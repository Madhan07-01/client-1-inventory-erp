import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import logoAsset from "@/assets/madeena-logo.png.asset.json";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign in · FastenerERP Billing" },
      { name: "description", content: "Sign in to the FastenerERP billing workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const REMEMBER_FLAG = "madeena.remember";

function AuthPage() {
  const company = useApp((s) => s.settings.company);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [prefill, setPrefill] = useState<string>("");

  return (
    <div className="min-h-screen w-full grid place-items-center bg-gradient-to-br from-[var(--surface-header)] via-background to-[var(--surface-summary)] p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <img
            src={company.logoDataUrl || logoAsset.url}
            alt="logo"
            className="h-16 w-16 object-contain"
          />
          <div className="text-center">
            <div className="text-lg font-bold tracking-tight">{company.name}</div>
            <div className="text-xs text-muted-foreground">{company.companyTagline}</div>
          </div>
        </div>

        <Card className="border-border/60 shadow-lg backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Secure access
            </CardTitle>
            <CardDescription>
              {tab === "login"
                ? "Sign in to continue to your billing workspace."
                : "Create an account to access the billing workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-4 animate-fade-in">
                <LoginForm prefillEmail={prefill} />
              </TabsContent>
              <TabsContent value="register" className="mt-4 animate-fade-in">
                <RegisterForm
                  onRegistered={(email) => {
                    setPrefill(email);
                    setTab("login");
                  }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Protected by JWT session authentication. Passwords are hashed and never stored in plain
          text.
        </p>
      </div>
    </div>
  );
}

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

function LoginForm({ prefillEmail }: { prefillEmail: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
      // focus password after prefill
      const el = document.getElementById("login-password") as HTMLInputElement | null;
      el?.focus();
    }
  }, [prefillEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: typeof errors = {};
      for (const issue of parsed.error.issues) {
        fe[issue.path[0] as "email" | "password"] = issue.message;
      }
      setErrors(fe);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) {
        setErrors({ form: "Invalid email or password." });
        toast.error("Invalid credentials");
        return;
      }
      try {
        localStorage.setItem(REMEMBER_FLAG, remember ? "1" : "0");
      } catch {
        /* ignore */
      }
      toast.success("Signed in");
      navigate({ to: "/" });
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              disabled={loading}
            />
          </div>
          {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setForgotOpen(true)}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-9"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? <p className="text-xs text-destructive">{errors.password}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(v) => setRemember(Boolean(v))}
            disabled={loading}
          />
          <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
            Remember me on this device
          </Label>
        </div>

        {errors.form ? (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} initialEmail={email} />
    </>
  );
}

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 12) score++;
  const s = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const map = [
    { label: "Too short", color: "bg-muted" },
    { label: "Weak", color: "bg-destructive" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Strong", color: "bg-emerald-500" },
    { label: "Excellent", color: "bg-emerald-600" },
  ] as const;
  return { score: s, ...map[s] };
}

const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "Enter your full name (min 3 characters)").max(120),
    email: z.string().trim().email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[+\d][\d\s-]{6,20}$/.test(v), {
        message: "Enter a valid phone number",
      }),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[a-z]/, "Must include a lowercase letter")
      .regex(/\d/, "Must include a number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

function RegisterForm({ onRegistered }: { onRegistered: (email: string) => void }) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = useMemo(() => passwordStrength(password), [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = registerSchema.safeParse({
      fullName,
      email,
      phone: phone || undefined,
      password,
      confirm,
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) fe[issue.path[0] as string] = issue.message;
      setErrors(fe);
      return;
    }
    setLoading(true);
    try {
      const cleanName = parsed.data.fullName.trim();
      const cleanEmail = parsed.data.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: parsed.data.password,
        options: {
          data: { full_name: cleanName, phone: parsed.data.phone ?? null },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        console.error("Registration failed:", {
          email: cleanEmail,
          full_name: cleanName,
          code: (error as { code?: string }).code,
          status: (error as { status?: number }).status,
          message: error.message,
        });
        const rawMessage =
          typeof error?.message === "string" && error.message.trim().length > 0
            ? error.message
            : typeof error === "string"
              ? error
              : "Could not create account. Please try again.";
        const message = rawMessage;
        const normalized = message.toLowerCase();
        const msg =
          normalized.includes("registered") || normalized.includes("already")
            ? "Email already registered."
            : normalized.includes("registration is disabled")
              ? "Registration is disabled. Contact the administrator."
              : normalized.includes("weak")
                ? "Password is too weak. Please choose a stronger password."
                : normalized.includes("rate limit")
                  ? "Too many attempts. Please wait a moment and try again."
                  : normalized.includes("database error") || normalized.includes("saving new user")
                    ? "Account setup could not be completed. Please try again."
                    : message;
        setErrors({ form: msg });
        toast.error(msg);
        return;
      }
      toast.success("Account created successfully.");
      if (data.session) {
        navigate({ to: "/" });
      } else {
        onRegistered(cleanEmail);
      }
    } catch (err) {
      console.error("Registration exception:", err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Something went wrong. Please try again.";
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reg-name">Full name</Label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-name"
            autoComplete="name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-9"
            disabled={loading}
          />
        </div>
        {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
            disabled={loading}
          />
        </div>
        {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-phone">
          Phone <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-9"
            disabled={loading}
          />
        </div>
        {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9 pr-9"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password ? (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded transition-colors ${
                    i < strength.score ? strength.color : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Strength: <span className="font-medium text-foreground">{strength.label}</span>
            </p>
          </div>
        ) : null}
        {errors.password ? <p className="text-xs text-destructive">{errors.password}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-confirm">Confirm password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Confirm your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="pl-9"
            disabled={loading}
          />
        </div>
        {errors.confirm ? <p className="text-xs text-destructive">{errors.confirm}</p> : null}
      </div>

      {errors.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function ForgotPasswordDialog({
  open,
  onOpenChange,
  initialEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setSent(false);
      setError(null);
    }
  }, [open, initialEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data.toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) {
        setError(err.message);
        toast.error(err.message);
        return;
      }
      setSent(true);
      toast.success("Password reset email sent");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            {sent
              ? "If an account exists for that email, a reset link is on its way."
              : "Enter the email associated with your account and we'll send a reset link."}
          </DialogDescription>
        </DialogHeader>
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                />
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send reset link
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
