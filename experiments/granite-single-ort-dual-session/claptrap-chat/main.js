import { CSV_HEADER, csvLine, readCsv, searchRows, verifyCompleted } from "./turn-boundary.js";

const EXPERIMENT = "granite-claptrap-rag-chat";
const CONVERSATION_FILE = "granite-claptrap-conversation.csv";
const EVIDENCE_FILE = "granite-claptrap-evidence.json";
const LEGACY_EVIDENCE_KEY = "granite-claptrap-rag-chat-evidence-v1";
const TOTAL_TURNS = 100;
const SEED_TEXT = "Welcome to the Zoo";
const worker = new Worker(new URL("./runtime-worker.js", import.meta.url), {
  type: "module", name: "granite-claptrap-single-ort",
});
const status = document.querySelector("#status");
const memoryStatus = document.querySelector("#memory-status");
const room = document.querySelector("#room");
const machineLog = document.querySelector("#machine-log");
const seedSeat = document.querySelector("#seed-seat");
const startButton = document.querySelector("#start");
const pauseButton = document.querySelector("#pause");
const stopButton = document.querySelector("#stop");
const clearButton = document.querySelector("#clear");
const progress = document.querySelector("#turn-progress");
let conversationHandle, evidenceHandle;
let runtimeReady = false, runtimeFailed = false, running = false;
let paused = false, stopRequested = false, requestSequence = 0;
let evidenceWrites = Promise.resolve();
const pending = new Map(); // Outstanding worker messages, never conversation memory.
let evidence = freshEvidence();

function freshEvidence() {
  return {
    experiment: EXPERIMENT, version: 2, createdAt: new Date().toISOString(),
    pageUrl: location.href, userAgent: navigator.userAgent,
    fixedConditions: {
      actorSystemPrompt: "You are Claptrap.", seedText: SEED_TEXT,
      totalTurns: 100, turnsPerSeat: 50, conversationalTokensPerTurn: 100,
      cpuBackend: "wasm", gpuBackend: "webgpu", dtype: "q4",
      retrieval: "Native tool call within the actor turn; no preliminary planner.",
    },
    seedSeat: null, runtimeEvents: [], turns: [], completed: false,
    stoppedEarly: false, error: null,
  };
}

function errorText(error) { return `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`; }

async function writeText(handle, text) {
  const writable = await handle.createWritable();
  try { await writable.write(text); await writable.close(); }
  catch (error) { await writable.abort().catch(() => {}); throw error; }
}

function persistEvidence() {
  const text = JSON.stringify(evidence);
  evidenceWrites = evidenceWrites.then(() => writeText(evidenceHandle, text));
  // Prevent unhandled rejections for asynchronous runtime progress. The run
  // awaits the same promise before advancing or declaring completion.
  evidenceWrites.catch((error) => { memoryStatus.textContent = `Evidence save failed: ${errorText(error)}`; });
  return evidenceWrites;
}

function recordEvent(entry) {
  evidence.runtimeEvents.push({ receivedAt: new Date().toISOString(), ...entry });
  if (entry.type !== "load-progress") {
    machineLog.textContent += JSON.stringify(entry) + "\n";
    machineLog.scrollTop = machineLog.scrollHeight;
  }
  if (evidenceHandle) persistEvidence();
}

function rpc(command, payload, expectedType) {
  const requestId = `request-${++requestSequence}`;
  return new Promise((resolve, reject) => {
    pending.set(requestId, { expectedType, resolve, reject });
    worker.postMessage({ command, requestId, ...payload });
  });
}

async function readRows() {
  return readCsv(await (await conversationHandle.getFile()).text());
}

worker.addEventListener("message", (event) => {
  const entry = event.data ?? {};
  recordEvent(entry);
  if (entry.type === "search-request") {
    status.textContent = `Turn ${entry.turn}/100: ${entry.lane.toUpperCase()} requested a CSV search.`;
    (async () => {
      try {
        const result = searchRows(await readRows(), entry.name, entry.query);
        recordEvent({ type: "search-result", turn: entry.turn, call: entry.call, result });
        worker.postMessage({ command: "search-result", requestId: entry.requestId, call: entry.call, result });
      } catch (error) {
        worker.postMessage({ command: "search-result", requestId: entry.requestId, call: entry.call, error: errorText(error) });
      }
    })();
    return;
  }
  if (entry.type === "session-load-start") {
    document.querySelector(`#${entry.lane}-status`).textContent = `${entry.lane.toUpperCase()}: loading q4`;
  } else if (entry.type === "load-progress" && Number.isFinite(entry.progress?.progress)) {
    document.querySelector(`#${entry.lane}-status`).textContent = `${entry.lane.toUpperCase()}: loading ${entry.progress.progress.toFixed(1)}%`;
  } else if (entry.type === "session-load-complete") {
    document.querySelector(`#${entry.lane}-status`).textContent = `${entry.lane.toUpperCase()}: resident`;
  } else if (entry.type === "generation-start") {
    status.textContent = `Turn ${entry.turn}/100: ${entry.lane.toUpperCase()} generating (${entry.speechTokensRemaining} conversational tokens remaining).`;
  } else if (entry.type === "runtime-ready") {
    runtimeReady = true;
  }
  const waiter = pending.get(entry.requestId);
  if (waiter && entry.type === "command-error") {
    pending.delete(entry.requestId);
    runtimeFailed = true;
    waiter.reject(new Error(entry.error));
  } else if (waiter && entry.type === waiter.expectedType) {
    pending.delete(entry.requestId);
    waiter.resolve(entry);
  }
});

