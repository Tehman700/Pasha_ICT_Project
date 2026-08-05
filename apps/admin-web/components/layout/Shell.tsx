"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale";
import { Badge } from "@/components/ui/Badge";

/**
 * Admin chrome: fixed sidebar, top bar with the language toggle.
 *
 * Layout primitives use logical properties (`ms-`, `pe-`, `start-`) rather
 * than left/right so the whole shell mirrors correctly when Urdu flips the
 * document to RTL.
 */

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { strings, locale, toggle } = useLocale();
  const n = strings.nav;

  const groups: NavGroup[] = [
    { label: n.operations, items: [
      { href: "/", label: n.dashboard },
      { href: "/queue", label: n.queue },
      { href: "/devices", label: n.devices },
      { href: "/audio", label: n.audio },
    ]},
    { label: n.people, items: [
      { href: "/schools", label: n.schools },
      { href: "/classes", label: n.classes },
      { href: "/students", label: n.students },
      { href: "/guardians", label: n.guardians },
      { href: "/staff", label: n.staff },
      { href: "/drivers", label: n.drivers },
    ]},
    { label: n.records, items: [
      { href: "/audit", label: n.audit },
      { href: "/announcements", label: n.announcements },
      { href: "/analytics", label: n.analytics },
    ]},
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden tablet:flex w-64 shrink-0 flex-col border-e border-hairline bg-canvas-soft">
        <div className="h-16 flex items-center px-6 border-b border-hairline">
          <Link href="/" className="type-title-md text-ink">
            {strings.common.appName}
            <span className="text-primary">.</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3">
          {groups.map((group) => (
            <div key={group.label} className="mb-7">
              <p className="type-label text-muted-soft px-3 mb-2">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
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
            Roots Montessori · Islamabad
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-6 tablet:px-10 border-b border-hairline bg-canvas">
          <div className="tablet:hidden type-title-md text-ink">
            {strings.common.appName}
            <span className="text-primary">.</span>
          </div>

          <div className="ms-auto flex items-center gap-3">
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
    </div>
  );
}
