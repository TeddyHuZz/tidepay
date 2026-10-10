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

// GET /api/projects - list all projects from Neon Postgres
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, slug, environment, plan_ids as "planIds", merchant_wallet as "merchantWallet", webhook_url as "webhookUrl", created_at as "createdAt", updated_at as "updatedAt"
      FROM projects
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

// POST /api/projects - create new project in Neon Postgres
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, slug, environment = "sandbox", planIds = [] } = body;

    if (!id || !name || !slug) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id, name, slug" },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO projects (id, name, slug, environment, plan_ids)
      VALUES (${id}, ${name}, ${slug}, ${environment}, ${JSON.stringify(planIds)})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        environment = EXCLUDED.environment,
        updated_at = NOW()
      RETURNING id, name, slug, environment, plan_ids as "planIds", created_at as "createdAt"
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
