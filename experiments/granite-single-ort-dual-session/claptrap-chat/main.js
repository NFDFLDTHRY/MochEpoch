import { CSV_HEADER, csvLine, readCsv, searchRows, verifyCompleted } from "./turn-boundary.js";
import { prepareApp, claimRuntime } from "./app-shell.js";

const EXPERIMENT = "granite-claptrap-rag-chat";
const CONVERSATION_FILE = "granite-claptrap-conversation.csv";
const EVIDENCE_FILE = "granite-claptrap-evidence.json";
const LEGACY_EVIDENCE_KEY = "granite-claptrap-rag-chat-evidence-v1";
const TOTAL_TURNS = 100;
const SEED_TEXT = "Welcome to the Zoo";
const FAILURE_KEY = "granite-claptrap-save-failure-v1";
let worker, appEnvironment, ownsRuntime = false;
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
const retryStorageButton = document.querySelector("#retry-storage");
let conversationHandle, evidenceHandle;
let storageReady = false, restoring = false, evidenceLoaded = false;
const storageIssues = [];
const storageState = { conversation: "unchecked", evidence: "unchecked", setupError: null };
let runtimeReady = false, runtimeFailed = false, running = false;
let loadingLane = null;
let paused = false, stopRequested = false, requestSequence = 0;
let evidenceWrites = Promise.resolve();
let saveFailure = null, pendingWrites = 0, committedEvents = 0, committedAt = null;
const pending = new Map(); // Outstanding worker messages, never conversation memory.
let evidence = freshEvidence();

function freshEvidence() {
  return {
    experiment: EXPERIMENT, version: 6, createdAt: new Date().toISOString(),
    pageUrl: location.href, userAgent: navigator.userAgent,
    fixedConditions: {
      actorSystemPrompt: "You are Claptrap. Respond to the incoming message.", seedText: SEED_TEXT,
      retrievalSystemPrompt: "Select three words from the supplied message. Call search_conversation with those words separated by spaces. Do not compose a conversational reply.",
      retrievalTemplateAdjustment: "Native tool schema and serialization retained; generic assistant preface omitted.",
      responseContext: "Retrieved CSV rows, timestamp and incoming message only. Queries and failed retrievals remain diagnostics.",
      malformedRetrieval: "Record failed attempt; execute no search; respond with zero retrieved rows.",
      totalTurns: 100, turnsPerSeat: 50, conversationalTokensPerTurn: 100,
      cpuBackend: "wasm", gpuBackend: "webgpu", dtype: "q4",
      turnProtocol: "retrieval-then-response-v1",
      retrieval: "Call 1 generates the search query; call 2 alone is the 100-token reply. Two calls per completed turn.",
    },
    seedSeat: null, runtimeEvents: [], turns: [], completed: false,
    stoppedEarly: false, running: false, interrupted: false, pendingTurn: null, error: null,
  };
}

function errorText(error) { return `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`; }

// File snapshots and handles are disposable. Never infer empty history from a
// failed read, and never create a replacement while resolving an existing file.
async function readStoredFile(name, { allowMissing = false } = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let operation = "getDirectory";
    try {
      const root = await navigator.storage.getDirectory();
      operation = "getFileHandle";
      const handle = await root.getFileHandle(name, { create: false });
      operation = "getFile";
      const file = await handle.getFile();
      operation = "File.text";
      const text = await file.text();
      if (attempt > 1) storageIssues.push({ at: new Date().toISOString(), file: name, attempt, outcome: "read-recovered" });
      return { handle, file, text };
    } catch (error) {
      const retry = attempt === 1 && ["InvalidStateError", "NotFoundError"].includes(error.name);
      const missing = !retry && allowMissing && operation === "getFileHandle" && error.name === "NotFoundError";
      storageIssues.push({ at: new Date().toISOString(), file: name, operation, attempt,
        name: error.name, message: error.message, stack: error.stack ?? null,
        outcome: retry ? "retry-with-fresh-handle" : missing ? "missing" : "failed" });
      if (retry) continue;
      if (missing) return null;
      const failure = new Error(`${name} at ${operation}: ${errorText(error)}`);
      failure.name = error.name;
      throw failure;
    }
  }
}

function storageUnavailable() {
  storageReady = false;
  storageState.conversation = "unavailable";
  progress.textContent = "Saved conversation count unavailable; CSV has not been verified.";
  memoryStatus.textContent = "Conversation CSV could not be read. Download evidence or retry saved storage.";
  clearButton.disabled = true;
}

