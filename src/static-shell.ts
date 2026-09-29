import htmlTemplate from "./static-shell.html?raw";
import appUrl from "../app.js?url";
import styleUrl from "../style.css?url";

export function renderStaticShell() {
  return htmlTemplate
    .replace('href="/style.css"', `href="${styleUrl}"`)
    .replace('src="/app.js"', `src="${appUrl}"`);
}
