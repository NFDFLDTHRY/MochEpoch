const EXPERIMENT = "granite-claptrap-rag-chat";
const CONVERSATION_FILE = "granite-claptrap-conversation.csv";
const EVIDENCE_KEY = "granite-claptrap-rag-chat-evidence-v1";
const SEED_TEXT = "Welcome to the Zoo";
const ACTOR_SYSTEM_PROMPT = "You are Claptrap.";
const TOTAL_TURNS = 100;
const FIXED_NEW_TOKENS = 100;

const worker = new Worker(new URL("./runtime-worker.js", import.meta.url), {
  type: "module",
  name: "granite-claptrap-single-ort",
});

const status = document.querySelector("#status");
const memoryStatus = document.querySelector("#memory-status");
const room = document.querySelector("#room");
const machineLog = document.querySelector("#machine-log");
const seedSeat = document.querySelector("#seed-seat");
const startButton = document.querySelector("#start");
const pauseButton = document.querySelector("#pause");
const stopButton = document.querySelector("#stop");
const downloadCsvButton = document.querySelector("#download-csv");
const downloadEvidenceButton = document.querySelector("#download-evidence");
const clearButton = document.querySelector("#clear");

let opfsRoot = null;
let conversationHandle = null;
let runtimeReady = false;
let running = false;
let paused = false;
let stopRequested = false;
let requestSequence = 0;
const pending = new Map();

let evidence = freshEvidence();

function freshEvidence() {
  return {
    experiment: EXPERIMENT,
    version: 1,
    createdAt: new Date().toISOString(),
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    fixedConditions: {
      actorSystemPrompt: ACTOR_SYSTEM_PROMPT,
      seedText: SEED_TEXT,
      totalTurns: TOTAL_TURNS,
      turnsPerSeat: TOTAL_TURNS / 2,
      fixedNewTokens: FIXED_NEW_TOKENS,
      cpuBackend: "wasm",
      gpuBackend: "webgpu",
      dtype: "q4",
    },
    seedSeat: null,
    runtimeEvents: [],
    turns: [],
    completed: false,
    stoppedEarly: false,
    error: null,
  };
}

function persistEvidence() {
  try {
    localStorage.setItem(EVIDENCE_KEY, JSON.stringify(evidence));
  } catch (error) {
    appendMachine({ type: "evidence-persist-error", error: serializeError(error) }, false);
  }
}

function serializeError(error) {
  return `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`;
}

function appendMachine(entry, save = true) {
  machineLog.textContent += `${JSON.stringify(entry)}\n`;
  machineLog.scrollTop = machineLog.scrollHeight;
  if (save) {
    evidence.runtimeEvents.push({ receivedAt: new Date().toISOString(), ...entry });
    persistEvidence();
  }
}

function rpc(command, payload, expectedType) {
  const requestId = `${command}-${Date.now()}-${++requestSequence}`;
  return new Promise((resolve, reject) => {
    pending.set(requestId, { expectedType, resolve, reject });
    worker.postMessage({ command, requestId, ...payload });
  });
}

worker.addEventListener("message", (event) => {
  const entry = event.data ?? {};
  appendMachine(entry);

  const waiter = entry.requestId ? pending.get(entry.requestId) : null;
  if (entry.type === "command-error" && waiter) {
    pending.delete(entry.requestId);
    waiter.reject(new Error(entry.error));
    return;
  }
  if (waiter && entry.type === waiter.expectedType) {
    pending.delete(entry.requestId);
    waiter.resolve(entry);
  }

  if (entry.type === "session-load-start") {
    status.textContent = `Loading ${entry.lane.toUpperCase()} q4 session on ${entry.device.toUpperCase()} inside the single runtime.`;
  } else if (entry.type === "first-session-resident") {
    status.textContent = `${entry.lane.toUpperCase()} resident. Loading ${entry.secondLane.toUpperCase()} in the same runtime.`;
  } else if (entry.type === "runtime-ready") {
    runtimeReady = true;
    status.textContent = "Both Claptraps are resident. Starting the conversation.";
  }
});

worker.addEventListener("error", (event) => {
  const error = `Worker script error: ${event.message}`;
  appendMachine({ type: "worker-script-error", error });
  for (const { reject } of pending.values()) reject(new Error(error));
  pending.clear();
  failRun(error);
});

