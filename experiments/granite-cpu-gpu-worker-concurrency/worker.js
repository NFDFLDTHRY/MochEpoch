import {
  AutoTokenizer,
  AutoModelForCausalLM,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

const MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
const TRANSFORMERS_VERSION = "4.3.0";
const MAX_NEW_TOKENS = 16;
const HEARTBEAT_MS = 5000;
const PROGRESS_THROTTLE_MS = 500;
const MESSAGES = [
  {
    role: "system",
    content: "You are a deterministic runtime test. Reply briefly and do not explain.",
  },
  {
    role: "user",
    content: "Return the single word READY.",
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
    return tokenizer.decode(generated, { skip_special_tokens: true }).slice(0, 500);
  } catch {
    return null;
  }
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

async function generate(label, measured) {
  if (!model || !tokenizer || !prepared) {
    throw new Error("Worker is not initialized.");
  }

  const startMs = nowMs();
  post("inference-start", { label, measured, startMs });

  try {
    const outputs = await model.generate({
      ...prepared.inputs,
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: false,
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
      startMs,
      endMs,
      durationMs: endMs - startMs,
      inputTokenCount: prepared.inputTokenCount,
      outputTokenCount,
      generatedTokenCount,
      outputText: boundedDecode(outputs, prepared.inputTokenCount),
    };

    post("inference-complete", result);
    return result;
  } catch (error) {
    const endMs = nowMs();
    const detail = {
      label,
      measured,
      startMs,
      endMs,
      durationMs: endMs - startMs,
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

  currentStage = "load-start";
  post("load-start", {
    modelId: MODEL_ID,
    transformersVersion: TRANSFORMERS_VERSION,
    loadStartMs,
    webgpuVisibleInWorker: Boolean(self.navigator?.gpu),
  });
  startHeartbeat();

  try {
    const tokenizerStartMs = nowMs();
    setStage("tokenizer-load-start", { tokenizerStartMs });
    tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
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
      device: requestedDevice,
      dtype: requestedDtype,
      progress_callback: makeProgressReporter("model"),
    });
    const modelEndMs = nowMs();
    setStage("model-load-complete", {
      modelStartMs,
      modelEndMs,
      modelDurationMs: modelEndMs - modelStartMs,
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
      transformersVersion: TRANSFORMERS_VERSION,
      loadStartMs,
      loadEndMs,
      loadDurationMs: loadEndMs - loadStartMs,
      inputTokenCount: prepared.inputTokenCount,
      webgpuVisibleInWorker: Boolean(self.navigator?.gpu),
    });
  } catch (error) {
    const loadEndMs = nowMs();
    const failedStage = currentStage;
    currentStage = "error";
    stopHeartbeat();
    post("load-error", {
      modelId: MODEL_ID,
      transformersVersion: TRANSFORMERS_VERSION,
      loadStartMs,
      loadEndMs,
      loadDurationMs: loadEndMs - loadStartMs,
      failedStage,
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
      case "warmup":
        await generate(message.label ?? "warmup", false);
        break;
      case "run":
        await generate(message.label ?? "run", true);
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
