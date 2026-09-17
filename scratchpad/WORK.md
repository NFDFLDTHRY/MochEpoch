# Approved Claptrap installed-app repair

proposal_id: 20260917-claptrap-installed-repair
status: COMPLETE
code_commit: bcf1060bde6091649efce6c1d61d270f102d23da
remaining_gate: full 100-response endurance, physical offline installed launch, and precise reported presentation mismatch remain unverified
repository: NFDFLDTHRY/MochEpoch
branch: experiment/granite-single-ort-dual-session
base_commit: 7995a2c0c6305a7fc73496007f1ae406073db94e

## Approval and scope

The user corrected the mistaken interpretation of their acknowledgement as a
stop request: "O, it was not. I was acknowledging the change you had me make.
Do the repair." This explicitly authorizes the previously discussed repair of
the actual chat, isolation/CPU threading, and installable WebApp lifecycle.
No further approval gate is being inserted. Earlier diagnostic results remain
in VERIFICATION.md and the committed evidence; diagnostic completion did not
establish that the full conversation or installed app worked.

## Concrete changes

Within experiments/granite-single-ort-dual-session/claptrap-chat only:

- Add a manifest, icons, service worker, and small startup module. Cache the
  local shell independently of model installation. Use same-origin service
  worker response headers for isolation on the existing development host;
  verify document and worker isolation before loading models. Retain pinned
  Transformers.js model/WASM caching for later launches. No new hosting service.
- Configure shared-memory WASM inference threads from available processors
  (half, capped at four); record the requested and runtime-reported setting.
  Preserve the single runtime, q4 models, and CPU/GPU residency.
- Acquire one origin-wide runtime/storage owner before creating any worker or
  writing files, shared by the actual conversation and diagnostic page.
- Repair actual-chat evidence writes, preserve received results/errors in
  exports, checkpoint before advancing, and identify interrupted runs after
  reload. Add the existing token-progress and GPU-loss observations to chat.
- Extend the existing checks only for these observed failure paths and app
  startup/cache behavior. Record executed verification and limitations here,
  in VERIFICATION.md, and in a compact evidence JSON.

Files: main.js, runtime-worker.js, index.html, stability.js, stability.html,
checks.mjs; new app-shell.js, sw.js, manifest.webmanifest, icon.svg/icon PNGs,
repair-checks.mjs and evidence/installed-repair-20260917.json if needed.
Documentation: this WORK.md and the experiment VERIFICATION.md.

## Preserved boundaries

The locked blueprint SHA was checked against current main and matches.
No architecture/lock, main branch, world CSV fixture, model, precision, prompt,
seed, token budget, native tool semantics, or actor behavior change. Granite's
own framing remains experimental output. The real test is the agreed alternating
100-response conversation (50 CPU + 50 GPU, seed excluded), with both sessions
resident. Simultaneous generation is not part of that conversation plan.
No paid service, CI, backend, new host, or unrelated Screechrac implementation.

## Verification and reporting

Run the existing synthetic checks plus targeted failed-save/reload, exclusive
ownership, thread/isolation, and shell/cache checks. Publish on the existing
experiment branch and exercise the actual page in the available browser. Verify
service worker control, isolation, shared memory and real CPU execution; inspect
errors rather than silently falling back to one thread. The cloud browser's
WebGPU adapter has previously been unavailable, so full dual-session endurance
must remain unproven unless actual execution establishes it. Publish a usable
phone link, distinguishing repaired code from a completed 100-response run.

## Implementation and executed results

The repair is implemented. Thirty synthetic checks pass. The published candidate
established page/worker isolation, shared memory, install eligibility, and live
exclusive ownership. Real CPU inference completed 100 tokens with two reported
WASM threads on the cloud browser's five processors. All 36 events saved and
matched on reload. The actual chat saved its CPU-load/WebGPU-adapter failure.
Final controller corrections cover released-model labels, interrupted clearing,
and exports while the last JSON close is pending. The final code was opened in the browser: isolation, pinned CPU startup and
released-model labels were verified, and its complete error export committed.

The full phone conversation, standalone launch in airplane mode, and original
Chrome crash cause remain unverified. No diagnostic replay is being presented
as a full dual-session run. All details and reviewed public evidence are in the
experiment VERIFICATION.md and evidence/installed-repair-20260917.json.

An executed check against the pinned library also reproduced an offline startup
failure: tokenizer metadata discovery drops revision and requests main despite
cached pinned resources. The worker's existing remote path template now pins
that lookup too. The before/after check succeeds without network in the fixed
case. This stays within the approved offline startup repair and adds no runtime,
model, package, or service. repair-checks.mjs retains the reproduction.

## Handoff

COMPLETE refers to this approved implementation repair and its recorded checks,
not to proof of the original crash cause or completion of the phone endurance
run. Open the final index.html URL in VERIFICATION.md after closing older
Claptrap pages. Export/clear an existing conversation before starting a fresh
50 CPU / 50 GPU run. The seed still counts as zero; both models stay resident
and generation alternates. No prompt or actor framing was repaired.

Main and the locked architecture were left untouched. Reviewed evidence and
all repair code are published on the existing experiment branch. There is no
new approval request, paid host, service, CI job, or runtime dependency.

## Installed-phone follow-up evidence

The 20:10 UTC exports from final code confirm a clean five-response installed
phone run with persistent storage, isolation/shared memory, four CPU threads
reported, and both sessions resident. Three GPU and two CPU replies each reached
100 tokens; all 124 events saved; zero pending writes/errors; stopped after turn 5.
Raw generated text, returned reply, actor evidence, CSV and next-turn input agree
for every response. The screenshot shows turn 2 still generating while only the
completed turn 1 is rendered. Generic assistant/tool wording is Granite's output.
No native retrieval ran. Exact original exports, hashes and per-turn checks are
in installed-repair-20260917.json. The user reports a minor display/recording
issue whose exact missing/extra passage is not yet identified; no implementation
change was guessed from that description. The installed five-response boundary
is now executed evidence. Full endurance and offline launch remain open.
