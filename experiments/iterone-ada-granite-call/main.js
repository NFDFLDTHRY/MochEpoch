const STORAGE_KEY = "iterone-pass1-granite-evidence-v1";
const pageLoadId = crypto.randomUUID();
const backendControl = document.querySelector("#backend");
const runButton = document.querySelector("#run");
const downloadButton = document.querySelector("#download");
const status = document.querySelector("#status");
const progress = document.querySelector("#progress");
const history = document.querySelector("#history");

function loadAttempts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

const attempts = loadAttempts();
let activeWorker = null;
let activeRequestId = null;
let currentEvents = [];
let startedAt = null;

function showHistory() {
  history.textContent = attempts.length
    ? attempts.map((attempt, index) => {
      const result = attempt.evidence?.parserDecision === "fixture-valid"
        ? `valid ${attempt.evidence.parsed.action}`
        : `failed at ${attempt.evidence?.firstFailingBoundary || "unknown"}`;
      return `${index + 1}. ${attempt.startedAt} — ${attempt.backend} — ${result}`;
    }).join("\n")
    : "No attempts yet.";
}

function recordAttempt(outcome, evidence) {
  const attempt = {
    requestId: activeRequestId,
    backend: backendControl.value,
    startedAt,
    finishedAt: new Date().toISOString(),
    outcome,
    browser: navigator.userAgent,
    platform: navigator.platform,
    pageUrl: location.href,
    pageLoadId,
    events: currentEvents,
    evidence,
  };
  attempts.push(attempt);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch (error) {
    status.textContent = `Attempt ended, but browser evidence storage failed: ${error.message}. Download the current record now.`;
  }
  showHistory();
}

function finish(outcome, evidence) {
  if (!activeWorker) return;
  recordAttempt(outcome, evidence);
  activeWorker.terminate();
  activeWorker = null;
  activeRequestId = null;
  runButton.disabled = false;
  backendControl.disabled = false;
  if (outcome === "result") {
    status.textContent = evidence?.parserDecision === "fixture-valid"
      ? `Valid JSON action: ${evidence.parsed.action}`
      : `Generated text failed JSON check: ${evidence?.firstFailingBoundary || "unknown reason"}`;
  } else {
    status.textContent = `Call failed at ${evidence?.firstFailingBoundary || "worker"}: ${evidence?.error?.message || "unknown error"}`;
  }
}

runButton.addEventListener("click", () => {
  if (activeWorker) return;
  const backend = backendControl.value;
  const requestId = crypto.randomUUID();
  activeRequestId = requestId;
  startedAt = new Date().toISOString();
  currentEvents = [];
  progress.textContent = "";
  status.textContent = `Starting one ${backend} call…`;
  runButton.disabled = true;
  backendControl.disabled = true;

  let worker;
  try {
    worker = new Worker("./runtime-worker.js", { type: "module" });
  } catch (error) {
    activeWorker = { terminate() {} };
    finish("error", { firstFailingBoundary: "worker-create", error: { message: error.message } });
    return;
  }
  activeWorker = worker;
  worker.onmessage = ({ data }) => {
    if (data?.requestId !== requestId || !activeWorker) return;
    const { type, timestamp, stage, details, progress: transfer, evidence } = data;
    if (type === "stage" || type === "progress") {
      currentEvents.push(data);
      const detail = type === "stage" ? (details ? ` ${JSON.stringify(details)}` : "") : ` ${JSON.stringify(transfer)}`;
      progress.textContent += `${timestamp || new Date().toISOString()} ${stage || type}${detail}\n`;
      progress.scrollTop = progress.scrollHeight;
      status.textContent = stage || "Loading model…";
    } else if (type === "result" || type === "error") {
      currentEvents.push({ type, timestamp: timestamp || new Date().toISOString() });
      finish(type === "result" ? "result" : "error", evidence);
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    finish("error", { firstFailingBoundary: "worker-script", error: { message: event.message, filename: event.filename, lineno: event.lineno } });
  };
  worker.onmessageerror = () => {
    finish("error", { firstFailingBoundary: "worker-message", error: { message: "Could not decode a worker message." } });
  };
  worker.postMessage({ command: "run", requestId, backend });
});

downloadButton.addEventListener("click", () => {
  const exportData = {
    title: "IterOne Pass 1 — Ada / Granite browser call",
    exportedAt: new Date().toISOString(),
    pageUrl: location.href,
    attempts,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "IterOne-pass1-granite-call-browser-export.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
});

showHistory();
