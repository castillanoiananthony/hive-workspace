"use client";
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Install the app": the browser's own install prompt where there is one, step-by-step instructions on iPhone. */
export function InstallApp() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [state, setState] = useState<"unknown" | "installed" | "ios" | "other">("unknown");
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- install support is only known in the browser
    setState(standalone ? "installed" : ios ? "ios" : "other");
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as PromptEvent); };
    const onInstalled = () => setState("installed");
    window.addEventListener("beforeinstallprompt", onPrompt); window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  return (
    <section aria-labelledby="install-h" id="install" className="scroll-mt-8">
      <h2 id="install-h" className="font-display text-xl font-semibold">Install the app</h2>
      <p className="mt-1 text-muted">Put HIVE-WORKSPACE on your home screen. It opens like an app, and your tasks still open and tick off with no signal (they sync when you&apos;re back online).</p>
      <div className="mt-4">
        {state === "installed" ? <p className="font-medium text-accent-text">It&apos;s installed on this device.</p>
          : evt ? <button type="button" onClick={async () => { await evt.prompt(); const c = await evt.userChoice; if (c.outcome === "accepted") setState("installed"); setEvt(null); }} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">Install HIVE-WORKSPACE</button>
          : state === "ios" ? <ol className="list-decimal space-y-1 pl-5"><li>Open this site in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (the square with an arrow).</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>
          : <p className="text-muted">In Chrome or Edge, use the install icon in the address bar, or the menu → <b>Install app</b> / <b>Add to Home screen</b>.</p>}
      </div>
      <a href="/offline" className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-4 text-sm font-medium hover:border-accent-edge">See your offline task list</a>
    </section>
  );
}
