export function ChangelogGrid() {
  const updates = [
    {
      date: "OCT 2026",
      title: "Token-2022 Native Pulls",
      description:
        "Full support for transfer_checked with exact on-chain decimal validation and program authority PDAs.",
      tag: "Protocol",
    },
    {
      date: "OCT 2026",
      title: "Solana Actions & Blinks",
      description:
        "Dialect-compatible Action endpoints allowing in-feed 1-click subscription authorizations across social feeds.",
      tag: "Actions",
    },
    {
      date: "OCT 2026",
      title: "Autonomous Keeper Cranks",
      description:
        "Node/TypeScript relayer bot with in-memory lock pools, batch memcmp filtering, and keeper reward routing.",
      tag: "Crank",
    },
    {
      date: "OCT 2026",
      title: "Zero-Dust Rent Recovery",
      description:
        "Deterministic closure of inactive subscription records, returning all Solana rent lamports to subscribers.",
      tag: "Anchor",
    },
  ];

  return (
    <section id="changelog" className="py-20 border-t border-white/8 bg-[#08090a]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between pb-10 border-b border-white/8">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Protocol Engineering Highlights
          </h3>
          <span className="font-mono text-xs text-zinc-500">Colosseum Hackathon Build</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-8">
          {updates.map((item) => (
            <div key={item.title} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#14F195]" />
                  <span className="font-mono text-[11px] text-zinc-500">{item.date}</span>
                  <span className="rounded bg-white/6 px-1.5 py-0.2 font-mono text-[10px] text-zinc-400 ml-auto">
                    {item.tag}
                  </span>
                </div>
                <h4 className="font-semibold text-white text-base mb-2">{item.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
