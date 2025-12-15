import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

window.addEventListener("load", async () => {
  const root = document.getElementById("app");
  const { bootMosaicUI } = await import("./Mosaic-ui.js");

  const isMini = await (async () => {
    try {
      return await sdk.isInMiniApp();
    } catch {
      return false;
    }
  })();

  const ui = bootMosaicUI({
    root,
    onReadyText: isMini ? "mini app detected ✓" : "web mode ✓"
  });
  ui.setEnv(isMini);

  // ALWAYS call ready()
  try {
    await sdk.actions.ready();
  } catch {
    // ignore if not available
  }
});