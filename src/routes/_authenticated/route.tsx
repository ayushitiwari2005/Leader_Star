import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

export function isOrganizerSessionValid(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw =
      sessionStorage.getItem("bizz_admin_auth") ||
      localStorage.getItem("bizz_admin_auth");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.authenticated === true &&
      typeof parsed.expiresAt === "number" &&
      parsed.expiresAt > Date.now()
    ) {
      return true;
    }
  } catch {}
  return false;
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("bizz_admin_auth");
    localStorage.removeItem("bizz_admin_auth");
  } catch {}
}

function AuthGate() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function verify() {
      // 1. Check verified Organizer / Judge session
      if (isOrganizerSessionValid()) {
        if (active) setChecked(true);
        return;
      }

      // 2. Check Supabase session
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data?.session) {
        setChecked(true);
      } else {
        void navigate({ to: "/auth" });
      }
    }

    void verify();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isOrganizerSessionValid()) {
        void navigate({ to: "/auth" });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ecru-soft font-sans">
        <div className="font-mono text-xs uppercase tracking-[0.25em] text-muted-text animate-pulse">
          Verifying security credentials…
        </div>
      </div>
    );
  }

  return <Outlet />;
}
