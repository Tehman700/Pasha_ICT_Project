"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Badge } from "@/components/ui/Badge";
import { Wordmark } from "@/components/brand/Logo";
import { DashboardTour } from "@/components/tour/DashboardTour";
import { useRestartTour } from "@/components/tour/GuidedTour";
import { DEMO_ADMIN_PHONE } from "@/lib/demo";

/**
 * Admin chrome: fixed sidebar, top bar with the language toggle.
 *
 * Layout primitives use logical properties (`ms-`, `pe-`, `start-`) rather
 * than left/right so the whole shell mirrors correctly when Urdu flips the
 * document to RTL.
 */

type NavItem = { href: string; label: string; tour?: string };
type NavGroup = { label: string; items: NavItem[] };

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const api = useApi();
  const { strings, locale, toggle } = useLocale();
  // Identify the signed-in admin from the API, not from fixtures.
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.me(), retry: false });
  const school = useQuery({ queryKey: ["schools"], queryFn: () => api.listSchools() });
  const restartTour = useRestartTour();
  const n = strings.nav;

  // `data-tour` ids are what GuidedTour's arrow actually points at — they
  // have to exist on the real element, not a screenshot of it, so the tour
  // can never drift out of sync with the nav it's describing.
  const groups: NavGroup[] = [
    { label: n.operations, items: [
      { href: "/dashboard", label: n.dashboard },
      { href: "/queue", label: n.queue, tour: "nav-queue" },
      { href: "/devices", label: n.devices, tour: "nav-devices" },
      { href: "/audio", label: n.audio },
    ]},
    { label: n.people, items: [
      { href: "/schools", label: n.schools },
      { href: "/classes", label: n.classes },
      { href: "/students", label: n.students, tour: "nav-students" },
      { href: "/guardians", label: n.guardians },
      { href: "/staff", label: n.staff },
      { href: "/drivers", label: n.drivers, tour: "nav-drivers" },
    ]},
    { label: n.records, items: [
      { href: "/audit", label: n.audit, tour: "nav-audit" },
      { href: "/announcements", label: n.announcements },
      { href: "/analytics", label: n.analytics },
    ]},
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden tablet:flex w-64 shrink-0 flex-col border-e border-hairline bg-canvas-soft">
        <div className="h-16 flex items-center px-6 border-b border-hairline">
          <Link href="/dashboard">
            <Wordmark />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3">
          {groups.map((group) => (
            <div key={group.label} className="mb-7">
              <p className="type-label text-muted-soft px-3 mb-2">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-tour={item.tour}
                        className={`block px-3 py-2 rounded-sm type-body-sm transition-colors ${
                          active
                            ? "bg-ink text-canvas"
                            : "text-body hover:bg-surface-strong/60 hover:text-ink"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-hairline">
          <p className="type-caption text-muted-soft">
            {school.data?.[0]?.name ?? "—"}
          </p>
          {me.data ? (
            <p className="type-caption text-muted-soft mt-1">{me.data.name}</p>
          ) : null}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-6 tablet:px-10 border-b border-hairline bg-canvas">
          <div className="tablet:hidden">
            <Wordmark markSize={24} />
          </div>

          <div className="ms-auto flex items-center gap-3">
            <button
              data-tour="tour-button"
              onClick={restartTour}
              className="type-body-sm text-body hover:text-ink border border-hairline-strong rounded-md h-9 px-3 bg-surface-card transition-colors"
            >
              {strings.tour.step6Title}
            </button>
            <button
              onClick={toggle}
              className="type-body-sm text-body hover:text-ink border border-hairline-strong rounded-md h-9 px-3 bg-surface-card transition-colors"
              aria-label="Toggle language"
            >
              {locale === "en" ? "اردو" : "English"}
            </button>
            <Badge tone="neutral">{strings.role.admin}</Badge>
          </div>
        </header>

        <main className="flex-1 px-6 tablet:px-10 py-10 max-w-[1200px] w-full">
          {children}
        </main>
      </div>

      <DashboardTour autoStart={me.data?.phone === DEMO_ADMIN_PHONE} />
    </div>
  );
}
