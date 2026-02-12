# Nad.fun Integration Notes (Legacy Reference)

This folder is a legacy documentation artifact.

## Current implementation source of truth

Nad.fun token launch flow is implemented in `web/`, not here.

Primary code paths:

- `web/src/components/actions/TokenizePanel.tsx`
- `web/src/lib/nadfun/client.ts`
- `web/src/lib/nadfun/constants.ts`
- `web/src/app/api/nadfun/image/route.ts`
- `web/src/app/api/nadfun/metadata/route.ts`
- `web/src/app/api/nadfun/salt/route.ts`

## Current product behavior

- Image upload to Nad.fun endpoint
- Metadata upload
- Salt generation
- Onchain token creation and linking to agent
- Token status and market-cap style progress display in UI

## Notes

- Do not treat this folder as the active integration spec.
- Keep this folder only for historical context.

