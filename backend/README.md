# Backend V2 — Brechó Solidário

Backend compatível com os dados atuais do MongoDB, mas com proteção administrativa no servidor.

## O que muda

- Login administrativo validado no servidor e sessão JWT de 8 horas.
- GET de reservas e avaliações protegido por token.
- CRUD de produtos/categorias/configurações protegido.
- Reserva atômica: apenas uma solicitação consegue travar uma peça disponível.
- Cancelamento/exclusão libera a peça; conclusão marca como trocada.
- Categorias persistentes e independentes de produtos.
- Lixeira (soft delete) para produtos, reservas e avaliações.
- Histórico de ações administrativas.
- Paginação/filtros no servidor.
- Rate limit, Helmet, CORS restrito e validação de entrada.
- Upload de imagem com validação, redimensionamento e limite.
- Endpoint de saúde em `/api/health`.

## Variáveis obrigatórias

Copie `.env.example` e configure:

- `MONGODB_URI`: a mesma conexão usada pelo backend atual.
- `ADMIN_ACCESS_CODE`: código da equipe, somente no servidor.
- `ADMIN_JWT_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `CORS_ORIGINS`: URLs permitidas do frontend.

Nunca coloque esses valores no frontend ou no GitHub.

## Executar

```bash
cd backend
npm install
npm start
```

## Compatibilidade

As coleções existentes `produtos`, `reservas` e `avaliacoes` continuam sendo utilizadas.
Os novos campos são opcionais para documentos antigos.

Novas coleções:

- `categorias`
- `configuracaos` (nome padrão do Mongoose)
- `historicos`

Na primeira inicialização, as categorias existentes nos produtos são sincronizadas automaticamente.

## Migração segura

1. Faça backup do MongoDB.
2. Configure um serviço de staging com a mesma estrutura.
3. Valide `/api/health`, catálogo e autenticação.
4. Troque o serviço Render atual para este backend.
5. Só depois atualize o frontend para exigir token administrativo.
6. Verifique logs e preserve o serviço anterior até confirmar a migração.

Não é necessário apagar dados existentes.
