import React, { useEffect, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

export default function PwaInstallButton() {
  const [iosDevice, setIosDevice] = useState(false);
  const [androidDevice, setAndroidDevice] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [installError, setInstallError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    setIosDevice(isIosDevice());
    setAndroidDevice(/Android/i.test(navigator.userAgent));
    setInstalled(isStandalone());

    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showInstallHelp) return undefined;
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowInstallHelp(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus?.();
    };
  }, [showInstallHelp]);

  if (installed || (!iosDevice && !androidDevice && !installPrompt)) return null;

  const install = async () => {
    setInstallError("");
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }
    if (!installPrompt) return;
    try {
      const prompt = installPrompt;
      setInstallPrompt(null);
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === "accepted") setInstalled(true);
    } catch (error) {
      console.error("Unable to start the PWA installation prompt:", error);
      setInstallError("Installation could not start. Try the browser menu instead.");
    }
  };

  return <>
    <button
      type="button"
      className="pwa-install-button"
      onClick={install}
      aria-haspopup={iosDevice && !installPrompt ? "dialog" : undefined}
    >
      <Download size={15} aria-hidden="true" />
      <span>Install app</span>
    </button>
    {installError && <p className="pwa-install-error" role="status">{installError}</p>}
    {showInstallHelp && (
      <div className="pwa-install-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowInstallHelp(false);
      }}>
        <section
          className="pwa-install-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          tabIndex={-1}
          ref={dialogRef}
        >
          <button type="button" className="pwa-install-close" onClick={() => setShowInstallHelp(false)} aria-label="Close install instructions">
            <X size={17} />
          </button>
          <span className="pwa-install-dialog-icon"><Download size={20} aria-hidden="true" /></span>
          <p className="pwa-install-eyebrow">A faster way to check the market</p>
          <h2 id="pwa-install-title">{iosDevice ? "Add Crypto Predict to your Home Screen" : "Install Crypto Predict from your browser"}</h2>
          <ol>
            {iosDevice ? <>
              <li><span>1</span>Tap the browser’s <strong>Share</strong> button <Share2 size={15} aria-label="Share" />.</li>
              <li><span>2</span>Choose <strong>Add to Home Screen</strong>.</li>
              <li><span>3</span>Tap <strong>Add</strong> to finish.</li>
            </> : <>
              <li><span>1</span>Open your browser’s <strong>menu</strong>.</li>
              <li><span>2</span>Choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</li>
              <li><span>3</span>Confirm to finish.</li>
            </>}
          </ol>
          <p className="pwa-install-note">Market prices and alerts still need an internet connection.</p>
          <button type="button" className="pwa-install-done" onClick={() => setShowInstallHelp(false)}>Got it</button>
        </section>
      </div>
    )}
  </>;
}
