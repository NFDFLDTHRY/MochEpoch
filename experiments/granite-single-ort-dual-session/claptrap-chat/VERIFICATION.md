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

### Executed CPU-only replay

Code commit: `7d6d8fb7cfe4299ce1346c5dd73bf6c4151be6a0`.
The published `stability.html` ran in cloud Chrome on 2026-09-17. Its CPU q4
session loaded in 4,829.10 ms. The exact recorded 351-token CPU input matched
before inference. One generation produced 100 conversational tokens in
80,089.30 ms, made no retrieval call, and completed input/output tensor cleanup.
The trial was saved as complete. This is one CPU-only replay in the cloud,
not a target-phone result or a speed comparison with the original run.

The export button delivered an 18,426-byte JSON file. Browser automation's
download event timed out, but the actual file arrived in the shared download
directory and was parsed. Its SHA-256 is
`e70324cee1934637ed710304ccc393213e0959bdd98373be869e287ee2204a06`.
The complete parsed export and delivery observation are retained inside
`evidence/stability-checks-20260917.json`. Both original fixture hashes matched
the supplied bytes. After reload, all 36 saved events and generated output
matched the downloaded export exactly; the trial remained available for export.
No new inference was started by restoration.

The phone evidence was inspected before publication under the user's explicit
conditional approval. It contains no names, contact details, locations,
credentials, or unique device identifiers. It contains generated speech,
timestamps, generic browser/runtime metadata, and the public experiment URL.

### Remaining target-device operation

Open the commit-pinned `stability.html` on the phone and run trials 1, 2, and 3,
reloading between trials. Export each result. If Chrome crashes, reload that
same diagnostic page and export the restored trial before starting another.
The fixed CPU input is identical across all trials. Trial 3 deliberately uses
the original CPU input even if its fresh GPU response differs.

The cloud browser cannot supply the two GPU trials because it has no WebGPU
adapter. The phone crash cause and any stabilization repair remain unresolved.
Use the phone outcomes to choose the next minimum change. Do not infer an OOM,
leak, or runtime defect solely from the Aw, Snap screenshot. The full 100-response,
50-CPU/50-GPU conversation is still outstanding.

### Received phone snapshots

The three supplied phone exports from the same code commit are preserved in
`evidence/stability-checks-20260917.json`, under `phoneObservations`.
Each `rawExportText` retains the exact uploaded UTF-8 bytes; byte length and
SHA-256 were checked after writing. The exports contain the public experiment
URL, generic browser/runtime metadata, timestamps, and the earlier model text.
No names, contact details, locations, credentials, or unique device identifiers
were found. Both source fixture hashes match in every file.

| Trial | Created (UTC) | Last saved event (UTC) | What is recorded |
| --- | --- | --- | --- |
| CPU alone | 17:59:28.402 | 17:59:39.523 | CPU loaded; identical 351-token input saved before inference. No first-token progress event. |
| Both loaded, then CPU | 17:59:49.183 | 17:59:51.583 | CPU model transfer last reported 21.90%; no completed CPU load or GPU load start. |
| GPU generation, then CPU | 17:59:57.803 | 18:00:23.707 | Both sessions loaded; runtime ready; no generation-start event. |

All three files say `status: running`, have `error: null`, and contain no
results. They record no generation-progress, generation-returned,
tensor-cleanup-complete, turn-result, command-error, or GPU-device-lost events.
Missing events are not evidence that those operations never happened later.
The first saved generation-start is a checkpoint before inference, not proof
that a token or forward pass completed.

These snapshots do not establish three crashes. Export while execution is
active, a manual reload, a crash, or another interruption can leave this state.
Neither export time nor the actual browser outcome is recorded. The user
subsequently clarified that the evidence collector stopped before the tasks
completed. These are not three reported Chrome crashes. The existing cloud
CPU success remains a separate result.

### Collector repair

Synthetic execution reproduced two defects in the published collector:

- After an injected checkpoint-save failure, the page showed FAILED while its
  exported file still said running with no error and no results. The rejected
  write chain prevented the failure record from being persisted, and export
  read only the old committed file.
- With the final write held pending after a generated response, export returned
  the earlier running snapshot. Once that write finished, export said complete.

