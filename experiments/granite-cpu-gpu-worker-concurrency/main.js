const WORKER_URL = new URL("./worker.js", import.meta.url);
const MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
const MODEL_REVISION = "6c9a6f61601df51e76b1efff0974d8d26c2a25b5";
const FIXED_NEW_TOKENS = 100;

const evidence = {
  experiment: "granite-cpu-gpu-worker-concurrency",
  phase: 1,
  probeRevision: 4,
  createdAt: new Date().toISOString(),
  metadata: {
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    secureContext: self.isSecureContext,
    crossOriginIsolated: Boolean(self.crossOriginIsolated),
    sharedArrayBufferAvailable: typeof SharedArrayBuffer !== "undefined",
    webgpuAvailable: Boolean(navigator.gpu),
    transformersVersion: "4.3.0",
    modelId: MODEL_ID,
    modelRevision: MODEL_REVISION,
    dtype: "q4",
    fixedNewTokens: FIXED_NEW_TOKENS,
  },
  lanes: {
    cpu: { workerId: "cpu", device: "wasm", dtype: "q4" },
    gpu: { workerId: "gpu", device: "webgpu", dtype: "q4" },
  },
  benchmarkOrder: [
    "cpu-profile-100",
    "gpu-profile-100",
    "cpu-solo-100",
    "gpu-solo-100",
    "cpu+gpu-concurrent-100",
  ],
  events: [],
  summary: null,
};

const logElement = document.querySelector("#log");
const phase1Button = document.querySelector("#phase1");
const downloadButton = document.querySelector("#download");
const benchmarkStatus = document.querySelector("#benchmark-status");

let benchmarkRunning = false;
let currentBenchmarkStep = null;

function nowMs() {
  return performance.timeOrigin + performance.now();
}

function appendLog(text) {
  const time = new Date().toLocaleTimeString();
  logElement.textContent += `[${time}] ${text}\n`;
  logElement.scrollTop = logElement.scrollHeight;
}

function record(source, data) {
  evidence.events.push({ source, receivedAtMs: nowMs(), ...data });
}

