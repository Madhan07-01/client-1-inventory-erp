import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "./store";
import { cloud } from "./cloud";
import { maybeExpireQuotation } from "./quotation-actions";

/**
 * Loads all business data from the cloud into the in-memory Zustand store
 * once per authenticated session. Renders children as soon as data is ready.
 */
export function useHydrateApp() {
  const hydrated = useApp((s) => s.hydrated);
  const hydrate = useApp((s) => s.hydrate);
  const reset = useApp((s) => s.reset);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const data = await cloud.fetchAll();
        if (cancelled) return;
        const quotations = data.quotations.map((q) => maybeExpireQuotation(q) ?? q);
        const toPersist = data.quotations
          .map((q, i) => (quotations[i] !== q ? quotations[i] : null))
          .filter((q): q is NonNullable<typeof q> => q !== null);
        hydrate({
          settings: data.settings,
          customers: data.customers,
          invoices: data.invoices,
          quotations,
          inventoryStock: data.inventoryStock,
          inventoryTransactions: data.inventoryTransactions,
          warehouses: data.warehouses,
          readNotificationIds: data.readNotificationIds,
          dismissedNotificationIds: data.dismissedNotificationIds,
        });
        for (const q of toPersist) {
          cloud.upsertQuotation(q).catch(() => {});
        }
        setError(null);
      } catch (e) {
        if (cancelled) return;
        const msg = (e as { message?: string })?.message || "Failed to load data";
        setError(msg);
        toast.error(`Load data: ${msg}`);
      }
    }

    if (!hydrated) run();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") reset();
    });

    // Re-sync on window focus for multi-device changes.
    const onFocus = () => {
      cloud
        .fetchAll()
        .then((data) => {
          if (cancelled) return;
          hydrate({
            settings: data.settings,
            customers: data.customers,
            invoices: data.invoices,
            quotations: data.quotations,
            inventoryStock: data.inventoryStock,
            inventoryTransactions: data.inventoryTransactions,
            warehouses: data.warehouses,
            readNotificationIds: data.readNotificationIds,
            dismissedNotificationIds: data.dismissedNotificationIds,
          });
        })
        .catch(() => {
          /* silent — background refresh */
        });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { hydrated, error };
}
