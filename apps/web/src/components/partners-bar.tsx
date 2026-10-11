export function PartnersBar() {
  const partners = [
    { name: "Solana", label: "SOLANA FOUNDATION" },
    { name: "Token-2022", label: "TOKEN EXTENSIONS" },
    { name: "Dialect", label: "SOLANA ACTIONS & BLINKS" },
    { name: "Phantom", label: "DELEGATED SESSIONS" },
    { name: "Backpack", label: "WALLET STANDARD" },
    { name: "Colosseum", label: "COLOSSEUM 2026" },
  ];

  return (
    <section className="border-y border-white/6 bg-[#08090a]/40 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-8">
          Powering the next era of recurring crypto cashflow
        </p>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6 items-center justify-items-center opacity-70 grayscale transition duration-300 hover:opacity-100">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex flex-col items-center justify-center p-2 text-center group cursor-default"
            >
              <span className="font-bold tracking-tight text-white text-base group-hover:text-[#14F195] transition">
                {partner.name}
              </span>
              <span className="text-[9px] font-mono tracking-wider text-zinc-500 mt-0.5">
                {partner.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
