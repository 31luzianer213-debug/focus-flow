const crypto = require("crypto");

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function safeText(value, options = {}) {
  const min = options.min ?? 0;
  const max = options.max ?? 1000;
  const field = options.field ?? "campo";
  const required = options.required ?? false;
  const text = String(value ?? "").trim();

  if (required && !text) fail(field + " é obrigatório.");
  if (text.length < min || text.length > max) {
    fail(field + " deve ter entre " + min + " e " + max + " caracteres.");
  }
  return text;
}

function safeInteger(value, options = {}) {
  const min = options.min ?? 0;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  const field = options.field ?? "valor";
  const number = Number(value);

  if (!Number.isInteger(number) || number < min || number > max) {
    fail(field + " inválido.");
  }
  return number;
}

function timingSafeMatch(a, b) {
  const left = Buffer.from(String(a ?? ""));
  const right = Buffer.from(String(b ?? ""));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parsePagination(query = {}) {
  const page = Math.max(1, Math.min(100000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 50));
  return { page, limit, skip: (page - 1) * limit };
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

module.exports = {
  fail,
  safeText,
  safeInteger,
  timingSafeMatch,
  parsePagination,
  escapeRegex,
  slugify,
};
