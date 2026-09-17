import {
  AutoTokenizer,
  AutoModelForCausalLM,
  env,
  StoppingCriteria,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

const MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
const MODEL_REVISION = "6c9a6f61601df51e76b1efff0974d8d26c2a25b5";
const TRANSFORMERS_VERSION = "4.3.0";
const ACTOR_SYSTEM_PROMPT = "You are Claptrap.";
const FIXED_NEW_TOKENS = 100;
const TOOL_TOKEN_BUDGET = 96; // Existing fixture tool-output bound, separate from speech.
import { inspectTokens } from "./turn-boundary.js";
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
let toolOpenToken, toolCloseToken;
let waitingForSearch = null;
let diagnostic = false;
let checkpointSequence = 0;
let waitingForCheckpoint = null;

function nowMs() {
  return performance.timeOrigin + performance.now();
}

function post(type, detail = {}) {
  self.postMessage({ type, atMs: nowMs(), ...detail });
}

function workerMemory() {
  const memory = performance.memory;
  return {
    source: "worker performance.memory; JS heap only, not total RAM or GPU memory",
    available: Boolean(memory),
    usedJSHeapSize: Number.isFinite(memory?.usedJSHeapSize) ? memory.usedJSHeapSize : null,
    totalJSHeapSize: Number.isFinite(memory?.totalJSHeapSize) ? memory.totalJSHeapSize : null,
    jsHeapSizeLimit: Number.isFinite(memory?.jsHeapSizeLimit) ? memory.jsHeapSizeLimit : null,
    wasmMemoryBytes: null, gpuMemoryBytes: null,
  };
}

async function checkpoint(type, detail = {}) {
  if (!diagnostic) { post(type, detail); return; }
  const checkpointId = ++checkpointSequence;
  await new Promise((resolve, reject) => {
    waitingForCheckpoint = { checkpointId, resolve, reject };
    post(type, { ...detail, checkpointId, requiresSave: true, workerMemory: workerMemory() });
  });
}

function observeExistingGpuDevice() {
  if (!diagnostic) return;
  try {
    const device = env.backends?.onnx?.webgpu?.device;
    const available = typeof device?.lost?.then === "function";
    post("gpu-loss-observer", { available, requestedNewDevice: false });
    if (available) device.lost.then((info) => post("gpu-device-lost", {
      reason: info.reason, message: info.message,
    }));
  } catch (error) {
    post("gpu-loss-observer", { available: false, requestedNewDevice: false, error: String(error) });
  }
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
  await checkpoint("session-load-start", { lane, device, dtype: "q4", startedAt });

  models[lane] = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    revision: MODEL_REVISION,
    device,
    dtype: "q4",
    progress_callback: reporter.callback,
  });

  const finishedAt = nowMs();
  if (lane === "gpu") observeExistingGpuDevice();
  await checkpoint("session-load-complete", {
    lane,
    device,
    dtype: "q4",
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    observedModelFiles: [...reporter.observed].sort(),
  });
}

class TurnBoundary extends StoppingCriteria {
  constructor(promptLength, speechLimit) {
    super();
    this.promptLength = promptLength;
    this.speechLimit = speechLimit;
  }
  _call(sequences) {
    return sequences.map((ids) => {
      const boundary = inspectTokens(ids.slice(this.promptLength), this.speechLimit, toolOpenToken, toolCloseToken);
      return boundary.stop || Boolean(boundary.inTool && boundary.tool.length + 1 >= TOOL_TOKEN_BUDGET);
    });
  }
}

async function disposeInputs(inputs, outputs) {
  if (outputs) await outputs.dispose();
  if (inputs) {
    for (const value of new Set(Object.values(inputs))) {
      if (typeof value?.dispose === "function") await value.dispose();
    }
  }
}

