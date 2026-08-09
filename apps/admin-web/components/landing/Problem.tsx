"use client";

import { useLocale } from "@/lib/locale";
import { useScrollRevealX } from "@/lib/gsap";

/** Simple line-drawn illustrations in the existing palette — no stock art,
 * nothing borrowed, just the same ink/cream/orange system the rest of the
 * page is built from, applied to one small scene per problem. */

function UnverifiedIllustration() {
  return (
    <svg viewBox="0 0 240 180" className="w-full h-auto" role="img" aria-hidden="true">
      <rect x="0" y="0" width="240" height="180" rx="16" fill="var(--color-canvas-soft)" />
      {/* gate posts */}
      <rect x="60" y="30" width="8" height="120" rx="4" fill="var(--color-ink)" />
      <rect x="172" y="30" width="8" height="120" rx="4" fill="var(--color-ink)" />
      <rect x="60" y="86" width="120" height="8" rx="4" fill="var(--color-hairline-strong)" />
      {/* unknown figure */}
      <circle cx="120" cy="110" r="20" fill="var(--color-muted-soft)" />
      <path d="M96 150c4-16 16-24 24-24s20 8 24 24" stroke="var(--color-muted-soft)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <text x="120" y="118" textAnchor="middle" fontSize="20" fill="var(--color-canvas)" fontFamily="var(--font-sans)">?</text>
    </svg>
  );
}

