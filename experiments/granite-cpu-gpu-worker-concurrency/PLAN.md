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

## Revision 4 plan: controlled same-artifact backend benchmark

Run 003 established that two separate workers can keep a WASM Granite call and a WebGPU Granite call outstanding at the same time, but it did not provide a controlled CPU-versus-GPU speed comparison. The CPU used `q4`, the GPU used `q4f16`, the model repository revision was not pinned, and the requested sixteen-token generation actually terminated after two generated tokens.

Revision 4 changes only what is required to make the speed comparison interpretable.

### Question

With the exact same Granite ONNX artifact, tokenizer/model revision, prompt, generated-token count, generation controls, and Transformers.js version, how fast is the WASM execution path relative to the WebGPU execution path on the target phone, and do those same two controlled lanes still overlap when launched from separate workers?

### Exact model control

Both lanes request:

- model repository: `onnx-community/granite-4.0-350m-ONNX-web`;
- pinned model-file revision: the verified model upload revision `6c9a6f6` unless the Hub requires its full resolved commit identifier;
- dtype: `q4`;
- expected graph file: `onnx/model_q4.onnx`;
- expected external weights: `onnx/model_q4.onnx_data`.

The q4 model files were introduced together in that model upload revision. No lane may silently fall back to q4f16, q8, fp16, fp32, or another artifact.

The probe records the actual filenames and total byte counts reported by each worker. If the WebGPU lane rejects q4, stop and record that result rather than substituting another dtype.

### CPU WASM control

Before creating the CPU model session, explicitly request fixed-width WebAssembly SIMD through the ONNX environment exposed by Transformers.js.

Record before and after session initialization:

- `navigator.hardwareConcurrency`;
- `self.crossOriginIsolated`;
- whether `SharedArrayBuffer` exists;
- requested WASM SIMD mode;
- resolved WASM SIMD setting;
- requested WASM thread count;
- resolved WASM thread count.

ONNX Runtime's current default behavior is one WASM thread when the browser is not cross-origin isolated. When isolation is available it defaults to at most four threads, using half the reported logical cores rounded up. Revision 4 makes the selected thread count explicit instead of leaving it implicit.

For the first controlled run, preserve ONNX Runtime's own environment-dependent default policy but compute and set the resulting value explicitly: one thread when cross-origin isolation is unavailable; otherwise `min(4, ceil(hardwareConcurrency / 2))`. Do not add cross-origin-isolation machinery merely to obtain more threads in this revision. If GitHack constrains the CPU lane to one thread, report the benchmark explicitly as single-thread fixed-SIMD WASM versus WebGPU. A later run may test a thread-count sweep if the evidence justifies it.

### Fixed generation work

The current prompt naturally ends after two generated tokens. Revision 4 must force a fixed amount of generation work so both lanes execute the same number of decode steps.

Use:

- identical prepared input tokens on both lanes;
- `do_sample: false`;
- `min_new_tokens: 8`;
- `max_new_tokens: 8`.

Eight tokens is intentionally small enough for repeated phone runs while being long enough to reduce the dominance of one-time call and prefill overhead. The result is valid only if both lanes report exactly eight generated tokens.

### Timing boundary

Keep timing around `model.generate()` only.

Do not include:

- model/tokenizer download;
- session construction;
- prompt templating/tokenization;
- output conversion to JavaScript arrays;
- text decoding;
- evidence serialization;
- DOM rendering.

Move the worker's start notification outside the measured interval so the `postMessage()` call itself is not charged to inference time. The completion result carries the authoritative generation start/end timestamps.

### UI/evidence activity during measurement

Loading telemetry remains available during initialization, but measured inference should be quiet.

During benchmark runs:

- stop the main page's 500 ms elapsed/activity DOM refresh loop or make it no-op until the measured call finishes;
- do not append progress text while a measured generation is executing;
- worker load heartbeats remain stopped once a worker is ready, as they already are;
- preserve only start/completion/error evidence around measured inference.

These changes remove small avoidable browser scheduling noise, especially from the CPU measurement.

### Warmup and run order

After both lanes are ready:

1. one unmeasured fixed-eight-token CPU warmup;
2. one unmeasured fixed-eight-token GPU warmup;
3. three measured solo rounds with alternating order:
   - round 1: CPU, then GPU;
   - round 2: GPU, then CPU;
   - round 3: CPU, then GPU;
4. three measured concurrent rounds, dispatching both workers together each round.

Record every individual duration. Use the median of the three solo CPU measurements and median of the three solo GPU measurements for the descriptive speed ratio. Do not hide individual runs.

Alternating solo order reduces, but does not eliminate, mobile thermal and scheduler ordering effects.

### Reported measurements

Report at minimum:

- CPU configuration: exact q4 artifact, fixed SIMD, resolved WASM thread count;
- GPU configuration: exact q4 artifact, WebGPU;
- input token count;
- exactly eight generated tokens per valid measured run;
- each solo duration;
- median CPU solo duration;
- median GPU solo duration;
- median CPU and GPU tokens per second for the fixed generation;
- CPU-to-GPU median duration ratio;
- each concurrent CPU duration;
- each concurrent GPU duration;
- each concurrent batch makespan;
- recorded interval overlap for each concurrent round.

Do not describe the duration ratio as raw hardware throughput. It is the performance difference of the actual Transformers.js plus ONNX Runtime browser execution paths using the same model artifact.

### Known runtime overhead intentionally retained

Transformers.js performs the autoregressive generation loop and wraps browser ONNX session execution through its per-realm inference chain. That overhead remains because it is part of the runtime path MochEpoch intends to use.

For WebGPU, Transformers.js requests GPU-buffer placement for key/value cache outputs, avoiding unnecessary cache round trips. Other generation outputs still return through the JavaScript generation path for token selection. Revision 4 therefore measures real application-path WebGPU performance rather than theoretical raw GPU kernel throughput.

### Current-code audit summary

The existing probe is not obviously adding a large artificial inference slowdown. Its timing begins immediately before `model.generate()` and ends immediately after it resolves; output conversion and text decoding happen after the end timestamp. Load-progress telemetry is only part of initialization, and worker heartbeats stop when a lane reaches ready.

The material benchmark contaminants found in the current code are:

1. CPU and GPU use different model artifacts (`q4` versus `q4f16`).
2. The nominal sixteen-token generation actually produces only two tokens because EOS ends generation.
3. WASM SIMD/thread configuration is implicit and the evidence does not record the resolved thread count.
4. The model repository revision is not pinned.
5. Solo measurements always run CPU first and GPU second.
6. The main page continues a 500 ms DOM activity timer during measured inference.
7. The worker posts its `inference-start` message after starting the timer, so that small message-post cost is included in the measured duration.

The first four materially affect interpretation. The last three are smaller sources of measurement noise and should still be removed for the controlled benchmark.

### Revision 4 stop conditions

Stop and preserve evidence without fallback if:

- WebGPU cannot load the exact q4 artifact;
- either lane resolves a different model file than expected;
- fixed SIMD cannot initialize on the CPU lane;
- a measured run produces other than eight new tokens;
- either backend throws during warmup or measurement;
- the page/worker is terminated;
- runtime conditions make the CPU thread count unresolved.

Only after this controlled run should the experiment separately compare each backend's fastest practical representation, such as q4 on CPU versus q4f16 on GPU.