async function generatePiece(lane, messages, speechLimit, requestId, turn, call, expectedFirstInput) {
  let inputs = null, outputs = null;
  const startedAt = nowMs();
  try {
    const prompt = tokenizer.apply_chat_template(messages, {
      tokenize: false, add_generation_prompt: true, tools: SEARCH_TOOL,
    });
    inputs = tokenizer(prompt);
    const inputTokenCount = inputs.input_ids.dims.at(-1);
    if (diagnostic && call === 1 && (!expectedFirstInput ||
        expectedFirstInput.renderedPrompt !== prompt ||
        expectedFirstInput.inputTokenCount !== inputTokenCount ||
        JSON.stringify(expectedFirstInput.messages) !== JSON.stringify(messages))) {
      post("replay-input-mismatch", { requestId, lane, turn, inputTokenCount, messages, renderedPrompt: prompt });
      throw new Error("Diagnostic input differs from the recorded prompt/messages/token count. Inference not started.");
    }
    // The stop criterion counts speech only. A native tool block has its own
    // finite output allowance and is never counted as conversational tokens.
    const rawLimit = speechLimit + TOOL_TOKEN_BUDGET;
    const contextLimit = models[lane].config.max_position_embeddings;
    if (!Number.isInteger(contextLimit) || inputTokenCount + rawLimit > contextLimit) {
      throw new Error(`Prompt (${inputTokenCount}) plus output bound (${rawLimit}) exceeds model context (${contextLimit}). No truncation performed.`);
    }
    await checkpoint("generation-start", {
      requestId, lane, turn, call, startedAt, inputTokenCount,
      messages, renderedPrompt: prompt, speechTokensRemaining: speechLimit,
      rawTokenLimit: rawLimit, doSample: false,
      pastKeyValuesSupplied: false, returnDictInGenerate: false,
      ...(diagnostic ? { recordedFirstInputMatched: call === 1 } : {}),
    });
    let promptSeen = false, rawGeneratedTokens = 0;
    const streamer = diagnostic ? {
      put(batch) {
        if (!promptSeen) { promptSeen = true; return; } // generate() first streams the prompt.
        rawGeneratedTokens += batch[0].length;
        if (rawGeneratedTokens === 1 || rawGeneratedTokens % 10 === 0) {
          post("generation-progress", { requestId, lane, turn, call, rawGeneratedTokens, elapsedMs: nowMs() - startedAt });
        }
      },
      end() {},
    } : null;
    outputs = await models[lane].generate({
      ...inputs,
      min_new_tokens: rawLimit,
      max_new_tokens: rawLimit,
      do_sample: false,
      return_dict_in_generate: false,
      stopping_criteria: new TurnBoundary(inputTokenCount, speechLimit),
      ...(streamer ? { streamer } : {}),
    });
    if (diagnostic) await checkpoint("generation-returned", { requestId, lane, turn, call, rawGeneratedTokens });
    const generatedIds = outputs.tolist()[0].slice(inputTokenCount).map(Number);
    const rawText = tokenizer.decode(generatedIds, { skip_special_tokens: false });
    const result = {
      call, inputTokenCount, generatedIds, rawText, startedAt,
      finishedAt: nowMs(), durationMs: nowMs() - startedAt,
    };
    post("generation-output", { requestId, lane, turn, ...result });
    return result;
  } finally {
    // Transformers.js 4.3.0 disposes its final DynamicCache before returning
    // when neither past_key_values nor return_dict_in_generate is requested.
    // We supply neither cache nor prior tensors to the next generation.
    await disposeInputs(inputs, outputs);
    inputs = null; outputs = null;
    if (diagnostic) await checkpoint("tensor-cleanup-complete", {
      requestId, lane, turn, call,
      note: "Existing input/output disposal completed. Actual RAM/GPU reclamation is not measured.",
    });
  }
}

async function generateTurn(message) {
  const { requestId, lane, turn, timestamp, incomingText } = message;
  if (!initialized || !models[lane]) throw new Error("Runtime is not ready.");
  const messages = [
    { role: "system", content: ACTOR_SYSTEM_PROMPT },
    { role: "user", content: `Current timestamp: ${timestamp}\nMessage from the other speaker:\n${incomingText}` },
  ];
  const speechIds = [], calls = [], retrievals = [];
  const startedAt = nowMs();
  while (speechIds.length < FIXED_NEW_TOKENS) {
    const remaining = FIXED_NEW_TOKENS - speechIds.length;
    const result = await generatePiece(lane, messages, remaining, requestId, turn, calls.length + 1, message.expectedFirstInput);
    calls.push(result);
    const boundary = inspectTokens(result.generatedIds, remaining, toolOpenToken, toolCloseToken);
    if (boundary.error) throw new Error(boundary.error);
    speechIds.push(...boundary.speech);
    if (!boundary.toolComplete) {
      if (boundary.inTool) throw new Error("Native tool call ended without its closing marker. Raw output saved; no repair performed.");
      if (speechIds.length !== FIXED_NEW_TOKENS) throw new Error(`Response ended after ${speechIds.length} conversational tokens.`);
      break;
    }

    const rawTool = tokenizer.decode(boundary.tool, { skip_special_tokens: false });
    let nativeCall;
    try { nativeCall = JSON.parse(rawTool); }
    catch { throw new Error("Native tool arguments are not JSON. Raw output saved; no repair performed."); }
    if (typeof nativeCall?.name !== "string" || !nativeCall.arguments ||
        typeof nativeCall.arguments !== "object" || Array.isArray(nativeCall.arguments)) {
      throw new Error("Native tool call must contain a name and arguments object. Raw output saved.");
    }
    const retrieval = await new Promise((resolve, reject) => {
      waitingForSearch = { requestId, call: calls.length, resolve, reject };
      post("search-request", {
        requestId, call: calls.length, lane, turn,
        name: nativeCall.name, query: nativeCall.arguments.query ?? null, rawTool,
      });
    });
    retrievals.push(retrieval);
    // Only this turn's own expression and its requested tool result are added.
    // No prior transcript, cached actor, or earlier turn's tensors are available.
    messages.push({
      role: "assistant",
      content: tokenizer.decode(boundary.speech, { skip_special_tokens: true }),
      tool_calls: [{ type: "function", function: nativeCall }],
    });
    messages.push({ role: "tool", content: JSON.stringify(retrieval) });
  }
  const outputText = tokenizer.decode(speechIds, { skip_special_tokens: true });
  if (!outputText.trim()) throw new Error("Generated response is empty after decoding. Raw output saved.");
  post("turn-result", {
    requestId, lane, turn, timestamp, systemPrompt: ACTOR_SYSTEM_PROMPT,
    outputText, generatedTokenCount: speechIds.length, generatedSpeechIds: speechIds,
    inputTokenCount: calls.at(-1).inputTokenCount,
    generationCallCount: calls.length, calls, retrievals,
    startedAt, finishedAt: nowMs(), durationMs: nowMs() - startedAt,
  });
  // All messages, output IDs, and retrieval results are turn-local. The next
  // command can see only the fresh input it receives from the controller.
}

