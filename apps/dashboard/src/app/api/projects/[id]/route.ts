import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// PATCH /api/projects/[id] - update project plans, environment, or settings
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { planIds, environment, webhookUrl } = body;

    let rows;
    if (planIds !== undefined && environment !== undefined) {
      rows = await sql`
        UPDATE projects
        SET plan_ids = ${JSON.stringify(planIds)},
            environment = ${environment},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, slug, environment, plan_ids as "planIds", updated_at as "updatedAt"
      `;
    } else if (planIds !== undefined) {
      rows = await sql`
        UPDATE projects
        SET plan_ids = ${JSON.stringify(planIds)},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, slug, environment, plan_ids as "planIds", updated_at as "updatedAt"
      `;
    } else if (environment !== undefined) {
      rows = await sql`
        UPDATE projects
        SET environment = ${environment},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, slug, environment, plan_ids as "planIds", updated_at as "updatedAt"
      `;
    } else if (webhookUrl !== undefined) {
      rows = await sql`
        UPDATE projects
        SET webhook_url = ${webhookUrl},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, slug, environment, plan_ids as "planIds", webhook_url as "webhookUrl", updated_at as "updatedAt"
      `;
    }

    return NextResponse.json({
      success: true,
      data: rows?.[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update project";
    console.error("[API] PATCH /api/projects/[id] error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
