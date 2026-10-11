const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-36 sm:py-44 md:py-48 text-center border-t border-white/6">
      {/* Subtle background ambient radial gradient */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-100 w-150 rounded-full bg-[#14F195]/4 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Main Headline matching Linear */}
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight text-white leading-[1.08]">
          Built for the future.
          <br />
          Available today.
        </h2>

        {/* Action Buttons */}
        <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-3.5">
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-black transition-all hover:bg-zinc-200 active:scale-[0.98]"
          >
            Get started
          </a>
          <a
            href={`${DASHBOARD_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/4 px-6 text-sm font-medium text-white transition-all hover:bg-white/8 hover:border-white/20 active:scale-[0.98]"
          >
            Documentation
          </a>
        </div>
      </div>
    </section>
  );
}
