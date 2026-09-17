(() => {
  const NativeWorker = window.Worker;
  const queue = [];
  const history = [];
  let active = null;
  let notice = null;

  function nowMs() {
    return performance.timeOrigin + performance.now();
  }

  function record(type, detail = {}) {
    history.push({ type, atMs: nowMs(), ...detail });
    if (history.length > 200) history.splice(0, history.length - 200);
  }

  function updateNotice() {
    if (!notice) return;
    const activeText = active ? `${active.workerName.toUpperCase()} initialization active` : "no initialization active";
    const queuedText = queue.length
      ? ` queued: ${queue.map((entry) => entry.workerName.toUpperCase()).join(", ")}`
      : " queue empty";
    notice.textContent = `Cross-worker init gate: ${activeText};${queuedText}. Only one init command is forwarded at a time.`;
  }

  function appendHumanLog(text) {
    const log = document.querySelector("#log");
    if (!log) return;
    const time = new Date().toLocaleTimeString();
    log.textContent += `[${time}] INIT GATE: ${text}\n`;
    log.scrollTop = log.scrollHeight;
  }

  function forward(entry) {
    active = entry;
    entry.forwardedAtMs = nowMs();
    record("init-forwarded", {
      workerName: entry.workerName,
      queuedAtMs: entry.queuedAtMs,
      forwardedAtMs: entry.forwardedAtMs,
      queueDelayMs: entry.forwardedAtMs - entry.queuedAtMs,
    });
    appendHumanLog(`${entry.workerName.toUpperCase()} init forwarded after ${(entry.forwardedAtMs - entry.queuedAtMs).toFixed(1)} ms in gate.`);
    updateNotice();

    try {
      if (entry.hasSecondArgument) {
        entry.nativePostMessage(entry.message, entry.transferOrOptions);
      } else {
        entry.nativePostMessage(entry.message);
      }
    } catch (error) {
      record("init-forward-error", {
        workerName: entry.workerName,
        error: `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`,
      });
      active = null;
      updateNotice();
      releaseNext();
      throw error;
    }
  }

  function releaseNext() {
    if (active || queue.length === 0) {
      updateNotice();
      return;
    }
    const next = queue.shift();
    queueMicrotask(() => {
      if (!active) forward(next);
    });
    updateNotice();
  }

  function release(worker, outcome) {
    if (!active || active.worker !== worker) return;
    const finished = active;
    const releasedAtMs = nowMs();
    record("init-released", {
      workerName: finished.workerName,
      outcome,
      forwardedAtMs: finished.forwardedAtMs,
      releasedAtMs,
      activeDurationMs: releasedAtMs - finished.forwardedAtMs,
    });
    appendHumanLog(`${finished.workerName.toUpperCase()} init gate released by ${outcome}.`);
    active = null;
    updateNotice();
    releaseNext();
  }

  function GatedWorker(url, options) {
    const worker = new NativeWorker(url, options);
    const workerName = options?.name ?? String(url);
    const nativePostMessage = worker.postMessage.bind(worker);

    worker.postMessage = function postMessage(message, transferOrOptions) {
      if (message?.command !== "init") {
        if (arguments.length > 1) return nativePostMessage(message, transferOrOptions);
        return nativePostMessage(message);
      }

      const entry = {
        worker,
        workerName,
        nativePostMessage,
        message,
        transferOrOptions,
        hasSecondArgument: arguments.length > 1,
        queuedAtMs: nowMs(),
        forwardedAtMs: null,
      };

      if (active) {
        queue.push(entry);
        record("init-queued", {
          workerName,
          blockedBy: active.workerName,
          queuedAtMs: entry.queuedAtMs,
          queueDepth: queue.length,
        });
        appendHumanLog(`${workerName.toUpperCase()} init queued behind ${active.workerName.toUpperCase()}.`);
        updateNotice();
        return;
      }

      return forward(entry);
    };

    worker.addEventListener("message", (event) => {
      const type = event.data?.type;
      if (type === "ready" || type === "load-error" || type === "worker-error") {
        release(worker, type);
      }
    });

    worker.addEventListener("error", () => {
      release(worker, "worker-script-error");
    });

    return worker;
  }

  GatedWorker.prototype = NativeWorker.prototype;
  Object.setPrototypeOf(GatedWorker, NativeWorker);
  window.Worker = GatedWorker;

  notice = document.createElement("p");
  notice.className = "notice";
  notice.id = "init-gate-status";
  document.querySelector("#benchmark-status").insertAdjacentElement("afterend", notice);
  updateNotice();

  window.__graniteInitGate = {
    get snapshot() {
      return {
        active: active
          ? {
              workerName: active.workerName,
              queuedAtMs: active.queuedAtMs,
              forwardedAtMs: active.forwardedAtMs,
            }
          : null,
        queue: queue.map((entry) => ({
          workerName: entry.workerName,
          queuedAtMs: entry.queuedAtMs,
        })),
        history: history.map((entry) => ({ ...entry })),
      };
    },
  };
})();
