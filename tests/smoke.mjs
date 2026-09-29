import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");
const js = fs.readFileSync("app.js", "utf8");
const css = fs.readFileSync("style.css", "utf8");

const checks = [];
const check = (name, ok) => {
  checks.push([name, Boolean(ok)]);
  if (!ok) process.exitCode = 1;
};

try {
  new Function(js);
  check("app.js syntax", true);
} catch (error) {
  console.error(error);
  check("app.js syntax", false);
}

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
const idSet = new Set(ids);
check("no duplicate HTML ids", ids.length === idSet.size);

const jsIdRefs = [...new Set([...js.matchAll(/\$\(["']#([^"']+)["']\)/g)].map((m) => m[1]))];
check("all JS id refs exist", jsIdRefs.every((id) => idSet.has(id)));

check("hash router enabled", js.includes('hash.startsWith("#/")') && js.includes('addEventListener("hashchange"'));
check("admin routes exist", ["/admin","/admin/produtos","/admin/categorias","/admin/reservas","/admin/avaliacoes","/admin/ferramentas"].every((r) => js.includes(r)));
check("demo fallback products removed", !js.includes("FALLBACK_PRODUCTS"));
check("API timeout exists", js.includes("AbortController") && js.includes("A conexão demorou demais"));
check("duplicate product code guard exists", js.includes("Já existe um produto com o código"));
check("active reservation delete guard exists", js.includes("reserva(s) ativa(s)"));
check("image upload validation exists", js.includes("Formato de imagem inválido") && js.includes("8 MB"));
check("CSV formula injection guard exists", js.includes("text.trimStart()"));
check("category placeholder disabled", html.includes('disabled selected hidden>Selecione uma categoria</option>'));
check("categories are dynamic", js.includes("function renderCatalogFilters") && !html.includes('data-category="adult"'));
check("responsive admin CSS exists", css.includes("@media(max-width:760px)") && css.includes(".admin-dashboard-grid{grid-template-columns:1fr}"));
check("Lovable badge hidden", css.includes("#lovable-badge") && css.includes("display: none !important"));

for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}

const failed = checks.filter(([, ok]) => !ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) {
  console.error("Failed:", failed.map(([name]) => name).join(", "));
  process.exit(1);
}
