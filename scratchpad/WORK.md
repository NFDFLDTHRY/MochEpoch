# IterOne Pass 1 — Granite browser call

proposal_id: 20260925T045541Z-iterone-pass1-granite-call
status: PROPOSED
repository: NFDFLDTHRY/MochEpoch
branch: predev
base_commit (GitHub predev): f790c39ae3df1a9d8b6cb2cb67a0ff7597cb1cdc

## Question and determination

Can one pinned Granite 4.0 350M browser configuration complete a fresh, single-call Ada fixture and return exactly one usable JSON action on the Linux laptop?

Pass 1 is complete only after actual model generation, generated-only decoding, and fixture-local parsing produce exactly `{"action":"hand_over"}` or `{"action":"wait"}` on an explicitly recorded backend. Loading weights, seeing a GPU adapter, or passing synthetic checks is not completion.

```
literal Ada/stone fixture JSON
        ↓ Granite's pinned chat template and tokenizer
one Granite q4 browser session → generated-only tokens/text
        ↓ fixture-local JSON parse
one action or a saved failure record
```

## Basis and boundary

- Current `main` is `214c0c66faaf4b778b05439760ff66654d688ddf`. The locked `docs/GAME_BLUEPRINT.md` blob is `5a3e9ae1a5e0d3bcc058ffab599c7cb8d65f0945`, matching `docs/ARCHITECTURE_LOCK.json` on `main` and `predev`.
- The existing experiment branch at `b56215858213fe411969e40ece6284d1a7b45a84` supplies a proven runtime reference: `@huggingface/transformers@4.3.0`, `onnx-community/granite-4.0-350m-ONNX-web` revision `6c9a6f61601df51e76b1efff0974d8d26c2a25b5`, dtype `q4`, and observed `onnx/model_q4.onnx` plus `onnx/model_q4.onnx_data`. Its real phone runs establish model generation, but no Ada JSON action.
- Use a literal copy of the seed facts and interaction prompt for this probe: one room; Ada and player are in the room; Ada holds the stone; the player says “Please hand me the stone.” Include the seed fixture's `hand_over | wait` JSON schema. Record the exact system/user messages and rendered model input. This call does not read or write world CSV; scoped Witness construction begins in Pass 2. This literal probe does not define a universal packet shape.

## Proposed implementation, after review

1. Add `experiments/iterone-ada-granite-call/index.html`: a minimal page with backend selection, one Run control, visible load/generation/result/error state, and evidence download.
2. Add `experiments/iterone-ada-granite-call/main.js`: start one worker and one call per click; collect exact attempt records and expose their download. Never use prior generated messages as the next call's input.
3. Add `experiments/iterone-ada-granite-call/runtime-worker.js`: adapt only pinned model loading, native chat-template application, tokenization, bounded greedy generation, generated-token slicing/decoding, timing, and tensor cleanup from the experiment. Load one `q4` session for the selected backend. Pin tokenizer resource discovery to the same model revision. For a WASM attempt use explicit single-thread settings (`simd: "fixed"`, `numThreads: 1`, `proxy: false`); do not inherit the Claptrap shared-memory/isolation gate. Start with `do_sample: false`, `max_new_tokens: 64`, no forced minimum, `return_dict_in_generate: false`, and no supplied prior messages or `past_key_values`. Record the effective settings and ONNX Runtime version if exposed.
4. After an actual run, add `evidence/IterOne-pass1-granite-call.json` with all attempts and a concise pass/fail judgment. Inspect the export before committing it. Update this `scratchpad/WORK.md` with the observed result and exact commit.

No changes are proposed to `world/`, root `index.html` or `app.js`, the existing Granite experiments/evidence, package dependencies, hosting, `scratchpad/REVIEW.md`, or the locked blueprint and lock file. Do not bring over Claptrap's two resident sessions, retrieval/tool protocol, forced 100-token reply, OPFS conversation, or character dialogue. No game mechanic or CSV mutation occurs in Pass 1.

## Run, evidence, and failure check

- Serve the `predev` repository at a stable local HTTP origin and use the actual Linux browser. Attempt WebGPU `q4` explicitly. If the adapter or graph fails, keep that failed attempt and run WASM `q4` as a separately labeled configuration; never silently substitute one backend for the other. A WASM pass establishes only the WASM path.
- For each attempt save the page/code commit, browser and OS, model/runtime revision, selected backend/dtype and observed files, literal input JSON, system/user messages, rendered chat-template text, input and generated token counts, generated-only token IDs, raw and parsed decoded text, load/generation times, parser decision, and error or first failing boundary. Decode the generated portion rather than the full prompt. Preserve the raw decode with special tokens; for parsing, remove only a terminal EOS token identified by the pinned tokenizer, then trim whitespace. Any other marker or surrounding text fails. The fixture-local check must accept one `action` with value `hand_over` or `wait` and reject duplicate or extra keys; do not add a general JSON validation layer or repair output.
- Close/reload the page and repeat once with the same configuration. Record cache/load behavior and whether the call still completes. Preserve failures. Do not resample until a favorable action appears or claim a phone/WebGPU result from a laptop WASM run.
- Gate passes when a fresh Linux browser session and its reload attempt each complete the pinned call and return a fixture-valid JSON action on the same explicitly named backend. If either fails, keep the gate open, isolate download, model load, backend execution, completion, decoding, or JSON compliance, and change only one relevant factor in a new labeled attempt.

## Unresolved risks and next boundary

Linux WebGPU availability, model transfer/cache behavior, and Granite's bare-JSON compliance are unproven for this fixture. The experiment's q4f16 candidate is a different graph and is outside this proposal. After Pass 1, Pass 2 can replace the literal fixture with a Witness call from the active CSV package; this proposal does not implement that step.

Stop after publishing this proposal. Implementation awaits a matching `scratchpad/REVIEW.md` approval or the user's explicit instruction in the active conversation to proceed with this proposal.
