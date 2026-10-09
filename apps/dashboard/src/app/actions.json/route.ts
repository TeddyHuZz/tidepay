import { actionResponse, actionsOptions } from "@/lib/actions/http";
import type { ActionsJson } from "@/lib/actions/types";

// Maps shareable URL slugs to Action API routes so Blink clients can
// unfurl links such as https://<domain>/subscribe/<planId>.
const RULES: ActionsJson = {
  rules: [
    { pathPattern: "/subscribe/*", apiPath: "/api/actions/subscribe/*" },
    { pathPattern: "/api/actions/**", apiPath: "/api/actions/**" },
  ],
};

export async function GET() {
  return actionResponse(RULES);
}

export const OPTIONS = actionsOptions;
