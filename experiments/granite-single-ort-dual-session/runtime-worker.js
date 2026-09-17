import {
  AutoTokenizer,
  AutoModelForCausalLM,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

const MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
const MODEL_REVISION = "6c9a6f61601df51e76b1efff0974d8d26c2a25b5";
const EXPECTED_Q4_FILES = ["onnx/model_q4.onnx", "onnx/model_q4.onnx_data"];

let tokenizer = null;
const models = { cpu: null, gpu: null };
let busy = false;

function nowMs() {
  return performance.timeOrigin + performance.now();
}

function post(type, detail = {}) {
  self.postMessage({ type, atMs: nowMs(), ...detail });
}

function fixedSimdSupported() {
  try {
    return WebAssembly.validate(new Uint8Array([
      0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11,
    ]));
  } catch {
    return false;
  }
}

function configureSingleOrtEnvironment() {
  const wasm = env.backends?.onnx?.wasm;
  if (!wasm) throw new Error("Transformers.js did not expose ONNX WASM environment.");
  if (!fixedSimdSupported()) throw new Error("Fixed-width WASM SIMD probe failed.");
  wasm.simd = "fixed";
  wasm.numThreads = 1;
  wasm.proxy = false;
  return {
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    crossOriginIsolated: Boolean(self.crossOriginIsolated),
    sharedArrayBufferAvailable: typeof SharedArrayBuffer !== "undefined",
    resolvedSimd: wasm.simd ?? null,
    resolvedThreads: wasm.numThreads ?? null,
    resolvedProxy: wasm.proxy ?? null,
  };
}

function progressReporter(lane) {
  const observed = new Set();
  let lastAt = 0;
  return {
    observed,
    callback(info) {
      if (info?.file?.startsWith("onnx/")) observed.add(info.file);
      const now = nowMs();
      const high = info?.status === "progress" || info?.status === "progress_total";
      if (high && now - lastAt < 500) return;
      if (high) lastAt = now;
      post("progress", {
        lane,
        progress: {
          status: info?.status ?? null,
          file: info?.file ?? null,
          loaded: Number.isFinite(info?.loaded) ? info.loaded : null,
          total: Number.isFinite(info?.total) ? info.total : null,
          progress: Number.isFinite(info?.progress) ? info.progress : null,
        },
      });
    },
  };
}

async function loadLane(lane) {
  const device = lane === "cpu" ? "wasm" : "webgpu";
  const reporter = progressReporter(lane);
  const startedAt = nowMs();
  post("session-load-start", { lane, device, dtype: "q4", startedAt });

  models[lane] = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    revision: MODEL_REVISION,
    device,
    dtype: "q4",
    progress_callback: reporter.callback,
  });

  const finishedAt = nowMs();
  post("session-load-complete", {
    lane,
    device,
    dtype: "q4",
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    observedModelFiles: [...reporter.observed].sort(),
    expectedQ4Files: EXPECTED_Q4_FILES,
    expectedQ4FilesObserved: EXPECTED_Q4_FILES.every((file) => reporter.observed.has(file)),
  });
}

async function initialize(order) {
  if (busy || models.cpu || models.gpu) throw new Error("Runtime already initialized or initializing. Reload for a fresh run.");
  if (!Array.isArray(order) || order.length !== 2 || !order.includes("cpu") || !order.includes("gpu")) {
    throw new Error("Invalid load order.");
  }

  busy = true;
  const environment = configureSingleOrtEnvironment();
  post("runtime-start", {
    transformersVersion: "4.3.0",
    modelId: MODEL_ID,
    modelRevision: MODEL_REVISION,
    oneWorker: true,
    oneTransformersModuleRealm: true,
    environment,
    requestedOrder: order,
  });

  try {
    const tokenizerStart = nowMs();
    post("tokenizer-load-start", { tokenizerStart });
    tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, { revision: MODEL_REVISION });
    const tokenizerEnd = nowMs();
    post("tokenizer-load-complete", { tokenizerStart, tokenizerEnd, durationMs: tokenizerEnd - tokenizerStart });

    await loadLane(order[0]);
    post("first-session-resident", { lane: order[0], secondLane: order[1] });
    await loadLane(order[1]);

    post("both-sessions-ready", {
      order,
      cpuResident: Boolean(models.cpu),
      gpuResident: Boolean(models.gpu),
      tokenizerResident: Boolean(tokenizer),
    });
  } catch (error) {
    post("runtime-error", {
      error: `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`,
      cpuResident: Boolean(models.cpu),
      gpuResident: Boolean(models.gpu),
    });
  } finally {
    busy = false;
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.command === "initialize-both") {
    initialize(event.data.order).catch((error) => {
      post("worker-error", { error: `${error?.name ?? "Error"}: ${error?.message ?? String(error)}` });
    });
  }
});
