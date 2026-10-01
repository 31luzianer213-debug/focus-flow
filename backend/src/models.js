const mongoose = require("mongoose");

const commonOptions = {
  timestamps: true,
  versionKey: false,
};

const produtoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    nome: { type: String, required: true, trim: true, maxlength: 120 },
    categoria: { type: String, required: true, trim: true, maxlength: 80 },
    tamanho: { type: String, required: true, trim: true, maxlength: 30 },
    estado: { type: String, required: true, trim: true, maxlength: 60 },
    status: {
      type: String,
      enum: ["available", "reserved", "exchanged"],
      default: "available",
      index: true,
    },
    descricao: { type: String, required: true, trim: true, maxlength: 1200 },
    troca: { type: String, required: true, trim: true, maxlength: 120 },
    imagem: { type: Buffer },
    imagemContentType: { type: String, maxlength: 100 },
    imagemPublicId: { type: String, default: "", maxlength: 300 },
    archivedAt: { type: Date, default: null, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  commonOptions,
);
produtoSchema.index({ categoria: 1, status: 1, createdAt: -1 });

const reservaSchema = new mongoose.Schema(
  {
    nomeCompleto: { type: String, required: true, trim: true, maxlength: 120 },
    contato: { type: String, required: true, trim: true, maxlength: 120 },
    protocolo: { type: String, unique: true, sparse: true, trim: true, maxlength: 32, index: true },
    codigoProduto: { type: String, required: true, trim: true, maxlength: 40, index: true },
    produtoId: { type: mongoose.Schema.Types.ObjectId, ref: "Produto", default: null, index: true },
    nomeProduto: { type: String, required: true, trim: true, maxlength: 120 },
    tipoDoacao: { type: String, required: true, trim: true, maxlength: 60 },
    itemDoacao: { type: String, required: true, trim: true, maxlength: 300 },
    quantidade: { type: Number, required: true, min: 1, max: 999 },
    status: {
      type: String,
      enum: ["Pendente", "Em análise", "Confirmada", "Pronta para retirada", "Vendido", "Cancelada"],
      default: "Pendente",
      index: true,
    },
    observacoesEquipe: { type: String, default: "", trim: true, maxlength: 1000 },
    deletedAt: { type: Date, default: null, index: true },
  },
  commonOptions,
);
reservaSchema.index({ createdAt: -1, status: 1 });

const avaliacaoSchema = new mongoose.Schema(
  {
    nota: { type: Number, required: true, min: 1, max: 5 },
    facilidade: { type: String, default: "", trim: true, maxlength: 60 },
    satisfacao: { type: String, default: "", trim: true, maxlength: 60 },
    participariaNovamente: { type: String, default: "", trim: true, maxlength: 60 },
    recomendaria: { type: String, default: "", trim: true, maxlength: 60 },
    sugestao: { type: String, default: "", trim: true, maxlength: 1000 },
    lidaEm: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  commonOptions,
);
avaliacaoSchema.index({ createdAt: -1, nota: -1 });

const categoriaSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    ativa: { type: Boolean, default: true, index: true },
    ordem: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
  },
  commonOptions,
);
categoriaSchema.index({ ordem: 1, nome: 1 });

const configuracaoSchema = new mongoose.Schema(
  {
    chave: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    valor: { type: mongoose.Schema.Types.Mixed, default: null },
    publica: { type: Boolean, default: false, index: true },
  },
  commonOptions,
);

const historicoSchema = new mongoose.Schema(
  {
    entidade: { type: String, required: true, trim: true, maxlength: 80, index: true },
    entidadeId: { type: String, default: "", trim: true, maxlength: 80, index: true },
    acao: { type: String, required: true, trim: true, maxlength: 80 },
    autor: { type: String, default: "sistema", trim: true, maxlength: 120 },
    antes: { type: mongoose.Schema.Types.Mixed, default: null },
    depois: { type: mongoose.Schema.Types.Mixed, default: null },
    ipHash: { type: String, default: "", maxlength: 128 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
historicoSchema.index({ createdAt: -1 });

const Produto = mongoose.models.Produto || mongoose.model("Produto", produtoSchema);
const Reserva = mongoose.models.Reserva || mongoose.model("Reserva", reservaSchema);
const Avaliacao = mongoose.models.Avaliacao || mongoose.model("Avaliacao", avaliacaoSchema);
const Categoria = mongoose.models.Categoria || mongoose.model("Categoria", categoriaSchema);
const Configuracao = mongoose.models.Configuracao || mongoose.model("Configuracao", configuracaoSchema);
const Historico = mongoose.models.Historico || mongoose.model("Historico", historicoSchema);

module.exports = {
  Produto,
  Reserva,
  Avaliacao,
  Categoria,
  Configuracao,
  Historico,
};
