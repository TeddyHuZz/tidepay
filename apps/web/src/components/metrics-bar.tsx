import { ShieldAlert, Zap, Coins, Layers } from "lucide-react";

export function MetricsBar() {
  const metrics = [
    {
      value: "400ms",
      label: "Settlement Latency",
      description: "Instant sub-second epoch settlement on Solana",
      icon: Zap,
      accent: "text-amber-400",
    },
    {
      value: "$0.0002",
      label: "Average Pull Fee",
      description: "Fractional cent network fees per subscription cycle",
      icon: Coins,
      accent: "text-emerald-400",
    },
    {
      value: "0%",
      label: "Custodial Risk",
      description: "Zero escrow vaults. Funds remain in subscriber wallet",
      icon: ShieldAlert,
      accent: "text-[#9945FF]",
    },
    {
      value: "Token-2022",
      label: "Native Standard",
      description: "Built for transfer_checked and programmatic delegates",
      icon: Layers,
      accent: "text-cyan-400",
    },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="group relative rounded-xl border border-white/8 bg-[#0f1015]/60 p-6 backdrop-blur-md transition duration-300 hover:border-white/18 hover:bg-[#0f1015]/90"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                    {item.label}
                  </span>
                  <Icon className={`h-4 w-4 ${item.accent} opacity-80 group-hover:scale-110 transition-transform`} />
                </div>
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                  {item.value}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
