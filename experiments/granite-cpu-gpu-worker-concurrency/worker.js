import {
  AutoTokenizer,
  AutoModelForCausalLM,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

const MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
const MODEL_REVISION = "6c9a6f61601df51e76b1efff0974d8d26c2a25b5";
const TRANSFORMERS_VERSION = "4.3.0";
const FIXED_NEW_TOKENS = 100;
const HEARTBEAT_MS = 5000;
const PROGRESS_THROTTLE_MS = 500;
const EXPECTED_Q4_FILES = Object.freeze([
  "onnx/model_q4.onnx",
  "onnx/model_q4.onnx_data",
]);
const MESSAGES = [
  {
    role: "system",
    content: "You are a deterministic runtime benchmark. Continue until the runtime stops generation.",
  },
  {
    role: "user",
    content: "Generate a deterministic continuation for the benchmark.",
  },
];

env.allowLocalModels = false;

let workerId = null;
let requestedDevice = null;
let requestedDtype = null;
let tokenizer = null;
let model = null;
let prepared = null;
let currentStage = "idle";
let loadStartMs = null;
let heartbeatTimer = null;
let wasmConfiguration = null;
const observedModelFiles = new Set();

function nowMs() {
  return performance.timeOrigin + performance.now();
}

function serializeError(error) {
  if (!error) return "Unknown error";
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }
  return String(error);
}

function post(type, detail = {}) {
  self.postMessage({
    type,
    workerId,
    device: requestedDevice,
    dtype: requestedDtype,
    stage: currentStage,
    atMs: nowMs(),
    ...detail,
  });
}

function setStage(stage, detail = {}) {
  currentStage = stage;
  post("checkpoint", { checkpoint: stage, ...detail });
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    post("heartbeat", {
      loadElapsedMs: loadStartMs === null ? null : nowMs() - loadStartMs,
    });
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summarizeProgress(info) {
  if (!info || typeof info !== "object") {
    return { status: "unknown", raw: String(info) };
  }

  return {
    status: typeof info.status === "string" ? info.status : null,
    name: typeof info.name === "string" ? info.name : null,
    file: typeof info.file === "string" ? info.file : null,
    loaded: finiteNumber(info.loaded),
    total: finiteNumber(info.total),
    progress: finiteNumber(info.progress),
    task: typeof info.task === "string" ? info.task : null,
    model: typeof info.model === "string" ? info.model : null,
  };
}

function makeProgressReporter(owner) {
  const lastProgressAt = new Map();
  const latestProgress = new Map();

  return (info) => {
    const progress = summarizeProgress(info);
    if (owner === "model" && progress.file?.startsWith("onnx/")) {
      observedModelFiles.add(progress.file);
    }

    const key = `${progress.status}:${progress.file ?? progress.name ?? "aggregate"}`;
    const now = nowMs();
    const isHighFrequency = progress.status === "progress" || progress.status === "progress_total";

    if (isHighFrequency) {
      latestProgress.set(key, progress);
      const previousAt = lastProgressAt.get(key) ?? -Infinity;
      if (now - previousAt < PROGRESS_THROTTLE_MS) return;
      lastProgressAt.set(key, now);
      post("load-progress", { owner, progress: latestProgress.get(key) });
      return;
    }

    post("load-progress", { owner, progress });
  };
}

function tokenLength(tensor) {
  if (!tensor?.dims?.length) return null;
  return tensor.dims[tensor.dims.length - 1];
}

function boundedDecode(outputs, inputTokenCount) {
  try {
    const rows = outputs?.tolist?.();
    if (!Array.isArray(rows) || !Array.isArray(rows[0])) return null;
    const generated = rows[0].slice(inputTokenCount ?? 0).map(Number);
    return tokenizer.decode(generated, { skip_special_tokens: true }).slice(0, 800);
  } catch {
    return null;
  }
}

function fixedSimdSupported() {
  try {
    return WebAssembly.validate(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 30, 1, 28, 0, 65, 0, 253, 15, 253, 12, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 253, 186, 1, 26, 11,
      ]),
    );
  } catch {
    return false;
  }
}

