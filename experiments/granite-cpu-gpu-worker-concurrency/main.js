const WORKER_URL = new URL("./worker.js", import.meta.url);

const evidence = {
  experiment: "granite-cpu-gpu-worker-concurrency",
  phase: 1,
  probeRevision: 3,
  createdAt: new Date().toISOString(),
  metadata: {
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    secureContext: self.isSecureContext,
    webgpuAvailable: Boolean(navigator.gpu),
    transformersVersion: "4.3.0",
    modelId: "onnx-community/granite-4.0-350m-ONNX-web",
  },
  lanes: {
    cpu: { workerId: "cpu", device: "wasm", dtype: "q4" },
    gpu: { workerId: "gpu", device: "webgpu", dtype: "q4" },
  },
  events: [],
  summary: null,
};

const logElement = document.querySelector("#log");
const phase1Button = document.querySelector("#phase1");
const downloadButton = document.querySelector("#download");

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
  return Number.isFinite(value) ? `${(value / 1000).toFixed(1)} s` : "n/a";
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
    case "model-load-start": return "Loading Granite model/runtime";
    case "model-load-complete": return "Granite model/runtime loaded";
    case "prompt-prepare-start": return "Preparing test prompt";
    case "prompt-prepare-complete": return "Prompt ready";
    case "ready": return "READY";
    default: return stage ?? "unknown";
  }
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
    this.workerLoadStartMs = null;
    this.lastSignalReceivedAtMs = null;
    this.lastDownloadPercent = null;
    this.lastDownloadedBytes = null;
    this.lastDownloadTotalBytes = null;
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
      updatePhaseButton();
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

  updateElapsed() {
    if (this.initRequestedAtMs === null) return;
    const end = this.loading ? nowMs() : (this.ready ? this.readyAtMs : this.finishedAtMs);
    if (!Number.isFinite(end)) return;
    this.elapsedElement.textContent = `Elapsed: ${formatSeconds(end - this.initRequestedAtMs)}`;
  }

  updateActivity() {
    if (this.lastSignalReceivedAtMs === null) {
      this.activityElement.textContent = "Worker signal: none yet.";
      return;
    }

    const ageMs = Math.max(0, nowMs() - this.lastSignalReceivedAtMs);
    if (this.ready) {
      this.activityElement.textContent = `Worker signal: READY · ${formatSeconds(ageMs)} since last message.`;
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
    if (percent >= 99.95 && this.stage === "model-load-start") {
      this.progressElement.textContent = `Model download: ${loaded} / ${total} · 100% · download complete; runtime/session construction may still be working.`;
    } else {
      this.progressElement.textContent = `Model download: ${loaded} / ${total} · ${percent.toFixed(1)}%.`;
    }
    return true;
  }

  snapshot() {
    return {
      ready: this.ready,
      loading: this.loading,
      stage: this.stage,
      initRequestedAtMs: this.initRequestedAtMs,
      lastSignalReceivedAtMs: this.lastSignalReceivedAtMs,
      lastDownloadPercent: this.lastDownloadPercent,
      lastDownloadedBytes: this.lastDownloadedBytes,
      lastDownloadTotalBytes: this.lastDownloadTotalBytes,
    };
  }

  onMessage(message) {
    this.markSignal();
    record(this.config.workerId, message);

    switch (message.type) {
      case "load-start":
        this.loading = true;
        this.workerLoadStartMs = message.loadStartMs ?? message.atMs ?? null;
        this.setStage(message.stage ?? "load-start");
        this.setStatus(`WORKING: loading ${message.device}/${message.dtype}.`);
        appendLog(`${this.config.workerId.toUpperCase()}: load started (${message.device}/${message.dtype}).`);
        break;

      case "checkpoint": {
        const checkpoint = message.checkpoint ?? message.stage;
        this.setStage(checkpoint);
        if (checkpoint === "tokenizer-load-start") {
          this.progressBar.removeAttribute("value");
          this.progressElement.textContent = "Tokenizer: loading…";
          this.setStatus("WORKING: loading tokenizer.");
        } else if (checkpoint === "tokenizer-load-complete") {
          this.progressElement.textContent = "Tokenizer: complete. Waiting for model download progress…";
          this.setStatus("WORKING: tokenizer ready; starting Granite model load.");
        } else if (checkpoint === "model-load-start") {
          this.progressBar.removeAttribute("value");
          this.progressElement.textContent = "Model: locating files and starting download…";
          this.setStatus("WORKING: loading Granite model/runtime.");
        } else if (checkpoint === "model-load-complete") {
          this.progressBar.value = 100;
          this.progressElement.textContent = "Model/runtime load complete. Preparing test prompt…";
          this.setStatus("WORKING: Granite loaded; preparing prompt.");
        } else if (checkpoint === "prompt-prepare-start") {
          this.setStatus("WORKING: preparing deterministic test prompt.");
        } else if (checkpoint === "prompt-prepare-complete") {
          this.setStatus("WORKING: prompt prepared; finalizing lane.");
        }
        appendLog(`${this.config.workerId.toUpperCase()}: ${humanStage(checkpoint)}.`);
        break;
      }

      case "load-progress": {
        this.setStage(message.stage);
        const progress = message.progress ?? {};
        const aggregateUpdated = progress.status === "progress_total" && this.updateDownload(progress);

        if (!aggregateUpdated && message.owner === "tokenizer" && progress.status === "progress" && Number.isFinite(progress.progress)) {
          this.progressElement.textContent = `Tokenizer file: ${progress.file ?? "unknown"} · ${progress.progress.toFixed(1)}%.`;
        }

        if (!aggregateUpdated && progress.status === "progress" && progress.file?.includes("onnx_data")) {
          this.updateDownload(progress);
        }

        if (progress.status === "initiate" || progress.status === "download" || progress.status === "done") {
          const file = progress.file ?? progress.name ?? "resource";
          appendLog(`${this.config.workerId.toUpperCase()}: ${message.owner} ${progress.status} ${file}.`);
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
        this.setStage("ready");
        this.progressBar.value = 100;
        this.progressElement.textContent = "READY: model and test prompt loaded.";
        this.setStatus(`READY. Load ${formatMs(message.loadDurationMs)}.`, true);
        this.elapsedElement.textContent = `Elapsed: ${formatSeconds(message.loadDurationMs)}`;
        appendLog(`${this.config.workerId.toUpperCase()}: READY after ${formatMs(message.loadDurationMs)}.`);
        this.initWaiter?.resolve(message);
        this.initWaiter = null;
        updatePhaseButton();
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
        updatePhaseButton();
        break;

      case "inference-start":
        appendLog(`${this.config.workerId.toUpperCase()}: ${message.label} started.`);
        break;

      case "inference-complete": {
        appendLog(`${this.config.workerId.toUpperCase()}: ${message.label} completed in ${formatMs(message.durationMs)}.`);
        const waiter = this.runWaiters.get(message.label);
        if (waiter) {
          this.runWaiters.delete(message.label);
          waiter.resolve(message);
        }
        break;
      }

      case "inference-error": {
        appendLog(`${this.config.workerId.toUpperCase()}: ${message.label} failed: ${message.error}`);
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
    this.progressElement.textContent = "Initialization requested; waiting for worker…";
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

  run(label, warmup = false) {
    if (!this.ready) return Promise.reject(new Error(`${this.config.workerId} lane is not ready.`));
    if (this.runWaiters.has(label)) return Promise.reject(new Error(`Duplicate run label: ${label}`));

    const dispatchAtMs = nowMs();
    record("main", {
      type: "command-dispatch",
      command: warmup ? "warmup" : "run",
      lane: this.config.workerId,
      label,
      atMs: dispatchAtMs,
    });

    return new Promise((resolve, reject) => {
      this.runWaiters.set(label, { resolve, reject });
      this.worker.postMessage({ command: warmup ? "warmup" : "run", label });
    });
  }
}

function showSummary(cpuBaseline, gpuBaseline, cpuConcurrent, gpuConcurrent, batchStartMs, batchEndMs) {
  const sequentialReferenceMs = cpuBaseline.durationMs + gpuBaseline.durationMs;
  const concurrentStartMs = Math.min(cpuConcurrent.startMs, gpuConcurrent.startMs);
  const concurrentEndMs = Math.max(cpuConcurrent.endMs, gpuConcurrent.endMs);
  const concurrentMakespanMs = concurrentEndMs - concurrentStartMs;
  const overlapMs = Math.max(
    0,
    Math.min(cpuConcurrent.endMs, gpuConcurrent.endMs) -
      Math.max(cpuConcurrent.startMs, gpuConcurrent.startMs),
  );
  const timeSavedMs = sequentialReferenceMs - concurrentMakespanMs;
  const overlapRatio = sequentialReferenceMs > 0
    ? 1 - concurrentMakespanMs / sequentialReferenceMs
    : null;

  evidence.summary = {
    cpuBaselineMs: cpuBaseline.durationMs,
    gpuBaselineMs: gpuBaseline.durationMs,
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
  document.querySelector("#cpu-baseline").textContent = `CPU solo baseline: ${formatMs(cpuBaseline.durationMs)}`;
  document.querySelector("#gpu-baseline").textContent = `GPU solo baseline: ${formatMs(gpuBaseline.durationMs)}`;
  document.querySelector("#sequential-reference").textContent = `Sequential reference: ${formatMs(sequentialReferenceMs)}`;
  document.querySelector("#concurrent-makespan").textContent = `Concurrent inference makespan: ${formatMs(concurrentMakespanMs)}`;
  document.querySelector("#overlap-time").textContent = `Recorded worker interval overlap: ${formatMs(overlapMs)}`;
  document.querySelector("#time-saved").textContent = `Time saved vs sequential reference: ${formatMs(timeSavedMs)}`;
  document.querySelector("#overlap-ratio").textContent = `Descriptive overlap ratio: ${overlapRatio === null ? "n/a" : overlapRatio.toFixed(3)}`;

  appendLog(`Phase 1 complete. Concurrent makespan ${formatMs(concurrentMakespanMs)} vs sequential reference ${formatMs(sequentialReferenceMs)}.`);
}

const cpuLane = new Lane(evidence.lanes.cpu);
const gpuLane = new Lane(evidence.lanes.gpu);
let phaseRunning = false;

function updatePhaseButton() {
  phase1Button.disabled = phaseRunning || !(cpuLane.ready && gpuLane.ready);
}

function beginInitialization(lane) {
  lane.init().catch((error) => {
    appendLog(`${lane.config.workerId.toUpperCase()} initialization ended without READY: ${serializeError(error)}`);
  });
}

document.querySelector("#init-cpu").addEventListener("click", () => beginInitialization(cpuLane));
document.querySelector("#init-gpu").addEventListener("click", () => beginInitialization(gpuLane));

document.querySelector("#gpu-availability").textContent = `WebGPU exposed: ${navigator.gpu ? "yes" : "no"}`;
document.querySelector("#hardware-concurrency").textContent = `navigator.hardwareConcurrency: ${navigator.hardwareConcurrency ?? "unavailable"}`;
document.querySelector("#page-url").textContent = location.href;

setInterval(() => {
  cpuLane.updateElapsed();
  gpuLane.updateElapsed();
  cpuLane.updateActivity();
  gpuLane.updateActivity();
}, 500);

appendLog("Probe revision 3 loaded. Load telemetry is throttled; live bars show observed download progress. No artificial load timeout is applied.");

phase1Button.addEventListener("click", async () => {
  phaseRunning = true;
  updatePhaseButton();

  try {
    appendLog("CPU warmup (unmeasured comparison setup).");
    await cpuLane.run("cpu-warmup", true);

    appendLog("GPU warmup (unmeasured comparison setup).");
    await gpuLane.run("gpu-warmup", true);

    appendLog("Running CPU solo baseline.");
    const cpuBaseline = await cpuLane.run("cpu-baseline");

    appendLog("Running GPU solo baseline.");
    const gpuBaseline = await gpuLane.run("gpu-baseline");

    appendLog("Launching CPU and GPU measured runs together from separate workers.");
    const batchStartMs = nowMs();
    const [cpuConcurrent, gpuConcurrent] = await Promise.all([
      cpuLane.run("cpu-concurrent"),
      gpuLane.run("gpu-concurrent"),
    ]);
    const batchEndMs = nowMs();

    showSummary(
      cpuBaseline,
      gpuBaseline,
      cpuConcurrent,
      gpuConcurrent,
      batchStartMs,
      batchEndMs,
    );
  } catch (error) {
    record("main", { type: "phase1-error", atMs: nowMs(), error: serializeError(error) });
    appendLog(`Phase 1 stopped on observed failure: ${serializeError(error)}`);
  } finally {
    phaseRunning = false;
    updatePhaseButton();
  }
});

downloadButton.addEventListener("click", () => {
  const snapshot = {
    ...evidence,
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
  anchor.download = `granite-cpu-gpu-worker-concurrency-r3-${new Date().toISOString().replaceAll(":", "-")}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.addEventListener("visibilitychange", () => {
  record("main", {
    type: "visibility-change",
    atMs: nowMs(),
    visibilityState: document.visibilityState,
  });
  appendLog(`Page visibility: ${document.visibilityState}.`);
});

window.addEventListener("error", (event) => {
  record("main", { type: "window-error", atMs: nowMs(), error: event.message });
});

window.addEventListener("unhandledrejection", (event) => {
  record("main", { type: "unhandled-rejection", atMs: nowMs(), error: serializeError(event.reason) });
});