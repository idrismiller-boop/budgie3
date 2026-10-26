import { useEffect, useState } from "react";

const isStandalone = () =>
  typeof window !== "undefined" &&
  ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true);

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/* Chrome/Edge/Android fire `beforeinstallprompt`; iOS Safari has no such event, so we show manual steps there. */
export function useInstall() {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const promptInstall = async () => {
    if (!evt) return;
    evt.prompt();
    try { await evt.userChoice; } catch (e) { /* ignore */ }
    setEvt(null);
  };
  return { canPrompt: !!evt, installed, ios: isIOS(), promptInstall };
}
