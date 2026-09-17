# Granite CPU/GPU worker concurrency run log

This file is the cumulative experiment ledger for `experiment/granite-cpu-gpu-worker-concurrency`.

Update this one file after each real phone run. Preserve what the run actually established, what remained unresolved, and what changed for the next probe. Do not convert absence of progress into a failure unless the browser/runtime actually reports a failure or the process is observed to terminate.

## Run 001 — initial Phase 1 probe

Date: 2026-09-17

Probe commit: `b224417013b607f9a2033e8f4ee1c0bc27b995ed`

Delivery surface:

`https://raw.githack.com/NFDFLDTHRY/MochEpoch/b224417013b607f9a2033e8f4ee1c0bc27b995ed/experiments/granite-cpu-gpu-worker-concurrency/index.html`

User-exported evidence file:

`granite-cpu-gpu-worker-concurrency-2026-09-17T04-59-55.931Z.json`

### Runtime facts recorded

- Browser user agent reported Android Chrome 152.
- `navigator.hardwareConcurrency` reported `8`.
- Secure context: `true`.
- Main-page WebGPU exposure: `true`.
- Transformers.js version requested by the probe: `4.3.0`.
- Granite artifact repository: `onnx-community/granite-4.0-350m-ONNX-web`.
- CPU lane configuration: `device=wasm`, `dtype=q4`.
- GPU lane configuration: `device=webgpu`, `dtype=q4f16`.

### Observed sequence

The CPU worker reported `load-start` at approximately `2026-09-17T04:59:15.774Z`.

The evidence export occurred at `2026-09-17T04:59:55.918Z`, about 40.1 seconds after that CPU `load-start` event.

No `ready`, `load-error`, inference event, or summary was recorded before export.

The original controller initialized CPU first and waited for CPU initialization to resolve before beginning GPU initialization. Therefore the GPU lane was never started during this run.

### Established

- The commit-pinned GitHack page executed on the target phone.
- The page ran in a secure context.
- The main page exposed WebGPU.
- The dedicated CPU module worker loaded far enough to receive its initialization command and send a structured message back to the main page.
- The worker's Transformers.js module import necessarily completed before the recorded `load-start` message could be emitted.
- CPU Granite initialization was requested with WASM/q4.
- Main-page-to-worker and worker-to-main messaging worked for the observed initialization event.

### Not established

- No failure or blocker was established.
- The run did not establish that 40 seconds was sufficient time for first-load initialization.
- The run did not show whether tokenizer download/loading started or completed.
- The run did not show whether model file download/loading started or completed.
- The run did not show whether ONNX session construction began.
- The run did not show whether CPU initialization would eventually complete.
- GPU initialization was not attempted.
- No warmup, solo inference, simultaneous inference, CPU/GPU overlap, serialization, or performance result was established.

### Probe limitation discovered

The first probe had insufficient visibility inside `AutoTokenizer.from_pretrained()` and `AutoModelForCausalLM.from_pretrained()`. It also made GPU observation dependent on CPU initialization completing because initialization was sequential.

Therefore the first run cannot distinguish among normal first-load delay, ongoing file transfer, tokenizer work, model transfer, ONNX/session construction, browser scheduling, runtime failure without surfaced error, or an error in the experiment code after the last observed event.

### Next probe revision

Keep Phase 1 unchanged, but improve observation before interpreting runtime behavior:

- independent CPU and GPU initialization controls;
- explicit checkpoints before and after tokenizer load;
- explicit checkpoints before and after model load;
- Transformers.js `progress_callback` events for tokenizer/model file activity and byte progress;
- elapsed load time visible per lane;
- worker heartbeat while the worker event loop remains responsive;
- no artificial initialization timeout;
- Phase 1 inference button enabled only when both lanes actually report ready;
- evidence export remains available at any time.

The next run should determine where each lane actually spends its initialization time before any attempt is made to repair or change the runtime.
