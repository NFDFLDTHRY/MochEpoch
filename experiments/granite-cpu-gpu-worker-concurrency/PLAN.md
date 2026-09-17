# Granite CPU/GPU worker concurrency experiment

## Status

Experimental branch only: `experiment/granite-cpu-gpu-worker-concurrency`

This experiment is runtime evidence work inside the MochEpoch repository. It is not game architecture, game state, Witness machinery, or the MochEpoch first-test loop.

The locked `docs/GAME_BLUEPRINT.md` blob was verified against `docs/ARCHITECTURE_LOCK.json` before this experiment was started. The experiment does not modify the blueprint, world CSVs, current game fixture, or authoritative MochEpoch runtime path.

## Question

Can separate dedicated browser workers run Granite inference on CPU/WASM and GPU/WebGPU concurrently, escaping the per-JavaScript-realm Transformers.js inference chain strongly enough to reduce real wall-clock makespan versus the same two generations run sequentially?

Secondary questions, only after the first question is answered:

1. What happens with two CPU workers?
2. What happens with two GPU workers?
3. What happens when a third independent worker is added?
4. Does per-worker CPU/GPU call ordering expose the Transformers.js per-realm inference chain?

## Known source fact motivating the experiment

In the inspected Transformers.js source, browser inference is chained through a module-level `webInferenceChain` because simultaneous WASM/WebGPU session execution in one JavaScript environment is not supported there.

A dedicated worker has its own JavaScript global/module realm. Therefore separate workers are a concrete way to test whether the Transformers.js chain is scoped to each worker while browser, ONNX Runtime, and hardware scheduling underneath still determine actual physical overlap.

That cross-worker overlap is a hypothesis until executed on the target phone.

## Target

Primary target: Pixel 9a Chrome/Android.

Development delivery pipe: public commit-pinned GitHack URLs.

Every runnable experiment commit should be testable at:

`https://raw.githack.com/NFDFLDTHRY/MochEpoch/<commit-sha>/experiments/granite-cpu-gpu-worker-concurrency/index.html`

GitHack is delivery only. It is not experimental evidence by itself.

## Model/runtime

Target model artifact repository:

`onnx-community/granite-4.0-350m-ONNX-web`

Transformers.js: pinned browser import from the 4.3.0 package line used by the repository's Granite runtime research.

Initial execution lanes:

- CPU lane: WASM with an explicitly selected published dtype/artifact that successfully loads on the target browser. First candidate: `q4`.
- GPU lane: WebGPU with explicit `q4f16`.

Do not rely on device or dtype defaults. Record the requested device and dtype in every result.

If either first candidate fails to load, that failure is evidence. Change the candidate only in a later explicit experiment revision.

## Controlled generation

Both lanes use the same small fixed chat input and the same generation controls where applicable:

- deterministic baseline: `do_sample: false`;
- explicit small `max_new_tokens`;
- Granite chat template via the tokenizer;
- no MochEpoch world state, Witness, actor state, tool schema, documents channel, or game authority.

The probe measures inference scheduling, not character behavior.

## Phase 1: two-lane proof

### Worker ownership

Create exactly two dedicated module workers:

- CPU worker owns one tokenizer/model session configured for WASM.
- GPU worker owns one tokenizer/model session configured for WebGPU.

Each worker loads and retains its own model/session for the duration of the page.

### Initialization

Each worker reports:

- worker id;
- requested device;
- requested dtype;
- model id;
- load start and end timestamps;
- success or complete error text.

The UI does not start measured inference until both requested workers report ready.

### Warmup

Run one unmeasured generation on each ready worker before timing baselines. Warmup is recorded as setup evidence but excluded from concurrency comparison.

This separates model download/session creation/first-run compilation effects from the measured inference region as much as the browser runtime permits.

### Baselines

Run and record:

1. CPU generation alone.
2. GPU generation alone.

For each run record:

- command dispatch time in the main page;
- worker inference start time;
- worker inference end time;
- worker duration;
- completion receipt time in the main page;
- input token count if available;
- generated token count if available;
- decoded output or a bounded decoded excerpt;
- error if any.

### Concurrent run

After both solo baselines complete, arm both workers and dispatch the same generation to both as close together as possible from the main page.

Record the same timestamps for each worker plus batch start, batch end, and total batch makespan.

## Primary calculation

Let:

- CPU baseline duration = C
- GPU baseline duration = G
- sequential reference = C + G
- concurrent batch makespan = M

Report:

- `sequential_reference_ms = C + G`
- `concurrent_makespan_ms = M`
- `time_saved_ms = (C + G) - M`
- `overlap_ratio = 1 - M / (C + G)`

The ratio is descriptive evidence only. Do not invent a threshold that turns noisy mobile scheduling into a false binary conclusion.

## Phase 1 interpretation

Strong evidence of useful CPU/GPU overlap exists when the concurrent batch repeatedly completes materially faster than the sequential reference and the worker inference intervals overlap in their recorded timestamps.

Evidence of serialization exists when the concurrent makespan repeatedly approaches the sequential sum and worker intervals do not materially overlap.

Intermediate results are reported as intermediate. Thermal throttling, scheduling noise, or backend behavior must not be silently normalized away.

## Phase 2: same-backend controls

Only after Phase 1 executes:

- two CPU workers simultaneously;
- two GPU workers simultaneously.

These distinguish heterogeneous overlap from simple multi-worker behavior and expose contention on one physical backend.

## Phase 3: third worker

Only after Phase 1/2 establish the basic scheduling behavior, add a third worker and test narrowly chosen combinations justified by those results.

Candidate cases:

- CPU + CPU + GPU;
- CPU + GPU + GPU;
- three CPU;
- three GPU.

Do not add all cases automatically if earlier evidence makes some irrelevant.

## Phase 4: per-worker dual-call stress test

Only if prior runs justify it, let each of multiple workers request both CPU and GPU inference and vary per-worker request order.

Purpose: determine whether each worker's own Transformers.js inference chain is observable independently while the workers themselves execute concurrently.

This is intentionally not part of the first build.

## Evidence format

The page maintains an append-only in-memory run log for the current page session and offers a JSON download/export containing:

- experiment version/commit when available from the URL or manually supplied label;
- user agent;
- hardware concurrency value exposed by the browser;
- WebGPU availability;
- model id;
- worker configuration;
- setup/load/warmup events;
- baseline events;
- concurrent events;
- timestamps and durations;
- generated token counts when available;
- bounded output text;
- complete errors.

No result is written into MochEpoch CSV-backed game state.

## Phase 1 pass condition

The probe itself passes when it can, on the target phone through GitHack:

1. initialize the CPU worker and GPU worker or preserve an exact load failure;
2. warm each successful lane;
3. run each successful lane alone;
4. launch both successful lanes together;
5. show the timing comparison; and
6. export the complete evidence JSON.

Whether inference actually overlaps is an experimental result, not the software pass/fail criterion.

## Stop conditions

Stop and record evidence instead of adding machinery if:

- the exact Granite artifact fails to load;
- Transformers.js import/runtime fails;
- the requested execution provider is unavailable;
- concurrent execution throws a backend/session error;
- the browser terminates a worker or page;
- the experiment reveals that the planned measurement cannot distinguish scheduling outcomes.

Only change the smallest thing required by the observed failure.
