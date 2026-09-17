// Resource lifecycle only; conversation authority remains the OPFS CSV.
const OWNER_LOCK = "granite-claptrap-runtime-and-files";

export async function prepareApp() {
  const status = document.querySelector("#app-status");
  status.textContent = "Preparing the installed app and offline shell…";
  if (!navigator.serviceWorker || !navigator.locks) {
    throw new Error("This app needs service workers and Web Locks in a secure browser context.");
  }
  const registration = await navigator.serviceWorker.register(new URL("./sw.js", import.meta.url), {
    scope: "./", updateViaCache: "none",
  });
  if (registration.installing) {
    await new Promise((resolve, reject) => {
      const installing = registration.installing;
      const changed = () => {
        if (installing.state === "activated" || installing.state === "installed") resolve();
        else if (installing.state === "redundant") reject(new Error("Offline shell installation failed. Reload to retry; models have not been loaded."));
      };
      installing.addEventListener("statechange", changed); changed();
    });
  }
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller || !self.crossOriginIsolated) {
    const key = `claptrap-isolation-reload:${registration.scope}`;
    if (sessionStorage.getItem(key)) {
      throw new Error("The installed app could not establish cross-origin isolation. Model loading is blocked; close this app and reopen its link.");
    }
    sessionStorage.setItem(key, "1");
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    }
    location.reload();
    await new Promise(() => {});
  }
  sessionStorage.removeItem(`claptrap-isolation-reload:${registration.scope}`);
  if (typeof SharedArrayBuffer === "undefined") throw new Error("Shared memory is unavailable despite isolation. Model loading is blocked.");
  const persistent = await navigator.storage.persisted();
  const installed = matchMedia("(display-mode: standalone)").matches;
  status.textContent = `${installed ? "Installed app" : "App ready"} · offline shell saved · isolated · shared memory available${persistent ? " · persistent storage" : ""}.`;
  const install = document.querySelector("#install");
  let prompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); prompt = event; install.hidden = false;
  });
  install.addEventListener("click", async () => {
    if (!prompt) return;
    await prompt.prompt(); await prompt.userChoice;
    prompt = null; install.hidden = true;
  });
  window.addEventListener("appinstalled", () => { install.hidden = true; });
  return { crossOriginIsolated: true, sharedArrayBufferAvailable: true, installed, persistentStorage: persistent, serviceWorker: registration.active?.scriptURL ?? null };
}

// One owner covers both chat and replay, including their resident model weights.
// The browser releases this lock when the document closes; there is no stale lease.
export function claimRuntime() {
  return new Promise((resolve, reject) => {
    navigator.locks.request(OWNER_LOCK, { mode: "exclusive", ifAvailable: true }, async (lock) => {
      if (!lock) { reject(new Error("Claptrap is already open in another tab or installed window. Close that window, then reload this one.")); return; }
      resolve();
      await new Promise(() => {});
    }).catch(reject);
  });
}
