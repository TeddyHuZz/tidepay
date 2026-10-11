import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

interface SettlementPayloadEvent {
  signature: string;
  planAddress: string;
  planName?: string;
  subscriber?: string;
  kind?: string;
  label?: string;
  amountGrossUsdc?: string | number;
  amountNetUsdc?: string | number;
  keeperFeeUsdc?: string | number;
  timestamp?: number;
}

// GET /api/settlements?planAddress=... or ?planAddresses=addr1,addr2
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planAddress = searchParams.get("planAddress");
    const planAddressesParam = searchParams.get("planAddresses");

    let addresses: string[] = [];
    if (planAddressesParam) {
      addresses = planAddressesParam.split(",").map((a) => a.trim()).filter(Boolean);
    } else if (planAddress) {
      addresses = [planAddress.trim()];
    }

    if (addresses.length === 0) {
      // Return total aggregates across all plans
      const totals = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE kind IN ('settled', 'subscribed'))::int as "totalSettlements",
          COALESCE(SUM(amount_net_usdc) FILTER (WHERE kind IN ('settled', 'subscribed')), 0)::numeric as "totalEarnedNet",
          COALESCE(SUM(amount_gross_usdc) FILTER (WHERE kind IN ('settled', 'subscribed')), 0)::numeric as "totalGrossBilled"
        FROM plan_settlements;
      `;

      const recentEvents = await sql`
        SELECT 
          signature,
          plan_address as "planAddress",
          plan_name as "planName",
          subscriber,
          kind,
          label,
          amount_gross_usdc::text as "amountGrossUsdc",
          amount_net_usdc::text as "amountNetUsdc",
          keeper_fee_usdc::text as "keeperFeeUsdc",
          FLOOR(EXTRACT(EPOCH FROM block_time) * 1000)::bigint as "timestamp"
        FROM plan_settlements
        ORDER BY block_time DESC
        LIMIT 50;
      `;

      return NextResponse.json({
        success: true,
        summary: totals[0] || { totalSettlements: 0, totalEarnedNet: "0.00", totalGrossBilled: "0.00" },
        byPlan: {},
        events: recentEvents,
      });
    }

    // Aggregates grouped by plan_address
    const byPlanRows = await sql`
      SELECT 
        plan_address as "planAddress",
        COUNT(*) FILTER (WHERE kind IN ('settled', 'subscribed'))::int as "totalSettlements",
        COALESCE(SUM(amount_net_usdc) FILTER (WHERE kind IN ('settled', 'subscribed')), 0)::numeric as "totalEarnedNet",
        COALESCE(SUM(amount_gross_usdc) FILTER (WHERE kind IN ('settled', 'subscribed')), 0)::numeric as "totalGrossBilled"
      FROM plan_settlements
      WHERE plan_address = ANY(${addresses})
      GROUP BY plan_address;
    `;

    const byPlan: Record<string, { totalSettlements: number; totalEarnedNet: string; totalGrossBilled: string }> = {};
    let totalSettlements = 0;
    let totalEarnedNetNum = 0;
    let totalGrossBilledNum = 0;

    for (const row of byPlanRows) {
      const net = parseFloat(row.totalEarnedNet) || 0;
      const gross = parseFloat(row.totalGrossBilled) || 0;
      const count = Number(row.totalSettlements) || 0;

      byPlan[row.planAddress] = {
        totalSettlements: count,
        totalEarnedNet: net.toFixed(2),
        totalGrossBilled: gross.toFixed(2),
      };

      totalSettlements += count;
      totalEarnedNetNum += net;
      totalGrossBilledNum += gross;
    }

    const events = await sql`
      SELECT 
        signature,
        plan_address as "planAddress",
        plan_name as "planName",
        subscriber,
        kind,
        label,
        amount_gross_usdc::text as "amountGrossUsdc",
        amount_net_usdc::text as "amountNetUsdc",
        keeper_fee_usdc::text as "keeperFeeUsdc",
        FLOOR(EXTRACT(EPOCH FROM block_time) * 1000)::bigint as "timestamp"
      FROM plan_settlements
      WHERE plan_address = ANY(${addresses})
      ORDER BY block_time DESC
      LIMIT 100;
    `;

    return NextResponse.json({
      success: true,
      summary: {
        totalSettlements,
        totalEarnedNet: totalEarnedNetNum.toFixed(2),
        totalGrossBilled: totalGrossBilledNum.toFixed(2),
      },
      byPlan,
      events,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load settlements";
    console.error("[API] GET /api/settlements error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/settlements - batch upsert settlements from on-chain sync
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events: SettlementPayloadEvent[] = Array.isArray(body?.events) ? body.events : [];

    if (events.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    let inserted = 0;
    for (const e of events) {
      if (!e.signature || !e.planAddress) continue;

      const gross = parseFloat(String(e.amountGrossUsdc || "0")) || 0;
      const net = parseFloat(String(e.amountNetUsdc || "0").replace("+", "")) || 0;
      const fee = parseFloat(String(e.keeperFeeUsdc || "0")) || 0;
      const blockTime = e.timestamp ? new Date(e.timestamp) : new Date();

      await sql`
        INSERT INTO plan_settlements (
          signature,
          plan_address,
          plan_name,
          subscriber,
          kind,
          label,
          amount_gross_usdc,
          amount_net_usdc,
          keeper_fee_usdc,
          block_time
        ) VALUES (
          ${e.signature},
          ${e.planAddress},
          ${e.planName || null},
          ${e.subscriber || null},
          ${e.kind || "settled"},
          ${e.label || "On-chain Settlement"},
          ${gross},
          ${net},
          ${fee},
          ${blockTime}
        )
        ON CONFLICT (signature) DO UPDATE SET
          kind = EXCLUDED.kind,
          label = EXCLUDED.label,
          amount_gross_usdc = EXCLUDED.amount_gross_usdc,
          amount_net_usdc = EXCLUDED.amount_net_usdc,
          keeper_fee_usdc = EXCLUDED.keeper_fee_usdc,
          plan_name = COALESCE(EXCLUDED.plan_name, plan_settlements.plan_name),
          subscriber = COALESCE(EXCLUDED.subscriber, plan_settlements.subscriber);
      `;
      inserted++;
    }

    return NextResponse.json({ success: true, count: inserted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save settlements";
    console.error("[API] POST /api/settlements error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
