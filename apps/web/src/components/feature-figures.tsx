type Vec3 = readonly [number, number, number];

interface Box {
  at: Vec3;
  size: Vec3; // [x-width, y-depth, z-height]
}

interface Disc {
  center: Vec3;
  radius: number;
}

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;
const STROKE = "rgba(255,255,255,0.4)";
const FILL = "#08090a";

function project([x, y, z]: Vec3): [number, number] {
  return [(x - y) * COS30, (x + y) * SIN30 - z];
}

function toPoints(vertices: Vec3[]): string {
  return vertices.map((v) => project(v).map((n) => n.toFixed(2)).join(",")).join(" ");
}

/** Visible faces of an isometric box: top, front-left (y-max), front-right (x-max). */
function boxFaces({ at: [x, y, z], size: [w, d, h] }: Box): string[] {
  const t = z + h;
  return [
    toPoints([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, t], [x, y + d, t]]),
    toPoints([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, t], [x + w, y, t]]),
    toPoints([[x, y, t], [x + w, y, t], [x + w, y + d, t], [x, y + d, t]]),
  ];
}

function sceneBounds(boxes: Box[], discs: Disc[]): string {
  const pts: [number, number][] = [];
  for (const { at: [x, y, z], size: [w, d, h] } of boxes) {
    for (const dx of [0, w]) for (const dy of [0, d]) for (const dz of [0, h]) pts.push(project([x + dx, y + dy, z + dz]));
  }
  for (const { center, radius } of discs) {
    const [cx, cy] = project(center);
    pts.push([cx - radius * COS30 * Math.SQRT2, cy - radius * SIN30 * Math.SQRT2]);
    pts.push([cx + radius * COS30 * Math.SQRT2, cy + radius * SIN30 * Math.SQRT2]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const pad = 4;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return `${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}`;
}

/** Renders boxes back-to-front (painter's order) so opaque fills hide hidden edges. */
function IsoScene({ boxes, discs = [] }: { boxes: Box[]; discs?: Disc[] }) {
  const ordered = [...boxes].sort((a, b) => a.at[0] + a.at[1] - (b.at[0] + b.at[1]) || a.at[2] - b.at[2]);
  return (
    <svg viewBox={sceneBounds(boxes, discs)} className="h-full w-full" aria-hidden="true">
      <g fill={FILL} stroke={STROKE} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke">
        {ordered.flatMap((box, i) =>
          boxFaces(box).map((pts, j) => <polygon key={`${i}-${j}`} points={pts} vectorEffect="non-scaling-stroke" />),
        )}
        {discs.map(({ center, radius }, i) => {
          const [cx, cy] = project(center);
          return (
            <ellipse
              key={`disc-${i}`}
              cx={cx}
              cy={cy}
              rx={radius * COS30 * Math.SQRT2}
              ry={radius * SIN30 * Math.SQRT2}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
    </svg>
  );
}

// FIG 0.1 — the subscriber's wallet: stacked slabs with a coin stack resting on top.
const walletSlabs: Box[] = Array.from({ length: 6 }, (_, i) => ({
  at: [0, 0, i * 14] as const,
  size: [110, 110, i === 5 ? 12 : 8] as const,
}));
const walletCoins: Disc[] = Array.from({ length: 4 }, (_, i) => ({
  center: [55, 55, 82 + i * 3] as const,
  radius: 30,
}));

// FIG 0.2 — a cluster of plans distributed as Blinks.
const blinkCubes: Box[] = [
  { at: [-50, -50, 40], size: [44, 44, 44] },
  { at: [-50, 10, 0], size: [44, 44, 44] },
  { at: [10, -50, 0], size: [44, 44, 44] },
  { at: [10, 10, 40], size: [44, 44, 44] },
  { at: [10, 10, -10], size: [44, 44, 44] },
  { at: [70, 10, -40], size: [44, 44, 44] },
];

// FIG 0.3 — billing epochs settling in sequence.
const epochPanels: Box[] = [
  { at: [-6, -4, -4], size: [126, 68, 4] },
  ...Array.from({ length: 10 }, (_, i) => ({
    at: [i * 12, 0, 0] as const,
    size: [3, 60, 120 - i * 11] as const,
  })),
];

const figures = [
  {
    label: "FIG 0.1",
    title: "Non-custodial",
    description:
      "Funds never leave the subscriber's wallet. Each cycle is pulled through a delegated program authority.",
    scene: <IsoScene boxes={walletSlabs} discs={walletCoins} />,
  },
  {
    label: "FIG 0.2",
    title: "Built for Blinks",
    description:
      "Plans unfurl as Solana Actions across X, Discord, and Telegram. One click to subscribe.",
    scene: <IsoScene boxes={blinkCubes} />,
  },
  {
    label: "FIG 0.3",
    title: "Settled automatically",
    description:
      "Keeper cranks settle every due epoch on-chain. No invoices, no reminders, no missed renewals.",
    scene: <IsoScene boxes={epochPanels} />,
  },
];

export function FeatureFigures() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-4xl text-[28px] font-medium leading-[1.15] tracking-tight text-white sm:text-[36px] md:text-[44px]">
          A new species of payment rail.{" "}
          <span className="text-zinc-500">
            Purpose-built for recurring revenue on Solana, TidePay replaces custodial escrow with delegated
            pull billing and autonomous on-chain settlement.
          </span>
        </h2>

        <div className="mt-20 grid grid-cols-1 divide-y divide-white/8 md:mt-28 md:grid-cols-3 md:divide-x md:divide-y-0">
          {figures.map((fig) => (
            <article key={fig.label} className="flex flex-col py-10 first:pt-0 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0">
              <span className="font-mono text-[11px] tracking-wide text-zinc-600">{fig.label}</span>
              <div className="mx-auto my-10 h-48 w-full max-w-60 md:my-14 md:h-56">{fig.scene}</div>
              <h3 className="text-sm font-medium text-white">{fig.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">{fig.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
