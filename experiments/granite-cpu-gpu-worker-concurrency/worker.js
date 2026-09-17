import {
  AutoTokenizer,
  AutoModelForCausalLM,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

const MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
const MAX_NEW_TOKENS = 16;
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
    atMs: nowMs(),
    ...detail,
  });
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

  const loadStartMs = nowMs();
  post("load-start", {
    modelId: MODEL_ID,
    transformersVersion: "4.3.0",
    loadStartMs,
  });

  try {
    tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
    model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
      device: requestedDevice,
      dtype: requestedDtype,
    });
    prepared = await preparePrompt();

    const loadEndMs = nowMs();
    post("ready", {
      modelId: MODEL_ID,
      transformersVersion: "4.3.0",
      loadStartMs,
      loadEndMs,
      loadDurationMs: loadEndMs - loadStartMs,
      inputTokenCount: prepared.inputTokenCount,
      webgpuVisibleInWorker: Boolean(self.navigator?.gpu),
    });
  } catch (error) {
    const loadEndMs = nowMs();
    post("load-error", {
      modelId: MODEL_ID,
      transformersVersion: "4.3.0",
      loadStartMs,
      loadEndMs,
      loadDurationMs: loadEndMs - loadStartMs,
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
        await model?.dispose?.();
        model = null;
        tokenizer = null;
        prepared = null;
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
