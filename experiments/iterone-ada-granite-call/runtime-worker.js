// One disposable Granite call for the Pass 1 Ada/stone browser probe.
// This fixture is literal here; Pass 2 will construct the call from CSV state.
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";
const TRANSFORMERS_VERSION = "4.3.0";
const MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
const MODEL_REVISION = "6c9a6f61601df51e76b1efff0974d8d26c2a25b5";
const EXPECTED_Q4_FILES = ["onnx/model_q4.onnx", "onnx/model_q4.onnx_data"];
const MAX_NEW_TOKENS = 64;

const SYSTEM_PROMPT = "Process this one calling packet for the actor. Use only the supplied world description and current situation. Return only one JSON object matching output_schema. Do not add explanation or fields outside the schema.";
const FIXTURE = {
  world_description: "One room.",
  actor: { name: "ada", control: "game", location: "room", decision_system: "interaction" },
  player: { name: "player", control: "player", location: "room" },
  object: { name: "stone", holder_type: "character", holder_name: "ada" },
  player_says: "Please hand me the stone.",
  output_schema: {
    type: "object",
    properties: { action: { type: "string", enum: ["hand_over", "wait"] } },
    required: ["action"],
    additionalProperties: false,
  },
};

let runStarted = false;

function nowMs() {
  return performance.timeOrigin + performance.now();
}

function describeError(error) {
  return {
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
  };
}

function emit(type, requestId, backend, detail = {}) {
  self.postMessage({ type, requestId, backend, timestamp: new Date().toISOString(), ...detail });
}

function boundaryError(boundary, message) {
  const error = new Error(message);
  error.boundary = boundary;
  return error;
}

// The fixture allows exactly one top-level string member. JSON.parse alone
// would silently accept duplicate keys, so inspect the one-member syntax too.
function oneStringMember(text) {
  let index = 0;
  const space = () => {
    while (index < text.length && " \t\r\n".includes(text[index])) index += 1;
  };
  const expect = (character) => {
    if (text[index] !== character) throw boundaryError("fixture-shape", `Expected ${JSON.stringify(character)} at character ${index}.`);
    index += 1;
  };
  const string = () => {
    const start = index;
    expect('"');
    while (index < text.length) {
      const character = text[index++];
      if (character === '"') return JSON.parse(text.slice(start, index));
      if (character === "\\") {
        const escape = text[index++];
        if (escape === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(index, index + 4))) {
            throw boundaryError("fixture-shape", "Invalid Unicode escape in JSON string.");
          }
          index += 4;
        } else if (!'"\\/bfnrt'.includes(escape)) {
          throw boundaryError("fixture-shape", "Invalid escape in JSON string.");
        }
      } else if (character.charCodeAt(0) < 32) {
        throw boundaryError("fixture-shape", "Unescaped control character in JSON string.");
      }
    }
    throw boundaryError("fixture-shape", "Unterminated JSON string.");
  };

  space();
  expect("{");
  space();
  const key = string();
  space();
  expect(":");
  space();
  const value = string();
  space();
  expect("}");
  space();
  if (index !== text.length) throw boundaryError("fixture-shape", "Extra content or another member after the action.");
  return { key, value };
}

function parseFixtureAction(text) {
  try {
    JSON.parse(text);
  } catch (error) {
    throw boundaryError("json-parse", `Generated text is not JSON: ${error.message}`);
  }
  const { key, value } = oneStringMember(text);
  if (key !== "action" || (value !== "hand_over" && value !== "wait")) {
    throw boundaryError("fixture-shape", "The sole member must be action: hand_over or wait.");
  }
  return { action: value };
}

async function disposeTensors(inputs, outputs) {
  if (typeof outputs?.dispose === "function") await outputs.dispose();
  if (inputs) {
    for (const tensor of new Set(Object.values(inputs))) {
      if (typeof tensor?.dispose === "function") await tensor.dispose();
    }
  }
}

