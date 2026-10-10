import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export interface ProjectRecord {
  id: string;
  name: string;
  slug: string;
  environment: "sandbox" | "live";
  planIds: string[];
  merchantWallet?: string | null;
  webhookUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// GET /api/projects?wallet=<walletAddress> - list projects scoped strictly to the merchant's wallet
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const rows = await sql`
      SELECT id, name, slug, environment, plan_ids as "planIds", merchant_wallet as "merchantWallet", webhook_url as "webhookUrl", created_at as "createdAt", updated_at as "updatedAt"
      FROM projects
      WHERE merchant_wallet = ${wallet}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch projects";
    console.error("[API] GET /api/projects error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/projects - create new project in Neon Postgres scoped to merchantWallet
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, slug, environment = "sandbox", planIds = [], merchantWallet } = body;

    if (!id || !name || !slug) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id, name, slug" },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO projects (id, name, slug, environment, plan_ids, merchant_wallet)
      VALUES (${id}, ${name}, ${slug}, ${environment}, ${JSON.stringify(planIds)}, ${merchantWallet || null})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        environment = EXCLUDED.environment,
        merchant_wallet = COALESCE(EXCLUDED.merchant_wallet, projects.merchant_wallet),
        updated_at = NOW()
      RETURNING id, name, slug, environment, plan_ids as "planIds", merchant_wallet as "merchantWallet", created_at as "createdAt"
    `;

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create project";
    console.error("[API] POST /api/projects error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
