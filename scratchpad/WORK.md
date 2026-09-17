# Approved Claptrap installed-app repair

proposal_id: 20260917-claptrap-installed-repair
status: APPROVED_IN_PROGRESS
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