function csvField(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function conversationCsvHeader() {
  return "turn,timestamp,speaker,backend,response\r\n";
}

function conversationCsvLine(row) {
  return [row.turn, row.timestamp, row.speaker, row.backend, row.response]
    .map(csvField)
    .join(",") + "\r\n";
}

function parseCsv(text) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    if (record.some((value) => value.length > 0)) records.push(record);
  }

  if (records.length === 0) return [];
  const [header, ...rows] = records;
  const expected = ["turn", "timestamp", "speaker", "backend", "response"];
  if (header.length !== expected.length || header.some((value, index) => value !== expected[index])) {
    throw new Error("conversation.csv header does not match the experiment schema.");
  }

  return rows.map((row) => ({
    turn: Number(row[0]),
    timestamp: row[1],
    speaker: row[2],
    backend: row[3],
    response: row[4],
  })).filter((row) => Number.isInteger(row.turn));
}

async function ensureOpfs() {
  if (!navigator.storage?.getDirectory) {
    throw new Error("Origin Private File System is unavailable on this origin.");
  }
  opfsRoot = await navigator.storage.getDirectory();
  conversationHandle = await opfsRoot.getFileHandle(CONVERSATION_FILE, { create: true });
}

async function resetConversationFile() {
  await ensureOpfs();
  const writable = await conversationHandle.createWritable();
  await writable.write(conversationCsvHeader());
  await writable.close();
  memoryStatus.textContent = `Conversation memory: ${CONVERSATION_FILE} reset and ready.`;
}

async function appendConversationRow(row) {
  if (!conversationHandle) await ensureOpfs();
  const file = await conversationHandle.getFile();
  const writable = await conversationHandle.createWritable({ keepExistingData: true });
  await writable.seek(file.size);
  await writable.write(conversationCsvLine(row));
  await writable.close();
}

async function readConversationText() {
  if (!conversationHandle) await ensureOpfs();
  const file = await conversationHandle.getFile();
  return file.text();
}

async function readConversationRows() {
  return parseCsv(await readConversationText());
}

function queryWords(query) {
  return String(query ?? "").trim().split(/\s+/).filter(Boolean);
}

async function executeRetrieval(plan) {
  if (plan.skipped) {
    return {
      requested: false,
      valid: true,
      query: null,
      words: [],
      matches: [],
      messageForActor: null,
      reason: plan.reason ?? "skipped",
    };
  }

  if (!plan.called) {
    return {
      requested: false,
      valid: true,
      query: null,
      words: [],
      matches: [],
      messageForActor: null,
      reason: "model-did-not-call-tool",
    };
  }

  if (plan.toolName !== "search_conversation") {
    return {
      requested: true,
      valid: false,
      query: plan.query ?? null,
      words: [],
      matches: [],
      messageForActor: `Memory search failed: unknown tool ${plan.toolName ?? "null"}.`,
      reason: "wrong-tool",
    };
  }

  if (plan.parseError || typeof plan.query !== "string") {
    return {
      requested: true,
      valid: false,
      query: plan.query ?? null,
      words: [],
      matches: [],
      messageForActor: "Memory search failed: tool arguments could not be parsed.",
      reason: "invalid-tool-arguments",
    };
  }

  const words = queryWords(plan.query);
  if (words.length < 3) {
    return {
      requested: true,
      valid: false,
      query: plan.query,
      words,
      matches: [],
      messageForActor: "Memory search failed: query requires at least three words.",
      reason: "query-too-short",
    };
  }

  const rows = await readConversationRows();
  const loweredWords = words.map((word) => word.toLocaleLowerCase());
  const matches = rows.filter((row) => {
    const haystack = row.response.toLocaleLowerCase();
    return loweredWords.every((word) => haystack.includes(word));
  });

  return {
    requested: true,
    valid: true,
    query: plan.query,
    words,
    matches,
    messageForActor: matches.length === 0
      ? `Memory search query: ${plan.query}. No prior conversation rows matched all query words.`
      : null,
    reason: matches.length ? "matches-returned" : "no-matches",
  };
}

