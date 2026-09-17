# Claptrap retrieval call followed by response call

proposal_id: 20260917-claptrap-two-call-turn
status: PROPOSED
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
base_commit: 11be0cd3bc3c0aeca4f02d9754c4133f1274870b

## User direction and evidence

The user now specifies that each seat runs twice and only the second output is
recorded as its conversational response. This follows the installed-phone run
where five completed turns generated tooling narration, zero native searches
occurred, and the operator deliberately stopped. The previous proposed removal
of generic template wording is superseded. IBM's native tool instructions stay
available to the retrieval call.

The user's direction defines this exact operation, following their earlier
instruction to put the plan in the repo and proceed with the repair. Publish
this plan before implementing the specified two-call turn; no new service,
hosting, model, dependency, architectural lock change, or additional approval
request is needed. This is a local experiment contract, not a universal game
pipeline. Current main's blueprint blob matches the lock:
5a3e9ae1a5e0d3bcc058ffab599c7cb8d65f0945.

## Exact operation

1. On each fresh turn, call the active resident model to generate a retrieval
   query for the seed or previous seat's latest plain-text reply. Keep Granite's
   native tool schema/format. Supply an explicit retrieval-only request and, if
   needed, a recorded native assistant prefix selecting the sole required tool;
   Granite must generate the query words itself. Keep all first-call material
   in machine evidence, never the conversation CSV.
2. Execute the existing deterministic CSV search. Preserve the at-least-three-
   word check, all-word matching, original matching rows, and deterministic
   invalid-query result. No query rewriting, automatic retries, semantic search,
   transcript injection, or made-up memory. Search even when CSV is empty.
3. Call the same resident model again with exactly `You are Claptrap.` as the
   actor system, the unchanged timestamp/incoming message, this turn's native
   tool request and its actual result. This is the response call, so do not
   advertise another available tool or append retrieval-task instructions to
   its system/user message. Keep the native tool-result serialization.
4. Generate exactly 100 response tokens; only this second call's decoded output
   is shown, saved to CSV, and passed to the other seat. Keep both calls in JSON
   evidence with explicit retrieval/response labels. A malformed/truncated first
   call or a second call requesting another tool fails visibly without a fake
   response. Invalid but parseable queries return the existing deterministic
   error to the response call.
5. Retain fresh inputs/no carried KV, one worker/runtime/tokenizer, simultaneous
   CPU/GPU residency, alternating generation, four-thread phone configuration,
   persistence checkpoints and origin ownership. A complete run is 100 replies,
   50 per seat, and 200 generation calls; the seed counts as zero.

## Files and why

Within experiments/granite-single-ort-dual-session/claptrap-chat:
- runtime-worker.js: two-call turn, phase evidence and failure boundaries;
  preserve the old fixed-input diagnostic replay explicitly.
- main.js, index.html: phase labels, evidence contract and response-only counts.
- turn-boundary.js: verify the two-call contract for new completed conversations.
- checks.mjs, repair-checks.mjs if needed: meaningful boundary/failure checks.
- stability.js, stability.html: one explicitly labeled CPU two-call probe through
  the same new worker path for this cloud browser without a WebGPU adapter;
  retain old replay trials as old replay trials, not the new conversation.
- sw.js: update the shell cache version for changed installed code.
- VERIFICATION.md and evidence/two-call-turn-20260917.json: executed results,
  exact public-safe exports, hashes, and limitations.
Also update the experiment's GRANITE_CLAPTRAP_CONVERSATION_EXPERIMENT_PLAN.md
with this explicit user-directed change and scratchpad/WORK.md with status.

## Verification and limits

Run existing checks plus: only call 2 reaches CSV; call 1 query/results feed call
2; original incoming message remains exact; zero-match/invalid searches remain
factual; malformed calls stop without a row; no query material/cached context
leaks into the next turn; both seed choices still complete 50/50 in synthetic
plumbing; new exports and reload retain both call records. Render actual native
prompts with the pinned tokenizer, then exercise real CPU two-call generation
through the diagnostic UI and save the export. Publish the actual 100-turn page
on the existing branch. Full dual-session execution still requires the phone if
this cloud browser cannot obtain a WebGPU adapter. Two calls establish a clean
recording boundary, not a guarantee that Granite's second answer is sensible.