worker.addEventListener("error", (event) => {
  runtimeFailed = true;
  const error = new Error(`Worker script error: ${event.message}`);
  recordEvent({ type: "worker-script-error", error: error.message });
  for (const waiter of pending.values()) waiter.reject(error);
  pending.clear();
  status.textContent = error.message;
  startButton.disabled = true;
});

function renderMessage(row, retrievals) {
  const article = document.createElement("article");
  article.className = `message ${row.backend === "wasm" ? "cpu" : "gpu"}`;
  const header = document.createElement("header");
  header.textContent = `Turn ${row.turn} · ${row.speaker} · ${row.backend.toUpperCase()} · ${row.timestamp}`;
  const body = document.createElement("p");
  body.textContent = row.response;
  article.append(header, body);
  if (retrievals) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `CSV retrieval: ${retrievals.length} tool call(s)`;
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(retrievals, null, 2);
    details.append(summary, pre);
    article.append(details);
  }
  room.append(article);
  article.scrollIntoView({ block: "nearest" });
}

function showCounts(rows) {
  const cpu = rows.filter((row) => row.backend === "wasm").length;
  const gpu = rows.filter((row) => row.backend === "webgpu").length;
  progress.textContent = `${rows.length}/100 saved · CPU ${cpu}/50 · GPU ${gpu}/50 · seed excluded`;
}

async function restore() {
  try {
    if (!navigator.storage?.getDirectory) throw new Error("OPFS is unavailable on this origin.");
    const root = await navigator.storage.getDirectory();
    conversationHandle = await root.getFileHandle(CONVERSATION_FILE, { create: true });
    evidenceHandle = await root.getFileHandle(EVIDENCE_FILE, { create: true });
    let text = await (await conversationHandle.getFile()).text();
    if (!text) {
      text = CSV_HEADER + "\r\n";
      await writeText(conversationHandle, text);
    }
    const rows = readCsv(text);
    const savedEvidence = await (await evidenceHandle.getFile()).text();
    // Import the previous build's diagnostics for viewing/export only.
    const legacy = !savedEvidence ? localStorage.getItem(LEGACY_EVIDENCE_KEY) : null;
    if (savedEvidence || legacy) {
      const restored = JSON.parse(savedEvidence || legacy);
      if (restored.experiment !== EXPERIMENT) throw new Error("Saved evidence belongs to another experiment.");
      evidence = restored;
      if (legacy) await persistEvidence();
    }
    for (const row of rows) renderMessage(row, evidence.turns?.[row.turn - 1]?.retrievals ?? null);
    showCounts(rows);
    memoryStatus.textContent = rows.length
      ? `Restored ${rows.length} CSV turn(s). Saved speech is not loaded into model context. Export or clear before a new run.`
      : "CSV and machine evidence storage ready.";
    if (evidence.error) status.textContent = `Saved run error: ${evidence.error}`;
    else if (evidence.completed) status.textContent = "Saved run complete. Conversation and evidence are available to download.";
    startButton.disabled = rows.length > 0 || runtimeFailed;
    clearButton.disabled = false;
  } catch (error) {
    status.textContent = `Storage error: ${errorText(error)}. Existing files have not been reset.`;
    startButton.disabled = true;
  }
}

