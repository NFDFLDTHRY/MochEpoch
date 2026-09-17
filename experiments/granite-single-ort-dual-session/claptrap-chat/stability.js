import { readCsv, searchRows } from "./turn-boundary.js";

const EXPERIMENT = "granite-claptrap-crash-isolation";
const DIRECTORY = "granite-claptrap-stability";
const TRIALS = ["cpu-only", "both-idle", "gpu-then-cpu"];
const status = document.querySelector("#status");
const log = document.querySelector("#log");
const output = document.querySelector("#output");
const saved = document.querySelector("#saved");
const download = document.querySelector("#download");
const checkpointDownload = document.querySelector("#download-checkpoint");
const collectorStatus = document.querySelector("#collector-status");
let directory, currentHandle, evidence, inputs, csvText, sourceHashes;
let worker, usedPage = false, activeInput = null, requestSequence = 0;
let writes = Promise.resolve();
let trialActive = false, currentFilename = "", saveFailure = null;
let pendingWrites = 0, committedEvents = 0, committedAt = null, committedText = "";
const pending = new Map();

function errorText(error) { return `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`; }

// The source is the actual phone export. No inferred timestamps or rewritten speech.
export function replayInputs(source, csv) {
  const rows = readCsv(csv);
  if (rows.length !== 1 || rows[0].speaker !== "gpu_claptrap" ||
      rows[0].response !== source.turns?.[0]?.actor?.outputText) {
    throw new Error("Source CSV and phone evidence do not match.");
  }
  const result = {};
  for (const lane of ["gpu", "cpu"]) {
    const start = source.runtimeEvents.find((event) => event.type === "generation-start" &&
      event.lane === lane && event.call === 1 && event.turn === (lane === "gpu" ? 1 : 2));
    const parts = /^Current timestamp: ([^\n]+)\nMessage from the other speaker:\n([\s\S]*)$/.exec(start?.messages?.[1]?.content ?? "");
    if (!parts || start.messages.length !== 2 || start.messages[0].role !== "system" ||
        start.messages[0].content !== "You are Claptrap." || start.messages[1].role !== "user" ||
        start.speechTokensRemaining !== 100 || start.rawTokenLimit !== 196 || start.doSample !== false ||
        !Number.isInteger(start.inputTokenCount) || typeof start.renderedPrompt !== "string") {
      throw new Error(`Source ${lane} input does not match the recorded experiment.`);
    }
    result[lane] = {
      lane, turn: start.turn, timestamp: parts[1], incomingText: parts[2],
      expectedFirstInput: { messages: start.messages, renderedPrompt: start.renderedPrompt, inputTokenCount: start.inputTokenCount },
    };
  }
  if (result.gpu.incomingText !== "Welcome to the Zoo" || result.cpu.incomingText !== rows[0].response) {
    throw new Error("Source inputs do not match the seed and saved GPU speech.");
  }
  return result;
}

async function hashText(text) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function writeText(handle, text) {
  const writable = await handle.createWritable();
  try { await writable.write(text); await writable.close(); }
  catch (error) { await writable.abort().catch(() => {}); throw error; }
}

function showCollector() {
  collectorStatus.textContent = saveFailure
    ? `Collector save failed after ${committedEvents} saved events: ${saveFailure.error}. Download the failure report before reloading; it includes unsaved diagnostics.`
    : `Collector: ${committedEvents} events saved; ${pendingWrites} write(s) pending.${trialActive ? " Collecting." : ""}`;
}

function persist() {
  if (saveFailure) return writes; // Fail closed; never retry a rejected checkpoint.
  const snapshot = JSON.stringify(evidence);
  const eventCount = evidence.events.length;
  const handle = currentHandle;
  pendingWrites++;
  showCollector();
  writes = writes.then(async () => {
    await writeText(handle, snapshot);
    committedText = snapshot;
    committedEvents = eventCount;
    committedAt = new Date().toISOString();
  }).catch((error) => {
    saveFailure ??= { error: errorText(error), at: new Date().toISOString(), committedEvents, committedAt };
    throw error;
  }).finally(() => { pendingWrites--; showCollector(); });
  writes.catch(() => {});
  return writes;
}

function record(entry) {
  const savedEntry = { receivedAt: new Date().toISOString(), ...entry };
  evidence.events.push(savedEntry);
  if (entry.type !== "load-progress") log.textContent += JSON.stringify(savedEntry) + "\n";
  return persist();
}

function rejectPending(error) {
  for (const waiter of pending.values()) waiter.reject(error);
  pending.clear();
}

