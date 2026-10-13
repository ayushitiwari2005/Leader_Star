import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, ShieldCheck, ArrowLeft } from "lucide-react";

const emblem = "/bizznnovate-emblem.webp";
const wordmark = "/bizznnovate-wordmark.webp";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin & Judge Sign In — BIZZNNOVATE" },
      {
        name: "description",
        content: "Judge and admin sign-in for the BIZZNNOVATE live leaderboard at IIPS DAVV.",
      },
      { property: "og:title", content: "Admin & Judge Sign In — BIZZNNOVATE" },
      {
        property: "og:description",
        content: "Judge and admin sign-in for the BIZZNNOVATE live leaderboard at IIPS DAVV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const grantAdminSession = (userEmail: string, role = "super_admin") => {
    const session = {
      authenticated: true,
      user: userEmail,
      role,
      token: `bizz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
    try {
      localStorage.setItem("bizz_admin_auth", JSON.stringify(session));
      sessionStorage.setItem("bizz_admin_auth", JSON.stringify(session));
    } catch {}
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const normEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Check Event Master Passkey / Organizer Credentials
    const isMasterPasskey =
      cleanPass === "bizz2026" ||
      cleanPass === "admin123" ||
      cleanPass === "Admin@123";

    if (isMasterPasskey) {
      grantAdminSession(normEmail || "admin@bizznnovate.com");
      toast.success("Security verified: Access granted to Admin Console.");
      setBusy(false);
      void navigate({ to: "/admin" });
      return;
    }

    // 2. Check Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normEmail,
        password: cleanPass,
      });

      if (!error && data?.session) {
        grantAdminSession(normEmail);
        toast.success("Welcome! Signed in via Supabase cloud.");
        void navigate({ to: "/admin" });
        return;
      }

      if (error) {
        toast.error(`Authentication error: ${error.message}`);
      } else {
        toast.error("Invalid credentials. Please enter your authorized admin credentials.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 font-sans text-espresso antialiased bg-ecru">
      <div className="paper-card relative w-full max-w-sm rounded-md border border-kraft/45 bg-ecru-soft p-6 sm:p-8 shadow-xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-text hover:text-espresso mb-6 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Leaderboard
        </Link>

        <div className="flex items-center gap-3">
          <img
            src={emblem}
            alt="BIZZNNOVATE emblem"
            className="size-12 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <img
              src={wordmark}
              alt="BIZZNNOVATE"
              className="w-36 sm:w-44 object-contain object-left"
            />
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-forest-green font-semibold flex items-center gap-1.5">
              <ShieldCheck className="size-3 text-forest-green" /> Secure Admin Console
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-text font-semibold"
            >
              Admin / Evaluator Email
            </Label>
            <Input
              id="email"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-kraft/40 bg-ecru-light/60 font-mono text-sm text-espresso focus-visible:ring-forest-green"
              placeholder="admin@bizznnovate.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-text font-semibold flex items-center justify-between"
            >
              <span>Security Passkey</span>
              <Lock className="size-3 text-muted-text" />
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-kraft/40 bg-ecru-light/60 font-mono text-sm text-espresso focus-visible:ring-forest-green"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-forest-green hover:bg-forest-dark font-mono text-xs font-bold uppercase tracking-[0.18em] text-ecru-soft shadow-sm transition-colors cursor-pointer py-2.5 mt-2"
          >
            {busy ? "Verifying Credentials…" : "Sign In to Admin Console"}
          </Button>
        </form>

        <div className="mt-5 rounded-xs border border-kraft/35 bg-ecru-light/70 p-2.5 text-center font-mono text-[10px] text-muted-text">
          Authorized Event Organizer Passkey:{" "}
          <strong className="text-forest-green font-semibold">bizz2026</strong>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] text-muted-text/80">
          Official BIZZNNOVATE evaluation portal · IIPS DAVV
        </p>
      </div>
    </div>
  );
}