async function appendRow(row) {
  const file = await conversationHandle.getFile();
  const before = readCsv(await file.text());
  if (row.turn !== before.length + 1) throw new Error("CSV changed before the completed turn could be appended.");
  const writable = await conversationHandle.createWritable({ keepExistingData: true });
  try {
    await writable.seek(file.size);
    await writable.write(csvLine(row));
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
}

async function runConversation(firstLane) {
  let incomingText = SEED_TEXT;
  for (let turn = 1; turn <= TOTAL_TURNS; turn++) {
    while (paused && !stopRequested) await new Promise((resolve) => setTimeout(resolve, 100));
    if (stopRequested) break;
    const lane = (turn - 1) % 2 === 0 ? firstLane : firstLane === "cpu" ? "gpu" : "cpu";
    const startedTimestamp = new Date().toISOString();
    const result = await rpc("generate-turn", {
      lane, turn, timestamp: startedTimestamp, incomingText,
    }, "turn-result");
    if (result.generatedTokenCount !== 100) throw new Error(`Turn ${turn} returned ${result.generatedTokenCount} conversational tokens.`);
    const row = {
      turn, timestamp: new Date().toISOString(), speaker: `${lane}_claptrap`,
      backend: lane === "cpu" ? "wasm" : "webgpu", response: result.outputText,
    };
    await appendRow(row);
    evidence.turns.push({
      turn, seat: lane, backend: row.backend, startedTimestamp,
      completedTimestamp: row.timestamp, incomingText,
      actor: {
        systemPrompt: result.systemPrompt, inputTokenCount: result.inputTokenCount,
        generatedTokenCount: result.generatedTokenCount, generatedSpeechIds: result.generatedSpeechIds,
        durationMs: result.durationMs, outputText: result.outputText,
      },
      calls: result.calls, retrievals: result.retrievals,
    });
    await persistEvidence();
    renderMessage(row, result.retrievals);
    showCounts(await readRows());
    incomingText = row.response; // Only the just-committed plain text crosses.
  }
  const rows = await readRows();
  if (rows.length === TOTAL_TURNS) {
    evidence.summary = verifyCompleted(rows, evidence.turns, firstLane);
    evidence.completed = true;
    status.textContent = "COMPLETE: 100 responses saved. CPU 50, GPU 50. Seed excluded.";
  } else {
    evidence.stoppedEarly = true;
    status.textContent = `Stopped after ${rows.length} saved turn(s). Export before clearing.`;
  }
  await persistEvidence();
}

async function startRun() {
  if (running || runtimeFailed) return;
  running = true; paused = false; stopRequested = false;
  startButton.disabled = true; seedSeat.disabled = true; clearButton.disabled = true;
  stopButton.disabled = false;
  try {
    if ((await readRows()).length) throw new Error("Saved CSV already contains conversation. Export or clear it before a new run.");
    const initialization = runtimeReady ? evidence.runtimeEvents.filter((event) =>
      /^(runtime-start|tokenizer-load|session-load|runtime-ready|first-session)/.test(event.type)) : [];
    evidence = freshEvidence(); evidence.seedSeat = seedSeat.value;
    evidence.runtimeEvents.push(...initialization);
    await persistEvidence();
    status.textContent = "Loading both q4 sessions in one runtime.";
    if (!runtimeReady) await rpc("initialize", {}, "runtime-ready");
    pauseButton.disabled = false;
    await runConversation(seedSeat.value);
  } catch (error) {
    evidence.error = errorText(error);
    status.textContent = `ERROR: ${evidence.error}. Saved CSV remains available. Reload before retrying a failed runtime.`;
    await persistEvidence().catch(() => {});
  } finally {
    running = false; paused = false;
    pauseButton.disabled = true; pauseButton.textContent = "Pause";
    stopButton.disabled = true; clearButton.disabled = false;
  }
}

startButton.addEventListener("click", startRun);
pauseButton.addEventListener("click", () => {
  if (!running) return;
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
  status.textContent = paused ? "Pause requested. The current turn will finish and save." : "Resumed.";
});
stopButton.addEventListener("click", () => {
  if (!running) return;
  stopRequested = true; paused = false;
  status.textContent = "Stop requested. The current turn will finish and save.";
});
clearButton.addEventListener("click", async () => {
  if (running || !conversationHandle || !evidenceHandle) return;
  try {
    await evidenceWrites.catch(() => {});
    evidenceWrites = Promise.resolve();
    const initialization = runtimeReady ? evidence.runtimeEvents.filter((event) =>
      /^(runtime-start|tokenizer-load|session-load|runtime-ready|first-session)/.test(event.type)) : [];
    await writeText(conversationHandle, CSV_HEADER + "\r\n");
    evidence = freshEvidence(); evidence.runtimeEvents.push(...initialization);
    await persistEvidence();
    localStorage.removeItem(LEGACY_EVIDENCE_KEY);
    room.textContent = ""; machineLog.textContent = ""; showCounts([]);
    seedSeat.disabled = false; startButton.disabled = runtimeFailed;
    memoryStatus.textContent = "Saved conversation and diagnostics cleared.";
    status.textContent = runtimeFailed ? "Reload to retry the failed runtime." : "Ready. Loaded model weights, if any, remain resident.";
  } catch (error) { status.textContent = `Clear failed: ${errorText(error)}`; }
});

function downloadText(text, type, filename) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function stamp() { return new Date().toISOString().replaceAll(":", "-"); }

document.querySelector("#download-csv").addEventListener("click", async () => {
  try {
    downloadText(await (await conversationHandle.getFile()).text(), "text/csv", `granite-claptrap-conversation-${stamp()}.csv`);
  } catch (error) { status.textContent = `CSV export failed: ${errorText(error)}`; }
});
document.querySelector("#download-evidence").addEventListener("click", () => {
  downloadText(JSON.stringify(evidence, null, 2), "application/json", `granite-claptrap-evidence-${stamp()}.json`);
});
restore();
