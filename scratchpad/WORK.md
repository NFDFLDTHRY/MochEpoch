# IterOne Pass 1 — Granite browser call

proposal_id: 20260925T045541Z-iterone-pass1-granite-call
status: COMPLETE
pass_gate: OPEN
repository: NFDFLDTHRY/MochEpoch
branch: predev

## Actual changes

- Added `experiments/iterone-ada-granite-call/index.html`, `main.js`, and `runtime-worker.js` in commit `5c1d4998415ecaf067df9fbdb4a26063a31ce38e` on `predev`.
- The probe uses the pinned Granite 4.0 350M q4 model and Transformers.js 4.3.0, one explicitly selected backend and one generation call per worker. It records the literal Ada/stone fixture, rendered prompt, generated-only tokens, and exact JSON parser outcome. Browser evidence persists across a reload for export.
- No game CSV, root app, existing experiment, dependency, hosting, locked blueprint, architecture lock, or `scratchpad/REVIEW.md` file changed.

## Ran and observed

- The locked blueprint Git blob still matches the architecture lock. Both JavaScript files passed syntax checks; seven fixture parser cases passed. The remote commit was verified to add only the three named probe files.
- A local HTTP server returned HTTP 200 for the test page. The Codex in-app browser denied opening that same local URL twice before page load because its admin-enforced browser security check could not be verified. The browser reported that this might be temporary and prohibited bypass or indirect workarounds.
- No model module, weights, tokenizer, generation, or JSON output was observed in the Linux browser. No `evidence/IterOne-pass1-granite-call.json` was created because no actual Granite attempt ran.

## Result and next operation

The Pass 1 gate remains open. Restore the browser security check, then open the existing local probe and run WebGPU q4 explicitly; if it fails, save that attempt and run WASM q4 separately. Reload and repeat the successful backend, inspect the exported record, and commit the actual evidence. Do not infer a Granite pass from the code or from the HTTP response.
