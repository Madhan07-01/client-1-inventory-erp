import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { 
  rowToInvoice, 
  rowToQuotation, 
  rowToCustomer, 
  rowToProduct, 
  rowToSettings 
} from "@/lib/cloud";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export function useRealtimeSync() {
  useEffect(() => {
    let channel: any;
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      const userId = user?.id;
      if (!userId) return;

      channel = supabase
        .channel("public-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "DELETE") {
            useApp.getState().removeInvoiceLocal(payload.old.id as string);
          } else {
            useApp.getState().upsertInvoiceLocal(rowToInvoice(payload.new));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotations", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "DELETE") {
            useApp.getState().removeQuotationLocal(payload.old.id as string);
          } else {
            useApp.getState().upsertQuotationLocal(rowToQuotation(payload.new));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "DELETE") {
            useApp.getState().removeCustomerLocal(payload.old.id as string);
          } else {
            useApp.getState().upsertCustomerLocal(rowToCustomer(payload.new));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_master", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType !== "DELETE") {
            useApp.getState().upsertProductLocal(rowToProduct(payload.new));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_settings", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType !== "DELETE") {
            const products = useApp.getState().settings.productMaster;
            useApp.getState().setSettingsLocal(rowToSettings(payload.new, products));
          }
        }
      )
      .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
}
