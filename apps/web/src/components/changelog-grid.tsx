import { ArrowRight } from "lucide-react";

interface ChangelogItem {
  date: string;
  title: string;
  description: string;
  isLatest?: boolean;
  commitUrl: string;
}

const changelogItems: ChangelogItem[] = [
  {
    date: "OCT 11, 2026",
    title: "On-Chain Plan State Controls",
    description:
      "Toggle plan status instructions allowing merchants to pause, resume, and close subscription tiers on-chain.",
    isLatest: true,
    commitUrl: "https://github.com/TeddyHuZz/tidepay/commit/c3f061e",
  },
  {
    date: "OCT 10, 2026",
    title: "HMAC Webhooks & Scoped Keys",
    description:
      "Project-level API key authorization and HMAC-SHA256 signature verification for automated recurring dunning webhooks.",
    commitUrl: "https://github.com/TeddyHuZz/tidepay/commit/10daa96",
  },
  {
    date: "OCT 10, 2026",
    title: "Cluster & Custom RPC Switcher",
    description:
      "Environment engine supporting seamless cluster switching between Solana Devnet and Mainnet with dedicated RPCs.",
    commitUrl: "https://github.com/TeddyHuZz/tidepay/commit/a706ffc",
  },
  {
    date: "OCT 09, 2026",
    title: "Non-Custodial Checkout & Rent Cleanup",
    description:
      "Dialect Blink actions, checkout sessions, and deterministic cancellation handlers closing accounts to refund rent.",
    commitUrl: "https://github.com/TeddyHuZz/tidepay/commit/283956b",
  },
];

export function ChangelogGrid() {
  return (
    <section id="changelog" className="overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h2 className="text-[32px] font-medium leading-[1.1] tracking-tight text-white sm:text-[40px]">
          Changelog
        </h2>

        {/* Horizontal Timeline Track */}
        <div className="relative mt-16 md:mt-20">
          {/* Subtle horizontal line connecting nodes */}
          <div className="pointer-events-none absolute top-1.5 left-2 right-2 hidden sm:block h-px bg-white/10" />

          {/* 4 Timeline Columns */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {changelogItems.map((item) => (
              <a
                key={item.title}
                href={item.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col justify-between"
              >
                <div>
                  {/* Timeline Dot Node */}
                  <div className="relative z-10 flex h-3 items-center">
                    {item.isLatest ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                      </span>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-zinc-600 transition-colors group-hover:bg-zinc-400" />
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="mt-8">
                    <h3 className="text-sm font-medium text-white transition group-hover:text-zinc-200">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="mt-6 font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
                  {item.date}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* View all link */}
        <div className="mt-14">
          <a
            href="https://github.com/TeddyHuZz/tidepay/commits/master"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