The diagnostic controller now displays saved-event and pending-write counts.
Final export is available only after the trial finishes or fails, waits for
queued writes, and uses the exact successfully committed snapshot. A separate
live checkpoint can export received diagnostics even while storage is stalled;
its metadata marks the report unfinished and identifies memory as its source.
Persistence failure stops the diagnostic run and enables a failure report with
the unsaved error and events. It does not retry storage or continue inference
past a rejected checkpoint. Unsaved diagnostics require download before reload.

Every new export identifies its export time, source, and outcome. Current-run
exports also include committed-event count, pending writes, and any save error.
Older saved files remain readable. Runtime, model input, sampling, token budget,
and the normal chat are unchanged.

Twenty-one synthetic checks pass, including final-write delay, a failed initial
generation checkpoint, and a collector failure during a turn. Reproduction
results and verified source hashes are retained in the existing evidence file.
These defects explain how incomplete exports can occur; they do not identify
the exact failure on the phone or the cause of the original Chrome crash.

The repaired collector at `a21b07a2a454bff6db3dc457547e88330f4c6466` then
executed the CPU-only replay in cloud Chrome. A live export contained 23 events
and was labeled unfinished/live-memory. Generation and collection continued
after that export. One generation completed all 100 conversational tokens in
79,877.60 ms. Final export enabled only after completion, contained all 36
events, and reported complete/committed-file-snapshot with zero pending writes.
Its first 23 events exactly matched the live export. Both actual downloads were
verified despite automation download-event timeouts. Reload restored the exact
36 events and output. Full observations and both exports are retained under
`collectorRepair.browserObservations` in the evidence file.

Next, verify CPU alone on the phone using this repaired collector before
repeating the remaining conditions. Use final evidence after COMPLETE/FAILED;
if collection stalls, use the live checkpoint. Download a failure report before
reload when the page says its newest diagnostics are unsaved. The original
phone instability and repaired collector's behavior on that device remain open.

### Completed phone trials with the repaired collector

The subsequent phone exports created at 18:22, 18:26, and 18:30 UTC on
2026-09-17 all completed at code commit
`a21b07a2a454bff6db3dc457547e88330f4c6466`. Their exact uploaded UTF-8 bytes,
lengths, hashes, and summaries are retained under `completedPhoneTrials` in
`evidence/stability-checks-20260917.json`. Inspection found no personal names,
contact details, locations, credentials, or unique device identifiers. The
random IDs identify individual trials, not devices.

| Trial / generating session | Input tokens | Output tokens | First token (s) | Whole turn (s) |
| --- | ---: | ---: | ---: | ---: |
| CPU alone | 351 | 100 | 37.45 | 164.95 |
| CPU with GPU loaded and idle | 351 | 100 | 43.28 | 169.87 |
| GPU, before CPU in the third trial | 255 | 100 | 12.96 | 27.60 |
| CPU, after GPU in the third trial | 351 | 100 | 40.33 | 172.12 |

Times exclude session loading but include diagnostic overhead. Every response
used one generation call and made zero retrieval calls. All CPU rendered inputs
are identical, and all three CPU output token sequences are identical. The GPU
output token sequence also matches the original phone conversation's first
turn, whose recorded whole-turn duration was 14.05 seconds. These separate runs
do not establish a reason for the different GPU timings.

The third trial records a loaded `webgpu` session, GPU generation progress from
1 through 100 tokens, generation return/output, tensor cleanup, and a completed
GPU turn. The CPU generation follows it. This establishes successful generation
using the WebGPU session, beyond model residency alone; it does not provide
per-kernel GPU utilization or prove concurrent CPU/GPU generation.

All final exports say complete, identify a committed file snapshot, report
zero pending writes and no save failure, and contain every committed event
(39, 60, and 74 respectively). No runtime error or GPU-device-lost event is
recorded. The earlier incomplete snapshots remain preserved separately with
the user's correction about the collector stopping early.

