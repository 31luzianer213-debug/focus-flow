import fs from "node:fs";

const html = fs.readFileSync("src/static-shell.html", "utf8");
const js = fs.readFileSync("public/app.js", "utf8");
const css = fs.readFileSync("public/style.css", "utf8");

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

const jsIdRefs = [...new Set([...js.matchAll(/\$\(["']#([A-Za-z0-9_:-]+)(?:[^"']*)["']\)/g)].map((m) => m[1]))];
check("all JS id refs exist", jsIdRefs.every((id) => idSet.has(id)));

check("clean history router enabled", js.includes("window.location.pathname") && js.includes('addEventListener("popstate"') && !js.includes('hash.startsWith("#/")'));
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
check("public assets exist", fs.existsSync("public/app.js") && fs.existsSync("public/style.css"));
check("tracking route exists", js.includes('tracking: "/minha-reserva"') && html.includes('id="tracking"') && js.includes("trackReservation"));
check("reservation protocol UX exists", html.includes('id="confirmation-protocol"') && js.includes("reservationProtocol"));
check("favorites persist locally", html.includes('id="catalog-favorites"') && js.includes("brecho:favorites"));
check("share action exists", html.includes('id="share-button"') && js.includes("navigator.share"));
check("catalog advanced filters exist", ["catalog-status","catalog-size","catalog-condition","catalog-sort"].every((id) => html.includes(`id="${id}"`)));
check("public menu does not expose ADM", !html.match(/<div class="nav-links"[\s\S]*?<\/div>/)?.[0]?.includes('data-screen-link="adm"'));
check("skip link exists", html.includes('class="skip-link"'));
check("mobile sticky reserve exists", css.includes(".sticky-reserve") && css.includes("position:sticky"));
check("public init does not fetch admin data", !js.includes("Promise.allSettled([loadProducts(),loadReservations(),loadReviews()])"));
check("server auth progressive client exists", js.includes("/auth/login") && js.includes("adminApi"));
check("no fake catalog fallback message", !js.includes("Mostrando uma prévia do catálogo"));

for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}

const failed = checks.filter(([, ok]) => !ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) {
  console.error("Failed:", failed.map(([name]) => name).join(", "));
  process.exit(1);
}