function showLoadingFailure() {
  if (!loadingLane) return;
  document.querySelector(`#${loadingLane}-status`).textContent = `${loadingLane.toUpperCase()}: failed to load`;
  loadingLane = null;
}

async function writeText(handle, text) {
  const writable = await handle.createWritable();
  try { await writable.write(text); await writable.close(); }
  catch (error) { await writable.abort().catch(() => {}); throw error; }
}

function failRuntime(error) {
  runtimeFailed = true; runtimeReady = false;
  worker?.terminate();
  for (const lane of ["cpu", "gpu"]) document.querySelector(`#${lane}-status`).textContent = `${lane.toUpperCase()}: not resident`;
  for (const waiter of pending.values()) waiter.reject(error);
  pending.clear();
  showLoadingFailure();
  startButton.disabled = true;
}

function storageDiagnostics() {
  return [...new Set([...(evidence.storageReadDiagnostics ?? []), ...storageIssues].map(entry => JSON.stringify(entry)))].map(text => JSON.parse(text));
}

function persistEvidence() {
  if (saveFailure) return Promise.reject(new Error(saveFailure.error));
  if (storageState.evidence !== "readable") return Promise.reject(new Error("Saved evidence has not been read; refusing to overwrite it."));
  const text = JSON.stringify({ ...evidence, storageReadDiagnostics: storageDiagnostics() }), eventCount = evidence.runtimeEvents.length;
  pendingWrites++;
  evidenceWrites = evidenceWrites.then(async () => {
    if (saveFailure) throw new Error(saveFailure.error);
    await writeText(evidenceHandle, text);
    committedEvents = eventCount; committedAt = new Date().toISOString();
  }).catch((error) => {
    if (!saveFailure) {
      saveFailure = { error: errorText(error), at: new Date().toISOString(), runCreatedAt: evidence.createdAt, committedEvents, committedAt };
      evidence.error = saveFailure.error; evidence.running = false; evidence.completed = false;
      // Small independent diagnostic marker: never conversation/world state.
      // If both storage mechanisms fail, the live export still retains this error.
      try { localStorage.setItem(FAILURE_KEY, JSON.stringify(saveFailure)); saveFailure.reloadMarkerSaved = true; }
      catch { saveFailure.reloadMarkerSaved = false; }
      failRuntime(error);
      status.textContent = `STOPPED: evidence save failed. Download the evidence report before reloading.`;
    }
    memoryStatus.textContent = `Evidence save failed: ${saveFailure.error}. ${saveFailure.reloadMarkerSaved ? "Failure marker saved for reload." : "Failure marker could not be saved."} Live export includes unsaved diagnostics.`;
    throw error;
  }).finally(() => { pendingWrites--; });
  evidenceWrites.catch(() => {});
  return evidenceWrites;
}

function logLine(entry) {
  // Keep the DOM small; full inputs, outputs and token IDs stay in the export.
  return [entry.type, entry.lane, entry.turn && `turn ${entry.turn}`,
    entry.rawGeneratedTokens && `${entry.rawGeneratedTokens} raw tokens`, entry.error].filter(Boolean).join(" · ");
}

function recordEvent(entry) {
  evidence.runtimeEvents.push({ receivedAt: new Date().toISOString(), ...entry });
  if (entry.type !== "load-progress") {
    machineLog.textContent = evidence.runtimeEvents.filter((e) => e.type !== "load-progress")
      .slice(-100).map(logLine).join("\n");
    machineLog.scrollTop = machineLog.scrollHeight;
  }
  // High-frequency download notices are covered by the next load checkpoint.
  if (evidenceHandle && entry.type !== "load-progress") return persistEvidence();
  return Promise.resolve();
}

function rpc(command, payload, expectedType) {
  const requestId = `request-${++requestSequence}`;
  return new Promise((resolve, reject) => {
    pending.set(requestId, { expectedType, resolve, reject });
    worker.postMessage({ command, requestId, ...payload });
  });
}

async function readRows() {
  try {
    const stored = await readStoredFile(CONVERSATION_FILE);
    const rows = readCsv(stored.text);
    conversationHandle = stored.handle;
    storageState.conversation = "readable";
    return rows;
  } catch (error) { storageUnavailable(); throw error; }
}