function serializeError(error) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function formatMs(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} ms` : "n/a";
}

function formatSeconds(value) {
  return Number.isFinite(value) ? `${(value / 1000).toFixed(2)} s` : "n/a";
}

function formatBytes(value) {
  if (!Number.isFinite(value)) return null;
  const mib = value / (1024 * 1024);
  if (mib >= 1) return `${mib.toFixed(1)} MiB`;
  const kib = value / 1024;
  if (kib >= 1) return `${kib.toFixed(1)} KiB`;
  return `${value.toFixed(0)} B`;
}

function humanStage(stage) {
  switch (stage) {
    case "init-command-dispatched": return "Initialization command sent";
    case "load-start": return "Worker load started";
    case "tokenizer-load-start": return "Loading tokenizer";
    case "tokenizer-load-complete": return "Tokenizer ready";
    case "model-load-start": return "Loading pinned q4 Granite model/runtime";
    case "model-load-complete": return "Pinned q4 Granite model/runtime loaded";
    case "prompt-prepare-start": return "Preparing fixed benchmark prompt";
    case "prompt-prepare-complete": return "Prompt ready";
    case "ready": return "READY";
    default: return stage ?? "unknown";
  }
}

function median(values) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function tokenWindows(result) {
  const offsets = result?.tokenOffsetsMs;
  if (!Array.isArray(offsets) || offsets.length < FIXED_NEW_TOKENS) return null;

  const windows = [];
  for (let endToken = 10; endToken <= FIXED_NEW_TOKENS; endToken += 10) {
    const endMs = offsets[endToken - 1];
    const startMs = endToken === 10 ? 0 : offsets[endToken - 11];
    const durationMs = endMs - startMs;
    windows.push({
      tokenStart: endToken - 9,
      tokenEnd: endToken,
      durationMs,
      tokensPerSecond: durationMs > 0 ? 10000 / durationMs : null,
    });
  }
  return windows;
}

function windowsText(windows) {
  if (!windows) return "unavailable";
  return windows
    .map((window) => `${window.tokenStart}-${window.tokenEnd}: ${window.tokensPerSecond?.toFixed(2) ?? "n/a"} tok/s`)
    .join(" | ");
}

class Lane {
  constructor(config) {
    this.config = config;
    this.statusElement = document.querySelector(`#${config.workerId}-status`);
    this.stageElement = document.querySelector(`#${config.workerId}-stage`);
    this.elapsedElement = document.querySelector(`#${config.workerId}-elapsed`);
    this.progressElement = document.querySelector(`#${config.workerId}-progress`);
    this.activityElement = document.querySelector(`#${config.workerId}-activity`);
    this.progressBar = document.querySelector(`#${config.workerId}-bar`);
    this.initButton = document.querySelector(`#init-${config.workerId}`);
    this.worker = new Worker(WORKER_URL, { type: "module", name: config.workerId });
    this.ready = false;
    this.loading = false;
    this.stage = "idle";
    this.initRequestedAtMs = null;
    this.readyAtMs = null;
    this.finishedAtMs = null;
    this.lastSignalReceivedAtMs = null;
    this.lastDownloadPercent = null;
    this.lastDownloadedBytes = null;
    this.lastDownloadTotalBytes = null;
    this.readyMessage = null;
    this.artifactVerified = false;
    this.initWaiter = null;
    this.runWaiters = new Map();

    this.worker.addEventListener("message", (event) => this.onMessage(event.data));
    this.worker.addEventListener("error", (event) => {
      const error = `Worker script error: ${event.message}`;
      record(this.config.workerId, { type: "worker-script-error", error });
      this.loading = false;
      this.ready = false;
      this.setStatus("ERROR: worker script failed.", false);
      this.setStage("worker-script-error");
      appendLog(`${this.config.workerId.toUpperCase()}: ${error}`);
      this.failAll(new Error(error));
      updateBenchmarkButton();
    });
  }

  setStatus(text, ok = null) {
    this.statusElement.textContent = text;
    this.statusElement.className = ok === true ? "ok" : ok === false ? "bad" : "working";
  }

  setStage(stage) {
    this.stage = stage ?? "unknown";
    this.stageElement.textContent = `Stage: ${humanStage(this.stage)}`;
  }

  markSignal() {
    this.lastSignalReceivedAtMs = nowMs();
  }

  updateLoadDisplay() {
    if (benchmarkRunning) return;
    if (this.initRequestedAtMs !== null) {
      const end = this.loading ? nowMs() : (this.ready ? this.readyAtMs : this.finishedAtMs);
      if (Number.isFinite(end)) {
        this.elapsedElement.textContent = `Load elapsed: ${formatSeconds(end - this.initRequestedAtMs)}`;
      }
    }

    if (this.lastSignalReceivedAtMs === null) {
      this.activityElement.textContent = "Worker signal: none yet.";
      return;
    }

    const ageMs = Math.max(0, nowMs() - this.lastSignalReceivedAtMs);
    if (this.ready) {
      this.activityElement.textContent = "Worker signal: READY.";
    } else if (this.loading && ageMs <= 7000) {
      this.activityElement.textContent = `Worker signal: ACTIVE · ${formatSeconds(ageMs)} ago.`;
    } else if (this.loading) {
      this.activityElement.textContent = `Worker signal: ${formatSeconds(ageMs)} ago · runtime may be busy; no error reported.`;
    } else {
      this.activityElement.textContent = `Worker signal: ${formatSeconds(ageMs)} ago.`;
    }
  }

  updateDownload(progress) {
    if (!Number.isFinite(progress?.loaded) || !Number.isFinite(progress?.total) || progress.total <= 0) return false;
    const percent = Math.max(0, Math.min(100, (progress.loaded / progress.total) * 100));
    this.lastDownloadPercent = percent;
    this.lastDownloadedBytes = progress.loaded;
    this.lastDownloadTotalBytes = progress.total;
    this.progressBar.value = percent;
    const loaded = formatBytes(progress.loaded);
    const total = formatBytes(progress.total);
    this.progressElement.textContent = `Model download: ${loaded} / ${total} · ${percent.toFixed(1)}%.`;
    return true;
  }

  snapshot() {
    return {
      ready: this.ready,
      loading: this.loading,
      stage: this.stage,
      artifactVerified: this.artifactVerified,
      initRequestedAtMs: this.initRequestedAtMs,
      lastSignalReceivedAtMs: this.lastSignalReceivedAtMs,
      lastDownloadPercent: this.lastDownloadPercent,
      lastDownloadedBytes: this.lastDownloadedBytes,
      lastDownloadTotalBytes: this.lastDownloadTotalBytes,
      readyMessage: this.readyMessage,
    };
  }

  onMessage(message) {
    this.markSignal();
    record(this.config.workerId, message);

    switch (message.type) {
      case "load-start":
        this.loading = true;
        this.setStage(message.stage ?? "load-start");
        this.setStatus(`WORKING: loading ${message.device}/q4 from pinned revision.`);
        if (this.config.workerId === "cpu" && message.wasmConfiguration) {
          document.querySelector("#cpu-thread-config").textContent =
            `WASM threads requested: ${message.wasmConfiguration.requestedThreads}; fixed SIMD probe: ${message.wasmConfiguration.fixedSimdFeatureProbe ? "pass" : "fail"}`;
        }
        appendLog(`${this.config.workerId.toUpperCase()}: pinned q4 load started.`);
        break;

      case "checkpoint": {
        const checkpoint = message.checkpoint ?? message.stage;
        this.setStage(checkpoint);
        if (checkpoint === "tokenizer-load-start") {
          this.progressBar.removeAttribute("value");
          this.progressElement.textContent = "Tokenizer: loading pinned revision.";
        } else if (checkpoint === "tokenizer-load-complete") {
          this.progressElement.textContent = "Tokenizer complete. Starting q4 model load.";
        } else if (checkpoint === "model-load-start") {
          this.progressBar.removeAttribute("value");
          this.progressElement.textContent = "q4 model: locating graph and weights.";
        } else if (checkpoint === "model-load-complete") {
          this.progressBar.value = 100;
          this.progressElement.textContent = message.expectedQ4FilesObserved
            ? "q4 graph and q4 external weights observed. Runtime loaded."
            : "Runtime loaded, but q4 file telemetry is incomplete.";
          if (this.config.workerId === "cpu" && message.wasmConfiguration) {
            document.querySelector("#cpu-thread-config").textContent =
              `WASM threads resolved: ${message.wasmConfiguration.resolvedThreads}; SIMD: ${message.wasmConfiguration.resolvedSimd}; proxy: ${message.wasmConfiguration.resolvedProxy}`;
          }
        }
        if (!benchmarkRunning) appendLog(`${this.config.workerId.toUpperCase()}: ${humanStage(checkpoint)}.`);
        break;
      }

      case "load-progress": {
        this.setStage(message.stage);
        const progress = message.progress ?? {};
        const aggregateUpdated = progress.status === "progress_total" && this.updateDownload(progress);
        if (!aggregateUpdated && progress.status === "progress" && progress.file?.includes("onnx_data")) {
          this.updateDownload(progress);
        }
        break;
      }

      case "heartbeat":
        this.setStage(message.stage);
        break;

      case "ready":
        this.loading = false;
        this.ready = true;
        this.readyAtMs = nowMs();
        this.readyMessage = message;
        this.artifactVerified = message.dtype === "q4" && message.expectedQ4FilesObserved === true;
        this.setStage("ready");
        this.progressBar.value = 100;
        this.progressElement.textContent = this.artifactVerified
          ? "READY: exact q4 graph and weights verified by load telemetry."
          : "READY, but exact q4 file telemetry was not verified.";
        this.setStatus(
          this.artifactVerified ? `READY. Load ${formatMs(message.loadDurationMs)}.` : "READY but artifact verification incomplete.",
          this.artifactVerified,
        );
        appendLog(`${this.config.workerId.toUpperCase()}: READY after ${formatMs(message.loadDurationMs)}; q4 verified=${this.artifactVerified}.`);
        this.initWaiter?.resolve(message);
        this.initWaiter = null;
        updateBenchmarkButton();
        break;

      case "load-error":
        this.loading = false;
        this.ready = false;
        this.finishedAtMs = nowMs();
        this.setStage(`error after ${message.failedStage ?? "unknown"}`);
        this.setStatus("ERROR: load failed. See log/evidence.", false);
        appendLog(`${this.config.workerId.toUpperCase()}: load failed during ${message.failedStage ?? "unknown"}: ${message.error}`);
        this.initWaiter?.reject(new Error(message.error));
        this.initWaiter = null;
        updateBenchmarkButton();
        break;

      case "inference-complete": {
        const waiter = this.runWaiters.get(message.label);
        if (waiter) {
          this.runWaiters.delete(message.label);
          waiter.resolve(message);
        }
        break;
      }

      case "inference-error": {
        const waiter = this.runWaiters.get(message.label);
        if (waiter) {
          this.runWaiters.delete(message.label);
          waiter.reject(new Error(message.error));
        }
        break;
      }

      case "worker-error":
        appendLog(`${this.config.workerId.toUpperCase()}: ${message.error}`);
        break;
    }
  }

  failAll(error) {
    this.initWaiter?.reject(error);
    this.initWaiter = null;
    for (const waiter of this.runWaiters.values()) waiter.reject(error);
    this.runWaiters.clear();
  }

  init() {
    if (this.loading || this.ready || this.initWaiter) {
      return Promise.reject(new Error(`${this.config.workerId} lane is already initialized or initializing.`));
    }

    this.loading = true;
    this.initRequestedAtMs = nowMs();
    this.initButton.disabled = true;
    this.progressBar.removeAttribute("value");
    this.progressElement.textContent = "Initialization requested; waiting for worker.";
    this.setStage("init-command-dispatched");
    this.setStatus("WORKING: initialization command sent.");
    record("main", {
      type: "command-dispatch",
      command: "init",
      lane: this.config.workerId,
      atMs: this.initRequestedAtMs,
      device: this.config.device,
      dtype: this.config.dtype,
    });

    return new Promise((resolve, reject) => {
      this.initWaiter = { resolve, reject };
      this.worker.postMessage({ command: "init", ...this.config });
    });
  }

  run(label, { profile = false, measured = true } = {}) {
    if (!this.ready || !this.artifactVerified) {
      return Promise.reject(new Error(`${this.config.workerId} lane is not ready with verified q4 artifact.`));
    }
    if (this.runWaiters.has(label)) {
      return Promise.reject(new Error(`Duplicate run label: ${label}`));
    }

    const dispatchAtMs = nowMs();
    record("main", {
      type: "command-dispatch",
      command: "run",
      lane: this.config.workerId,
      label,
      profile,
      measured,
      targetNewTokens: FIXED_NEW_TOKENS,
      atMs: dispatchAtMs,
    });

    return new Promise((resolve, reject) => {
      this.runWaiters.set(label, { resolve, reject });
      this.worker.postMessage({ command: "run", label, profile, measured });
    });
  }
}

