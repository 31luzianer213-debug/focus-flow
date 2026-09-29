const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const sharp = require("sharp");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { rateLimit } = require("express-rate-limit");

const {
  Produto,
  Reserva,
  Avaliacao,
  Categoria,
  Configuracao,
  Historico,
} = require("./src/models");
const {
  safeText,
  safeInteger,
  timingSafeMatch,
  parsePagination,
  escapeRegex,
  slugify,
} = require("./src/security");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";
const ADMIN_ACCESS_CODE = String(process.env.ADMIN_ACCESS_CODE || "");
const ADMIN_JWT_SECRET = String(process.env.ADMIN_JWT_SECRET || "");
const IS_PROD = process.env.NODE_ENV === "production";

const defaultOrigins = [
  "https://fuzzy-heart-project.lovable.app",
  "https://id-preview--12faf864-0458-4e0d-97d5-24b6b1114160.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];
const allowedOrigins = new Set(
  String(process.env.CORS_ORIGINS || defaultOrigins.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

function requiredEnv() {
  const missing = [];
  if (!MONGODB_URI) missing.push("MONGODB_URI");
  if (!ADMIN_ACCESS_CODE) missing.push("ADMIN_ACCESS_CODE");
  if (ADMIN_JWT_SECRET.length < 32) missing.push("ADMIN_JWT_SECRET (mínimo 32 caracteres)");
  if (missing.length) {
    throw new Error("Variáveis obrigatórias ausentes: " + missing.join(", "));
  }
}

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origem não autorizada."));
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Total-Count", "X-Page", "X-Limit"],
  }),
);
app.use(express.json({ limit: "64kb" }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas de acesso. Tente novamente mais tarde." },
});
const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { mensagem: "Muitas solicitações deste dispositivo. Tente novamente mais tarde." },
});
app.use("/api", generalLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowed.has(file.mimetype)) {
      return cb(new Error("Formato de imagem não permitido. Use JPG, PNG, WEBP ou GIF."));
    }
    cb(null, true);
  },
});

function activeFilter(extra = {}) {
  return {
    ...extra,
    $and: [
      { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
      { $or: [{ archivedAt: null }, { archivedAt: { $exists: false } }] },
    ],
  };
}

function notDeleted(extra = {}) {
  return {
    ...extra,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  };
}

function snapshot(value) {
  if (!value) return null;
  const object = typeof value.toObject === "function" ? value.toObject() : { ...value };
  delete object.imagem;
  return object;
}

function ipHash(req) {
  return crypto
    .createHash("sha256")
    .update(String(req.ip || "") + ADMIN_JWT_SECRET.slice(0, 16))
    .digest("hex");
}

async function audit(req, entidade, entidadeId, acao, antes, depois) {
  try {
    await Historico.create({
      entidade,
      entidadeId: String(entidadeId || ""),
      acao,
      autor: req.admin?.sub || "site/sistema",
      antes: snapshot(antes),
      depois: snapshot(depois),
      ipHash: ipHash(req),
    });
  } catch (error) {
    console.error("Falha ao registrar histórico:", error.message);
  }
}

function signAdminToken() {
  return jwt.sign(
    { role: "admin", type: "admin-session" },
    ADMIN_JWT_SECRET,
    { subject: "equipe", expiresIn: "8h", issuer: "brecho-solidario-api" },
  );
}

function requireAdmin(req, res, next) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ mensagem: "Acesso administrativo necessário." });
  }
  try {
    const payload = jwt.verify(header.slice(7), ADMIN_JWT_SECRET, {
      issuer: "brecho-solidario-api",
    });
    if (payload.role !== "admin" || payload.type !== "admin-session") {
      throw new Error("token inválido");
    }
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ mensagem: "Sessão administrativa inválida ou expirada." });
  }
}

function formatProduct(product) {
  const value = product.toObject ? product.toObject() : { ...product };
  delete value.imagem;
  delete value.imagemContentType;
  value.imagem = product.imagem
    ? "/api/produtos/" + product._id + "/imagem?v=" + encodeURIComponent(String(product.updatedAt?.getTime?.() || "1"))
    : "";
  return value;
}

