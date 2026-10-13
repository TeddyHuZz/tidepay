#!/bin/bash
# Vercel Ignored Build Step Script
# In Vercel: exit 1 = Proceed with build; exit 0 = Skip/Cancel build.

echo "🔍 Checking VERCEL_GIT_COMMIT_REF: '${VERCEL_GIT_COMMIT_REF}'..."

if [ "$VERCEL_GIT_COMMIT_REF" = "master" ] || [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  echo "✅ Push is on production branch ($VERCEL_GIT_COMMIT_REF). Proceeding with build."
  exit 1
else
  echo "🛑 Branch '$VERCEL_GIT_COMMIT_REF' is a preview/side branch. Skipping build."
  exit 0
fi