async function runAttempt(requestId, backend) {
  const startedAt = nowMs();
  const observedFiles = new Set();
  const evidence = {
    requestId,
    backend,
    status: "running",
    startedAt: new Date().toISOString(),
    browser: { userAgent: navigator.userAgent ?? null, platform: navigator.platform ?? null },
    model: {
      transformersVersion: TRANSFORMERS_VERSION,
      modelId: MODEL_ID,
      revision: MODEL_REVISION,
      dtype: "q4",
      onnxRuntimeVersion: null,
      expectedQ4Files: EXPECTED_Q4_FILES,
      observedModelFiles: [],
    },
    settings: {
      device: backend,
      doSample: false,
      maxNewTokens: MAX_NEW_TOKENS,
      minNewTokensSupplied: false,
      returnDictInGenerate: false,
      pastKeyValuesSupplied: false,
      priorGeneratedMessagesSupplied: false,
    },
    fixture: FIXTURE,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(FIXTURE) },
    ],
    timings: {},
  };
  let stage = "validate-command";
  const announce = (nextStage, details = {}) => {
    stage = nextStage;
    emit("stage", requestId, backend, { stage, details });
  };

  try {
    if (backend !== "webgpu" && backend !== "wasm") {
      throw boundaryError(stage, "Backend must be webgpu or wasm.");
    }
    announce("runtime-import-start", { transformersUrl: TRANSFORMERS_URL });
    const importStartedAt = nowMs();
    const { AutoTokenizer, AutoModelForCausalLM, env } = await import(TRANSFORMERS_URL);
    evidence.timings.moduleLoadMs = nowMs() - importStartedAt;
    evidence.model.onnxRuntimeVersion = typeof env.backends?.onnx?.version === "string" ? env.backends.onnx.version : null;
    announce("runtime-import-complete", { durationMs: evidence.timings.moduleLoadMs });

    if (backend === "wasm") {
      announce("wasm-configure-start");
      const wasm = env.backends?.onnx?.wasm;
      if (!wasm) throw boundaryError("wasm-configure", "Transformers.js did not expose ONNX WASM settings.");
      wasm.simd = "fixed";
      wasm.numThreads = 1;
      wasm.proxy = false;
      evidence.settings.wasm = {
        simd: wasm.simd ?? null,
        numThreads: wasm.numThreads ?? null,
        proxy: wasm.proxy ?? null,
      };
      announce("wasm-configure-complete", evidence.settings.wasm);
    }

    announce("tokenizer-load-start");
    const tokenizerStartedAt = nowMs();
    const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, { revision: MODEL_REVISION });
    evidence.timings.tokenizerLoadMs = nowMs() - tokenizerStartedAt;
    const eos = tokenizer.eos_token_id;
    const eosIds = (Array.isArray(eos) ? eos : [eos]).filter((id) => Number.isInteger(id));
    evidence.tokenizer = { eosTokenIds: eosIds, eosToken: tokenizer.eos_token ?? null };
    announce("tokenizer-load-complete", { durationMs: evidence.timings.tokenizerLoadMs, eosTokenIds: eosIds });

    announce("session-load-start", { device: backend, dtype: "q4" });
    const modelStartedAt = nowMs();
    let lastProgressAt = 0;
    const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
      revision: MODEL_REVISION,
      device: backend,
      dtype: "q4",
      progress_callback(info) {
        if (info?.file?.startsWith("onnx/")) observedFiles.add(info.file);
        const now = nowMs();
        const frequent = info?.status === "progress" || info?.status === "progress_total";
        if (frequent && now - lastProgressAt < 500) return;
        lastProgressAt = now;
        emit("progress", requestId, backend, {
          progress: {
            status: info?.status ?? null,
            file: info?.file ?? null,
            loaded: Number.isFinite(info?.loaded) ? info.loaded : null,
            total: Number.isFinite(info?.total) ? info.total : null,
            progress: Number.isFinite(info?.progress) ? info.progress : null,
          },
        });
      },
    });
    evidence.timings.modelLoadMs = nowMs() - modelStartedAt;
    evidence.model.observedModelFiles = [...observedFiles].sort();
    evidence.model.expectedQ4FilesObserved = EXPECTED_Q4_FILES.every((file) => observedFiles.has(file));
    announce("session-load-complete", {
      durationMs: evidence.timings.modelLoadMs,
      observedModelFiles: evidence.model.observedModelFiles,
      expectedQ4FilesObserved: evidence.model.expectedQ4FilesObserved,
    });

    announce("prompt-render-start");
    const renderedPrompt = tokenizer.apply_chat_template(evidence.messages, {
      tokenize: false,
      add_generation_prompt: true,
    });
    evidence.renderedPrompt = renderedPrompt;
    let inputs = null;
    let outputs = null;
    let generationError = null;
    try {
      inputs = tokenizer(renderedPrompt);
      const inputTokenCount = inputs.input_ids.dims.at(-1);
      evidence.inputTokenCount = inputTokenCount;
      const contextLimit = model.config?.max_position_embeddings;
      evidence.model.contextLimit = Number.isInteger(contextLimit) ? contextLimit : null;
      if (Number.isInteger(contextLimit) && inputTokenCount + MAX_NEW_TOKENS > contextLimit) {
        throw boundaryError("context-limit", `Input ${inputTokenCount} plus ${MAX_NEW_TOKENS} generated tokens exceeds context ${contextLimit}.`);
      }
      announce("generation-start", {
        inputTokenCount,
        contextLimit: evidence.model.contextLimit,
        settings: evidence.settings,
        messages: evidence.messages,
        renderedPrompt,
      });
      const generationStartedAt = nowMs();
      outputs = await model.generate({
        ...inputs,
        max_new_tokens: MAX_NEW_TOKENS,
        do_sample: false,
        return_dict_in_generate: false,
      });
      evidence.timings.generationMs = nowMs() - generationStartedAt;
      announce("generation-returned", { durationMs: evidence.timings.generationMs });
      const sequences = outputs.tolist();
      if (!Array.isArray(sequences?.[0]) || sequences.length !== 1) {
        throw boundaryError("generated-sequence", "Expected one generated token sequence.");
      }
      const generatedIds = sequences[0].slice(inputTokenCount).map(Number);
      evidence.generatedTokenIds = generatedIds;
      evidence.generatedTokenCount = generatedIds.length;
      evidence.rawGeneratedText = tokenizer.decode(generatedIds, {
        skip_special_tokens: false,
        clean_up_tokenization_spaces: false,
      });
      if (generatedIds.length === 0) throw boundaryError("generated-sequence", "Generation returned no new tokens.");
      const terminalEosRemoved = eosIds.includes(generatedIds.at(-1));
      const parseIds = terminalEosRemoved ? generatedIds.slice(0, -1) : generatedIds;
      evidence.terminalEosRemoved = terminalEosRemoved;
      evidence.parseTextBeforeTrim = tokenizer.decode(parseIds, {
        skip_special_tokens: false,
        clean_up_tokenization_spaces: false,
      });
      evidence.parseText = evidence.parseTextBeforeTrim.trim();
      announce("fixture-parse-start", { generatedTokenCount: generatedIds.length, terminalEosRemoved });
      evidence.parsed = parseFixtureAction(evidence.parseText);
      evidence.parserDecision = "fixture-valid";
    } catch (error) {
      generationError = error;
      throw error;
    } finally {
      try {
        await disposeTensors(inputs, outputs);
        evidence.tensorCleanup = "completed";
      } catch (error) {
        evidence.tensorCleanup = "failed";
        evidence.tensorCleanupError = describeError(error);
        if (!generationError) throw boundaryError("tensor-cleanup", `Tensor cleanup failed: ${error.message ?? String(error)}`);
      }
    }

    evidence.status = "passed";
    evidence.finishedAt = new Date().toISOString();
    evidence.timings.totalMs = nowMs() - startedAt;
    emit("result", requestId, backend, { evidence });
  } catch (error) {
    evidence.status = "failed";
    evidence.firstFailingBoundary = error?.boundary ?? stage;
    evidence.parserDecision ??= ["json-parse", "fixture-shape"].includes(evidence.firstFailingBoundary)
      ? "fixture-invalid"
      : "not-reached";
    evidence.error = describeError(error);
    evidence.model.observedModelFiles = [...observedFiles].sort();
    evidence.finishedAt = new Date().toISOString();
    evidence.timings.totalMs = nowMs() - startedAt;
    emit("error", requestId, backend, { evidence });
  }
}

self.addEventListener("message", (event) => {
  const message = event.data ?? {};
  const requestId = message.requestId ?? null;
  const backend = message.backend ?? null;
  if (runStarted || message.command !== "run") {
    emit("error", requestId, backend, {
      evidence: {
        requestId,
        backend,
        status: "failed",
        firstFailingBoundary: "worker-command",
        error: { name: "Error", message: runStarted ? "This worker accepts only one run. Start a fresh worker." : "Unknown worker command." },
      },
    });
    return;
  }
  runStarted = true;
  runAttempt(requestId, backend);
});
