# Claptrap completion verification

Date: 2026-09-17
Starting build: `8f9e86f36177f4525edbd80a54650e696405bf95`
Branch: `experiment/granite-single-ort-dual-session`
Published code: `37aef813ac2490a87325dca66377eef41ac4a594`

[Open the verified code build](https://raw.githack.com/NFDFLDTHRY/MochEpoch/37aef813ac2490a87325dca66377eef41ac4a594/experiments/granite-single-ort-dual-session/claptrap-chat/index.html)

## Where work stopped

The branch contained the plan, page, controller, and worker, but no saved run of
the chat build. The successful phone export at `70e3f4e` established simultaneous
CPU/WASM q4 and GPU/WebGPU q4 residency in one worker/runtime. It stopped at
`both-sessions-ready`; it was not a completed conversation export.

The original chat implementation forced a separate retrieval-planning inference
before turns 2 through 100, discarded ordinary speech from that inference, and
gave the speaking call no tool. It also wrote diagnostic JSON to localStorage
but did not restore it on reload. Starting another run reset the saved CSV.

## Implemented boundary

- The same worker, runtime, tokenizer, model revision and q4 backend selection
  remain. There is no CPU substitution for WebGPU.
- Each turn starts with the exact `You are Claptrap.` system message, timestamp,
  newest incoming text, and the native `search_conversation` tool definition.
- A native tool call stops that generation at its closing marker. Deterministic
  code searches the current OPFS CSV and returns the exact matching row values
  through Granite's native tool-response representation. Only then is another
  generation needed. There is no preflight `NO_SEARCH` generation.
- Ordinary generated token IDs accumulate to exactly 100 per conversational
  response. Tool markers/arguments are excluded. The prior build's 96-token tool
  output bound remains local to this fixture. The raw generation ceiling is
  remaining speech tokens + 96; a stopping criterion ends sooner at 100 speech
  tokens or a tool boundary. EOS is suppressed within that finite call bound.
  The standard `min_new_tokens=max_new_tokens=100` shape could not count native
  tool tokens separately; this implementation makes the requested speech/tool
  distinction explicit instead of adding an unconditional inference.
- Malformed/truncated tool output is saved as evidence and fails the turn. There
  is no repair, synthetic model fallback, transcript injection, query rewriting,
  semantic retrieval, search-result cap, or behavioral correction.
- Messages/tensors/cache inputs are fresh per turn. Native tool continuation may
  include only the current turn's expression and its explicit retrieval results.
  No prior turn's messages or cache are supplied.
- CSV commits before the next seat starts. Diagnostics are stored separately in
  OPFS JSON. Reload restores both for inspection/export, without calling a model.
  Existing conversation rows prevent Start until explicitly cleared.
- Completion checks 100 sequential turns, strict alternation, 50 per backend,
  100 conversational tokens per response, CSV/evidence agreement, and exact
  latest-message propagation. `Welcome to the Zoo` is input, never a saved turn.

## Executed local checks

Run:

```sh
node experiments/granite-single-ort-dual-session/claptrap-chat/checks.mjs
```

Results: `evidence/local-checks.json`.

These are explicitly **synthetic plumbing checks**, including a controlled
100-turn controller run in each seed order. They establish code-path behavior
under the supplied test doubles, not real Granite generation or mobile OPFS.

Also rendered the pinned model's actual Jinja template with
`@huggingface/jinja@0.5.10`, and exercised the actual Transformers.js 4.3.0
StoppingCriteria/StoppingCriteriaList implementation. Native tool-call history
and tool results serialized successfully. See `evidence/pinned-template-check.json`.

Inspected `@huggingface/transformers@4.3.0` from its npm tarball:
`src/models/modeling_utils.js` disposes its final DynamicCache when neither
`past_key_values` nor `return_dict_in_generate` requests retaining it. This
worker does not supply `past_key_values` and explicitly uses
`return_dict_in_generate: false`, then disposes its input/output tensors.
This source trace supports successful-call cleanup; it is not a GPU-memory
measurement or evidence of a completed device run.

## Real browser observation and remaining gate

The original build executed in the available cloud Chrome browser, loaded the
CPU q4 session, then failed WebGPU session creation with `Failed to get GPU
adapter`. Selected exact visible events are retained in
`evidence/original-cloud-browser-startup.json`.

The corrected published build also executed in that browser. The final code
build loaded its CPU q4 session in 4502.5 ms, then encountered the same WebGPU
adapter error. The GPU label changed to `failed to load`. After reload, the
saved error and all eight non-progress events from that attempt appeared in
the page again, with zero saved conversational turns. The exact selected
observations and comparison are in `evidence/corrected-cloud-browser-check.json`.

The evidence download control was clicked on the corrected build; browser
automation received no download event within 15 seconds. Download delivery is
therefore unverified in this environment. This is recorded separately from
the successful OPFS diagnostic restoration; no downloaded full run file is
claimed by the browser observation record.

That browser limitation is separate from the user's successful phone residency
run. It was not used to alter the runtime topology or switch the GPU seat to CPU.

**A real 100-turn conversation on the target device remains unverified.** No
behavioral result, completed CPU/GPU conversation, or end-to-end experiment pass
is claimed by these checks. Run the commit-pinned chat page on the working phone
path, then preserve Download conversation CSV and Download evidence JSON. If a
call or save fails, retain those files before clearing the run.

The architecture lock and current `main` are unchanged.

## Crash isolation probe (2026-09-17)

Approved proposal: `20260917-claptrap-crash-isolation`, recorded in
`scratchpad/WORK.md` at `e230cd6e91cc28f5c7306c4ae87d56e52b3266f6`.
The user approved implementation in the active Work conversation.

The exact phone exports are retained as `evidence/phone-precrash-20260917.json`
and `.csv`. They show one completed 100-token GPU turn and CPU turn 2 starting
with 351 input tokens. The later supplied screenshot shows Chrome's Aw, Snap
page. The exports predate the crash and do not identify its final phase or
cause. The reported 575,914,563 model-file bytes per session are not a RAM
measurement.

The actual rendered system message includes the native template's tool-use
instructions after `You are Claptrap.`, including generic helpful-assistant
framing. The earlier statement about an exact effective system prompt was too
strong. This probe preserves the recorded template unchanged. The generated
weather identity and invented second tool were absent from the supplied input.

`stability.html` is a separate diagnostic surface. On fresh page loads it runs:

1. CPU alone, replaying the recorded CPU turn-2 input.
2. Both q4 sessions resident, replaying the identical CPU input.
3. Both q4 sessions resident, running the recorded GPU turn-1 input before
   replaying that identical CPU input. The new GPU speech does not replace it.

Every replay verifies its messages, rendered prompt, and input-token count
before inference. The CPU can retrieve only the original CSV row, under the
existing search rules; the GPU warmup has no older rows. No full transcript is
automatically supplied. Normal chat initialization still loads both sessions.

The diagnostic worker waits for a successful OPFS write acknowledgement before
model loading and each generation. It reports the first token and every ten
raw tokens, generation return, and completion of existing input/output tensor
disposal. Token-progress posts are best-effort. Missing progress is not proof
that no tokens were computed. Checkpoint writes affect timing, so this is not
a speed benchmark. Memory APIs unavailable in the worker are reported as
unavailable; tensor disposal does not measure physical memory reclamation.

Diagnostic files have unique names in a separate OPFS directory. Reload lists
them without loading a model. The chat's conversation and evidence files are
never opened for writing by the diagnostic controller. An unfinished restored
trial is labeled interrupted/unfinished, not assigned an invented crash cause.

Eighteen synthetic checks pass, including checkpoint gating and save failure,
prompt mismatch, all three fixed-input trials, explicit retrieval, restoration,
and preservation of the chat files. These checks are not real model inference.
Executed results are in `evidence/stability-checks-20260917.json`; browser and
target-device results will be added only after execution.