function VerifiedIllustration() {
  return (
    <svg viewBox="0 0 240 180" className="w-full h-auto" role="img" aria-hidden="true">
      <rect x="0" y="0" width="240" height="180" rx="16" fill="var(--color-canvas-soft)" />
      <rect x="60" y="30" width="8" height="120" rx="4" fill="var(--color-ink)" />
      <rect x="172" y="30" width="8" height="120" rx="4" fill="var(--color-ink)" />
      <rect x="60" y="86" width="120" height="8" rx="4" fill="var(--color-primary)" />
      {/* known figure with a signed-code badge */}
      <circle cx="120" cy="110" r="20" fill="var(--color-ink)" />
      <path d="M96 150c4-16 16-24 24-24s20 8 24 24" stroke="var(--color-ink)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="140" cy="96" r="14" fill="var(--color-primary)" />
      <path d="M134 96l4 4 8-8" stroke="var(--color-on-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function SilentIllustration() {
  return (
    <svg viewBox="0 0 240 180" className="w-full h-auto" role="img" aria-hidden="true">
      <rect x="0" y="0" width="240" height="180" rx="16" fill="var(--color-canvas-soft)" />
      <rect x="98" y="36" width="44" height="90" rx="8" fill="var(--color-surface-card)" stroke="var(--color-hairline-strong)" strokeWidth="2" />
      <rect x="106" y="46" width="28" height="58" rx="2" fill="var(--color-hairline-soft)" />
      <circle cx="120" cy="150" r="18" fill="none" stroke="var(--color-muted-soft)" strokeWidth="3" strokeDasharray="4 5" />
      <text x="120" y="157" textAnchor="middle" fontSize="16" fill="var(--color-muted-soft)">?</text>
    </svg>
  );
}

function NotifiedIllustration() {
  return (
    <svg viewBox="0 0 240 180" className="w-full h-auto" role="img" aria-hidden="true">
      <rect x="0" y="0" width="240" height="180" rx="16" fill="var(--color-canvas-soft)" />
      <rect x="98" y="36" width="44" height="90" rx="8" fill="var(--color-surface-card)" stroke="var(--color-hairline-strong)" strokeWidth="2" />
      <rect x="106" y="46" width="28" height="58" rx="2" fill="var(--color-hairline-soft)" />
      <rect x="140" y="34" width="76" height="34" rx="8" fill="var(--color-ink)" />
      <text x="178" y="55" textAnchor="middle" fontSize="10" fill="var(--color-canvas)" fontFamily="var(--font-sans)">Handed over</text>
      <circle cx="212" cy="40" r="5" fill="var(--color-primary)" />
    </svg>
  );
}

function DeadPhoneIllustration() {
  return (
    <svg viewBox="0 0 240 180" className="w-full h-auto" role="img" aria-hidden="true">
      <rect x="0" y="0" width="240" height="180" rx="16" fill="var(--color-canvas-soft)" />
      <rect x="98" y="36" width="44" height="90" rx="8" fill="var(--color-surface-card)" stroke="var(--color-hairline-strong)" strokeWidth="2" />
      <line x1="94" y1="30" x2="146" y2="132" stroke="var(--color-error)" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 150c8-6 20-10 60-10s52 4 60 10" stroke="var(--color-hairline-strong)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ManualFallbackIllustration() {
  return (
    <svg viewBox="0 0 240 180" className="w-full h-auto" role="img" aria-hidden="true">
      <rect x="0" y="0" width="240" height="180" rx="16" fill="var(--color-canvas-soft)" />
      <circle cx="90" cy="90" r="26" fill="var(--color-ink)" />
      <circle cx="150" cy="90" r="26" fill="var(--color-primary)" />
      <path d="M108 90h24" stroke="var(--color-hairline-strong)" strokeWidth="4" strokeLinecap="round" />
      <path d="M132 78l12 12-12 12" stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="90" y="150" textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily="var(--font-sans)">guard</text>
      <text x="150" y="150" textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily="var(--font-sans)">logged</text>
    </svg>
  );
}

function ProblemRow({
  reverse,
  before,
  beforeImg,
  after,
  afterImg,
  title,
  body,
  solution,
}: {
  reverse: boolean;
  before: string;
  beforeImg: React.ReactNode;
  after: string;
  afterImg: React.ReactNode;
  title: string;
  body: string;
  solution: string;
}) {
  const textRef = useScrollRevealX<HTMLDivElement>(reverse ? "right" : "left");
  const imgRef = useScrollRevealX<HTMLDivElement>(reverse ? "left" : "right");

  const textBlock = (
    <div ref={textRef}>
      <p className="type-title-md text-ink mb-3">{title}</p>
      <p className="type-body text-muted mb-4">{body}</p>
      <div className="flex items-start gap-2.5 border-s-2 border-primary ps-3.5">
        <p className="type-body-sm text-body">{solution}</p>
      </div>
    </div>
  );

  const imgBlock = (
    <div ref={imgRef} className="grid grid-cols-2 gap-3 items-center">
      <div>
        <div className="overflow-hidden p-2 rounded-lg bg-surface-card border border-hairline">
          {beforeImg}
        </div>
        <p className="type-caption text-muted-soft text-center mt-2">{before}</p>
      </div>
      <div>
        <div className="overflow-hidden p-2 rounded-lg bg-surface-card border-2 border-primary">
          {afterImg}
        </div>
        <p className="type-caption text-primary text-center mt-2">{after}</p>
      </div>
    </div>
  );

  return (
    <div className="grid tablet:grid-cols-2 gap-8 tablet:gap-14 items-center py-12">
      {reverse ? (
        <>
          <div className="tablet:order-2">{textBlock}</div>
          <div className="tablet:order-1">{imgBlock}</div>
        </>
      ) : (
        <>
          {textBlock}
          {imgBlock}
        </>
      )}
    </div>
  );
}

export function Problem() {
  const { strings } = useLocale();
  const l = strings.landing;

  return (
    <section className="px-6 tablet:px-10 py-16 max-w-[1200px] mx-auto">
      <div className="max-w-xl mb-4">
        <h2 className="type-display-md text-ink mb-3">{l.problemTitle}</h2>
        <p className="type-body text-muted">{l.problemSubtitle}</p>
      </div>

      <ProblemRow
        reverse={false}
        before="Unverified"
        beforeImg={<UnverifiedIllustration />}
        after="Verified"
        afterImg={<VerifiedIllustration />}
        title={l.problem1Title}
        body={l.problem1Body}
        solution={l.problem1Solution}
      />
      <ProblemRow
        reverse={true}
        before="No record"
        beforeImg={<SilentIllustration />}
        after="Notified instantly"
        afterImg={<NotifiedIllustration />}
        title={l.problem2Title}
        body={l.problem2Body}
        solution={l.problem2Solution}
      />
      <ProblemRow
        reverse={false}
        before="Phone dies"
        beforeImg={<DeadPhoneIllustration />}
        after="Manual fallback"
        afterImg={<ManualFallbackIllustration />}
        title={l.problem3Title}
        body={l.problem3Body}
        solution={l.problem3Solution}
      />
    </section>
  );
}
