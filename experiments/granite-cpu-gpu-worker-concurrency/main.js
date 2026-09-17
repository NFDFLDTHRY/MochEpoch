const WORKER_URL = new URL("./worker.js", import.meta.url);

const evidence = {
  experiment: "granite-cpu-gpu-worker-concurrency",
  phase: 1,
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
    gpu: { workerId: "gpu", device: "webgpu", dtype: "q4f16" },
  },
  events: [],
  summary: null,
};

const logElement = document.querySelector("#log");
const initializeButton = document.querySelector("#initialize");
const phase1Button = document.querySelector("#phase1");
const downloadButton = document.querySelector("#download");
const cpuStatus = document.querySelector("#cpu-status");
const gpuStatus = document.querySelector("#gpu-status");

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

class Lane {
  constructor(config, statusElement) {
    this.config = config;
    this.statusElement = statusElement;
    this.worker = new Worker(WORKER_URL, { type: "module", name: config.workerId });
    this.ready = false;
    this.initWaiter = null;
    this.runWaiters = new Map();

    this.worker.addEventListener("message", (event) => this.onMessage(event.data));
    this.worker.addEventListener("error", (event) => {
      const error = `Worker script error: ${event.message}`;
      record(this.config.workerId, { type: "worker-script-error", error });
      appendLog(`${this.config.workerId.toUpperCase()}: ${error}`);
      this.failAll(new Error(error));
    });
  }

  setStatus(text, ok = null) {
    this.statusElement.textContent = text;
    this.statusElement.className = ok === true ? "ok" : ok === false ? "bad" : "";
  }

  onMessage(message) {
    record(this.config.workerId, message);

    if (message.type === "load-start") {
      this.setStatus("Loading model/runtime…");
      appendLog(`${this.config.workerId.toUpperCase()}: load started (${message.device}/${message.dtype}).`);
      return;
    }

    if (message.type === "ready") {
      this.ready = true;
      this.setStatus(`Ready. Load ${formatMs(message.loadDurationMs)}.`, true);
      appendLog(`${this.config.workerId.toUpperCase()}: ready after ${formatMs(message.loadDurationMs)}.`);
      this.initWaiter?.resolve(message);
      this.initWaiter = null;
      return;
    }

    if (message.type === "load-error") {
      this.ready = false;
      this.setStatus("Load failed. See log/evidence.", false);
      appendLog(`${this.config.workerId.toUpperCase()}: load failed: ${message.error}`);
      this.initWaiter?.reject(new Error(message.error));
      this.initWaiter = null;
      return;
    }

    if (message.type === "inference-start") {
      appendLog(`${this.config.workerId.toUpperCase()}: ${message.label} started.`);
      return;
    }

    if (message.type === "inference-complete") {
      appendLog(`${this.config.workerId.toUpperCase()}: ${message.label} completed in ${formatMs(message.durationMs)}.`);
      const waiter = this.runWaiters.get(message.label);
      if (waiter) {
        this.runWaiters.delete(message.label);
        waiter.resolve(message);
      }
      return;
    }

    if (message.type === "inference-error") {
      appendLog(`${this.config.workerId.toUpperCase()}: ${message.label} failed: ${message.error}`);
      const waiter = this.runWaiters.get(message.label);
      if (waiter) {
        this.runWaiters.delete(message.label);
        waiter.reject(new Error(message.error));
      }
      return;
    }

    if (message.type === "worker-error") {
      appendLog(`${this.config.workerId.toUpperCase()}: ${message.error}`);
    }
  }

  failAll(error) {
    this.initWaiter?.reject(error);
    this.initWaiter = null;
    for (const waiter of this.runWaiters.values()) waiter.reject(error);
    this.runWaiters.clear();
  }

  init() {
    if (this.initWaiter) throw new Error(`${this.config.workerId} initialization already pending.`);
    return new Promise((resolve, reject) => {
      this.initWaiter = { resolve, reject };
      this.worker.postMessage({ command: "init", ...this.config });
    });
  }

  run(label, warmup = false) {
    if (!this.ready) return Promise.reject(new Error(`${this.config.workerId} lane is not ready.`));
    if (this.runWaiters.has(label)) return Promise.reject(new Error(`Duplicate run label: ${label}`));
    return new Promise((resolve, reject) => {
      this.runWaiters.set(label, { resolve, reject });
      this.worker.postMessage({ command: warmup ? "warmup" : "run", label });
    });
  }
}

function formatMs(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} ms` : "n/a";
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

const cpuLane = new Lane(evidence.lanes.cpu, cpuStatus);
const gpuLane = new Lane(evidence.lanes.gpu, gpuStatus);

document.querySelector("#gpu-availability").textContent = `WebGPU exposed: ${navigator.gpu ? "yes" : "no"}`;
document.querySelector("#hardware-concurrency").textContent = `navigator.hardwareConcurrency: ${navigator.hardwareConcurrency ?? "unavailable"}`;
document.querySelector("#page-url").textContent = location.href;

appendLog("Probe loaded. No model sessions initialized yet.");

initializeButton.addEventListener("click", async () => {
  initializeButton.disabled = true;
  phase1Button.disabled = true;

  appendLog("Initializing CPU lane first; initialization concurrency is intentionally not under test.");
  let cpuReady = false;
  let gpuReady = false;

  try {
    await cpuLane.init();
    cpuReady = true;
  } catch (error) {
    appendLog(`CPU initialization preserved as failure: ${serializeError(error)}`);
  }

  appendLog("Initializing GPU lane second.");
  try {
    await gpuLane.init();
    gpuReady = true;
  } catch (error) {
    appendLog(`GPU initialization preserved as failure: ${serializeError(error)}`);
  }

  phase1Button.disabled = !(cpuReady && gpuReady);
  if (cpuReady && gpuReady) {
    appendLog("Both lanes ready. Phase 1 can run.");
  } else {
    appendLog("Phase 1 cannot run because both lanes are not ready. Export the failure evidence before changing the experiment.");
  }
});

phase1Button.addEventListener("click", async () => {
  phase1Button.disabled = true;
  initializeButton.disabled = true;

  try {
    appendLog("CPU warmup (unmeasured comparison setup). ");
    await cpuLane.run("cpu-warmup", true);

    appendLog("GPU warmup (unmeasured comparison setup). ");
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
  }
});

downloadButton.addEventListener("click", () => {
  const snapshot = {
    ...evidence,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `granite-cpu-gpu-worker-concurrency-${new Date().toISOString().replaceAll(":", "-")}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

window.addEventListener("error", (event) => {
  record("main", { type: "window-error", atMs: nowMs(), error: event.message });
});

window.addEventListener("unhandledrejection", (event) => {
  record("main", { type: "unhandled-rejection", atMs: nowMs(), error: serializeError(event.reason) });
});
