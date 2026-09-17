(() => {
  const STORAGE_KEY = "granite-v4-persistent-journal-v1";
  const MAX_ENTRIES = 1000;
  const NativeWorker = window.Worker;

  function readStoredJournal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function sessionHasEvidence(session) {
    return Boolean(
      session &&
      ((Array.isArray(session.entries) && session.entries.length > 0) || session.humanLog),
    );
  }

  const stored = readStoredJournal();
  const previous = sessionHasEvidence(stored?.current)
    ? stored.current
    : (sessionHasEvidence(stored?.previous) ? stored.previous : null);

  const journal = {
    version: 1,
    probe: "v4-original-plus-persistent-journal",
    previous,
    current: {
      startedAt: new Date().toISOString(),
      pageUrl: location.href,
      userAgent: navigator.userAgent,
      entries: [],
      humanLog: "",
    },
  };

  let storageError = null;

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(journal));
      storageError = null;
    } catch (error) {
      storageError = `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`;
    }
  }

  function journalEvent(kind, detail = {}) {
    journal.current.entries.push({
      kind,
      recordedAt: new Date().toISOString(),
      recordedAtMs: performance.timeOrigin + performance.now(),
      ...detail,
    });
    if (journal.current.entries.length > MAX_ENTRIES) {
      journal.current.entries.splice(0, journal.current.entries.length - MAX_ENTRIES);
    }
    persist();
  }

  function journalWorker(url, options) {
    const worker = new NativeWorker(url, options);
    const workerName = options?.name ?? String(url);

    journalEvent("worker-created", {
      workerName,
      url: String(url),
      options: options ?? null,
    });

    worker.addEventListener("message", (event) => {
      journalEvent("worker-message", {
        workerName,
        data: event.data,
      });
    });

    worker.addEventListener("error", (event) => {
      journalEvent("worker-error", {
        workerName,
        message: event.message ?? null,
        filename: event.filename ?? null,
        lineno: event.lineno ?? null,
        colno: event.colno ?? null,
      });
    });

    const nativePostMessage = worker.postMessage.bind(worker);
    worker.postMessage = function postMessage(message, transferOrOptions) {
      journalEvent("worker-command", {
        workerName,
        data: message,
      });
      if (arguments.length > 1) {
        return nativePostMessage(message, transferOrOptions);
      }
      return nativePostMessage(message);
    };

    return worker;
  }

  journalWorker.prototype = NativeWorker.prototype;
  Object.setPrototypeOf(journalWorker, NativeWorker);
  window.Worker = journalWorker;

  const logElement = document.querySelector("#log");
  let restoredPrefix = "";

  if (previous) {
    const previousEntryCount = Array.isArray(previous.entries) ? previous.entries.length : 0;
    restoredPrefix = [
      "=== RESTORED PERSISTENT JOURNAL FROM PREVIOUS PAGE INSTANCE ===",
      `Previous page started: ${previous.startedAt ?? "unknown"}`,
      `Persisted worker/command entries: ${previousEntryCount}`,
      previous.humanLog || "(No human-readable log text was persisted.)",
      "=== CURRENT PAGE INSTANCE ===",
      "",
    ].join("\n");
    logElement.textContent = restoredPrefix;
  }

  const restoredPrefixLength = restoredPrefix.length;
  const observer = new MutationObserver(() => {
    journal.current.humanLog = logElement.textContent.slice(restoredPrefixLength);
    persist();
  });
  observer.observe(logElement, { childList: true, characterData: true, subtree: true });

  const controls = document.querySelector(".controls");

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.textContent = "Download persistent journal";
  downloadButton.addEventListener("click", () => {
    journalEvent("journal-download-requested");
    const raw = localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(journal);
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `granite-v4-persistent-journal-${new Date().toISOString().replaceAll(":", "-")}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  controls.append(downloadButton);

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "Clear persistent journal";
  clearButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    journal.previous = null;
    journal.current.entries = [];
    journal.current.humanLog = "";
    journal.current.startedAt = new Date().toISOString();
    journal.current.pageUrl = location.href;
    logElement.textContent = "";
    persist();
    journalEvent("journal-cleared");
  });
  controls.append(clearButton);

  const notice = document.createElement("p");
  notice.className = "notice";
  notice.textContent = previous
    ? "Persistent journal restored the previous page instance. If Chrome snaps again, reload this same URL and download the persistent journal before clearing it."
    : "Persistent journal armed. Worker commands, worker messages, and the visible log are mirrored to localStorage so they survive a renderer crash and reload.";
  document.querySelector("#benchmark-status").insertAdjacentElement("afterend", notice);

  journalEvent("journal-session-start", {
    restoredPreviousSession: Boolean(previous),
    previousEntryCount: Array.isArray(previous?.entries) ? previous.entries.length : 0,
  });

  window.addEventListener("pagehide", () => {
    journalEvent("pagehide", { visibilityState: document.visibilityState });
  });

  window.addEventListener("pageshow", (event) => {
    journalEvent("pageshow", { persisted: Boolean(event.persisted) });
  });

  window.__granitePersistentJournal = {
    storageKey: STORAGE_KEY,
    get snapshot() {
      return JSON.parse(JSON.stringify(journal));
    },
    get storageError() {
      return storageError;
    },
  };

  persist();
})();
