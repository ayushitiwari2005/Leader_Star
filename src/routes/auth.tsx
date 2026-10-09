import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { role } = await getMyRole();
      if (!role) {
        toast.error("Please verify your email before using the Admin Panel.");
      }
      void navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 font-sans text-espresso antialiased">
      <div className="paper-card relative w-full max-w-sm rounded-md border border-kraft/45 bg-ecru-soft p-6 sm:p-8 shadow-xl">
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
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-forest-green font-semibold">
              Judge & Admin Console
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-text font-semibold"
            >
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-kraft/40 bg-ecru-light/60 font-mono text-sm text-espresso focus-visible:ring-forest-green"
              placeholder="evaluator@iips.edu"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-text font-semibold"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-kraft/40 bg-ecru-light/60 font-mono text-sm text-espresso focus-visible:ring-forest-green"
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-forest-green hover:bg-forest-dark font-mono text-xs font-bold uppercase tracking-[0.18em] text-ecru-soft shadow-sm transition-colors cursor-pointer py-2.5"
          >
            {busy ? "Authenticating…" : mode === "signin" ? "Sign In to Arena" : "Register Evaluator"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-text hover:text-espresso transition-colors cursor-pointer"
        >
          {mode === "signin" ? "Need credentials? Sign up" : "Already registered? Sign in"}
        </button>
        <p className="mt-4 text-center font-mono text-[10px] text-muted-text/80">
          Official BIZZNNOVATE evaluation portal · IIPS DAVV
        </p>
      </div>
    </div>
  );
}
