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
    const {
      planIds,
      environment,
      webhookUrl,
      secretKey,
      publishableKey,
      signingSecret,
      name,
      payoutWallet,
      customRpcUrl,
      customDevnetRpcUrl,
      customMainnetRpcUrl,
      explorer,
      gracePeriodHours,
    } = body;

    const newSettings =
      customRpcUrl !== undefined ||
      customDevnetRpcUrl !== undefined ||
      customMainnetRpcUrl !== undefined ||
      explorer !== undefined ||
      gracePeriodHours !== undefined
        ? JSON.stringify({
            ...(customRpcUrl !== undefined && { customRpcUrl }),
            ...(customDevnetRpcUrl !== undefined && { customDevnetRpcUrl }),
            ...(customMainnetRpcUrl !== undefined && { customMainnetRpcUrl }),
            ...(explorer !== undefined && { explorer }),
            ...(gracePeriodHours !== undefined && { gracePeriodHours }),
          })
        : null;

    const rows = await sql`
      UPDATE projects
      SET plan_ids = COALESCE(${planIds !== undefined ? JSON.stringify(planIds) : null}::jsonb, plan_ids),
          environment = COALESCE(${environment ?? null}, environment),
          webhook_url = COALESCE(${webhookUrl ?? null}, webhook_url),
          secret_key = COALESCE(${secretKey ?? null}, secret_key),
          publishable_key = COALESCE(${publishableKey ?? null}, publishable_key),
          signing_secret = COALESCE(${signingSecret ?? null}, signing_secret),
          name = COALESCE(${name ?? null}, name),
          payout_wallet = COALESCE(${payoutWallet ?? null}, payout_wallet),
          settings = COALESCE(settings, '{}'::jsonb) || ${newSettings ? newSettings : "{}"}::jsonb,
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, slug, environment, plan_ids as "planIds", merchant_wallet as "merchantWallet", payout_wallet as "payoutWallet", webhook_url as "webhookUrl", secret_key as "secretKey", publishable_key as "publishableKey", signing_secret as "signingSecret", settings, updated_at as "updatedAt"
    `;

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

// DELETE /api/projects/[id] - delete a project
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await sql`DELETE FROM projects WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete project";
    console.error("[API] DELETE /api/projects/[id] error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
