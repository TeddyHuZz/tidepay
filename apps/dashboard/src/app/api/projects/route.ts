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
  secretKey?: string | null;
  publishableKey?: string | null;
  signingSecret?: string | null;
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
      SELECT id, name, slug, environment, plan_ids as "planIds", merchant_wallet as "merchantWallet", webhook_url as "webhookUrl", secret_key as "secretKey", publishable_key as "publishableKey", signing_secret as "signingSecret", created_at as "createdAt", updated_at as "updatedAt"
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
    const {
      id,
      name,
      slug,
      environment = "sandbox",
      planIds = [],
      merchantWallet,
      webhookUrl,
      secretKey,
      publishableKey,
      signingSecret,
    } = body;

    if (!id || !name || !slug) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id, name, slug" },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO projects (id, name, slug, environment, plan_ids, merchant_wallet, webhook_url, secret_key, publishable_key, signing_secret)
      VALUES (
        ${id},
        ${name},
        ${slug},
        ${environment},
        ${JSON.stringify(planIds)},
        ${merchantWallet || null},
        ${webhookUrl || null},
        ${secretKey || null},
        ${publishableKey || null},
        ${signingSecret || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        environment = EXCLUDED.environment,
        merchant_wallet = COALESCE(EXCLUDED.merchant_wallet, projects.merchant_wallet),
        webhook_url = COALESCE(EXCLUDED.webhook_url, projects.webhook_url),
        secret_key = COALESCE(EXCLUDED.secret_key, projects.secret_key),
        publishable_key = COALESCE(EXCLUDED.publishable_key, projects.publishable_key),
        signing_secret = COALESCE(EXCLUDED.signing_secret, projects.signing_secret),
        updated_at = NOW()
      RETURNING id, name, slug, environment, plan_ids as "planIds", merchant_wallet as "merchantWallet", webhook_url as "webhookUrl", secret_key as "secretKey", publishable_key as "publishableKey", signing_secret as "signingSecret", created_at as "createdAt"
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