const cpuLane = new Lane(evidence.lanes.cpu);
const gpuLane = new Lane(evidence.lanes.gpu);

function updateBenchmarkButton() {
  phase1Button.disabled = benchmarkRunning || !(
    cpuLane.ready &&
    gpuLane.ready &&
    cpuLane.artifactVerified &&
    gpuLane.artifactVerified
  );
}

function beginInitialization(lane) {
  lane.init().catch((error) => {
    appendLog(`${lane.config.workerId.toUpperCase()} initialization ended without READY: ${serializeError(error)}`);
  });
}

function setBenchmarkStep(text) {
  currentBenchmarkStep = text;
  benchmarkStatus.textContent = `${text} This is a 100-token generation. The page intentionally does not stream token progress during the timed call.`;
  record("main", { type: "benchmark-step", step: text, atMs: nowMs() });
}

async function runSingleStep(text, lane, label, options) {
  setBenchmarkStep(text);
  const result = await lane.run(label, options);
  appendLog(`${text} complete in ${formatSeconds(result.durationMs)}.`);
  return result;
}

function showSummary(results) {
  const { cpuProfile, gpuProfile, cpuSolo, gpuSolo, cpuConcurrent, gpuConcurrent, batchStartMs, batchEndMs } = results;
  const sequentialReferenceMs = cpuSolo.durationMs + gpuSolo.durationMs;
  const concurrentStartMs = Math.min(cpuConcurrent.startMs, gpuConcurrent.startMs);
  const concurrentEndMs = Math.max(cpuConcurrent.endMs, gpuConcurrent.endMs);
  const concurrentMakespanMs = concurrentEndMs - concurrentStartMs;
  const overlapMs = Math.max(
    0,
    Math.min(cpuConcurrent.endMs, gpuConcurrent.endMs) - Math.max(cpuConcurrent.startMs, gpuConcurrent.startMs),
  );
  const timeSavedMs = sequentialReferenceMs - concurrentMakespanMs;
  const overlapRatio = sequentialReferenceMs > 0 ? 1 - concurrentMakespanMs / sequentialReferenceMs : null;
  const cpuTokensPerSecond = FIXED_NEW_TOKENS / (cpuSolo.durationMs / 1000);
  const gpuTokensPerSecond = FIXED_NEW_TOKENS / (gpuSolo.durationMs / 1000);
  const durationRatio = gpuSolo.durationMs > 0 ? cpuSolo.durationMs / gpuSolo.durationMs : null;
  const cpuProfileWindows = tokenWindows(cpuProfile);
  const gpuProfileWindows = tokenWindows(gpuProfile);

  evidence.summary = {
    fixedNewTokens: FIXED_NEW_TOKENS,
    modelId: MODEL_ID,
    modelRevision: MODEL_REVISION,
    dtype: "q4",
    cpuWasmConfiguration: cpuLane.readyMessage?.wasmConfiguration ?? null,
    cpuProfileMs: cpuProfile.durationMs,
    gpuProfileMs: gpuProfile.durationMs,
    cpuProfileFirstTokenMs: cpuProfile.tokenOffsetsMs?.[0] ?? null,
    gpuProfileFirstTokenMs: gpuProfile.tokenOffsetsMs?.[0] ?? null,
    cpuProfileTokenWindows: cpuProfileWindows,
    gpuProfileTokenWindows: gpuProfileWindows,
    cpuSoloMs: cpuSolo.durationMs,
    gpuSoloMs: gpuSolo.durationMs,
    cpuSoloTokensPerSecond: cpuTokensPerSecond,
    gpuSoloTokensPerSecond: gpuTokensPerSecond,
    cpuToGpuDurationRatio: durationRatio,
    sequentialReferenceMs,
    concurrentCpuMs: cpuConcurrent.durationMs,
    concurrentGpuMs: gpuConcurrent.durationMs,
    concurrentInferenceMakespanMs: concurrentMakespanMs,
    mainPageBatchMakespanMs: batchEndMs - batchStartMs,
    observedWorkerIntervalOverlapMs: overlapMs,
    timeSavedVsSequentialReferenceMs: timeSavedMs,
    overlapRatio,
  };

  document.querySelector("#summary").hidden = false;
  document.querySelector("#cpu-profile").textContent = `CPU profile: ${formatSeconds(cpuProfile.durationMs)}; first token ${formatMs(cpuProfile.tokenOffsetsMs?.[0])}; timestamps ${cpuProfile.profileTimestampCount}.`;
  document.querySelector("#gpu-profile").textContent = `GPU profile: ${formatSeconds(gpuProfile.durationMs)}; first token ${formatMs(gpuProfile.tokenOffsetsMs?.[0])}; timestamps ${gpuProfile.profileTimestampCount}.`;
  document.querySelector("#cpu-baseline").textContent = `CPU clean solo: ${formatSeconds(cpuSolo.durationMs)}; ${cpuTokensPerSecond.toFixed(2)} tokens/s.`;
  document.querySelector("#gpu-baseline").textContent = `GPU clean solo: ${formatSeconds(gpuSolo.durationMs)}; ${gpuTokensPerSecond.toFixed(2)} tokens/s.`;
  document.querySelector("#speed-ratio").textContent = `CPU/GPU clean duration ratio: ${durationRatio?.toFixed(2) ?? "n/a"}x.`;
  document.querySelector("#sequential-reference").textContent = `Sequential clean reference: ${formatSeconds(sequentialReferenceMs)}.`;
  document.querySelector("#concurrent-makespan").textContent = `Concurrent makespan: ${formatSeconds(concurrentMakespanMs)}.`;
  document.querySelector("#overlap-time").textContent = `Recorded worker interval overlap: ${formatSeconds(overlapMs)}.`;
  document.querySelector("#time-saved").textContent = `Time saved versus clean sequential reference: ${formatSeconds(timeSavedMs)}.`;
  document.querySelector("#overlap-ratio").textContent = `Descriptive overlap ratio: ${overlapRatio === null ? "n/a" : overlapRatio.toFixed(3)}.`;
  document.querySelector("#cpu-windows").textContent = `CPU 10-token profile windows: ${windowsText(cpuProfileWindows)}`;
  document.querySelector("#gpu-windows").textContent = `GPU 10-token profile windows: ${windowsText(gpuProfileWindows)}`;
}