function productPayload(body = {}) {
  const status = safeText(body.status || "available", { max: 30, field: "Status" });
  if (!["available", "reserved", "exchanged"].includes(status)) {
    const error = new Error("Status de produto inválido.");
    error.status = 400;
    throw error;
  }
  return {
    codigo: safeText(body.codigo, { required: true, min: 1, max: 40, field: "Código" }),
    nome: safeText(body.nome, { required: true, min: 1, max: 120, field: "Nome" }),
    categoria: safeText(body.categoria, { required: true, min: 1, max: 80, field: "Categoria" }),
    tamanho: safeText(body.tamanho, { required: true, min: 1, max: 30, field: "Tamanho" }),
    estado: safeText(body.estado, { required: true, min: 1, max: 60, field: "Conservação" }),
    status,
    descricao: safeText(body.descricao, { required: true, min: 1, max: 1200, field: "Descrição" }),
    troca: safeText(body.troca, { required: true, min: 1, max: 120, field: "Troca" }),
  };
}

async function processImage(file) {
  if (!file) return null;
  const buffer = await sharp(file.buffer)
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  if (buffer.length > 8 * 1024 * 1024) {
    const error = new Error("A imagem processada ficou maior que 8 MB.");
    error.status = 400;
    throw error;
  }
  return buffer;
}

async function ensureCategory(name) {
  const cleanName = safeText(name, { required: true, min: 1, max: 80, field: "Categoria" });
  const slug = slugify(cleanName) || "outros";
  const category = await Categoria.findOneAndUpdate(
    { slug },
    {
      $setOnInsert: { nome: cleanName, slug, ordem: 0 },
      $set: { ativa: true, deletedAt: null },
    },
    { new: true, upsert: true, runValidators: true },
  );
  return category;
}

async function ensureCategoriesFromProducts() {
  const values = await Produto.distinct("categoria", notDeleted());
  for (const value of values) {
    if (!String(value || "").trim()) continue;
    await ensureCategory(value);
  }
  await ensureCategory("Outros");
}

function sendPaged(res, rows, total, page, limit) {
  res.set("X-Total-Count", String(total));
  res.set("X-Page", String(page));
  res.set("X-Limit", String(limit));
  return res.json(rows);
}

app.get("/", (req, res) => {
  res.json({
    mensagem: "Backend do Brechó Solidário Online funcionando.",
    versao: "2.0.0",
  });
});

app.get("/api/health", async (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    ok: ready,
    banco: ready ? "conectado" : "indisponível",
    versao: "2.0.0",
  });
});

app.post("/api/auth/login", loginLimiter, (req, res) => {
  const code = String(req.body?.code || "");
  if (!timingSafeMatch(code, ADMIN_ACCESS_CODE)) {
    return res.status(401).json({ mensagem: "Código de acesso inválido." });
  }
  return res.json({
    token: signAdminToken(),
    expiresIn: 8 * 60 * 60,
  });
});

app.get("/api/auth/me", requireAdmin, (req, res) => {
  res.json({ authenticated: true, role: "admin" });
});

// ==============================
// PRODUTOS PÚBLICOS
// ==============================

app.get("/api/produtos", async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 100));
    const skip = (page - 1) * limit;
    const filter = activeFilter();

    if (req.query.status && ["available", "reserved", "exchanged"].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.categoria) {
      filter.categoria = new RegExp("^" + escapeRegex(String(req.query.categoria)) + "$", "i");
    }
    if (req.query.q) {
      const q = escapeRegex(String(req.query.q).slice(0, 100));
      filter.$and.push({
        $or: [
          { codigo: new RegExp(q, "i") },
          { nome: new RegExp(q, "i") },
          { categoria: new RegExp(q, "i") },
          { descricao: new RegExp(q, "i") },
        ],
      });
    }

    const [products, total] = await Promise.all([
      Produto.find(filter)
        .select("-imagem -imagemContentType")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Produto.countDocuments(filter),
    ]);

    return sendPaged(res, products.map(formatProduct), total, page, limit);
  } catch (error) {
    next(error);
  }
});

