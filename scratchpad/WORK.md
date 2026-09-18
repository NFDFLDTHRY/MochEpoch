# Claptrap: separate retrieval and response system prompts

proposal_id: 20260917-claptrap-separate-system-prompts
status: IN_PROGRESS
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
base_commit: 9d9562d62da62fe9455f42ff5b8530b52a9ebccc
code_commit: 513117267504e2702bddf0d26eb86d5fa1d5da90

## Authorization and observed failure

The user proposed a retrieval-only system instruction to choose three words from
the incoming text, followed by a separate Claptrap response system instruction.
Work described this exact prompt split. The user now says, "Yeah let's fix it
because this happens on last creation." This actively approves that specific
repair. Publish this proposal before implementing it; no repeated approval gate
is needed. This is an experiment-local prompt change, not a game architecture
revision. Current main's blueprint blob still matches the lock:
5a3e9ae1a5e0d3bcc058ffab599c7cb8d65f0945.

The screenshot shows one saved CPU reply and then a retrieval call missing its
native closing marker. No raw export of that failed call accompanied it. The
worker termination and "not resident" labels follow the harness error; they do
not establish a GPU/device-loss or memory failure. The earlier real CPU probe
also produced a one-word query and responses fixated on timestamps.

## Exact operation

1. Retrieval system: `Select three words from the supplied message. Call
   search_conversation with those words separated by spaces. Do not compose a
   conversational reply.` Give this call the original incoming text, the native
   tool schema and existing explicit assistant prefix. Timestamp metadata is not
   part of the message from which it selects search words.
2. Response system: `You are Claptrap. Respond to the incoming message.` Keep the
   original incoming text and timestamp, the native tool request, and the exact
   deterministic CSV result. Only call 2 becomes displayed/saved speech.
3. Preserve both resident models, shared runtime/tokenizer, fresh inputs, native
   serialization, 96-token retrieval allowance, 100-token response, two calls per
   completed turn, 50/50 alternation, CSV authority and existing checkpoints.
   Keep the at-least-three-word search validation; do not fabricate, rewrite or
   retry a malformed query. Retain the previous exact prompt for legacy replay.
4. Make missing-marker failures identify the observed output length and last
   token. Preserve the raw output. Do not silently append a marker or count a
   failed retrieval as a response. Record both system prompts in evidence and
   show the changed response prompt on the page.

## Files and verification

Within experiments/granite-single-ort-dual-session/claptrap-chat:
- runtime-worker.js: split prompts, preserve legacy replay, boundary diagnostics.
- main.js and index.html: accurate prompt metadata and visible conditions.
- checks.mjs: actual message boundaries and malformed-retrieval assertions.
- sw.js: shell cache version for changed installed code.
- VERIFICATION.md and evidence/separate-prompts-20260917.json: executed checks,
  public-safe real generation export, source hashes, and remaining limitations.
Also amend GRANITE_CLAPTRAP_CONVERSATION_EXPERIMENT_PLAN.md to record the user's
new prompt instruction and update this scratchpad with the outcome.

Run existing synthetic checks with assertions on both actual system prompts,
input separation, exact tool result, and failure preservation. Run the existing
real two-turn CPU diagnostic through the same worker and record its actual
queries, closure, responses, CSV and reload behavior. Inspect the installed-app
entry point. The full alternating CPU/GPU run needs the phone if this browser
still lacks a WebGPU adapter. Prompt compliance and phone endurance are not
guaranteed by a CPU-only probe; the screenshot alone cannot establish why that
particular retrieval omitted its closing marker.

## Executed prompt correction within this repair

The first real run of 5131172 completed both turns, but the retrieval query copied
the native template's generic assistant preface (23 words), and its response
echoed that text. The next query had 29 words. Both native calls closed, so this
is different from the phone's missing-marker failure. The rendered prompt proves
that supplying the dedicated system still appends a competing generic assistant
role through the native tools template.

Continue this same approved prompt repair by omitting only those two generic
assistant-role sentences from the retrieval call's template. Retain all native
role markers, tools/schema, JSON instructions, call prefix and result formatting.
Use the pinned template with an explicit per-call override, record the adjustment,
and preserve the untouched template for legacy replay. This adds no inference,
query repair, behavior filtering, schema change, model, service or dependency.
Retain both real exports and distinguish what each run established.

The next real run still generated self-description as its first query. The
response repeated that query text, which the prior implementation explicitly
supplied as an assistant tool call and again inside its result metadata. Complete
the user's proposed independent response input: supply retrieved CSV rows and any
factual retrieval error, plus the original timestamp/incoming message. Keep the
first query/native call and full result in evidence only. This is a scoped fresh
response generation rather than a continuation of the retrieval conversation.
The native tool schema and calling format remain in call 1. This supersedes the
proposal's earlier inclusion of the native request in call 2, which the executed
case showed continued to carry first-pass language into the response context.