function configureCpuWasm() {
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 1;
  const crossOriginIsolated = Boolean(self.crossOriginIsolated);
  const sharedArrayBufferAvailable = typeof SharedArrayBuffer !== "undefined";
  const simdAvailable = fixedSimdSupported();
  const requestedThreads = crossOriginIsolated
    ? Math.min(4, Math.ceil(hardwareConcurrency / 2))
    : 1;

  if (!simdAvailable) {
    throw new Error("Fixed-width WebAssembly SIMD feature probe failed.");
  }

  const wasm = env.backends?.onnx?.wasm;
  if (!wasm) {
    throw new Error("Transformers.js did not expose the ONNX WASM environment.");
  }

  wasm.simd = "fixed";
  wasm.numThreads = requestedThreads;
  wasm.proxy = false;

  wasmConfiguration = {
    hardwareConcurrency,
    crossOriginIsolated,
    sharedArrayBufferAvailable,
    fixedSimdFeatureProbe: simdAvailable,
    requestedSimd: "fixed",
    requestedThreads,
    requestedProxy: false,
  };

  return wasmConfiguration;
}

function resolvedWasmConfiguration() {
  if (requestedDevice !== "wasm") return null;
  const wasm = env.backends?.onnx?.wasm;
  return {
    ...wasmConfiguration,
    resolvedSimd: wasm?.simd ?? null,
    resolvedThreads: wasm?.numThreads ?? null,
    resolvedProxy: wasm?.proxy ?? null,
  };
}

async function preparePrompt() {
  const prompt = tokenizer.apply_chat_template(MESSAGES, {
    tokenize: false,
    add_generation_prompt: true,
  });
  const inputs = tokenizer(prompt);
  return {
    prompt,
    inputs,
    inputTokenCount: tokenLength(inputs.input_ids),
  };
}

function streamedTokenCount(value) {
  if (!value) return 0;
  const row = Array.isArray(value) ? value[0] : value;
  if (Array.isArray(row) || ArrayBuffer.isView(row)) return row.length;
  return 1;
}

function createTimingStreamer(startRef) {
  const tokenTimesMs = [];
  let promptObserved = false;

  return {
    tokenTimesMs,
    put(value) {
      const count = streamedTokenCount(value);
      if (!promptObserved && count === prepared.inputTokenCount) {
        promptObserved = true;
        return;
      }
      promptObserved = true;
      const stamp = nowMs();
      for (let index = 0; index < count; index += 1) {
        tokenTimesMs.push(stamp - startRef.value);
      }
    },
    end() {},
  };
}

async function generate(label, { measured = true, profile = false } = {}) {
  if (!model || !tokenizer || !prepared) {
    throw new Error("Worker is not initialized.");
  }

  const startRef = { value: null };
  const timingStreamer = profile ? createTimingStreamer(startRef) : null;

  try {
    const startMs = nowMs();
    startRef.value = startMs;
    const outputs = await model.generate({
      ...prepared.inputs,
      min_new_tokens: FIXED_NEW_TOKENS,
      max_new_tokens: FIXED_NEW_TOKENS,
      do_sample: false,
      ...(timingStreamer ? { streamer: timingStreamer } : {}),
    });
    const endMs = nowMs();

    const outputTokenCount = tokenLength(outputs);
    const generatedTokenCount =
      outputTokenCount !== null && prepared.inputTokenCount !== null
        ? Math.max(0, outputTokenCount - prepared.inputTokenCount)
        : null;

    const result = {
      label,
      measured,
      profile,
      startMs,
      endMs,
      durationMs: endMs - startMs,
      inputTokenCount: prepared.inputTokenCount,
      outputTokenCount,
      generatedTokenCount,
      targetNewTokens: FIXED_NEW_TOKENS,
      tokenOffsetsMs: profile ? timingStreamer.tokenTimesMs : null,
      profileTimestampCount: profile ? timingStreamer.tokenTimesMs.length : null,
      outputText: boundedDecode(outputs, prepared.inputTokenCount),
    };

    if (generatedTokenCount !== FIXED_NEW_TOKENS) {
      throw new Error(
        `Invalid benchmark generation: expected ${FIXED_NEW_TOKENS} new tokens, observed ${generatedTokenCount}.`,
      );
    }

    post("inference-complete", result);
    return result;
  } catch (error) {
    const endMs = nowMs();
    const detail = {
      label,
      measured,
      profile,
      endMs,
      targetNewTokens: FIXED_NEW_TOKENS,
      error: serializeError(error),
    };
    post("inference-error", detail);
    throw error;
  }
}