The phone reports `hardwareConcurrency: 8`, while the runtime explicitly sets
`wasm.numThreads = 1`. It also reports `crossOriginIsolated: false` and no
`SharedArrayBuffer`. This is a single-threaded WASM inference baseline, not an
assessment of the CPU's multicore potential or a count of all browser threads.
The official [ONNX Runtime threading documentation](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html#envwasmnumthreads)
states that setting one disables multithreading, and enabling it requires
browser WASM threading support and cross-origin isolation. Changing only the
thread count is insufficient on the measured page. Any later CPU comparison
needs an isolated serving environment, verified threading support, and the
same input/model/settings across thread counts.

All three short trials passed. The original Chrome crash was not reproduced,
and its cause remains unknown. No total, WASM, or GPU memory usage was measured.
The differing GPU/CPU input lengths and checkpoint overhead preclude treating
these timings as a controlled CPU/GPU benchmark. One run per condition cannot
attribute the small CPU timing differences to GPU residency, heat, or another
cause. Full 100-response conversation endurance and multicore CPU performance
remain untested.

### Runtime and actual-chat audit after the completed replays

The phone's missing cross-origin isolation prevents the intended multicore CPU
configuration. There is also an independent code restriction:
`configureSingleOrtEnvironment()` always sets `wasm.numThreads = 1`. It does
not increase that value on an isolated origin. Successful CPU multithreading
therefore requires both a suitable serving environment and a runtime setting
change, followed by execution evidence. Initialization currently accepts the
single-threaded environment and reports runtime-ready.

The usual isolation configuration is `Cross-Origin-Opener-Policy: same-origin`
and `Cross-Origin-Embedder-Policy: require-corp` on the top-level response, with
worker policy and cross-origin resources configured compatibly. Verify the
result in both page and worker. See the
[cross-origin isolation guide](https://web.dev/articles/cross-origin-isolation-guide).
A workspace HEAD request to the actual diagnostic URL returned HTTP 403;
this audit did not directly inspect the successful page response's headers.
The supplied phone evidence does establish isolation false and shared memory
unavailable. No hosting configuration was changed.

Concurrency has two further restrictions. The worker's `busy` flag rejects a
second model command during generation. The exact downloaded Transformers.js
4.3.0 source also chains browser ONNX `session.run()` calls through a
module-level `webInferenceChain`. Headers do not remove either restriction.
The current conversation plan explicitly requires alternating turns, and the
original chat also awaited each completed turn and its CSV/evidence saves.
The third replay therefore matched its first GPU-then-CPU order. Simultaneous
CPU/GPU generation remains untested by these replays and is not an established
cause of the original crash.

The diagnostic controller adds awaited save checkpoints around inference and
cleanup, then stops after one or two responses. It does not execute the chat's
CSV append/render loop or its full endurance run. Token progress and the GPU
device-lost observer are enabled only in diagnostic mode. A successful replay
cannot establish the full chat's persistence or failure handling.

Two additional synthetic executions used the actual chat controller with the
existing test fixture. They did not execute Granite or simulate a phone crash:

- Injecting an evidence-file save failure after the first model result left
  one CSV row saved, zero turns in the saved evidence, and `error: null` in that
  file. The live page retained the error and stopped before another model call.
  Reload restored the CSV but lost the error. The chat's rejected write chain
  prevented its later error-save attempt from executing. Live JSON export
  before reload can retain the error; its durable evidence is still incomplete.
- Two controllers with opposite seed choices shared one storage namespace.
  Both initialized and issued 100 synthetic generation calls. One displayed
  COMPLETE while the other failed its turn-one CSV/evidence agreement check.
  The final shared evidence said incomplete. There is no cross-tab ownership
  lock around the fixed CSV/JSON filenames. In the actual application, each
  tab can also initialize its own resident model pair. The phone screenshots
  do not establish that multiple experiment tabs were running; duplication is
  a demonstrated controller hazard, not a finding about those phone tabs.

Source hashes, exact reproduction outcomes, and audit limits are retained
under `runtimeAndChatAudit` in the existing evidence file. The successful
collector repair applies to `stability.js`; it did not repair the actual
chat controller's failed-save behavior. The new audit changed no runtime code.

## Approved installed-app repair — executed verification

The user's explicit instruction to do the repair is recorded in WORK.md.
The new manifest/service worker cache a small shell independently of model
loading. Same-origin document and worker responses receive COOP/COEP headers.
Both page and worker require isolation/shared memory before model loading;
eight logical processors request four WASM threads, preserving fixed SIMD,
one runtime, and the two resident q4 sessions. This configures threading; it
does not measure per-core utilization.

One Web Lock covers chat and diagnostic pages before workers or file writes.
Chat now acknowledges durable runtime checkpoints, saves each prepared result
before appending CSV, and can reconcile a committed row against that exact
prepared record after a failed diagnostic close. A separate small failure
marker preserves the error across reload if localStorage remains writable;
if both storage mechanisms fail, only the live export retains the newest error.
Full received diagnostics remain exportable, including write status. The DOM
shows only the latest 100 event summaries. Actor content is not rewritten.

Thirty synthetic checks pass, including both 50/50 seed cases,
shared-memory admission, failed saves before and after CSV, reload, duplicate
controllers, and isolated cached shell responses. These are plumbing checks.
The published candidate eb3b607 established service worker control, page and
worker isolation, shared memory, and an offered Chrome install prompt. A second
actual page was blocked before worker creation/file access. A real CPU replay
completed 100 tokens in 50,619.22 ms with two requested/runtime-reported WASM
threads on five logical processors. It matched the recorded 351-token input.
All 36 events committed; downloaded evidence contained zero pending writes.
Reload restored the exact 36-event sequence and output. This is not a controlled
speed comparison or measurement of per-core utilization.

The actual conversation controller also loaded CPU with two reported threads,
then failed at WebGPU adapter acquisition in the cloud browser. The error and
runtime events survived reload. No GPU generation or full dual-session chat was
executed in this environment. A final controller correction marks both lanes
nonresident after terminating a failed worker. Synthetic checks cover that
release, interrupted clear, and an unfinished final-save export.

The shell was reloaded from its service-worker cache. Physical offline launch
and standalone installation were not exercised in this browser. The existing
pinned Transformers.js caches still own model and WASM resources; the service
worker caches the shell and executable modules without duplicating model
weights. Its installation does not wait for the model. Future shell changes
must bump the service worker cache version, and active sessions do not receive
forced skipWaiting updates. Commit-pinned development URLs remain separate
release scopes; this work does not provision a production origin.

The final phone test remains the actual index.html conversation, with both
sessions resident and alternating generation: 50 CPU + 50 GPU, seed excluded.
Close older Claptrap pages before opening it, allow the initial setup reload,
then Start. On an eight-processor phone, the configured CPU thread count is four.
Keep the app visible for the endurance run. Export both files after completion
or an error; live evidence exports explicitly identify unfinished/pending saves.
The separate stability.html remains a short replay and does not substitute for
that full run. Neither the original Chrome crash cause nor full endurance is
claimed resolved by the short cloud run.

The exact downloaded exports, hashes, and synthetic outcomes are in
[evidence/installed-repair-20260917.json](./evidence/installed-repair-20260917.json).
Browser download notifications timed out, but the files arrived and were parsed.
The export review found no personal identifiers: routine browser metadata,
public experiment URLs, UUIDs for test records, and model-generated fixture text.

A further offline defect was reproduced against the actual 4.3.0 package source:
get_tokenizer_files drops the requested revision during its metadata check.
With only the pinned tokenizer cached and a rejected network, it requests main
and fails. Setting the existing env.remotePathTemplate to this realm's already
pinned revision makes the same discovery succeed from cache with zero fetches.
The worker now applies that setting; model bytes/revision are unchanged.
repair-checks.mjs reproduces before/after in separate processes against the
pinned package. Its exact outputs are saved with the evidence. This is an
executed cache/discovery regression, not a physical airplane-mode device run.

Final code bcf1060bde6091649efce6c1d61d270f102d23da was then opened in the
browser. It installed its shell, established isolation, loaded CPU with two
threads using the corrected pinned resource path, and saved the expected
cloud WebGPU adapter failure with zero pending writes. After terminating the
worker, the UI correctly read "CPU: not resident" and "GPU: failed to load".
Its complete export and source hashes are included in the evidence file.
The final phone entry point is:
https://raw.githack.com/NFDFLDTHRY/MochEpoch/bcf1060bde6091649efce6c1d61d270f102d23da/experiments/granite-single-ort-dual-session/claptrap-chat/index.html


## Installed phone run at 20:04–20:10 UTC

The user's final-build export confirms installed display mode, persistent
storage, page/worker isolation, shared memory, eight logical processors, four
requested/runtime-reported WASM threads, and both q4 sessions resident together.
Five actual responses completed in order GPU / CPU / GPU / CPU / GPU, each
100 generated speech tokens. All 124 received events committed. The run used
the stop-after-turn path after turn 5, with no recorded error or pending write.
The user initially described execution as flawless apart from presentation/recording
issues, then clarified that the generated assistant/tooling narration was the
problem and that they deliberately stopped for that reason. This establishes
five completed runtime turns. It does not establish the exact prompt condition
or a completed 100-turn run.

| Turn | Backend | Recorded generation duration | Speech tokens |
| --- | --- | ---: | ---: |
| 1 | WebGPU | 25.65 s | 100 |
| 2 | WASM | 109.15 s | 100 |
| 3 | WebGPU | 17.34 s | 100 |
| 4 | WASM | 152.26 s | 100 |
| 5 | WebGPU | 18.30 s | 100 |

For all five responses, raw generation text, returned output, actor evidence
and CSV text are exactly equal. Raw generated token IDs equal saved speech IDs.
Each following user-message input contains exactly the prior committed reply.
No native retrieval call occurred. Turns 4 and 5 contain identical text.
The helper/tool-description text in the first response is model output.

The supplied screenshot catches CPU turn 2 at 60 raw tokens and shows the
completed GPU turn 1. The controller currently renders a reply only after its
100-token turn commits. Mid-sentence endings result from the specified token
boundary; the export contains no hidden continuation. The seed is in the UI
configuration and JSON input, and is excluded from response CSV/counting.
These are established display/recording behaviors, but they do not explain the
reported defect. The operator has now identified the reply content itself as the
problem. No decoder or prompt correction has been applied.

Exact original JSON/CSV text and SHA-256 hashes are retained in the existing
installed-repair evidence file under phoneInstalledRun. Source bytes can be
recovered by UTF-8 encoding originalText. Publication review found only the
experiment's public URLs, routine browser metadata and model-generated text.
No source attachment or implementation file was modified in this evidence update.

## Clarified stop reason and effective prompt audit

The operator deliberately stopped because the conversation contained generic
assistant/tooling narration. This was not another reported runtime crash.
Byte-for-byte CSV fidelity proved accurate recording, not a correct conversation
setup. There is no separate final answer in these exports to reveal by changing
which output field the UI displays.

The actual pinned tokenizer template was rendered with the first phone turn's
messages and the worker's real search tool schema. It exactly reproduced the
recorded rendered prompt. Although the supplied system message is exactly
`You are Claptrap.`, enabling tools expands the effective system text to 1,002
characters. It appends `You are a helpful assistant with access to the following tools.`
plus the search schema and native tool instructions. Rendering the same messages
without tools leaves the effective system text exactly `You are Claptrap.`

All five phone outputs lack native tool-call, tool-response, thinking, or role
delimiters. They are generated assistant prose which echoes the supplied tool
framing; there were zero executed retrieval calls. The
[official IBM model card](https://huggingface.co/ibm-granite/granite-4.0-350m)
uses this native tool template, so this finding is not evidence of an incompatible
tokenizer or an accidental base-model artifact. It exposes additional role
framing in the effective prompt despite the experiment's exact-system condition.

The rendering audit and exact effective system text are saved under
`phoneInstalledRun.promptFramingAudit` in the existing evidence JSON. This audit
did not run another inference and does not prove which phrase caused the
repetition. The smallest next experiment is a fixed-input, same-backend
comparison that removes only the added generic assistant-role wording while
retaining the search schema, native tool protocol, and all other experimental
conditions. Record both raw outputs. Do not strip tooling narration from ordinary
prose, invent a missing final answer, coach Claptrap's personality, or remove
retrieval from the real conversation merely to make the displayed text look right.