async function receive(entry) {
  try {
    if (entry.type === "session-load-start") status.textContent = `Saving checkpoint, then loading ${entry.lane.toUpperCase()} q4...`;
    if (entry.type === "generation-start") status.textContent = `${entry.lane.toUpperCase()}: saving verified input before inference (${entry.inputTokenCount} tokens).`;
    if (entry.type === "generation-progress") status.textContent = `${entry.lane.toUpperCase()}: ${entry.rawGeneratedTokens} raw tokens generated in this call.`;
    await record(entry);
    if (entry.requiresSave) {
      worker.postMessage({ command: "checkpoint-ack", checkpointId: entry.checkpointId });
    }
    if (entry.type === "search-request") {
      if (entry.lane !== activeInput?.lane) throw new Error("Search does not belong to the active replay.");
      const rows = entry.lane === "cpu" ? readCsv(csvText) : [];
      const result = searchRows(rows, entry.name, entry.query);
      await record({ type: "search-result", requestId: entry.requestId, lane: entry.lane, turn: entry.turn, call: entry.call, result });
      worker.postMessage({ command: "search-result", requestId: entry.requestId, call: entry.call, result });
    }
    if (entry.type === "gpu-device-lost") throw new Error(`GPU device lost: ${entry.reason}: ${entry.message}`);
    const waiter = pending.get(entry.requestId);
    if (waiter && (entry.type === "command-error" || entry.type === waiter.expected)) {
      pending.delete(entry.requestId);
      if (entry.type === "command-error") waiter.reject(new Error(entry.error));
      else waiter.resolve(entry);
    }
  } catch (error) {
    if (entry.requiresSave) worker.postMessage({ command: "checkpoint-ack", checkpointId: entry.checkpointId, error: errorText(error) });
    rejectPending(error);
    worker.terminate();
    status.textContent = `Probe stopped: ${errorText(error)}. The last committed file remains available.`;
  }
}

function rpc(command, payload, expected) {
  const requestId = `diagnostic-${++requestSequence}`;
  return new Promise((resolve, reject) => {
    pending.set(requestId, { expected, resolve, reject });
    worker.postMessage({ command, requestId, ...payload });
  });
}

function downloadText(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportHandle(handle) {
  try {
    const file = await handle.getFile();
    const record = JSON.parse(await file.text());
    record.export = { exportedAt: new Date().toISOString(), source: "saved-file", outcome: record.status === "running" ? "unfinished" : record.status };
    downloadText(JSON.stringify(record), file.name);
  } catch (error) { status.textContent = `Export failed: ${errorText(error)}`; }
}

async function exportCurrent(checkpoint = false) {
  if (trialActive && !checkpoint) return;
  if (!usedPage) return currentHandle && exportHandle(currentHandle);
  const activeAtRequest = trialActive;
  // Final reports wait for queued writes. A live checkpoint remains available
  // even if storage has stalled, and explicitly labels its unsaved contents.
  if (!checkpoint) await writes.catch(() => {});
  const fromMemory = checkpoint || Boolean(saveFailure) || !committedText;
  const record = fromMemory ? JSON.parse(JSON.stringify(evidence)) : JSON.parse(committedText);
  record.export = {
    exportedAt: new Date().toISOString(),
    source: checkpoint ? "live-memory" : fromMemory ? "unsaved-memory" : "committed-file-snapshot",
    outcome: activeAtRequest || record.status === "running" ? "unfinished" : record.status,
    activeAtRequest, committedEvents, committedAt, pendingWrites, saveFailure,
  };
  downloadText(JSON.stringify(record), currentFilename);
}

function addSaved(handle, record, filename) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  const last = record.events?.at(-1);
  const state = record.status === "running" ? "interrupted or unfinished" : record.status;
  button.textContent = `Export ${record.trial} · ${record.createdAt} · ${state}`;
  button.addEventListener("click", () => exportHandle(handle));
  const note = document.createElement("p");
  note.textContent = `Last saved event: ${last?.type ?? "none"}${last?.lane ? ` (${last.lane})` : ""}. File: ${filename}`;
  item.append(button, note); saved.append(item);
}

