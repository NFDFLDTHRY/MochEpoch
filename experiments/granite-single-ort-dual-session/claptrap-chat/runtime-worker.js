import {
  AutoTokenizer,
  AutoModelForCausalLM,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

const MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
const MODEL_REVISION = "6c9a6f61601df51e76b1efff0974d8d26c2a25b5";
const TRANSFORMERS_VERSION = "4.3.0";
const ACTOR_SYSTEM_PROMPT = "You are Claptrap.";
const FIXED_NEW_TOKENS = 100;
const RETRIEVAL_MAX_NEW_TOKENS = 96;
const SEARCH_TOOL = [{
  type: "function",
  function: {
    name: "search_conversation",
    description: "Search earlier saved conversation turns when older memory would help answer the newest message.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A search phrase containing at least three whitespace-separated words. All words must appear in a saved response for that row to match.",
        },
      },
      required: ["query"],
    },
  },
}];

let tokenizer = null;
const models = { cpu: null, gpu: null };
let initialized = false;
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
      post("load-progress", {
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
  });
}

function tokenCount(tensor) {
  if (!tensor?.dims?.length) return null;
  return tensor.dims[tensor.dims.length - 1];
}

function disposeValue(value) {
  if (!value) return;
  if (typeof value.dispose === "function") {
    try { value.dispose(); } catch {}
    return;
  }
  if (typeof value !== "object") return;
  for (const child of Object.values(value)) {
    if (child && typeof child.dispose === "function") {
      try { child.dispose(); } catch {}
    }
  }
}

function decodeGenerated(outputs, inputTokenCount) {
  const rows = outputs?.tolist?.();
  if (!Array.isArray(rows) || !Array.isArray(rows[0])) {
    throw new Error("Generation output did not expose a token row.");
  }
  const generatedIds = rows[0].slice(inputTokenCount).map(Number);
  return {
    generatedIds,
    text: tokenizer.decode(generatedIds, { skip_special_tokens: true }),
  };
}

async function generateFromMessages(lane, messages, {
  tools = null,
  minNewTokens = null,
  maxNewTokens,
} = {}) {
  const model = models[lane];
  if (!initialized || !model || !tokenizer) throw new Error("Runtime is not ready.");

  let inputs = null;
  let outputs = null;
  const startedAt = nowMs();

  try {
    const templateOptions = {
      tokenize: false,
      add_generation_prompt: true,
      ...(tools ? { tools } : {}),
    };
    const prompt = tokenizer.apply_chat_template(messages, templateOptions);
    inputs = tokenizer(prompt);
    const inputTokenCount = tokenCount(inputs.input_ids);
    outputs = await model.generate({
      ...inputs,
      ...(Number.isInteger(minNewTokens) ? { min_new_tokens: minNewTokens } : {}),
      max_new_tokens: maxNewTokens,
      do_sample: false,
    });
    const outputTokenCount = tokenCount(outputs);
    const generatedTokenCount =
      Number.isInteger(outputTokenCount) && Number.isInteger(inputTokenCount)
        ? Math.max(0, outputTokenCount - inputTokenCount)
        : null;
    const decoded = decodeGenerated(outputs, inputTokenCount);
    const finishedAt = nowMs();

    return {
      text: decoded.text,
      generatedIds: decoded.generatedIds,
      inputTokenCount,
      outputTokenCount,
      generatedTokenCount,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
    };
  } finally {
    disposeValue(outputs);
    disposeValue(inputs);
    inputs = null;
    outputs = null;
  }
}

function extractFirstToolCall(text) {
  const match = String(text).match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/i);
  if (!match) return { called: false, raw: text, name: null, query: null, parseError: null };

  try {
    const parsed = JSON.parse(match[1]);
    const name = parsed?.name ?? parsed?.function?.name ?? null;
    let args = parsed?.arguments ?? parsed?.function?.arguments ?? null;
    if (typeof args === "string") {
      try { args = JSON.parse(args); } catch {}
    }
    return {
      called: true,
      raw: text,
      name,
      query: typeof args?.query === "string" ? args.query : null,
      parseError: null,
    };
  } catch (error) {
    return {
      called: true,
      raw: text,
      name: null,
      query: null,
      parseError: `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`,
    };
  }
}