async function initialize(message) {
  workerId = message.workerId;
  requestedDevice = message.device;
  requestedDtype = message.dtype;
  loadStartMs = nowMs();
  observedModelFiles.clear();

  if (requestedDtype !== "q4") {
    throw new Error(`Revision 4 requires q4 on every lane; received ${requestedDtype}.`);
  }

  if (requestedDevice === "wasm") {
    configureCpuWasm();
  }

  currentStage = "load-start";
  post("load-start", {
    modelId: MODEL_ID,
    modelRevision: MODEL_REVISION,
    transformersVersion: TRANSFORMERS_VERSION,
    loadStartMs,
    webgpuVisibleInWorker: Boolean(self.navigator?.gpu),
    workerEnvironment: {
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      crossOriginIsolated: Boolean(self.crossOriginIsolated),
      sharedArrayBufferAvailable: typeof SharedArrayBuffer !== "undefined",
      fixedSimdFeatureProbe: fixedSimdSupported(),
    },
    wasmConfiguration: resolvedWasmConfiguration(),
  });
  startHeartbeat();

  try {
    const tokenizerStartMs = nowMs();
    setStage("tokenizer-load-start", { tokenizerStartMs });
    tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
      revision: MODEL_REVISION,
      progress_callback: makeProgressReporter("tokenizer"),
    });
    const tokenizerEndMs = nowMs();
    setStage("tokenizer-load-complete", {
      tokenizerStartMs,
      tokenizerEndMs,
      tokenizerDurationMs: tokenizerEndMs - tokenizerStartMs,
    });

    const modelStartMs = nowMs();
    setStage("model-load-start", { modelStartMs });
    model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
      revision: MODEL_REVISION,
      device: requestedDevice,
      dtype: "q4",
      progress_callback: makeProgressReporter("model"),
    });
    const modelEndMs = nowMs();
    setStage("model-load-complete", {
      modelStartMs,
      modelEndMs,
      modelDurationMs: modelEndMs - modelStartMs,
      observedModelFiles: [...observedModelFiles].sort(),
      expectedQ4Files: EXPECTED_Q4_FILES,
      expectedQ4FilesObserved: EXPECTED_Q4_FILES.every((file) => observedModelFiles.has(file)),
      wasmConfiguration: resolvedWasmConfiguration(),
    });

    const promptStartMs = nowMs();
    setStage("prompt-prepare-start", { promptStartMs });
    prepared = await preparePrompt();
    const promptEndMs = nowMs();
    setStage("prompt-prepare-complete", {
      promptStartMs,
      promptEndMs,
      promptDurationMs: promptEndMs - promptStartMs,
      inputTokenCount: prepared.inputTokenCount,
    });

    const loadEndMs = nowMs();
    currentStage = "ready";
    stopHeartbeat();
    post("ready", {
      modelId: MODEL_ID,
      modelRevision: MODEL_REVISION,
      transformersVersion: TRANSFORMERS_VERSION,
      loadStartMs,
      loadEndMs,
      loadDurationMs: loadEndMs - loadStartMs,
      inputTokenCount: prepared.inputTokenCount,
      fixedNewTokens: FIXED_NEW_TOKENS,
      observedModelFiles: [...observedModelFiles].sort(),
      expectedQ4Files: EXPECTED_Q4_FILES,
      expectedQ4FilesObserved: EXPECTED_Q4_FILES.every((file) => observedModelFiles.has(file)),
      webgpuVisibleInWorker: Boolean(self.navigator?.gpu),
      wasmConfiguration: resolvedWasmConfiguration(),
    });
  } catch (error) {
    const loadEndMs = nowMs();
    const failedStage = currentStage;
    currentStage = "error";
    stopHeartbeat();
    post("load-error", {
      modelId: MODEL_ID,
      modelRevision: MODEL_REVISION,
      transformersVersion: TRANSFORMERS_VERSION,
      loadStartMs,
      loadEndMs,
      loadDurationMs: loadEndMs - loadStartMs,
      failedStage,
      observedModelFiles: [...observedModelFiles].sort(),
      wasmConfiguration: resolvedWasmConfiguration(),
      error: serializeError(error),
    });
  }
}

self.addEventListener("message", async (event) => {
  const message = event.data ?? {};

  try {
    switch (message.command) {
      case "init":
        await initialize(message);
        break;
      case "run":
        await generate(message.label ?? "run", {
          measured: message.measured !== false,
          profile: message.profile === true,
        });
        break;
      case "dispose":
        stopHeartbeat();
        await model?.dispose?.();
        model = null;
        tokenizer = null;
        prepared = null;
        currentStage = "disposed";
        post("disposed");
        break;
      default:
        post("worker-error", { error: `Unknown command: ${message.command}` });
    }
  } catch (error) {
    post("worker-error", {
      command: message.command,
      error: serializeError(error),
    });
  }
});
