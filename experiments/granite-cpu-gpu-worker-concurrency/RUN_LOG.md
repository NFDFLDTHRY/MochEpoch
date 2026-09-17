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

## Run 002 — revision 2 load visibility probe

Date: 2026-09-17

Probe commit: `b165124d39876c8bbaab43114667064e4221dd1f`

User-exported evidence file:

`granite-cpu-gpu-worker-concurrency-r2-2026-09-17T05-20-44.383Z.json`

### Operator sequence

The operator started CPU first, later pressed GPU initialization, then exported evidence while initialization activity was still in progress.

The recorded main-page timestamps show:

- CPU init command dispatched at `1789622336654.1 ms`.
- GPU init command dispatched at `1789622392030.0 ms`, about 55.38 seconds after the CPU command was actually handled by the main page.
- Evidence export occurred about 107.68 seconds after CPU dispatch and about 52.31 seconds after the GPU command dispatch.

The perceived interval between button presses may differ from these recorded handler times because the main page became heavily backlogged processing CPU progress messages.

### CPU initialization established

- CPU worker started normally with `device=wasm`, `dtype=q4`.
- The worker reported WebGPU visible inside the worker as well, even though this lane was configured for WASM.
- Tokenizer loading completed successfully in approximately 1.106 seconds.
- `tokenizer_config.json` completed.
- `tokenizer.json` completed.
- Model loading then started normally.
- `config.json` and `generation_config.json` completed.
- Transformers.js requested the expected q4 ONNX files:
  - `onnx/model_q4.onnx`
  - `onnx/model_q4.onnx_data`
- The small `model_q4.onnx` file completed.
- The large external-data file reported total size approximately `575,639,552` bytes.
- Aggregate model progress reported total approximately `575,914,563` bytes.
- Worker heartbeats were recorded at approximately 5, 10, 15, 20, and 25 seconds of worker load time, proving the CPU worker event loop remained alive during observed loading.
- No CPU load error was recorded.

### Critical instrumentation artifact discovered

Revision 2 generated far too many progress messages.

The evidence contains 3,755 events total:

- 3,744 CPU `load-progress` events;
- 5 CPU heartbeats;
- 3 CPU checkpoints;
- 1 CPU `load-start`;
- 2 main-page command-dispatch events.

The reporter throttled per-file `status=progress` events but did not throttle `status=progress_total` events. The main controller also appended every `progress_total` event to the visible DOM log because it treated only `status=progress` as suppressible.

This caused the main page to process progress events much more slowly than the CPU worker generated them.

Measured evidence of backlog:

- CPU worker event timestamps represented only about the first 25.34 seconds of worker activity in the events processed before export.
- Those same events continued arriving at the main page for about 107.33 seconds after CPU initialization began.
- Median worker-to-main receipt lag across recorded CPU events was about 9.62 seconds.
- 95th-percentile recorded lag was about 71.07 seconds.
- Maximum recorded lag was about 81.99 seconds.
- At the moment the GPU button handler finally recorded its command dispatch, the CPU progress event immediately before it had been generated by the worker roughly 33 seconds earlier.

Therefore the visible UI and exported event tail were substantially behind actual worker execution.

### Meaning of the final recorded CPU progress

The newest CPU worker progress event that the main page had processed before export reported approximately `171,000,685 / 575,914,563` aggregate bytes, about 29.69%.

That event itself had been generated by the worker only about 25.35 seconds after CPU initialization started, but the main page did not process it until roughly 107.34 seconds after CPU dispatch.

Therefore 29.69% is NOT established as the CPU's actual progress at export time. Later worker progress messages may have existed in the browser task/message queue and simply had not been processed yet. The run does not establish whether CPU downloading had reached a later percentage or completed by export time.

### GPU observation

The main page definitely handled and recorded a GPU initialization command with `device=webgpu`, `dtype=q4f16`.

However, no event sourced from the GPU worker was processed into the evidence before export. There is no GPU `load-start`, checkpoint, progress, heartbeat, ready, or error event in this export.

Because the main page was demonstrably tens of seconds behind on worker message processing, absence of GPU worker events in the exported JSON does NOT establish that the GPU worker failed to start. GPU worker messages may have been delayed behind the overloaded main-page event processing, or the GPU worker may not yet have emitted/processed its initialization response. This run cannot distinguish those cases.

### Established

- Run 001's apparent CPU silence was normal active model loading, not evidence of a hang.
- Tokenizer loading works on the CPU worker.
- CPU/WASM q4 model artifact resolution works and the expected q4 ONNX/external-data files are being transferred.
- The worker remained alive and responsive during observed transfer.
- CPU model transfer was progressing substantially during the worker-time interval observed.
- Independent GPU init command dispatch from the page works.
- Revision 2's progress instrumentation itself creates severe main-thread event/DOM backlog and corrupts real-time observability.

### Not established

- CPU model initialization completion.
- CPU ONNX session construction completion.
- CPU generation.
- GPU worker initialization success or failure.
- GPU q4f16 artifact transfer.
- GPU generation.
- CPU/GPU simultaneous inference or hardware overlap.

### Required next probe change

Do not change Granite, dtype, backend, artifact, or concurrency design yet.

Change only the observer:

- throttle `progress_total` just like ordinary per-file progress;
- coalesce progress to a low fixed update rate, preferably a few UI/evidence updates per second at most;
- do not append every byte/progress update to the DOM log;
- retain milestone events such as initiate, download, done, checkpoints, heartbeats, ready, and errors;
- keep only periodic aggregate byte snapshots for ongoing transfers;
- then repeat CPU-first/GPU-second initialization and allow enough time for the resulting low-noise probe to show real current state.

