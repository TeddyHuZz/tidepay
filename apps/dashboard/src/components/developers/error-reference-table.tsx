"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const PROTOCOL_ERRORS = [
  {
    code: "6000 (0x1770)",
    name: "InvalidPlanId",
    message: "Plan ID cannot be empty or exceed 32 characters",
    resolution: "Ensure plan_id is 1–32 UTF-8 bytes without invalid characters.",
  },
  {
    code: "6001 (0x1771)",
    name: "ZeroAmount",
    message: "Amount must be greater than zero",
    resolution: "Specify an amount greater than 0 token base units.",
  },
  {
    code: "6002 (0x1772)",
    name: "IntervalTooShort",
    message: "Billing interval must be at least 60 seconds",
    resolution: "Interval must be >= 60 seconds (production standard is monthly 2,592,000s).",
  },
  {
    code: "6003 (0x1773)",
    name: "EpochNotDue",
    message: "Epoch billing is not yet due",
    resolution: "Current cluster unix timestamp has not reached next_epoch_timestamp.",
  },
  {
    code: "6004 (0x1774)",
    name: "SubscriptionInactive",
    message: "Subscription is not active",
    resolution: "Subscriber either cancelled or account has been closed.",
  },
  {
    code: "6005 (0x1775)",
    name: "InvalidFeeBps",
    message: "Protocol fee basis points exceed maximum allowed",
    resolution: "Fee bps cannot exceed the protocol cap (maximum 1,000 bps / 10%).",
  },
  {
    code: "6006 (0x1776)",
    name: "InsufficientAllowance",
    message: "Insufficient delegated allowance for subscription pull",
    resolution: "Subscriber must call Token createApproveInstruction to increase delegated allowance.",
  },
  {
    code: "6007 (0x1777)",
    name: "Unauthorized",
    message: "Unauthorized signer for this action",
    resolution: "Only the designated merchant or subscriber can invoke this instruction.",
  },
  {
    code: "6008 (0x1778)",
    name: "MathOverflow",
    message: "Calculation overflow",
    resolution: "Checked math overflow during token or epoch timestamp arithmetic.",
  },
];

export function ErrorReferenceTable() {
  return (
    <Card className="border-border/70 bg-card/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <AlertCircle className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Anchor Error Reference</CardTitle>
            <CardDescription className="text-xs">
              Custom on-chain errors emitted by the TidePay smart contract runtime.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border/60 overflow-x-auto">
          <Table className="min-w-160 text-xs">
            <TableHeader>
              <TableRow className="border-t-0 bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-28">Code</TableHead>
                <TableHead className="w-44">Name</TableHead>
                <TableHead>Error Message</TableHead>
                <TableHead>Handling & Cause</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROTOCOL_ERRORS.map((err) => (
                <TableRow key={err.name} className="hover:bg-accent/40">
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{err.code}</TableCell>
                  <TableCell className="font-mono font-medium text-foreground">{err.name}</TableCell>
                  <TableCell className="text-muted-foreground">{err.message}</TableCell>
                  <TableCell className="text-xs text-foreground/80">{err.resolution}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
