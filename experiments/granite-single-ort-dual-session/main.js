const STORAGE_KEY = "granite-single-ort-dual-session-v1";
const worker = new Worker(new URL("./runtime-worker.js", import.meta.url), { type: "module", name: "single-ort" });
const status = document.querySelector("#status");
const log = document.querySelector("#log");
const cpuFirst = document.querySelector("#cpu-first");
const gpuFirst = document.querySelector("#gpu-first");
const download = document.querySelector("#download");
const clear = document.querySelector("#clear");

let evidence = {
  experiment: "granite-single-ort-dual-session",
  createdAt: new Date().toISOString(),
  pageUrl: location.href,
  userAgent: navigator.userAgent,
  events: [],
  completed: false,
};

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(evidence));
  } catch (error) {
    append(`PERSIST ERROR ${error?.name ?? "Error"}: ${error?.message ?? String(error)}`);
  }
}

function append(text) {
  log.textContent += `${text}\n`;
  log.scrollTop = log.scrollHeight;
}

const previous = localStorage.getItem(STORAGE_KEY);
if (previous) {
  try {
    const parsed = JSON.parse(previous);
    append("=== RESTORED PREVIOUS PAGE EVIDENCE ===");
    for (const entry of parsed.events ?? []) append(JSON.stringify(entry));
    append("=== CURRENT PAGE ===");
  } catch {}
}

function start(order) {
  evidence = {
    experiment: "granite-single-ort-dual-session",
    createdAt: new Date().toISOString(),
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    requestedOrder: order,
    events: [],
    completed: false,
  };
  persist();
  cpuFirst.disabled = true;
  gpuFirst.disabled = true;
  status.textContent = `Loading inside one Worker and one ONNX Runtime module: ${order.join(" → ").toUpperCase()}.`;
  append(`COMMAND initialize-both ${order.join(" -> ")}`);
  worker.postMessage({ command: "initialize-both", order });
}

worker.addEventListener("message", (event) => {
  const entry = { receivedAt: new Date().toISOString(), ...event.data };
  evidence.events.push(entry);
  if (entry.type === "both-sessions-ready") evidence.completed = true;
  persist();
  append(JSON.stringify(entry));

  if (entry.type === "first-session-resident") {
    status.textContent = `${entry.lane.toUpperCase()} session resident. Creating ${entry.secondLane.toUpperCase()} session inside the same runtime.`;
  } else if (entry.type === "both-sessions-ready") {
    status.textContent = "PASS: CPU WASM q4 and GPU WebGPU q4 sessions are simultaneously resident inside one Worker / one Transformers module realm.";
  } else if (entry.type === "runtime-error" || entry.type === "worker-error") {
    status.textContent = `ERROR: ${entry.error}`;
  }
});

worker.addEventListener("error", (event) => {
  const entry = { type: "worker-script-error", receivedAt: new Date().toISOString(), message: event.message };
  evidence.events.push(entry);
  persist();
  append(JSON.stringify(entry));
  status.textContent = `Worker script error: ${event.message}`;
});

cpuFirst.addEventListener("click", () => start(["cpu", "gpu"]));
gpuFirst.addEventListener("click", () => start(["gpu", "cpu"]));

download.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `granite-single-ort-dual-session-${new Date().toISOString().replaceAll(":", "-")}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

clear.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  log.textContent = "";
  status.textContent = "Persisted evidence cleared. Reload before starting a fresh runtime run.";
});
