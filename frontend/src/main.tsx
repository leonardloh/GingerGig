import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker only in production builds.
// In dev, a service worker would cache CSS/JS from earlier visits and
// keep serving stale assets even after Vite hot-reload, which silently
// breaks live edits (e.g. footer styles updating but the cached version
// still rendering). It also makes any previously cached visit "sticky"
// across dev server restarts.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration failed — app still works online
    });
  });
} else if (import.meta.env.DEV && "serviceWorker" in navigator) {
  // Defensive cleanup: if you previously visited in dev with the SW
  // registered (legacy code paths), proactively unregister it and clear
  // its caches so this dev session sees fresh code on every reload.
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}
