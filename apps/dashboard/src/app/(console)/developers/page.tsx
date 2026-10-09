import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { WebhookSimulator } from "@/components/developers/webhook-simulator";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Developers" };

const SNIPPETS = [
  {
    title: "Subscribe a wallet",
    description: "Delegates the allowance and settles Epoch 0 in one transaction.",
    code: `import { TidePayClient } from "@tidepay/sdk";

const client = new TidePayClient(provider);

const { txSignature, subscriptionPda } = await client.subscribe({
  plan: planPda,
  subscriber: wallet.publicKey,
});`,
  },
  {
    title: "Create a plan",
    description: "Register billing terms. Amounts and timestamps are bigint.",
    code: `const { txSignature, planPda } = await client.createPlan({
  planId: "promptpilot-pro",
  amount: 29_000_000n, // 29 USDC, 6 decimals
  intervalSeconds: 2_592_000n,
  mint: USDC_DEVNET_MINT,
});`,
  },
  {
    title: "Compose into your own transaction",
    description: "Instruction builders return raw TransactionInstruction objects.",
    code: `const ix = await client.buildSubscribeIx({
  plan: planPda,
  subscriber: wallet.publicKey,
});

tx.add(ix);`,
  },
];

export default function DevelopersPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Integrate TidePay with the TypeScript SDK. Signatures follow the planned @tidepay/sdk API and may change
        until it is published.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-6">
        {SNIPPETS.map((snippet) => (
          <Card key={snippet.title}>
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{snippet.title}</CardTitle>
                  <CardDescription className="mt-1">{snippet.description}</CardDescription>
                </div>
                <CopyButton value={snippet.code} label={`Copy ${snippet.title} snippet`} />
              </div>
              <pre className="overflow-x-auto rounded-md border bg-background p-4 font-mono text-xs leading-5 text-foreground/90">
                <code>{snippet.code}</code>
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <WebhookSimulator />
    </div>
  );
}
