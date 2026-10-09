import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { WebhookSimulator } from "@/components/developers/webhook-simulator";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Developers" };

const SNIPPETS = [
  {
    title: "Subscribe a wallet",
    description: "Delegate an allowance to the program authority, then subscribe; Epoch 0 is pulled immediately.",
    code: `import { Connection } from "@solana/web3.js";
import { TidePayClient } from "@tidepay/sdk";

const client = new TidePayClient(new Connection(RPC_URL));

const [programAuthority] = client.findProgramAuthorityPda();
const approveIx = createApproveInstruction(subscriberAta, programAuthority, wallet.publicKey, plan.amount * 12n);

const { instruction, subscriptionPda } = await client.buildSubscribeInstruction({
  subscriber: wallet.publicKey,
  plan: planPda,
  tokenMint: USDC_MINT,
  subscriberTokenAccount: subscriberAta,
  merchantTokenAccount: plan.merchantTokenAccount,
});`,
  },
  {
    title: "Create a plan",
    description: "Register billing terms. Amounts are bigint in token base units (USDC has 6 decimals).",
    code: `const { instruction, planPda } = await client.buildInitializePlanInstruction({
  merchant: wallet.publicKey,
  planId: "promptpilot-pro",
  amount: 29_000_000n,
  intervalSeconds: 2_592_000n,
  protocolFeeBps: 0,
  crankBountyAmount: 10_000n,
  tokenMint: USDC_MINT,
  merchantTokenAccount: merchantAta,
});`,
  },
  {
    title: "Check a subscription",
    description: "Gate features on an active subscription record.",
    code: `const [subscriptionPda] = client.findSubscriptionRecordPda(planPda, wallet.publicKey);
const record = await client.getSubscriptionRecord(subscriptionPda);

const isActive =
  record?.isActive === true &&
  BigInt(Math.floor(Date.now() / 1000)) <= record.nextEpochTimestamp;`,
  },
];

export default function DevelopersPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Integrate TidePay with the @tidepay/sdk TypeScript client. Builders return raw instructions, so you can
        compose them into your own transactions.
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
