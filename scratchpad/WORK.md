# Current Work result

proposal_id: 20260915T020507Z-csv-read-projection
status: COMPLETE
implementation_base: e4084c5be65629e677eeb4c14cffd908f8f24cd9
implementation_commit: 4ad423fdc3735553c02c4bbaace999b655d26e8e
result_branch: main

The user explicitly approved this proposal in the active Work conversation, clarifying that temporary parsing/inspection values are computation and must not be retained. The implementation follows that clarification.

## Actual changes

- `app.js`: removed `activeWorld` and the parsed index/record Maps. The `CSV` class contains only static functions, with no fields or instances. CSV reads and decoded values stay within the calling operation. The existing display reads those functions, and every indexed file is checked before the world is revealed.
- `evidence/read-render.md`: appended the correction's commands, source identity, observed results, and limits; preserved all earlier evidence.
- `README.md`: changed only Current status to reflect the correction and remaining verification.
- `scratchpad/WORK.md`: recorded this completed result.

No other repository files changed. The committed seed, dependencies, and hosting configuration are unchanged.

## Actual checks and evidence

Run: 2026-09-15, 02:21 UTC; Node.js v24.19.0 and Python 3.12.14.

- `node --check app.js`: PASS.
- Original seed: all six CSVs and ten referenced key/value lookups matched Python's CSV reader, including the quoted prompt/schema strings; stone holder was Ada.
- Changed holder: changing only the disposable stone CSV to player was observed using the same class and execution context; independent comparisons passed.
- Missing reference: removing the disposable stone CSV produced `world/objects/stone.csv: HTTP 404`.
- Restoration: the restored seed returned Ada with both the reused class and a fresh execution context; the fresh context's full comparisons passed.
- Source and class-member inspection: no retained parsed world or class-owned facts; no fields appeared across calls.
- Scope check: tested `app.js` bytes preserved, README edits confined to Current status, earlier evidence preserved, all other repository files unchanged.

Implementation: [4ad423f](https://github.com/NFDFLDTHRY/MochEpoch/commit/4ad423fdc3735553c02c4bbaace999b655d26e8e).
Evidence: [CSV correction run](https://github.com/NFDFLDTHRY/MochEpoch/blob/4ad423fdc3735553c02c4bbaace999b655d26e8e/evidence/read-render.md#csv-backing-state-correction-2026-09-15-0221-utc).

## Failure or unresolved blocker

No unexpected failure occurred in the scoped checks. Browser entry-point execution and visible rendering were not tested. The previously recorded localhost browser-policy rejection and private-repository GitHack delivery failure were not retested. The three real Chrome checks remain unverified.

This operation did not establish the first-person 3D client, Granite, Witness, gameplay mutation, or persistence.

## Smallest next operation

Finish the three existing real Chrome read/resolve/render checks once an authorized reachable test surface is available. Selecting a different delivery service or changing source visibility is outside this completed proposal.
