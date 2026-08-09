"use client";

import { useLocale } from "@/lib/locale";
import { useScrollReveal } from "@/lib/gsap";

type Person = {
  name: string;
  photo: string;
  linkedin: string;
};

const FOUNDERS: Person[] = [
  { name: "Tehman", photo: "/team/tehman.png", linkedin: "https://www.linkedin.com/in/tehman600/" },
  {
    name: "Ali Hussnain",
    photo: "/team/ali-hussnain.jpeg",
    linkedin: "https://www.linkedin.com/in/syed-ali-hussnain-shah-9b0131300/",
  },
];

const SUPERVISOR: Person = {
  name: "Dr. Naveed Khan",
  photo: "/team/naveed-khan.jpg",
  linkedin: "https://www.linkedin.com/in/naveed-ai-architect/",
};

/**
 * A photo that opens LinkedIn on hover-intent and click, in a new tab.
 *
 * `target="_blank"` on the anchor is what satisfies "opens in a new tab" —
 * the hover state is purely the visual promise that clicking will do that,
 * an orange ring plus a small LinkedIn glyph fading in over the photo.
 */
function PersonPhoto({ person, size = 96 }: { person: Person; size?: number }) {
  return (
    <a
      href={person.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${person.name} — LinkedIn`}
      className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={person.photo}
        alt={person.name}
        width={size}
        height={size}
        className="rounded-full object-cover w-full h-full border border-hairline-strong transition-[filter] duration-200 group-hover:brightness-[0.55]"
      />
      <span className="absolute inset-0 rounded-full ring-0 group-hover:ring-2 ring-primary transition-all duration-200" />
      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.8v1.64h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.34-.02-3.05-1.86-3.05-1.87 0-2.16 1.46-2.16 2.96V21h-4V9z"
            fill="#ffffff"
          />
        </svg>
      </span>
    </a>
  );
}

export function Founders() {
  const { strings } = useLocale();
  const l = strings.landing;
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-founder]", stagger: 0.1 });

  return (
    <section className="px-6 tablet:px-10 py-20 max-w-[1200px] mx-auto">
      <h2 className="type-display-md text-ink mb-10 text-center">{l.foundersTitle}</h2>

      <div ref={ref} className="flex justify-center gap-10 tablet:gap-16 mb-14">
        {FOUNDERS.map((f) => (
          <div key={f.name} data-founder className="flex flex-col items-center text-center">
            <PersonPhoto person={f} />
            <p className="type-title-sm text-ink mt-4">{f.name}</p>
            <p className="type-caption text-muted-soft mt-1">{l.founderRole}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center text-center border-t border-hairline pt-12">
        <p className="type-label text-muted mb-6">{l.supervisorTitle}</p>
        <div data-founder className="flex flex-col items-center">
          <PersonPhoto person={SUPERVISOR} size={80} />
          <p className="type-title-sm text-ink mt-4">{SUPERVISOR.name}</p>
          <p className="type-caption text-muted-soft mt-1">{l.supervisorRole}</p>
        </div>
      </div>
    </section>
  );
}