app.get("/api/produtos/:id/imagem", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ mensagem: "Imagem não encontrada." });
    }
    const product = await Produto.findOne(activeFilter({ _id: req.params.id }))
      .select("imagem imagemContentType updatedAt");
    if (!product?.imagem) {
      return res.status(404).json({ mensagem: "Imagem do produto não encontrada." });
    }
    res.set("Content-Type", product.imagemContentType || "image/webp");
    res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    return res.send(product.imagem);
  } catch (error) {
    next(error);
  }
});

app.get("/api/categorias", async (req, res, next) => {
  try {
    const categories = await Categoria.find({
      ativa: true,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    }).sort({ ordem: 1, nome: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

app.get("/api/configuracoes/publicas", async (req, res, next) => {
  try {
    const settings = await Configuracao.find({ publica: true }).sort({ chave: 1 });
    res.json(Object.fromEntries(settings.map((item) => [item.chave, item.valor])));
  } catch (error) {
    next(error);
  }
});

// ==============================
// RESERVAS PÚBLICAS / ATÔMICAS
// ==============================

app.post("/api/reservas", publicWriteLimiter, async (req, res, next) => {
  let lockedProduct = null;
  try {
    const codigoProduto = safeText(req.body?.codigoProduto, {
      required: true,
      min: 1,
      max: 40,
      field: "Código do produto",
    });

    lockedProduct = await Produto.findOneAndUpdate(
      activeFilter({ codigo: codigoProduto, status: "available" }),
      { $set: { status: "reserved" } },
      { new: true },
    );

    if (!lockedProduct) {
      return res.status(409).json({
        mensagem: "Esta peça não está mais disponível para reserva.",
      });
    }

    const reservation = await Reserva.create({
      nomeCompleto: safeText(req.body?.nomeCompleto, {
        required: true,
        min: 3,
        max: 120,
        field: "Nome",
      }),
      contato: safeText(req.body?.contato, {
        required: true,
        min: 8,
        max: 120,
        field: "Contato",
      }),
      codigoProduto: lockedProduct.codigo,
      produtoId: lockedProduct._id,
      nomeProduto: lockedProduct.nome,
      tipoDoacao: safeText(req.body?.tipoDoacao, {
        required: true,
        min: 1,
        max: 60,
        field: "Tipo de doação",
      }),
      itemDoacao: safeText(req.body?.itemDoacao, {
        required: true,
        min: 2,
        max: 300,
        field: "Item da doação",
      }),
      quantidade: safeInteger(req.body?.quantidade, {
        min: 1,
        max: 999,
        field: "Quantidade",
      }),
      status: "Pendente",
      observacoesEquipe: "",
    });

    await audit(req, "reserva", reservation._id, "criou", null, reservation);
    return res.status(201).json({
      _id: reservation._id,
      codigoProduto: reservation.codigoProduto,
      nomeProduto: reservation.nomeProduto,
      status: reservation.status,
      createdAt: reservation.createdAt,
    });
  } catch (error) {
    if (lockedProduct?._id) {
      await Produto.updateOne(
        { _id: lockedProduct._id, status: "reserved" },
        { $set: { status: "available" } },
      ).catch(() => {});
    }
    next(error);
  }
});

// ==============================
// AVALIAÇÕES PÚBLICAS
// ==============================

app.post("/api/avaliacoes", publicWriteLimiter, async (req, res, next) => {
  try {
    const review = await Avaliacao.create({
      nota: safeInteger(req.body?.nota, { min: 1, max: 5, field: "Nota" }),
      facilidade: safeText(req.body?.facilidade, { max: 60, field: "Facilidade" }),
      satisfacao: safeText(req.body?.satisfacao, { max: 60, field: "Satisfação" }),
      participariaNovamente: safeText(req.body?.participariaNovamente, {
        max: 60,
        field: "Participaria novamente",
      }),
      recomendaria: safeText(req.body?.recomendaria, { max: 60, field: "Recomendaria" }),
      sugestao: safeText(req.body?.sugestao, { max: 1000, field: "Sugestão" }),
    });
    await audit(req, "avaliacao", review._id, "criou", null, review);
    return res.status(201).json({ _id: review._id, nota: review.nota, createdAt: review.createdAt });
  } catch (error) {
    next(error);
  }
});

// ==============================
// PRODUTOS - ADMIN
// ==============================

app.post("/api/produtos", requireAdmin, upload.single("imagem"), async (req, res, next) => {
  try {
    const payload = productPayload(req.body);
    await ensureCategory(payload.categoria);
    const image = await processImage(req.file);

    const product = await Produto.create({
      ...payload,
      imagem: image || undefined,
      imagemContentType: image ? "image/webp" : undefined,
      imagemPublicId: "",
    });
    await audit(req, "produto", product._id, "criou", null, product);
    return res.status(201).json(formatProduct(product));
  } catch (error) {
    if (error?.code === 11000) {
      error.status = 409;
      error.message = "Já existe um produto com esse código.";
    }
    next(error);
  }
});

app.put("/api/produtos/:id", requireAdmin, upload.single("imagem"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ mensagem: "Produto não encontrado." });
    }
    const product = await Produto.findOne(notDeleted({ _id: req.params.id }));
    if (!product) return res.status(404).json({ mensagem: "Produto não encontrado." });

    const before = snapshot(product);
    const fields = ["nome", "categoria", "tamanho", "estado", "status", "descricao", "troca"];
    if (req.body.codigo !== undefined) {
      const newCode = safeText(req.body.codigo, { required: true, min: 1, max: 40, field: "Código" });
      if (newCode !== product.codigo) {
        const linkedReservations = await Reserva.exists(
          notDeleted({ codigoProduto: product.codigo }),
        );
        if (linkedReservations) {
          return res.status(409).json({
            mensagem: "O código deste produto já está ligado a reservas e não pode ser alterado.",
          });
        }
        product.codigo = newCode;
      }
    }

    for (const field of fields) {
      if (req.body[field] === undefined) continue;
      if (field === "status") {
        const status = safeText(req.body.status, { max: 30, field: "Status" });
        if (!["available", "reserved", "exchanged"].includes(status)) {
          return res.status(400).json({ mensagem: "Status inválido." });
        }
        product.status = status;
      } else {
        const limits = {
          nome: 120,
          categoria: 80,
          tamanho: 30,
          estado: 60,
          descricao: 1200,
          troca: 120,
        };
        product[field] = safeText(req.body[field], {
          required: true,
          min: 1,
          max: limits[field],
          field,
        });
      }
    }

    if (req.body.categoria !== undefined) await ensureCategory(product.categoria);
    const image = await processImage(req.file);
    if (image) {
      product.imagem = image;
      product.imagemContentType = "image/webp";
    }

    await product.save();
    await audit(req, "produto", product._id, "editou", before, product);
    return res.json(formatProduct(product));
  } catch (error) {
    if (error?.code === 11000) {
      error.status = 409;
      error.message = "Já existe um produto com esse código.";
    }
    next(error);
  }
});

app.delete("/api/produtos/:id", requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ mensagem: "Produto não encontrado." });
    }
    const product = await Produto.findOne(notDeleted({ _id: req.params.id }));
    if (!product) return res.status(404).json({ mensagem: "Produto não encontrado." });

    const activeReservations = await Reserva.countDocuments(
      notDeleted({
        codigoProduto: product.codigo,
        status: { $in: ["Pendente", "Em análise", "Confirmada"] },
      }),
    );
    if (activeReservations) {
      return res.status(409).json({
        mensagem: "Este produto possui reservas ativas e não pode ser excluído.",
      });
    }

    const before = snapshot(product);
    product.deletedAt = new Date();
    await product.save();
    await audit(req, "produto", product._id, "moveu-para-lixeira", before, product);
    res.json({ mensagem: "Produto movido para a lixeira." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/lixeira/produtos", requireAdmin, async (req, res, next) => {
  try {
    const products = await Produto.find({ deletedAt: { $ne: null } })
      .select("-imagem -imagemContentType")
      .sort({ deletedAt: -1 })
      .limit(100);
    res.json(products.map(formatProduct));
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/lixeira/produtos/:id/restaurar", requireAdmin, async (req, res, next) => {
  try {
    const product = await Produto.findById(req.params.id);
    if (!product || !product.deletedAt) {
      return res.status(404).json({ mensagem: "Produto não encontrado na lixeira." });
    }
    const before = snapshot(product);
    product.deletedAt = null;
    await product.save();
    await audit(req, "produto", product._id, "restaurou", before, product);
    res.json(formatProduct(product));
  } catch (error) {
    next(error);
  }
});

// ==============================
// CATEGORIAS - ADMIN
// ==============================

app.post("/api/categorias", requireAdmin, async (req, res, next) => {
  try {
    const name = safeText(req.body?.nome, { required: true, min: 1, max: 80, field: "Categoria" });
    const slug = slugify(name);
    const existing = await Categoria.findOne({ slug, deletedAt: null });
    if (existing) return res.status(409).json({ mensagem: "Esta categoria já existe." });

    const category = await Categoria.findOneAndUpdate(
      { slug },
      { $set: { nome: name, ativa: true, deletedAt: null }, $setOnInsert: { ordem: 0 } },
      { upsert: true, new: true, runValidators: true },
    );
    await audit(req, "categoria", category._id, "criou", null, category);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

app.put("/api/categorias/:id", requireAdmin, async (req, res, next) => {
  try {
    const category = await Categoria.findOne(notDeleted({ _id: req.params.id }));
    if (!category) return res.status(404).json({ mensagem: "Categoria não encontrada." });

    const before = snapshot(category);
    const oldName = category.nome;
    const newName = safeText(req.body?.nome ?? category.nome, {
      required: true,
      min: 1,
      max: 80,
      field: "Categoria",
    });
    const newSlug = slugify(newName);

    const duplicate = await Categoria.exists({
      _id: { $ne: category._id },
      slug: newSlug,
      deletedAt: null,
    });
    if (duplicate) return res.status(409).json({ mensagem: "Já existe outra categoria com esse nome." });

    category.nome = newName;
    category.slug = newSlug;
    if (req.body?.ativa !== undefined) category.ativa = Boolean(req.body.ativa);
    if (req.body?.ordem !== undefined) {
      category.ordem = safeInteger(req.body.ordem, { min: -10000, max: 10000, field: "Ordem" });
    }
    await category.save();

    if (newName !== oldName) {
      await Produto.updateMany(notDeleted({ categoria: oldName }), { $set: { categoria: newName } });
    }

    await audit(req, "categoria", category._id, "editou", before, category);
    res.json(category);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/categorias/:id", requireAdmin, async (req, res, next) => {
  try {
    const category = await Categoria.findOne(notDeleted({ _id: req.params.id }));
    if (!category) return res.status(404).json({ mensagem: "Categoria não encontrada." });
    if (slugify(category.nome) === "outros") {
      return res.status(409).json({ mensagem: 'A categoria "Outros" não pode ser removida.' });
    }

    await ensureCategory("Outros");
    const before = snapshot(category);
    await Produto.updateMany(notDeleted({ categoria: category.nome }), { $set: { categoria: "Outros" } });
    category.deletedAt = new Date();
    category.ativa = false;
    await category.save();
    await audit(req, "categoria", category._id, "removeu", before, category);
    res.json({ mensagem: 'Categoria removida. Produtos movidos para "Outros".' });
  } catch (error) {
    next(error);
  }
});

// ==============================
// RESERVAS - ADMIN
// ==============================

app.get("/api/reservas", requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination({ ...req.query, limit: req.query.limit || "100" });
    const filter = notDeleted();

    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.q) {
      const q = new RegExp(escapeRegex(String(req.query.q).slice(0, 100)), "i");
      filter.$and = [{
        $or: [
          { nomeCompleto: q },
          { contato: q },
          { codigoProduto: q },
          { nomeProduto: q },
          { itemDoacao: q },
        ],
      }];
    }

    const [rows, total] = await Promise.all([
      Reserva.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Reserva.countDocuments(filter),
    ]);
    sendPaged(res, rows, total, page, limit);
  } catch (error) {
    next(error);
  }
});

app.put("/api/reservas/:id", requireAdmin, async (req, res, next) => {
  try {
    const reservation = await Reserva.findOne(notDeleted({ _id: req.params.id }));
    if (!reservation) return res.status(404).json({ mensagem: "Reserva não encontrada." });

    const before = snapshot(reservation);
    const oldStatus = reservation.status;
    const newStatus = req.body?.status !== undefined
      ? safeText(req.body.status, { required: true, max: 30, field: "Status" })
      : oldStatus;
    const allowed = ["Pendente", "Em análise", "Confirmada", "Vendido", "Cancelada"];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({ mensagem: "Status de reserva inválido." });
    }

    if (oldStatus === "Cancelada" && newStatus !== "Cancelada") {
      const relocked = await Produto.findOneAndUpdate(
        activeFilter({ codigo: reservation.codigoProduto, status: "available" }),
        { $set: { status: "reserved" } },
        { new: true },
      );
      if (!relocked) {
        return res.status(409).json({ mensagem: "A peça não está disponível para reativar esta reserva." });
      }
    }

    reservation.status = newStatus;
    if (req.body?.observacoesEquipe !== undefined) {
      reservation.observacoesEquipe = safeText(req.body.observacoesEquipe, {
        max: 1000,
        field: "Observação",
      });
    }
    await reservation.save();

    if (newStatus === "Cancelada" && oldStatus !== "Cancelada") {
      await Produto.updateOne(
        activeFilter({ codigo: reservation.codigoProduto, status: "reserved" }),
        { $set: { status: "available" } },
      );
    } else if (newStatus === "Vendido") {
      await Produto.updateOne(
        activeFilter({ codigo: reservation.codigoProduto }),
        { $set: { status: "exchanged" } },
      );
    } else if (["Pendente", "Em análise", "Confirmada"].includes(newStatus)) {
      await Produto.updateOne(
        activeFilter({ codigo: reservation.codigoProduto, status: { $ne: "exchanged" } }),
        { $set: { status: "reserved" } },
      );
    }

    await audit(req, "reserva", reservation._id, "editou", before, reservation);
    res.json(reservation);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/reservas/:id", requireAdmin, async (req, res, next) => {
  try {
    const reservation = await Reserva.findOne(notDeleted({ _id: req.params.id }));
    if (!reservation) return res.status(404).json({ mensagem: "Reserva não encontrada." });
    const before = snapshot(reservation);

    reservation.deletedAt = new Date();
    await reservation.save();

    if (["Pendente", "Em análise", "Confirmada"].includes(reservation.status)) {
      await Produto.updateOne(
        activeFilter({ codigo: reservation.codigoProduto, status: "reserved" }),
        { $set: { status: "available" } },
      );
    }

    await audit(req, "reserva", reservation._id, "moveu-para-lixeira", before, reservation);
    res.json({ mensagem: "Reserva movida para a lixeira." });
  } catch (error) {
    next(error);
  }
});

// ==============================
// AVALIAÇÕES - ADMIN
// ==============================

app.get("/api/avaliacoes", requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination({ ...req.query, limit: req.query.limit || "100" });
    const filter = notDeleted();
    if (req.query.nota) filter.nota = Number(req.query.nota);

    const [rows, total] = await Promise.all([
      Avaliacao.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Avaliacao.countDocuments(filter),
    ]);
    sendPaged(res, rows, total, page, limit);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/avaliacoes/:id/lida", requireAdmin, async (req, res, next) => {
  try {
    const review = await Avaliacao.findOne(notDeleted({ _id: req.params.id }));
    if (!review) return res.status(404).json({ mensagem: "Avaliação não encontrada." });
    const before = snapshot(review);
    review.lidaEm = new Date();
    await review.save();
    await audit(req, "avaliacao", review._id, "marcou-como-lida", before, review);
    res.json(review);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/avaliacoes/:id", requireAdmin, async (req, res, next) => {
  try {
    const review = await Avaliacao.findOne(notDeleted({ _id: req.params.id }));
    if (!review) return res.status(404).json({ mensagem: "Avaliação não encontrada." });
    const before = snapshot(review);
    review.deletedAt = new Date();
    await review.save();
    await audit(req, "avaliacao", review._id, "moveu-para-lixeira", before, review);
    res.json({ mensagem: "Avaliação movida para a lixeira." });
  } catch (error) {
    next(error);
  }
});

// ==============================
// DASHBOARD / CONFIGURAÇÕES / HISTÓRICO
// ==============================

app.get("/api/admin/dashboard", requireAdmin, async (req, res, next) => {
  try {
    const [
      products,
      available,
      reserved,
      exchanged,
      pendingReservations,
      confirmedReservations,
      reviewStats,
    ] = await Promise.all([
      Produto.countDocuments(activeFilter()),
      Produto.countDocuments(activeFilter({ status: "available" })),
      Produto.countDocuments(activeFilter({ status: "reserved" })),
      Produto.countDocuments(activeFilter({ status: "exchanged" })),
      Reserva.countDocuments(notDeleted({ status: { $in: ["Pendente", "Em análise"] } })),
      Reserva.countDocuments(notDeleted({ status: "Confirmada" })),
      Avaliacao.aggregate([
        { $match: notDeleted() },
        { $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$nota" } } },
      ]),
    ]);

    res.json({
      products,
      available,
      reserved,
      exchanged,
      pendingReservations,
      confirmedReservations,
      reviews: reviewStats[0]?.count || 0,
      reviewAverage: Number((reviewStats[0]?.average || 0).toFixed(2)),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/configuracoes", requireAdmin, async (req, res, next) => {
  try {
    res.json(await Configuracao.find().sort({ chave: 1 }));
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/configuracoes/:chave", requireAdmin, async (req, res, next) => {
  try {
    const key = safeText(req.params.chave, { required: true, min: 1, max: 120, field: "Chave" });
    const before = await Configuracao.findOne({ chave: key });
    const setting = await Configuracao.findOneAndUpdate(
      { chave: key },
      {
        $set: {
          valor: req.body?.valor ?? null,
          publica: Boolean(req.body?.publica),
        },
      },
      { upsert: true, new: true, runValidators: true },
    );
    await audit(req, "configuracao", setting._id, "salvou", before, setting);
    res.json(setting);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/historico", requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.entidade) filter.entidade = String(req.query.entidade).slice(0, 80);
    const [rows, total] = await Promise.all([
      Historico.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Historico.countDocuments(filter),
    ]);
    sendPaged(res, rows, total, page, limit);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ mensagem: "A imagem não pode ter mais de 10 MB." });
    }
    return res.status(400).json({ mensagem: "Erro no upload da imagem." });
  }
  if (error?.message?.includes("Formato de imagem não permitido")) {
    return res.status(400).json({ mensagem: error.message });
  }
  if (error?.message === "Origem não autorizada.") {
    return res.status(403).json({ mensagem: "Origem não autorizada." });
  }
  if (error?.name === "ValidationError") {
    return res.status(400).json({ mensagem: "Dados inválidos.", erro: error.message });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ mensagem: "Já existe um registro com esses dados." });
  }
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error("ERRO INTERNO:", error);
  return res.status(status).json({
    mensagem: status >= 500 ? "Erro interno do servidor." : error.message,
  });
});

async function start() {
  requiredEnv();
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10,
  });
  await ensureCategoriesFromProducts();
  app.listen(PORT, () => {
    console.log("Brechó API v2 rodando na porta " + PORT);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Falha ao iniciar API:", error);
    process.exit(1);
  });
}

module.exports = { app, start };