async function initialize(requestId, options) {
  if (initialized || models.cpu || models.gpu) {
    throw new Error("Runtime already initialized or initializing. Reload for a fresh runtime.");
  }

  diagnostic = options.diagnostic === true;
  const loadOrder = diagnostic ? options.lanes : ["cpu", "gpu"];
  if (![JSON.stringify(["cpu"]), JSON.stringify(["cpu", "gpu"])].includes(JSON.stringify(loadOrder))) {
    throw new Error("Diagnostic lanes must be CPU only or CPU then GPU.");
  }
  const environment = configureSingleOrtEnvironment();
  await checkpoint("runtime-start", {
    requestId,
    transformersVersion: TRANSFORMERS_VERSION,
    modelId: MODEL_ID,
    modelRevision: MODEL_REVISION,
    actorSystemPrompt: ACTOR_SYSTEM_PROMPT,
    fixedNewTokens: FIXED_NEW_TOKENS,
    oneWorker: true,
    oneTransformersModuleRealm: true,
    loadOrder,
    ...(diagnostic ? { diagnostic: true } : {}),
    environment,
  });

  const tokenizerStart = nowMs();
  await checkpoint("tokenizer-load-start", { tokenizerStart });
  tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, { revision: MODEL_REVISION });
  const open = tokenizer.encode("<tool_call>", { add_special_tokens: false });
  const close = tokenizer.encode("</tool_call>", { add_special_tokens: false });
  if (open.length !== 1 || close.length !== 1 || open[0] === close[0]) {
    throw new Error("Pinned Granite native tool markers are not distinct atomic tokens.");
  }
  [toolOpenToken] = open;
  [toolCloseToken] = close;
  const tokenizerEnd = nowMs();
  post("tokenizer-load-complete", { tokenizerStart, tokenizerEnd, durationMs: tokenizerEnd - tokenizerStart });

  await loadLane("cpu");
  if (loadOrder.includes("gpu")) {
    post("first-session-resident", { lane: "cpu", secondLane: "gpu" });
    await loadLane("gpu");
  }

  initialized = true;
  post("runtime-ready", {
    requestId,
    cpuResident: Boolean(models.cpu),
    gpuResident: Boolean(models.gpu),
    tokenizerResident: Boolean(tokenizer),
    oneWorker: true,
    oneTransformersModuleRealm: true,
  });
}

self.addEventListener("message", (event) => {
  const message = event.data ?? {};
  if (message.command === "checkpoint-ack") {
    if (waitingForCheckpoint?.checkpointId === message.checkpointId) {
      const pending = waitingForCheckpoint;
      waitingForCheckpoint = null;
      if (message.error) pending.reject(new Error(`Checkpoint save failed: ${message.error}`));
      else pending.resolve();
    }
    return;
  }
  if (message.command === "search-result") {
    if (waitingForSearch?.requestId === message.requestId && waitingForSearch.call === message.call) {
      const pending = waitingForSearch;
      waitingForSearch = null;
      if (message.error) pending.reject(new Error(message.error));
      else pending.resolve(message.result);
    }
    return;
  }
  const run = async () => {
    if (busy) throw new Error("A model command is already running.");
    busy = true;
    try {
      if (message.command === "initialize") return await initialize(message.requestId, message);
      if (message.command === "generate-turn") return await generateTurn(message);
      throw new Error(`Unknown worker command: ${message.command}`);
    } finally {
      busy = false;
      waitingForSearch = null;
    }
  };
  run().catch((error) => post("command-error", {
    requestId: message.requestId ?? null, command: message.command ?? null,
    lane: message.lane ?? null, turn: message.turn ?? null,
    error: `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`,
  }));
});
