const test = require("node:test");
const assert = require("node:assert/strict");
const {
  safeText,
  safeInteger,
  timingSafeMatch,
  parsePagination,
  slugify,
  escapeRegex,
} = require("../src/security");

test("timingSafeMatch só aceita valor idêntico", () => {
  assert.equal(timingSafeMatch("537586", "537586"), true);
  assert.equal(timingSafeMatch("537586", "537585"), false);
  assert.equal(timingSafeMatch("", ""), false);
});

test("safeText aplica trim e limites", () => {
  assert.equal(safeText("  teste  ", { required: true, min: 2, max: 10 }), "teste");
  assert.throws(() => safeText("", { required: true }), /obrigatório/);
  assert.throws(() => safeText("abcdefghijk", { max: 10 }), /entre/);
});

test("safeInteger valida faixa", () => {
  assert.equal(safeInteger("2", { min: 1, max: 3 }), 2);
  assert.throws(() => safeInteger("2.5", { min: 1, max: 3 }), /inválido/);
});

test("paginação tem limites seguros", () => {
  assert.deepEqual(parsePagination({ page: "2", limit: "25" }), { page: 2, limit: 25, skip: 25 });
  assert.equal(parsePagination({ limit: "999" }).limit, 100);
});

test("slug e regex são normalizados", () => {
  assert.equal(slugify("Bolsas e Mochilas"), "bolsas-e-mochilas");
  assert.equal(escapeRegex("a+b"), "a\\+b");
});