async function startTrial(trial) {
  if (usedPage || !TRIALS.includes(trial)) return;
  usedPage = true;
  trialActive = true;
  saveFailure = null; pendingWrites = 0; committedEvents = 0; committedAt = null; committedText = "";
  currentHandle = null;
  download.disabled = true;
  download.textContent = "Download final evidence";
  checkpointDownload.disabled = true;
  status.textContent = "Running. Wait for COMPLETE or FAILED before downloading the final evidence.";
  showCollector();
  for (const id of TRIALS) document.querySelector(`#${id}`).disabled = true;
  log.textContent = ""; output.textContent = "";
  evidence = {
    experiment: EXPERIMENT, version: 2, trial, createdAt: new Date().toISOString(),
    pageUrl: location.href, userAgent: navigator.userAgent,
    sourceHashes, sourceCodeCommit: "37aef813ac2490a87325dca66377eef41ac4a594",
    status: "running", error: null, events: [], results: [],
    note: "Fixed-input diagnostic replay. Checkpoint writes affect timing. Not the 100-turn conversation or a speed benchmark.",
  };
  const filename = `${trial}-${evidence.createdAt.replaceAll(":", "-")}-${crypto.randomUUID()}.json`;
  currentFilename = filename;
  try {
    currentHandle = await directory.getFileHandle(filename, { create: true });
    writes = Promise.resolve();
    await persist();
    checkpointDownload.disabled = false;
    worker = new Worker(new URL("./runtime-worker.js", import.meta.url), { type: "module", name: "claptrap-stability" });
    worker.addEventListener("message", (event) => { void receive(event.data); });
    worker.addEventListener("error", (event) => {
      const error = new Error(`Worker script error: ${event.message}`);
      void record({ type: "worker-script-error", error: errorText(error) }).catch(() => {});
      rejectPending(error);
    });
    worker.addEventListener("messageerror", () => rejectPending(new Error("Worker message could not be decoded.")));
    await rpc("initialize", { diagnostic: true, lanes: trial === "cpu-only" ? ["cpu"] : ["cpu", "gpu"] }, "runtime-ready");
    const sequence = trial === "gpu-then-cpu" ? [inputs.gpu, inputs.cpu] : [inputs.cpu];
    for (const input of sequence) {
      activeInput = input;
      const result = await rpc("generate-turn", input, "turn-result");
      if (result.generatedTokenCount !== 100) throw new Error("Diagnostic response did not contain 100 conversational tokens.");
      evidence.results.push(result);
      await persist();
      output.textContent += `${input.lane.toUpperCase()}\n${result.outputText}\n\n`;
    }
    evidence.status = "complete";
    await persist();
    status.textContent = `COMPLETE: ${trial}. Recorded input matched; each response reached 100 conversational tokens and completed tensor cleanup. Export, then reload for the next trial.`;
  } catch (error) {
    evidence.status = "failed"; evidence.error = errorText(error);
    if (saveFailure) {
      const entry = { type: "collector-save-failed", receivedAt: new Date().toISOString(), ...saveFailure };
      evidence.events.push(entry);
      log.textContent += JSON.stringify(entry) + "\n";
    } else if (currentHandle) {
      await persist().catch(() => {});
    }
    status.textContent = `FAILED: ${evidence.error}. ${saveFailure || !committedText ? "Download the failure report before reloading; its newest diagnostics are not saved." : "Download the failure report, then reload for another trial."}`;
  } finally {
    worker?.terminate();
    trialActive = false;
    download.disabled = false;
    download.textContent = evidence.status === "complete" ? "Download final evidence" : "Download failure report";
    checkpointDownload.disabled = true;
    showCollector();
    activeInput = null;
    if (currentHandle) {
      try {
        const durable = JSON.parse(await (await currentHandle.getFile()).text());
        addSaved(currentHandle, durable, filename);
      } catch {
        addSaved(currentHandle, { trial, createdAt: evidence.createdAt, status: "no readable checkpoint", events: [] }, filename);
      }
    }
  }
}

async function restore() {
  try {
    const texts = await Promise.all(["json", "csv"].map(async (extension) => {
      const response = await fetch(new URL(`./evidence/phone-precrash-20260917.${extension}`, import.meta.url));
      if (!response.ok) throw new Error(`Could not load source ${extension}: HTTP ${response.status}`);
      return response.text();
    }));
    csvText = texts[1];
    inputs = replayInputs(JSON.parse(texts[0]), csvText);
    sourceHashes = { json: await hashText(texts[0]), csv: await hashText(csvText) };
    const root = await navigator.storage.getDirectory();
    directory = await root.getDirectoryHandle(DIRECTORY, { create: true });
    const previous = [];
    for await (const [name, handle] of directory.entries()) {
      if (handle.kind !== "file" || !name.endsWith(".json")) continue;
      const file = await handle.getFile();
      try {
        const record = JSON.parse(await file.text());
        if (record.experiment === EXPERIMENT) previous.push({ name, handle, record });
      } catch {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.textContent = `Export unreadable evidence: ${name}`;
        button.addEventListener("click", () => exportHandle(handle));
        item.append(button); saved.append(item);
      }
    }
    previous.sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt));
    for (const item of previous) addSaved(item.handle, item.record, item.name);
    const latest = previous[0];
    if (latest) {
      currentHandle = latest.handle;
      committedText = JSON.stringify(latest.record);
      committedEvents = latest.record.events.length;
      download.disabled = false;
      download.textContent = latest.record.status === "running" ? "Download saved unfinished evidence" : "Download saved evidence";
      log.textContent = latest.record.events.map((entry) => JSON.stringify(entry) + "\n").join("");
      output.textContent = latest.record.results.map((result) => `${result.lane.toUpperCase()}\n${result.outputText}\n\n`).join("");
    }
    document.querySelector("#fixture").textContent = `Recorded CPU input: ${inputs.cpu.expectedFirstInput.inputTokenCount} tokens. Identical messages, timestamp, and tool template in all trials.`;
    status.textContent = latest ? "Saved diagnostics restored. Choose a trial for a fresh runtime, or export a saved trial." : "Ready. Choose one trial.";
    showCollector();
    for (const id of TRIALS) document.querySelector(`#${id}`).disabled = false;
  } catch (error) { status.textContent = `Setup failed: ${errorText(error)}. Existing files have not been changed.`; }
}

for (const trial of TRIALS) document.querySelector(`#${trial}`).addEventListener("click", () => startTrial(trial));
download.addEventListener("click", () => exportCurrent());
checkpointDownload.addEventListener("click", () => trialActive && exportCurrent(true));
void restore();
