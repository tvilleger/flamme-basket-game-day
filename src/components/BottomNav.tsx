import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ClipboardCheck, Trophy, Newspaper, Star, Target } from "lucide-react";

const items = [
  { to: "/home", label: "Moi", icon: Home },
  { to: "/checkin", label: "Check-in", icon: ClipboardCheck },
  { to: "/missions", label: "Missions", icon: Star },
  { to: "/shoot", label: "Shoot", icon: Target },
  { to: "/rankings", label: "Classt.", icon: Trophy },
  { to: "/feed", label: "Actu", icon: Newspaper },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold"
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-2xl transition-all ${
                    active
                      ? "bg-gradient-flame text-primary-foreground shadow-flame"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon size={18} strokeWidth={2.5} />
                </span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