async function planRetrieval(message) {
  const { requestId, lane, turn, timestamp, incomingText, memoryRowCount } = message;

  if (memoryRowCount < 1) {
    post("retrieval-plan-result", {
      requestId,
      lane,
      turn,
      skipped: true,
      reason: "memory-empty",
      called: false,
      query: null,
      rawModelOutput: null,
      inputTokenCount: null,
      generatedTokenCount: null,
      durationMs: 0,
    });
    return;
  }

  const messages = [
    { role: "system", content: ACTOR_SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Current timestamp: ${timestamp}\n` +
        `Newest message from the other speaker:\n${incomingText}\n\n` +
        `If older saved conversation memory would materially help you answer this newest message, call search_conversation once. ` +
        `The query must contain at least three whitespace-separated words. If older memory is not needed, do not call the tool and answer NO_SEARCH.`,
    },
  ];

  const result = await generateFromMessages(lane, messages, {
    tools: SEARCH_TOOL,
    maxNewTokens: RETRIEVAL_MAX_NEW_TOKENS,
  });
  const parsed = extractFirstToolCall(result.text);

  post("retrieval-plan-result", {
    requestId,
    lane,
    turn,
    skipped: false,
    called: parsed.called,
    toolName: parsed.name,
    query: parsed.query,
    parseError: parsed.parseError,
    rawModelOutput: parsed.raw,
    inputTokenCount: result.inputTokenCount,
    generatedTokenCount: result.generatedTokenCount,
    durationMs: result.durationMs,
  });
}

function formatRetrievedRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "No prior rows were retrieved.";
  return rows.map((row) =>
    `Turn ${row.turn} | ${row.timestamp} | ${row.speaker} | ${row.backend}\n${row.response}`
  ).join("\n\n");
}

async function generateTurn(message) {
  const {
    requestId,
    lane,
    turn,
    timestamp,
    incomingText,
    retrievalQuery,
    retrievedRows,
    retrievalMessage,
  } = message;

  let memoryBlock = "";
  if (Array.isArray(retrievedRows) && retrievedRows.length > 0) {
    memoryBlock = `\n\nMemory search query: ${retrievalQuery}\nRetrieved earlier conversation rows:\n${formatRetrievedRows(retrievedRows)}`;
  } else if (typeof retrievalMessage === "string" && retrievalMessage.length > 0) {
    memoryBlock = `\n\n${retrievalMessage}`;
  }

  const messages = [
    { role: "system", content: ACTOR_SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Current timestamp: ${timestamp}\n` +
        `Message from the other speaker:\n${incomingText}` +
        memoryBlock,
    },
  ];

  const result = await generateFromMessages(lane, messages, {
    minNewTokens: FIXED_NEW_TOKENS,
    maxNewTokens: FIXED_NEW_TOKENS,
  });

  if (result.generatedTokenCount !== FIXED_NEW_TOKENS) {
    throw new Error(`Expected ${FIXED_NEW_TOKENS} new tokens, observed ${result.generatedTokenCount}.`);
  }

  post("turn-result", {
    requestId,
    lane,
    turn,
    timestamp,
    systemPrompt: ACTOR_SYSTEM_PROMPT,
    outputText: result.text,
    inputTokenCount: result.inputTokenCount,
    generatedTokenCount: result.generatedTokenCount,
    durationMs: result.durationMs,
    retrievalQuery: retrievalQuery ?? null,
    retrievedTurnNumbers: Array.isArray(retrievedRows) ? retrievedRows.map((row) => row.turn) : [],
  });
}

async function initialize(requestId) {
  if (busy || initialized || models.cpu || models.gpu) {
    throw new Error("Runtime already initialized or initializing. Reload for a fresh runtime.");
  }

  busy = true;
  const environment = configureSingleOrtEnvironment();
  post("runtime-start", {
    requestId,
    transformersVersion: TRANSFORMERS_VERSION,
    modelId: MODEL_ID,
    modelRevision: MODEL_REVISION,
    actorSystemPrompt: ACTOR_SYSTEM_PROMPT,
    fixedNewTokens: FIXED_NEW_TOKENS,
    oneWorker: true,
    oneTransformersModuleRealm: true,
    loadOrder: ["cpu", "gpu"],
    environment,
  });

  try {
    const tokenizerStart = nowMs();
    post("tokenizer-load-start", { tokenizerStart });
    tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, { revision: MODEL_REVISION });
    const tokenizerEnd = nowMs();
    post("tokenizer-load-complete", { tokenizerStart, tokenizerEnd, durationMs: tokenizerEnd - tokenizerStart });

    await loadLane("cpu");
    post("first-session-resident", { lane: "cpu", secondLane: "gpu" });
    await loadLane("gpu");

    initialized = true;
    post("runtime-ready", {
      requestId,
      cpuResident: Boolean(models.cpu),
      gpuResident: Boolean(models.gpu),
      tokenizerResident: Boolean(tokenizer),
      oneWorker: true,
      oneTransformersModuleRealm: true,
    });
  } finally {
    busy = false;
  }
}

self.addEventListener("message", (event) => {
  const message = event.data ?? {};
  const run = async () => {
    if (message.command === "initialize") return initialize(message.requestId);
    if (message.command === "plan-retrieval") return planRetrieval(message);
    if (message.command === "generate-turn") return generateTurn(message);
    throw new Error(`Unknown worker command: ${message.command}`);
  };

  run().catch((error) => {
    post("command-error", {
      requestId: message.requestId ?? null,
      command: message.command ?? null,
      lane: message.lane ?? null,
      turn: message.turn ?? null,
      error: `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`,
    });
  });
});