function renderMessage(row, retrieval = null) {
  const article = document.createElement("article");
  article.className = `message ${row.backend === "wasm" ? "cpu" : "gpu"}`;

  const header = document.createElement("header");
  header.textContent = `Turn ${row.turn} · ${row.speaker} · ${row.backend.toUpperCase()} · ${row.timestamp}`;
  article.append(header);

  const body = document.createElement("p");
  body.textContent = row.response;
  article.append(body);

  if (retrieval) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const queryText = retrieval.query ? `query: ${retrieval.query}` : retrieval.reason;
    summary.textContent = `Memory retrieval · ${queryText} · ${retrieval.matches.length} match(es)`;
    details.append(summary);

    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify({
      requested: retrieval.requested,
      valid: retrieval.valid,
      query: retrieval.query,
      words: retrieval.words,
      reason: retrieval.reason,
      matchedTurnNumbers: retrieval.matches.map((match) => match.turn),
      rows: retrieval.matches,
    }, null, 2);
    details.append(pre);
    article.append(details);
  }

  room.append(article);
  article.scrollIntoView({ behavior: "smooth", block: "end" });
}

async function restoreConversation() {
  try {
    await ensureOpfs();
    const text = await readConversationText();
    if (!text.trim()) {
      await resetConversationFile();
      return;
    }
    const rows = parseCsv(text);
    room.textContent = "";
    for (const row of rows) renderMessage(row, null);
    memoryStatus.textContent = rows.length
      ? `Conversation memory: restored ${rows.length} saved turn(s) from ${CONVERSATION_FILE}. Starting a new run will reset it.`
      : `Conversation memory: ${CONVERSATION_FILE} is ready.`;
  } catch (error) {
    status.textContent = `ERROR: ${serializeError(error)}`;
    startButton.disabled = true;
    memoryStatus.textContent = "Conversation memory unavailable.";
  }
}