document.querySelector("#init-cpu").addEventListener("click", () => beginInitialization(cpuLane));
document.querySelector("#init-gpu").addEventListener("click", () => beginInitialization(gpuLane));

document.querySelector("#gpu-availability").textContent = `WebGPU exposed: ${navigator.gpu ? "yes" : "no"}`;
document.querySelector("#hardware-concurrency").textContent = `navigator.hardwareConcurrency: ${navigator.hardwareConcurrency ?? "unavailable"}`;
document.querySelector("#cross-origin-isolated").textContent = `crossOriginIsolated: ${self.crossOriginIsolated ? "yes" : "no"}`;
document.querySelector("#shared-array-buffer").textContent = `SharedArrayBuffer exposed: ${typeof SharedArrayBuffer !== "undefined" ? "yes" : "no"}`;
document.querySelector("#page-url").textContent = location.href;

setInterval(() => {
  if (benchmarkRunning) return;
  cpuLane.updateLoadDisplay();
  gpuLane.updateLoadDisplay();
}, 500);

appendLog("Revision 4 loaded. Both lanes require pinned q4. Benchmark work is exactly 100 new tokens per generation.");

phase1Button.addEventListener("click", async () => {
  benchmarkRunning = true;
  updateBenchmarkButton();

  try {
    const cpuProfile = await runSingleStep(
      "CPU profiling pass",
      cpuLane,
      "cpu-profile-100",
      { profile: true, measured: false },
    );

    const gpuProfile = await runSingleStep(
      "GPU profiling pass",
      gpuLane,
      "gpu-profile-100",
      { profile: true, measured: false },
    );

    const cpuSolo = await runSingleStep(
      "CPU clean solo benchmark",
      cpuLane,
      "cpu-solo-100",
      { profile: false, measured: true },
    );

    const gpuSolo = await runSingleStep(
      "GPU clean solo benchmark",
      gpuLane,
      "gpu-solo-100",
      { profile: false, measured: true },
    );

    setBenchmarkStep("Concurrent CPU plus GPU benchmark");
    const batchStartMs = nowMs();
    const [cpuConcurrent, gpuConcurrent] = await Promise.all([
      cpuLane.run("cpu-concurrent-100", { profile: false, measured: true }),
      gpuLane.run("gpu-concurrent-100", { profile: false, measured: true }),
    ]);
    const batchEndMs = nowMs();
    appendLog(`Concurrent pair complete in ${formatSeconds(batchEndMs - batchStartMs)} main-page wall time.`);

    showSummary({
      cpuProfile,
      gpuProfile,
      cpuSolo,
      gpuSolo,
      cpuConcurrent,
      gpuConcurrent,
      batchStartMs,
      batchEndMs,
    });

    currentBenchmarkStep = "complete";
    benchmarkStatus.textContent = "COMPLETE. Revision 4 finished. Download the evidence JSON now.";
    appendLog("Revision 4 complete. Evidence JSON is ready for export.");
  } catch (error) {
    record("main", {
      type: "benchmark-error",
      atMs: nowMs(),
      step: currentBenchmarkStep,
      error: serializeError(error),
    });
    benchmarkStatus.textContent = `STOPPED during ${currentBenchmarkStep ?? "benchmark"}. An explicit error was recorded.`;
    appendLog(`Revision 4 stopped: ${serializeError(error)}`);
  } finally {
    benchmarkRunning = false;
    updateBenchmarkButton();
  }
});

downloadButton.addEventListener("click", () => {
  const snapshot = {
    ...evidence,
    benchmarkRunning,
    currentBenchmarkStep,
    laneSnapshots: {
      cpu: cpuLane.snapshot(),
      gpu: gpuLane.snapshot(),
    },
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `granite-cpu-gpu-worker-concurrency-r4-${new Date().toISOString().replaceAll(":", "-")}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.addEventListener("visibilitychange", () => {
  record("main", {
    type: "visibility-change",
    atMs: nowMs(),
    visibilityState: document.visibilityState,
  });
});

window.addEventListener("error", (event) => {
  record("main", { type: "window-error", atMs: nowMs(), error: event.message });
});

window.addEventListener("unhandledrejection", (event) => {
  record("main", { type: "unhandled-rejection", atMs: nowMs(), error: serializeError(event.reason) });
});