async function receive(entry) {
  try {
    await recordEvent(entry);
    if (runtimeFailed) return;
    if (entry.requiresSave) worker.postMessage({ command: "checkpoint-ack", checkpointId: entry.checkpointId });
    if (entry.type === "search-request") {
      status.textContent = `Turn ${entry.turn}/100: ${entry.lane.toUpperCase()} requested a CSV search.`;
      const result = searchRows(await readRows(), entry.name, entry.query);
      await recordEvent({ type: "search-result", turn: entry.turn, call: entry.call, result });
      worker.postMessage({ command: "search-result", requestId: entry.requestId, call: entry.call, result });
      return;
    }
    if (entry.type === "session-load-start") {
      loadingLane = entry.lane;
      document.querySelector(`#${entry.lane}-status`).textContent = `${entry.lane.toUpperCase()}: loading q4`;
    } else if (entry.type === "load-progress" && Number.isFinite(entry.progress?.progress)) {
      document.querySelector(`#${entry.lane}-status`).textContent = `${entry.lane.toUpperCase()}: loading ${entry.progress.progress.toFixed(1)}%`;
    } else if (entry.type === "session-load-complete") {
      loadingLane = null;
      document.querySelector(`#${entry.lane}-status`).textContent = `${entry.lane.toUpperCase()}: resident${entry.lane === "cpu" ? ` · ${entry.runtimeThreads} WASM threads` : ""}`;
    } else if (entry.type === "generation-start") {
      status.textContent = `Turn ${entry.turn}/100: ${entry.lane.toUpperCase()} · ${entry.phase === "retrieval" ? "1/2 selecting search words" : "2/2 composing reply"}.`;
    } else if (entry.type === "generation-progress") {
      status.textContent = `Turn ${entry.turn}/100: ${entry.lane.toUpperCase()} · ${entry.phase === "retrieval" ? "1/2 selecting search words" : "2/2 composing reply"} · ${entry.rawGeneratedTokens} tokens generated. Only the second call is conversation.`;
    } else if (entry.type === "runtime-ready") {
      runtimeReady = true;
    } else if (entry.type === "gpu-device-lost") {
      throw new Error(`GPU device lost: ${entry.reason}: ${entry.message}`);
    }
    const waiter = pending.get(entry.requestId);
    if (waiter && entry.type === "command-error") {
      failRuntime(new Error(entry.error));
    } else if (waiter && entry.type === waiter.expectedType) {
      pending.delete(entry.requestId);
      waiter.resolve(entry);
    }
  } catch (error) {
    failRuntime(error);
    evidence.error = errorText(error); evidence.completed = false; evidence.running = false;
    status.textContent = `STOPPED: ${evidence.error}. Download the evidence report.`;
    if (!saveFailure && evidenceHandle) await persistEvidence().catch(() => {});
  }
}

function createRuntime() {
  worker = new Worker(new URL("./runtime-worker.js", import.meta.url), {
    type: "module", name: "granite-claptrap-single-ort",
  });
  worker.addEventListener("message", (event) => { void receive(event.data ?? {}); });
  for (const type of ["error", "messageerror"]) worker.addEventListener(type, (event) => {
    const error = new Error(type === "error" ? `Worker script error: ${event.message}` : "Worker message could not be decoded.");
    failRuntime(error);
    evidence.error = error.message; evidence.running = false;
    void recordEvent({ type: "worker-script-error", error: error.message }).catch(() => {});
    status.textContent = error.message;
  });
}

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
    const skipped = retrievals.filter((item) => item.executed === false).length;
    summary.textContent = skipped ? `CSV retrieval: ${skipped} failed attempt(s); no search executed` : `CSV retrieval: ${retrievals.length} tool call(s)`;
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

