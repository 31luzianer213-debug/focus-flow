import htmlTemplate from "./static-shell.html?raw";

/**
 * The current Brechó UI is served as a complete HTML document.
 * Its JS and CSS must live in /public; importing them with ?url
 * emitted hashed /assets links that Lovable's SSR deployment did not serve.
 */
export function renderStaticShell() {
  return htmlTemplate;
}