The runtime itself should not be changed based on Run 002 because the dominant failure observed was in the probe's reporting path, not in Granite initialization.

## Run 003 — revision 3 successful dual-backend initialization and partial Phase 1

Date: 2026-09-17

Probe commit: `f0d1ff23d570a407fb50f912218167d061d3bc09`

User-exported evidence file:

`granite-cpu-gpu-worker-concurrency-r3-2026-09-17T05-56-05.749Z.json`

### Operator sequence

The operator initialized CPU first and allowed it to reach ready. GPU was then initialized and allowed to reach ready. Once both lanes were ready, Phase 1 was started. Evidence was exported while the final concurrent CPU inference was still outstanding.

### Observer repair established

Revision 3 fixed the revision 2 telemetry flood. The exported evidence contains 99 events rather than thousands, and worker-to-main event timing remained close enough for the UI to track the real worker state. CPU and GPU progress, milestones, readiness, and inference events were all observed.

### CPU initialization

- Backend: `wasm`.
- Dtype: `q4`.
- Tokenizer load completed in approximately `535.4 ms`.
- Expected q4 model files resolved: `model_q4.onnx` and `model_q4.onnx_data`.
- External-data file size reported approximately `575,639,552` bytes.
- Model-load stage completed in approximately `9,481.4 ms`.
- Prompt preparation completed in approximately `41.9 ms`.
- Total worker load duration to ready: approximately `10,059.7 ms`.
- Input prompt length: 33 tokens.
- CPU lane reached `ready` with no load error.

The progress callback calls these transfers downloads, but this run does not establish whether every byte came from the network or browser/cache storage. Do not interpret the very high apparent transfer rate as a measured network bandwidth result.

### GPU initialization

- Backend: `webgpu`.
- Dtype: `q4f16`.
- Worker itself reported WebGPU visible.
- Tokenizer load completed in approximately `509.4 ms`.
- Expected q4f16 model files resolved: `model_q4f16.onnx` and `model_q4f16.onnx_data`.
- External-data file size reported approximately `350,210,048` bytes.
- Model-load stage completed in approximately `5,434.1 ms`.
- Prompt preparation completed in approximately `34.2 ms`.
- Total worker load duration to ready: approximately `5,979.3 ms`.
- Input prompt length: 33 tokens.
- GPU lane reached `ready` with no load error.

### Generation established

Both backends successfully executed Granite generation and produced the expected exact text `READY`.

CPU warmup:

- duration approximately `9,749.8 ms`;
- generated 2 tokens;
- output `READY`.

GPU warmup:

- duration approximately `5,600.2 ms`;
- generated 2 tokens;
- output `READY`.

CPU warmed solo baseline:

- duration approximately `8,395.5 ms`;
- generated 2 tokens;
- output `READY`.

GPU warmed solo baseline:

- duration approximately `912.5 ms`;
- generated 2 tokens;
- output `READY`.

For this exact tiny deterministic generation after warmup, the observed GPU baseline was approximately 9.2 times faster than the CPU baseline. This ratio is descriptive of this run only and is not generalized to other prompt lengths, output lengths, thermal states, or workloads.

### Concurrent launch observation

The main page dispatched the measured CPU and GPU concurrent run commands approximately `0.3 ms` apart.

The workers reported entering their measured generation calls approximately `4.8 ms` apart:

- GPU concurrent start: `1789624562493.7 ms`.
- CPU concurrent start: `1789624562498.5 ms`.

The GPU concurrent generation completed in approximately `814.4 ms`, producing `READY`, while the CPU generation call was still outstanding.

Therefore the GPU inference call was not serialized behind the outstanding CPU call. Separate workers successfully allowed both measured calls to be outstanding over the same wall-clock interval, which is evidence that the single-realm Transformers.js inference chain did not serialize these two worker lanes against each other.

This evidence does not by itself directly measure simultaneous physical CPU and GPU hardware occupancy. The CPU concurrent completion is needed to compute final makespan, compare its duration against the CPU solo baseline, and strengthen the claim about effective heterogeneous hardware overlap.

### Partial export limitation

Evidence was exported approximately `3,229.5 ms` after the CPU concurrent inference started. The CPU solo baseline for the same call had taken approximately `8,395.5 ms`. The CPU concurrent completion had therefore not yet been recorded when the export occurred.

Consequences:

- `summary` remained `null`.
- No final concurrent batch makespan was calculated.
- No final worker-interval overlap duration was calculated.
- No concurrent CPU duration was captured.

The GPU concurrent completion was captured approximately `2.42 s` before export.

### Established

- CPU/WASM/q4 Granite loads to ready on the target phone.
- GPU/WebGPU/q4f16 Granite loads to ready on the target phone.
- Both backends perform real Granite generation and return the expected text.
- Separate dedicated workers can hold independent working Granite CPU and GPU sessions in the same page.
- The warmed GPU baseline is much faster than the warmed CPU baseline for this tiny test.
- A GPU generation can complete while a CPU generation from another worker is still outstanding.
- The Transformers.js per-realm serialization mechanism is not acting as a cross-worker CPU/GPU serialization barrier in this run.

### Not yet established

- Completed CPU concurrent duration.
- Final concurrent makespan.
- Final quantitative speedup versus sequential baselines.
- Direct physical CPU and GPU occupancy overlap.
- Behavior with two CPU workers, two GPU workers, or three workers.

### Next evidence needed

No runtime change is required before repeating Phase 1. Let the final CPU concurrent call complete and wait for the Phase 1 summary before exporting final evidence.

If the current page remains open after the partial export, a second evidence export after Phase 1 completes is sufficient; reloading the page is not required. Otherwise repeat the same run. A future UI revision should make Phase 1 completion visually explicit so a mid-run snapshot is not mistaken for the final result.
