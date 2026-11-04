#!/usr/bin/env bash
# Builds and validates the NEAR Hackathon submission payload, prints it, and only POSTs with --send.
# Every value comes from the environment (nothing personal is stored in the repo):
#   LEAD_NAME EMAIL SIZE TRACKS NEAR_ADDRESS PROJECT_URL DEMO_URL IDEA
#   CONSENT=yes  (set only after the lead agreed to the hackathon contact notice)
# Optional: REQUEST_ID (reuse the same one on retries). Submissions cannot be edited, so send once the
# repo is public and the demo post is up. Window: 2026-11-01 to 2026-11-14T23:59Z.
set -euo pipefail

for v in LEAD_NAME EMAIL SIZE TRACKS NEAR_ADDRESS PROJECT_URL DEMO_URL IDEA; do
  [ -n "${!v:-}" ] || { echo "Missing $v" >&2; exit 1; }
done

[ "${CONSENT:-}" = "yes" ] || { echo "Set CONSENT=yes only after the lead agreed to the contact notice" >&2; exit 1; }

REQUEST_ID="${REQUEST_ID:-$(uuidgen | tr 'A-Z' 'a-z')}"
PAYLOAD_FILE="$(mktemp -t near_hackathon_submission)" # outside the repo: contains personal data

export REQUEST_ID PAYLOAD_FILE
node --input-type=module -e '
import { writeFileSync } from "node:fs";
const e = process.env;
const p = {
  requestId: e.REQUEST_ID,
  projectName: e.PROJECT_NAME || "TidePay",
  leadName: e.LEAD_NAME,
  email: e.EMAIL,
  size: e.SIZE,
  tracks: e.TRACKS.split(",").map((t) => t.trim()),
  nearAddress: e.NEAR_ADDRESS,
  projectUrl: e.PROJECT_URL,
  demoUrl: e.DEMO_URL,
  idea: e.IDEA,
  consent: true,
};
const TRACKS = ["defi","thesis","privacy","business","swarms","security","agents","realworld","games","nfts","memecoins","social","open"];
const errs = [];
const len = (s, a, b) => s.length >= a && s.length <= b;
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(p.requestId)) errs.push("requestId must be a UUID");
if (!len(p.projectName, 2, 80)) errs.push("projectName 2-80 chars");
if (!len(p.leadName, 2, 80)) errs.push("leadName 2-80 chars");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email) || p.email.length > 160) errs.push("email invalid");
if (!["1","2 - 4","4 - 6","6 - 8","8+"].includes(p.size)) errs.push("size must be one of: 1, 2 - 4, 4 - 6, 6 - 8, 8+");
if (!p.tracks.length || new Set(p.tracks).size !== p.tracks.length || p.tracks.some((t) => !TRACKS.includes(t))) errs.push("tracks must be unique ids from the track list");
if (!len(p.nearAddress, 2, 64) || !/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(p.nearAddress)) errs.push("nearAddress invalid");
for (const k of ["projectUrl", "demoUrl"]) if (!/^https?:\/\//.test(p[k]) || p[k].length > 300) errs.push(k + " must be an http(s) URL, max 300 chars");
if (!len(p.idea, 20, 2000)) errs.push("idea 20-2000 chars");
if (errs.length) { console.error("Invalid payload:\n- " + errs.join("\n- ")); process.exit(1); }
writeFileSync(e.PAYLOAD_FILE, JSON.stringify(p, null, 2));
'

echo "Payload (requestId ${REQUEST_ID}) written to ${PAYLOAD_FILE}:"
cat "$PAYLOAD_FILE"; echo

if [ "${1:-}" = "--send" ]; then
  curl -sS -X POST https://nearhackathon.com/api/applications -H 'Content-Type: application/json' -d @"$PAYLOAD_FILE"
  echo
else
  echo "Dry run only. Re-run with --send (and the same REQUEST_ID on retries) to submit."
fi
