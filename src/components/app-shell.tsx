"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Bell,
  BriefcaseBusiness,
  ChartLine,
  Home,
  Link2,
  Settings,
  Shapes,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/deals", label: "Deals", icon: BriefcaseBusiness },
  { href: "/templates", label: "Templates", icon: Shapes },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/integrations", label: "Integrations", icon: Link2 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/insights", label: "Insights", icon: ChartLine, disabled: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fef3c7,_transparent_35%),radial-gradient(circle_at_bottom_right,_#dbeafe,_transparent_40%),#f8fafc] text-slate-900">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_1fr] lg:px-6">
        <aside className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Blueprint</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Workspace</h1>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.disabled ? "#" : item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    item.disabled && "cursor-not-allowed opacity-45",
                    active && !item.disabled
                      ? "bg-slate-900 text-slate-50 shadow"
                      : "text-slate-700 hover:bg-slate-100",
                  )}
                  onClick={(event) => {
                    if (item.disabled) {
                      event.preventDefault();
                    }
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