async function waitWhilePaused() {
  while (paused && !stopRequested) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function laneForTurn(turn, firstLane) {
  return (turn - 1) % 2 === 0 ? firstLane : (firstLane === "cpu" ? "gpu" : "cpu");
}

function speakerForLane(lane) {
  return lane === "cpu" ? "cpu_claptrap" : "gpu_claptrap";
}

function backendForLane(lane) {
  return lane === "cpu" ? "wasm" : "webgpu";
}

async function runConversation(firstLane) {
  let incomingText = SEED_TEXT;

  for (let turn = 1; turn <= TOTAL_TURNS; turn += 1) {
    await waitWhilePaused();
    if (stopRequested) break;

    const lane = laneForTurn(turn, firstLane);
    const timestamp = new Date().toISOString();
    const rowsBeforeTurn = await readConversationRows();

    status.textContent = `Turn ${turn}/${TOTAL_TURNS}: ${lane.toUpperCase()} Claptrap deciding whether to search memory.`;
    const retrievalPlan = await rpc("plan-retrieval", {
      lane,
      turn,
      timestamp,
      incomingText,
      memoryRowCount: rowsBeforeTurn.length,
    }, "retrieval-plan-result");

    const retrieval = await executeRetrieval(retrievalPlan);

    status.textContent = `Turn ${turn}/${TOTAL_TURNS}: ${lane.toUpperCase()} Claptrap generating 100 new tokens.`;
    const turnResult = await rpc("generate-turn", {
      lane,
      turn,
      timestamp,
      incomingText,
      retrievalQuery: retrieval.valid ? retrieval.query : null,
      retrievedRows: retrieval.valid ? retrieval.matches : [],
      retrievalMessage: retrieval.messageForActor,
    }, "turn-result");

    const completedTimestamp = new Date().toISOString();
    const row = {
      turn,
      timestamp: completedTimestamp,
      speaker: speakerForLane(lane),
      backend: backendForLane(lane),
      response: turnResult.outputText,
    };

    await appendConversationRow(row);
    renderMessage(row, retrieval);

    evidence.turns.push({
      turn,
      seat: lane,
      backend: row.backend,
      startedWithTimestamp: timestamp,
      completedTimestamp,
      incomingText,
      retrievalPlan: {
        called: retrievalPlan.called ?? false,
        toolName: retrievalPlan.toolName ?? null,
        query: retrievalPlan.query ?? null,
        parseError: retrievalPlan.parseError ?? null,
        rawModelOutput: retrievalPlan.rawModelOutput ?? null,
        inputTokenCount: retrievalPlan.inputTokenCount ?? null,
        generatedTokenCount: retrievalPlan.generatedTokenCount ?? null,
        durationMs: retrievalPlan.durationMs ?? null,
      },
      retrieval: {
        requested: retrieval.requested,
        valid: retrieval.valid,
        query: retrieval.query,
        words: retrieval.words,
        reason: retrieval.reason,
        matchedTurnNumbers: retrieval.matches.map((match) => match.turn),
        returnedRows: retrieval.matches,
      },
      actor: {
        systemPrompt: ACTOR_SYSTEM_PROMPT,
        inputTokenCount: turnResult.inputTokenCount,
        generatedTokenCount: turnResult.generatedTokenCount,
        durationMs: turnResult.durationMs,
        outputText: turnResult.outputText,
      },
    });
    persistEvidence();

    incomingText = turnResult.outputText;

    if (stopRequested) break;
  }

  const rows = await readConversationRows();
  const cpuTurns = rows.filter((row) => row.backend === "wasm").length;
  const gpuTurns = rows.filter((row) => row.backend === "webgpu").length;

  if (!stopRequested && rows.length === TOTAL_TURNS && cpuTurns === 50 && gpuTurns === 50) {
    evidence.completed = true;
    status.textContent = "COMPLETE: 100 turns saved. CPU 50, GPU 50. Conversation CSV is ready to export.";
  } else {
    evidence.stoppedEarly = true;
    status.textContent = `Stopped with ${rows.length} completed turn(s) safely saved.`;
  }
  persistEvidence();
}

async function startRun() {
  if (running) return;
  running = true;
  paused = false;
  stopRequested = false;
  startButton.disabled = true;
  seedSeat.disabled = true;
  pauseButton.disabled = true;
  stopButton.disabled = false;
  room.textContent = "";
  machineLog.textContent = "";
  evidence = freshEvidence();
  evidence.seedSeat = seedSeat.value;
  persistEvidence();

  try {
    await resetConversationFile();
    status.textContent = "Initializing one Transformers/ONNX runtime with CPU and GPU q4 sessions.";
    if (!runtimeReady) {
      await rpc("initialize", {}, "runtime-ready");
      runtimeReady = true;
    }

    pauseButton.disabled = false;
    await runConversation(seedSeat.value);
  } catch (error) {
    failRun(serializeError(error));
  } finally {
    running = false;
    paused = false;
    pauseButton.disabled = true;
    pauseButton.textContent = "Pause";
    stopButton.disabled = true;
  }
}

function failRun(error) {
  evidence.error = error;
  persistEvidence();
  status.textContent = `ERROR: ${error}`;
  running = false;
  paused = false;
  pauseButton.disabled = true;
  stopButton.disabled = true;
}

pauseButton.addEventListener("click", () => {
  if (!running) return;
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
  status.textContent = paused
    ? "Pause requested. The current model call will finish; the next turn will wait."
    : "Resumed.";
});

stopButton.addEventListener("click", () => {
  if (!running) return;
  stopRequested = true;
  paused = false;
  pauseButton.textContent = "Pause";
  status.textContent = "Stop requested. The current turn will finish and save, then the run will stop.";
});

startButton.addEventListener("click", startRun);

downloadCsvButton.addEventListener("click", async () => {
  try {
    const text = await readConversationText();
    downloadText(text, "text/csv", `granite-claptrap-conversation-${safeTimestamp()}.csv`);
  } catch (error) {
    status.textContent = `CSV DOWNLOAD ERROR: ${serializeError(error)}`;
  }
});

downloadEvidenceButton.addEventListener("click", () => {
  downloadText(JSON.stringify(evidence, null, 2), "application/json", `granite-claptrap-evidence-${safeTimestamp()}.json`);
});

clearButton.addEventListener("click", async () => {
  if (running) return;
  try {
    await resetConversationFile();
    localStorage.removeItem(EVIDENCE_KEY);
    evidence = freshEvidence();
    room.textContent = "";
    machineLog.textContent = "";
    status.textContent = "Saved conversation and evidence cleared. Runtime remains loaded if it was already initialized.";
  } catch (error) {
    status.textContent = `CLEAR ERROR: ${serializeError(error)}`;
  }
});

function safeTimestamp() {
  return new Date().toISOString().replaceAll(":", "-");
}

function downloadText(text, type, filename) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

restoreConversation();