async function restore({ initializeEmpty = false } = {}) {
  if (running || restoring) return;
  restoring = true; storageReady = false;
  storageState.setupError = null;
  storageState.conversation = storageState.evidence = "unchecked";
  startButton.disabled = clearButton.disabled = retryStorageButton.disabled = true;
  progress.textContent = "Checking saved conversation; count not yet verified.";
  memoryStatus.textContent = "Reading existing conversation and evidence files…";
  room.textContent = "";
  try {
    appEnvironment ||= await prepareApp();
    if (!ownsRuntime) { await claimRuntime(); ownsRuntime = true; }
    if (!navigator.storage?.getDirectory) throw new Error("OPFS is unavailable on this origin.");
    let storedEvidence, storedConversation, rows, restoreError;
    const markerText = localStorage.getItem(FAILURE_KEY);
    const legacy = localStorage.getItem(LEGACY_EVIDENCE_KEY);

    // Load diagnostics independently before attempting the authoritative CSV.
    try {
      storedEvidence = await readStoredFile(EVIDENCE_FILE, { allowMissing: true });
      evidenceHandle = storedEvidence?.handle;
      const saved = storedEvidence?.text || legacy;
      if (saved) {
        const restored = JSON.parse(saved);
        if (restored.experiment !== EXPERIMENT || !Array.isArray(restored.turns) || !Array.isArray(restored.runtimeEvents)) throw new Error("Saved evidence does not match this experiment.");
        evidence = restored; evidenceLoaded = true;
        committedEvents = evidence.runtimeEvents.length;
      }
      storageState.evidence = storedEvidence ? "readable" : "missing";
    } catch (error) { storageState.evidence = "unavailable"; restoreError = error; }
    try {
      storedConversation = await readStoredFile(CONVERSATION_FILE, { allowMissing: true });
      conversationHandle = storedConversation?.handle;
      if (storedConversation?.text) {
        rows = readCsv(storedConversation.text);
        storageState.conversation = "readable";
        for (const row of rows) renderMessage(row, evidence.turns?.[row.turn - 1]?.retrievals ?? null);
        showCounts(rows);
      } else storageState.conversation = storedConversation ? "empty" : "missing";
    } catch (error) { storageState.conversation = "unavailable"; restoreError ||= error; }
    machineLog.textContent = (evidence.runtimeEvents ?? []).filter(entry => entry.type !== "load-progress")
      .slice(-100).map(logLine).join("\n");
    if (restoreError) throw restoreError;

    const bothMissing = !storedEvidence && !storedConversation;
    const bothEmpty = storedEvidence?.text === "" && storedConversation?.text === "";
    if (initializeEmpty && (bothMissing || bothEmpty) && !legacy && !markerText && !evidenceLoaded) {
      const root = await navigator.storage.getDirectory();
      conversationHandle = await root.getFileHandle(CONVERSATION_FILE, { create: true });
      evidenceHandle = await root.getFileHandle(EVIDENCE_FILE, { create: true });
      await writeText(conversationHandle, CSV_HEADER + "\r\n");
      storageState.conversation = storageState.evidence = "readable";
      rows = []; evidence = freshEvidence(); evidenceLoaded = true;
      await persistEvidence();
      showCounts(rows);
    } else {
      if (!rows) throw new Error("Conversation CSV is missing or empty. It has not been recreated from evidence.");
      if (!storedEvidence?.text && !legacy) throw new Error("Saved evidence is missing or empty. The conversation CSV remains unchanged.");
      if (!evidenceHandle) throw new Error("Evidence file is missing. Recovered legacy diagnostics are available to export.");
    }

    if (markerText) {
      const marker = JSON.parse(markerText);
      if (marker.runCreatedAt >= evidence.createdAt) {
        evidence.error = marker.error; evidence.completed = false;
        evidence.recoveredSaveFailure = marker;
      }
    }
    const prepared = evidence.pendingTurn;
    const row = prepared && rows[prepared.turn - 1];
    if (row && evidence.turns.length === prepared.turn - 1 &&
        row.backend === prepared.backend && row.timestamp === prepared.completedTimestamp &&
        row.response === prepared.actor.outputText) {
      evidence.turns.push(prepared); evidence.pendingTurn = null;
      evidence.recoveredCommittedTurn = row.turn;
    }
    if (evidence.turns.length !== rows.length) {
      evidence.completed = false;
      evidence.error ||= "CSV and diagnostic counts differ. Export both files before clearing; no rows were changed during recovery.";
    }
    if (evidence.completed) {
      try { verifyCompleted(rows, evidence.turns, evidence.seedSeat, 100, evidence.version >= 4); }
      catch (error) { evidence.completed = false; evidence.error = errorText(error); }
    }
    if (evidence.running) { evidence.running = false; evidence.interrupted = true; }
    storageReady = true;
    memoryStatus.textContent = rows.length
      ? `Restored ${rows.length} CSV turn(s). Saved speech is not loaded into model context. Export before starting a new run.`
      : "CSV and machine evidence storage ready.";
    if (evidence.error) status.textContent = `Saved run error: ${evidence.error}`;
    else if (evidence.completed) status.textContent = "Saved run complete. Conversation and evidence are available to download.";
    else if (evidence.interrupted) status.textContent = "The previous run was interrupted. Saved turns and diagnostics are available to export.";
    else status.textContent = rows.length ? "Saved conversation restored. Export before starting a new run." : "Ready. Choose the seed speaker and press Start.";
    startButton.disabled = rows.length > 0 || runtimeFailed || Boolean(evidence.error) || evidence.interrupted;
    clearButton.disabled = false;
  } catch (error) {
    storageState.setupError = errorText(error);
    if (storageState.conversation !== "readable") {
      progress.textContent = "Saved conversation count unavailable; CSV has not been verified.";
    }
    memoryStatus.textContent = evidenceLoaded
      ? `Saved evidence recovered (${evidence.turns.length} recorded replies). ${storageState.conversation === "readable" ? "CSV read succeeded." : "CSV count is unverified."} Download evidence or retry saved storage.`
      : "Saved storage could not be fully restored. Export recovery diagnostics or retry saved storage.";
    status.textContent = `Storage recovery error: ${storageState.setupError}. No existing history was reset.`;
    startButton.disabled = clearButton.disabled = true;
  } finally {
    restoring = false;
    retryStorageButton.disabled = false;
    document.querySelector("#download-evidence").textContent = evidenceLoaded ? "Download evidence JSON" : "Download recovery diagnostics";
  }
}

