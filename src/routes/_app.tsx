import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getSession()) navigate({ to: "/" });
    else setReady(true);
  }, [navigate]);
  if (!ready) return null;
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
}
