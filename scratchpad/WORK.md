# Android app-switch → return → CSV access diagnostic

proposal_id: 20260918-android-app-switch-csv-access
status: PATCH_READY_FOR_CODEX — local complete patch vs 0ca6f802; Android unverified
repository: NFDFLDTHRY/MochEpoch
base_commit: 0ca6f802ee1d347eb5bacd3fab05717bd16121d7
branch_intent: separate debug branch from experiment/granite-single-ort-dual-session tip

## Evidence

Phone export phone-csv-read-failure-20260918.json: NotFoundError on conversation CSV
read during turn-4 search-request. Reload InvalidStateError (14034.png). Prior
57896a2 fresh-read recovery remains phone-unverified. App-switch causation unproven.

## Beyond existing recovery (synthetic baseline on unpatched tip)

- Transient NotFound during search already recovers via readStoredFile after a no-op
  visibility switch.
- Unpatched recordEvent skips persist when evidenceHandle is null, so requiresSave
  checkpoint ack can fire without durable close after handle invalidation.

## Patch behavior

- Lifecycle diagnostics; drop cached handles on foreground return.
- recordEvent persists when storageState.evidence === "readable"; fresh write
  handles acquired inside evidenceWrites; ack after successful close only.
- Missing files are not recreated on write.
- Synthetic: 48/48 on patched checks.mjs including delayed-write visibility cases.

## Files

- experiments/granite-single-ort-dual-session/claptrap-chat/main.js
- experiments/granite-single-ort-dual-session/claptrap-chat/checks.mjs
- experiments/granite-single-ort-dual-session/claptrap-chat/sw.js (shell v7)
- experiments/granite-single-ort-dual-session/claptrap-chat/evidence/android-app-switch-csv-access-20260918.json
- scratchpad/WORK.md

Unchanged: runtime-worker.js, turn-boundary.js, prompts, two-call protocol, dual residency, locked blueprint.