async function appendRow(row) {
  let stored;
  try { stored = await readStoredFile(CONVERSATION_FILE); }
  catch (error) { storageUnavailable(); throw error; }
  conversationHandle = stored.handle;
  const file = stored.file;
  const before = readCsv(stored.text);
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
    while (paused && !stopRequested && !runtimeFailed) await new Promise((resolve) => setTimeout(resolve, 100));
    if (runtimeFailed) throw new Error(evidence.error || "Runtime failed; reload required.");
    if (stopRequested) break;
    const lane = (turn - 1) % 2 === 0 ? firstLane : firstLane === "cpu" ? "gpu" : "cpu";
    const startedTimestamp = new Date().toISOString();
    const result = await rpc("generate-turn", {
      lane, turn, timestamp: startedTimestamp, incomingText,
    }, "turn-result");
    if (result.generatedTokenCount !== 100) throw new Error(`Turn ${turn} returned ${result.generatedTokenCount} conversational tokens.`);
    if (result.turnProtocol !== "retrieval-then-response-v1" || result.generationCallCount !== 2 || result.responseCall !== 2 ||
        result.calls?.length !== 2 || result.calls[0].phase !== "retrieval" || result.calls[1].phase !== "response" || result.retrievals?.length !== 1) {
      throw new Error(`Turn ${turn} did not complete retrieval followed by the response call. No CSV row appended.`);
    }
    const row = {
      turn, timestamp: new Date().toISOString(), speaker: `${lane}_claptrap`,
      backend: lane === "cpu" ? "wasm" : "webgpu", response: result.outputText,
    };
    evidence.pendingTurn = {
      turn, seat: lane, backend: row.backend, startedTimestamp,
      completedTimestamp: row.timestamp, incomingText,
      actor: {
        systemPrompt: result.systemPrompt, inputTokenCount: result.inputTokenCount,
        generatedTokenCount: result.generatedTokenCount, generatedSpeechIds: result.generatedSpeechIds,
        durationMs: result.durationMs, outputText: result.outputText,
        turnProtocol: result.turnProtocol, responseCall: result.responseCall, generationCallCount: result.generationCallCount,
      },
      calls: result.calls, retrievals: result.retrievals,
    };
    await persistEvidence(); // Durable result before changing the authoritative CSV.
    await appendRow(row);
    evidence.turns.push(evidence.pendingTurn); evidence.pendingTurn = null;
    await persistEvidence();
    renderMessage(row, result.retrievals);
    showCounts(await readRows());
    incomingText = row.response; // Only the just-committed plain text crosses.
  }
  const rows = await readRows();
  if (runtimeFailed) throw new Error(evidence.error || "Runtime failed.");
  if (rows.length === TOTAL_TURNS) {
    evidence.summary = verifyCompleted(rows, evidence.turns, firstLane, 100, true);
    evidence.completed = true;

  } else {
    evidence.stoppedEarly = true;

  }
  evidence.running = false;
  await persistEvidence();
  status.textContent = evidence.completed ? "COMPLETE: 100 responses saved from 200 calls. CPU 50, GPU 50. Seed excluded."
    : `Stopped after ${rows.length} saved turn(s). Export before clearing.`;
}

