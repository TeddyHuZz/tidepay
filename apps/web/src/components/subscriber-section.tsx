import Image from "next/image";
import { ArrowRight, ShieldCheck, Zap, RefreshCw, CheckCircle2 } from "lucide-react";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

// Generates pseudo-random but deterministic scatter points around target epoch bands
function generateScatterPoints(seed: number, count: number, centerX: number, centerY: number, spreadY: number) {
  const points: { cx: number; cy: number; r: number; opacity: number }[] = [];
  for (let i = 0; i < count; i++) {
    // deterministic pseudo-random formula
    const s1 = Math.sin(seed + i * 1.7) * 10000;
    const r1 = s1 - Math.floor(s1);
    const s2 = Math.cos(seed + i * 2.3) * 10000;
    const r2 = s2 - Math.floor(s2);
    const s3 = Math.sin(seed + i * 3.1) * 10000;
    const r3 = s3 - Math.floor(s3);

    const x = centerX + (r1 - 0.5) * 36;
    const y = centerY + (r2 - 0.5) * spreadY;
    const r = 1.6 + r3 * 1.4;
    const opacity = 0.45 + r3 * 0.5;

    points.push({ cx: Number(x.toFixed(1)), cy: Number(y.toFixed(1)), r: Number(r.toFixed(1)), opacity });
  }
  return points;
}

const cluster1 = generateScatterPoints(101, 38, 100, 120, 110);
const cluster2 = generateScatterPoints(202, 34, 250, 95, 80);
const cluster3 = generateScatterPoints(303, 44, 400, 105, 95);

function RetentionChartCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1015]/95 p-5 md:p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-md">
      {/* Card Header */}
      <div className="flex items-start justify-between pb-4 border-b border-white/6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              Settlement cadence by epoch
            </span>
            <span className="flex h-2 w-2 rounded-full bg-[#14F195] animate-pulse" />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Real-time keeper crank telemetry across active subscribers
          </p>
        </div>
        <span className="rounded bg-white/6 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
          Devnet 60s
        </span>
      </div>

      {/* Scatter plot telemetry area matching Linear's "Cycle time by agent" */}
      <div className="relative mt-4 h-48 w-full overflow-hidden">
        <svg viewBox="0 0 500 200" className="h-full w-full" aria-hidden="true">
          {/* Subtle horizontal guideline tracks */}
          <path
            d="M 20 50 C 140 50, 180 35, 250 35 C 320 35, 360 45, 480 45"
            fill="none"
            stroke="rgba(244,63,94,0.3)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <path
            d="M 20 100 C 130 100, 170 85, 250 85 C 330 85, 370 100, 480 100"
            fill="none"
            stroke="rgba(20,241,149,0.35)"
            strokeWidth="1"
          />
          <path
            d="M 20 150 C 140 150, 180 140, 250 140 C 320 140, 360 155, 480 155"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {/* Reference labels */}
          <text x="25" y="42" fill="rgba(244,63,94,0.6)" fontSize="9" fontFamily="monospace">
            MAX PULL WINDOW (120s)
          </text>
          <text x="25" y="93" fill="rgba(20,241,149,0.7)" fontSize="9" fontFamily="monospace">
            TARGET CRANK SETTLEMENT (~400ms)
          </text>

          {/* Scatter dots */}
          <g fill="#14F195">
            {cluster1.map((p, i) => (
              <circle key={`c1-${i}`} cx={p.cx} cy={p.cy} r={p.r} opacity={p.opacity} />
            ))}
          </g>
          <g fill="#5eead4">
            {cluster2.map((p, i) => (
              <circle key={`c2-${i}`} cx={p.cx} cy={p.cy} r={p.r} opacity={p.opacity} />
            ))}
          </g>
          <g fill="#00bfb3">
            {cluster3.map((p, i) => (
              <circle key={`c3-${i}`} cx={p.cx} cy={p.cy} r={p.r} opacity={p.opacity} />
            ))}
          </g>
        </svg>
      </div>

      {/* Axis timestamps */}
      <div className="flex items-center justify-between pt-1 border-t border-white/6 font-mono text-[10px] text-zinc-600">
        <span>Epoch 01 (00:00)</span>
        <span>Epoch 02 (+01:00)</span>
        <span>Epoch 03 (+02:00)</span>
        <span>Epoch 04 (+03:00)</span>
      </div>

      {/* Key telemetry stats pill row */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/6 bg-black/40 p-2.5 text-center">
        <div>
          <div className="font-mono text-xs font-semibold text-white">412ms</div>
          <div className="text-[10px] text-zinc-500">Avg Settlement</div>
        </div>
        <div className="border-x border-white/6">
          <div className="font-mono text-xs font-semibold text-[#14F195]">100%</div>
          <div className="text-[10px] text-zinc-500">Renewal Success</div>
        </div>
        <div>
          <div className="font-mono text-xs font-semibold text-cyan-400">$142.8K USDC</div>
          <div className="text-[10px] text-zinc-500">Volume Settled</div>
        </div>
      </div>
    </div>
  );
}

export function SubscriberSection() {
  return (
    <section id="subscribers" className="overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-[32px] font-medium leading-[1.1] tracking-tight text-white sm:text-[40px]">
            Subscriber
            <br />
            and retention telemetry
          </h2>
          <div>
            <p className="text-base leading-relaxed text-zinc-400 sm:text-lg">
              Monitor active delegated pull allowances, upcoming renewal epochs, and full cancellation histories.
              When a subscriber churns, their on-chain account closes cleanly and rent lamports return to their wallet.
            </p>
            <a
              href={`${DASHBOARD_URL}/subscribers`}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
            >
              View subscribers
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        {/* Visual: faded background subscriber dashboard + floating Linear-style telemetry card */}
        <div className="relative mt-16 md:mt-20">
          {/* Background Screenshot with fade on left and bottom */}
          <div className="relative w-full md:w-[88%] mr-auto">
            <Image
              src="/subscriber.png"
              alt="TidePay subscriber management console showing active subscribers, status, and cancellation history"
              width={3418}
              height={1890}
              sizes="(min-width: 1152px) 1000px, 100vw"
              className="h-auto w-full rounded-xl border border-white/8 opacity-50"
            />
            {/* Fade toward the left, right and bottom into the canvas */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-l from-transparent from-40% to-[#08090a]" />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-35% to-[#08090a]" />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent from-60% to-[#08090a]" />
          </div>

          {/* Floating card on the right side */}
          <div className="relative z-10 mx-auto -mt-16 w-full max-w-sm sm:-mt-28 md:absolute md:top-10 md:right-0 md:mt-0 md:max-w-md lg:max-w-lg">
            <RetentionChartCard />
          </div>
        </div>
      </div>
    </section>
  );
}