async function startRun() {
  if (running || restoring || !storageReady || runtimeFailed || !ownsRuntime || saveFailure) return;
  running = true; paused = false; stopRequested = false;
  startButton.disabled = true; seedSeat.disabled = true; clearButton.disabled = true;
  stopButton.disabled = false; retryStorageButton.disabled = true;
  try {
    if ((await readRows()).length) throw new Error("Saved CSV already contains conversation. Export or clear it before a new run.");
    const initialization = runtimeReady ? evidence.runtimeEvents.filter((event) =>
      /^(runtime-start|tokenizer-load|session-load|runtime-ready|first-session)/.test(event.type)) : [];
    evidence = freshEvidence(); evidence.seedSeat = seedSeat.value;
    evidence.running = true; evidence.appEnvironment = appEnvironment;
    evidence.appEnvironment.persistentStorage = await navigator.storage.persist().catch(() => false);
    evidence.runtimeEvents.push(...initialization);
    await persistEvidence();
    status.textContent = "Loading both q4 sessions in one runtime.";
    if (!runtimeReady) { createRuntime(); await rpc("initialize", {}, "runtime-ready"); }
    pauseButton.disabled = false;
    await runConversation(seedSeat.value);
  } catch (error) {
    evidence.error = errorText(error); evidence.running = false; evidence.completed = false;
    status.textContent = `ERROR: ${evidence.error}. Export available evidence. CSV availability must be checked before retrying.`;
    if (!saveFailure) await persistEvidence().catch(() => {});
  } finally {
    running = false; paused = false;
    pauseButton.disabled = true; pauseButton.textContent = "Pause";
    stopButton.disabled = true; clearButton.disabled = !storageReady; retryStorageButton.disabled = false;
  }
}

startButton.addEventListener("click", startRun);
retryStorageButton.addEventListener("click", () => restore());
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
  if (running || restoring || !storageReady || !ownsRuntime || !conversationHandle || !evidenceHandle) return;
  try {
    await evidenceWrites.catch(() => {});
    evidenceWrites = Promise.resolve(); saveFailure = null; pendingWrites = 0; committedEvents = 0; committedAt = null;
    const initialization = runtimeReady ? evidence.runtimeEvents.filter((event) =>
      /^(runtime-start|tokenizer-load|session-load|runtime-ready|first-session)/.test(event.type)) : [];
    await writeText(conversationHandle, CSV_HEADER + "\r\n");
    evidence = freshEvidence(); evidence.runtimeEvents.push(...initialization);
    await persistEvidence();
    localStorage.removeItem(LEGACY_EVIDENCE_KEY);
    localStorage.removeItem(FAILURE_KEY);
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
    downloadText((await readStoredFile(CONVERSATION_FILE)).text, "text/csv", `granite-claptrap-conversation-${stamp()}.csv`);
  } catch (error) { status.textContent = `CSV export failed: ${errorText(error)}`; }
});
document.querySelector("#download-evidence").addEventListener("click", () => {
  const report = { ...evidence, storageRecovery: { ...storageState, evidenceLoaded, pageUrl: location.href },
    storageReadDiagnostics: storageDiagnostics(),
    completed: evidence.completed && storageReady && !running && pendingWrites === 0 && !saveFailure,
    export: { at: new Date().toISOString(), source: evidenceLoaded ? "live received evidence" : "recovery diagnostics; saved evidence unavailable",
    outcome: storageState.setupError ? "storage-recovery-failed" : evidence.error ? "failed" : running || pendingWrites > 0 ? "running" : evidence.completed ? "complete" : evidence.interrupted ? "interrupted" : "stopped",
    committedEvents, receivedEvents: evidence.runtimeEvents.length, pendingWrites, committedAt, saveFailure } };
  downloadText(JSON.stringify(report, null, 2), "application/json", `granite-claptrap-evidence-${stamp()}.json`);
});
restore({ initializeEmpty: true });
