import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Baby, Check, ChevronRight, CircleCheck, Clock3, Footprints,
  HeartHandshake, Leaf, Menu, Pencil, Plus, Recycle, Repeat2, Search, ShieldCheck,
  Shirt, ShoppingBag, Star, Trash2, Upload, Users, X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

export const Route = createFileRoute("/")({ component: BrechoApp });

const API_URL = "https://brecho-api-zebo.onrender.com/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");
const ADM_CODE = "537586";

type Screen = "home" | "catalog" | "how" | "rules" | "details" | "reservation" | "confirmation" | "feedback" | "impact" | "adm" | "management";
type Product = { _id: string; codigo: string; nome: string; categoria: string; tamanho: string; estado: string; status: string; descricao: string; troca: string; imagem?: string };
type Reservation = { _id: string; nomeCompleto: string; contato: string; codigoProduto: string; nomeProduto: string; tipoDoacao: string; itemDoacao: string; quantidade: number; status: string; observacoesEquipe?: string; createdAt?: string };
type Review = { _id: string; nota: number; facilidade?: string; satisfacao?: string; participariaNovamente?: string; recomendaria?: string; sugestao?: string; createdAt?: string };

type AdminTab = "products" | "reservations" | "feedback";

const fallbackImages: Record<string, string> = {
  "001": "https://images.pexels.com/photos/4440566/pexels-photo-4440566.jpeg?auto=compress&cs=tinysrgb&w=1000",
  "002": "https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=1000",
  "003": "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=1000",
  "004": "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1000",
};

const categories = [
  { id: "adult", label: "Vestuário adulto", icon: Shirt, copy: "Peças para novos looks e novas histórias." },
  { id: "child", label: "Vestuário infantil", icon: Baby, copy: "Conforto e cuidado para a infância circular." },
  { id: "accessories", label: "Acessórios e calçados", icon: Footprints, copy: "Detalhes e passos para completar o visual." },
];

const normalize = (value = "") => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const categoryKey = (value = "") => {
  const v = normalize(value);
  if (["adult", "adulto", "vestuario adulto"].includes(v)) return "adult";
  if (["child", "children", "infantil", "vestuario infantil"].includes(v)) return "child";
  if (["accessories", "shoes", "calcados", "acessorios", "calcados e acessorios"].includes(v)) return "accessories";
  return v;
};
const imageUrl = (product: Product) => {
  if (product.imagem?.startsWith("http")) return product.imagem;
  if (product.imagem) return `${API_ORIGIN}${product.imagem.startsWith("/") ? "" : "/"}${product.imagem}`;
  return fallbackImages[product.codigo] || "https://images.pexels.com/photos/6068975/pexels-photo-6068975.jpeg?auto=compress&cs=tinysrgb&w=1000";
};
const statusInfo = (status: string) => ({
  available: ["Disponível", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  reserved: ["Reservado", "bg-amber-50 text-amber-700 ring-amber-200"],
  exchanged: ["Trocado", "bg-sky-50 text-sky-700 ring-sky-200"],
}[status] || [status || "Indisponível", "bg-slate-100 text-slate-600 ring-slate-200"]);

function BrechoApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [admUnlocked, setAdmUnlocked] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("products");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const go = (next: Screen) => {
    if (next === "management" && !admUnlocked) next = "adm";
    setScreen(next); setMobileOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const r = await fetch(`${API_URL}/produtos`);
      if (!r.ok) throw new Error("Não foi possível carregar o catálogo.");
      setProducts(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoadingProducts(false); }
  };
  const loadAdmin = async () => {
    const [rr, rv] = await Promise.all([fetch(`${API_URL}/reservas`), fetch(`${API_URL}/avaliacoes`)]);
    if (rr.ok) setReservations(await rr.json());
    if (rv.ok) setReviews(await rv.json());
  };
  useEffect(() => { void loadProducts(); }, []);
  useEffect(() => { if (admUnlocked) void loadAdmin(); }, [admUnlocked]);

  const filtered = useMemo(() => products.filter((p) => {
    const categoryOk = category === "all" || categoryKey(p.categoria) === category;
    const text = normalize(`${p.nome} ${p.codigo} ${p.tamanho} ${p.descricao}`);
    return categoryOk && text.includes(normalize(query));
  }), [products, category, query]);

  const openProduct = (p: Product) => { setSelected(p); go("details"); };
  const startReservation = (p: Product) => { setSelected(p); go("reservation"); };

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#17324a]">
      <Header screen={screen} go={go} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main>
        {screen === "home" && <Home go={go} />}
        {screen === "how" && <How go={go} />}
        {screen === "rules" && <Rules go={go} />}
        {screen === "impact" && <Impact go={go} />}
        {screen === "catalog" && <Catalog products={filtered} loading={loadingProducts} category={category} setCategory={setCategory} query={query} setQuery={setQuery} openProduct={openProduct} />}
        {screen === "details" && selected && <Details product={selected} go={go} reserve={startReservation} />}
        {screen === "reservation" && selected && <ReservationForm product={selected} onSuccess={(msg) => { setConfirmation(msg); void loadProducts(); go("confirmation"); }} go={go} />}
        {screen === "confirmation" && <Confirmation text={confirmation} go={go} />}
        {screen === "feedback" && <FeedbackForm onDone={() => admUnlocked && void loadAdmin()} />}
        {screen === "adm" && <AdminLogin onUnlock={() => { setAdmUnlocked(true); setAdminTab("products"); go("management"); }} />}
        {screen === "management" && admUnlocked && <Management tab={adminTab} setTab={setAdminTab} products={products} reservations={reservations} reviews={reviews} reloadProducts={loadProducts} reloadAdmin={loadAdmin} />}
      </main>
      <Footer />
    </div>
  );
}

function Header({ screen, go, mobileOpen, setMobileOpen }: { screen: Screen; go: (s: Screen) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const links: [Screen, string][] = [["home","Início"],["catalog","Catálogo"],["how","Como funciona"],["rules","Regras"],["impact","Impacto"],["feedback","Pós-venda"],["adm","ADM"]];
  return <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
    <nav className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
      <button onClick={() => go("home")} className="flex min-w-0 items-center gap-3 text-left" aria-label="Ir para o início">
        <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#092a46] text-white shadow-sm"><Recycle size={20}/></span>
        <span className="hidden sm:block"><b className="block text-sm tracking-[.12em] text-[#092a46]">BRECHÓ</b><span className="block text-xs font-bold text-[#ef6b2e]">SOLIDÁRIO</span></span>
      </button>
      <div className="hidden items-center gap-1 lg:flex">
        {links.map(([id,label]) => <button key={id} onClick={() => go(id)} className={`px-3 py-2 text-sm font-bold transition ${screen===id || (screen==="management"&&id==="adm") ? "bg-[#fff1e8] text-[#cf531e]" : "text-slate-600 hover:bg-slate-50 hover:text-[#092a46]"}`}>{label}</button>)}
      </div>
      <button className="grid h-10 w-10 place-items-center border border-slate-200 bg-white lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menu" aria-expanded={mobileOpen}>{mobileOpen?<X size={20}/>:<Menu size={20}/>}</button>
    </nav>
    {mobileOpen && <div className="absolute left-3 right-3 top-[calc(100%+.5rem)] border border-slate-200 bg-white p-2 shadow-2xl lg:hidden">
      {links.map(([id,label]) => <button key={id} onClick={() => go(id)} className="block w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">{label}</button>)}
    </div>}
  </header>;
}

const SectionHead = ({ kicker, title, copy }: { kicker: string; title: string; copy?: string }) => <div className="max-w-3xl">
  <p className="text-xs font-extrabold tracking-[.18em] text-[#ef6b2e]">{kicker}</p>
  <h2 className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight text-[#092a46] sm:text-4xl lg:text-5xl">{title}</h2>
  {copy && <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{copy}</p>}
</div>;

function Home({ go }: { go: (s: Screen) => void }) {
  return <section className="overflow-hidden bg-[radial-gradient(circle_at_85%_15%,#dce9dd_0,transparent_28%),linear-gradient(145deg,#fbf7ef_0%,#fff_60%,#f4f9f6_100%)]">
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.02fr_.98fr] lg:py-16">
      <div>
        <div className="inline-flex items-center gap-2 border border-emerald-900/10 bg-[#e7efe7] px-3 py-2 text-xs font-extrabold tracking-wide text-[#174d37]"><Leaf size={16}/> MODA QUE CUIDA DO FUTURO</div>
        <h1 className="mt-6 max-w-3xl font-serif text-[clamp(2.8rem,8vw,6rem)] font-bold leading-[.9] tracking-[-.05em] text-[#092a46]">Brechó Solidário Online</h1>
        <p className="mt-6 text-xl font-bold text-[#ef6b2e] sm:text-2xl">Escolha. Troque. Faça o bem.</p>
        <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">Dê uma nova história a uma peça e transforme sua escolha em solidariedade — de forma simples, consciente e transparente.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button onClick={() => go("catalog")} className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#ef6b2e] px-5 font-extrabold text-white shadow-lg shadow-orange-600/15 transition hover:-translate-y-0.5 hover:bg-[#d95a22]">VER PRODUTOS <ArrowRight size={18}/></button>
          <button onClick={() => go("how")} className="min-h-12 border border-[#092a46] bg-white px-5 font-extrabold text-[#092a46] transition hover:bg-slate-50">COMO FUNCIONA</button>
        </div>
        <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
          {[['repeat-2','Troca consciente'],['shield','Reserva segura'],['heart','Impacto coletivo']].map(([_,label],i) => <div key={label} className="flex items-center gap-2 text-sm font-bold text-slate-600">{i===0?<Repeat2 size={18} className="text-[#ef6b2e]"/>:i===1?<ShieldCheck size={18} className="text-[#ef6b2e]"/>:<HeartHandshake size={18} className="text-[#ef6b2e]"/>}{label}</div>)}
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
        <div className="absolute -inset-3 translate-x-3 translate-y-3 bg-[#ef6b2e]"/>
        <img src="https://images.pexels.com/photos/6068975/pexels-photo-6068975.jpeg?auto=compress&cs=tinysrgb&w=1200" className="relative h-[360px] w-full object-cover shadow-2xl sm:h-[520px]" alt="Pessoas escolhendo roupas em um brechó"/>
        <div className="relative -mt-16 ml-4 max-w-sm border border-slate-200 bg-white p-5 shadow-xl sm:ml-8"><p className="text-xs font-extrabold tracking-[.14em] text-[#ef6b2e]">CIRCULAR É CUIDAR</p><p className="mt-2 font-serif text-xl font-bold text-[#092a46]">Peças que continuam úteis, histórias que continuam vivas.</p></div>
      </div>
    </div>
  </section>;
}

function How({ go }: { go: (s: Screen) => void }) {
  const steps = [[ShoppingBag,"Escolha","Encontre uma peça disponível no catálogo."],[Search,"Confira","Veja tamanho, conservação e condição da troca."],[Clock3,"Reserve","Preencha seus dados e solicite a reserva."],[HeartHandshake,"Doe","Entregue os itens combinados para a troca solidária."],[CircleCheck,"Retire","Após a confirmação, retire a sua peça."]];
  return <section><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16"><SectionHead kicker="PASSO A PASSO" title="Como funciona a troca?" copy="Cinco etapas simples para colocar a solidariedade em circulação."/><div className="mt-10 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-5">{steps.map(([Icon,title,copy],i) => { const I=Icon as typeof ShoppingBag; return <article key={String(title)} className="bg-white p-6"><span className="grid h-10 w-10 place-items-center bg-[#092a46] text-sm font-black text-white">0{i+1}</span><I className="mt-8 text-[#ef6b2e]"/><h3 className="mt-4 text-lg font-extrabold text-[#092a46]">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{String(copy)}</p></article>})}</div><button onClick={() => go("catalog")} className="mt-8 inline-flex items-center gap-2 bg-[#ef6b2e] px-5 py-3 font-extrabold text-white">IR PARA O CATÁLOGO <ArrowRight size={18}/></button></div></section>;
}

function Rules({ go }: { go: (s: Screen) => void }) {
  const rules = ["Escolha somente produtos marcados como disponíveis.","A solicitação é uma reserva e depende da confirmação da equipe.","Informe corretamente o item e a quantidade que serão entregues na troca.","A equipe poderá avaliar os itens recebidos antes de concluir a troca.","Respeite o prazo combinado para retirada; peças não retiradas podem voltar ao catálogo.","O objetivo é incentivar reuso, cuidado e solidariedade — não revenda comercial."];
  return <section><div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16"><SectionHead kicker="REGRAS DA TROCA" title="Transparência para todo mundo." copy="Alguns combinados simples mantêm a experiência organizada e justa."/><div className="mt-10 grid gap-3 md:grid-cols-2">{rules.map((rule,i)=><article key={rule} className="flex gap-4 border border-slate-200 bg-white p-5 shadow-sm"><span className="grid h-9 w-9 shrink-0 place-items-center bg-[#fff0e7] font-black text-[#d65820]">{i+1}</span><p className="text-sm font-semibold leading-6 text-slate-700">{rule}</p></article>)}</div><button onClick={()=>go("catalog")} className="mt-8 bg-[#092a46] px-5 py-3 font-extrabold text-white">VER PEÇAS DISPONÍVEIS</button></div></section>;
}

function Impact({ go }: { go: (s: Screen) => void }) {
  const items = [[Repeat2,"Reuso inteligente","Peças em bom estado permanecem em circulação por mais tempo."],[Leaf,"Consumo consciente","Mais intenção na escolha e menos desperdício de recursos."],[Users,"Impacto coletivo","Cada troca fortalece uma rede de colaboração e cuidado."]];
  return <section><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16"><div className="grid gap-8 bg-[#092a46] p-7 text-white sm:p-10 lg:grid-cols-[1fr_auto] lg:p-14"><div><p className="text-xs font-extrabold tracking-[.18em] text-[#ff9a68]">NOSSO IMPACTO</p><h2 className="mt-3 max-w-4xl font-serif text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">Moda circular que movimenta solidariedade.</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">O brechó conecta doação, troca e comunidade em uma experiência simples, ajudando a reduzir descarte e prolongar a vida útil das peças.</p></div><div className="hidden h-44 w-44 place-items-center border border-white/15 bg-white/5 text-center font-extrabold lg:grid"><HeartHandshake size={38} className="text-[#ff9a68]"/><span>Menos descarte.<br/>Mais histórias.</span></div></div><div className="mt-4 grid gap-4 md:grid-cols-3">{items.map(([Icon,title,copy])=>{const I=Icon as typeof Repeat2;return <article key={String(title)} className="border border-slate-200 bg-white p-6 shadow-sm"><span className="grid h-11 w-11 place-items-center bg-[#ef6b2e] text-white"><I size={21}/></span><h3 className="mt-5 text-xl font-extrabold text-[#092a46]">{String(title)}</h3><p className="mt-2 leading-7 text-slate-600">{String(copy)}</p></article>})}</div><div className="mt-4 flex flex-col justify-between gap-5 border border-slate-200 bg-white p-6 sm:flex-row sm:items-center"><div><p className="text-xs font-extrabold tracking-[.16em] text-[#ef6b2e]">FAÇA PARTE</p><h3 className="mt-2 font-serif text-2xl font-bold text-[#092a46]">Uma peça pode começar outra história.</h3></div><button onClick={()=>go("catalog")} className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#ef6b2e] px-5 font-extrabold text-white">VER CATÁLOGO <ArrowRight size={18}/></button></div></div></section>;
}

function Catalog({ products, loading, category, setCategory, query, setQuery, openProduct }: { products: Product[]; loading: boolean; category: string; setCategory:(v:string)=>void; query:string; setQuery:(v:string)=>void; openProduct:(p:Product)=>void }) {
  return <section><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><SectionHead kicker="CATÁLOGO SOLIDÁRIO" title="Encontre uma peça para recomeçar" copy="Escolha por categoria ou pesquise pelo que você procura."/><label className="flex min-h-12 w-full items-center gap-3 border border-slate-300 bg-white px-4 lg:max-w-sm"><Search size={18} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar produto, tamanho..." className="w-full bg-transparent outline-none"/></label></div>
    <div className="mt-8 grid gap-3 md:grid-cols-3">{categories.map(({id,label,copy,icon:Icon})=><button key={id} onClick={()=>setCategory(category===id?"all":id)} className={`border p-5 text-left transition ${category===id?"border-[#ef6b2e] bg-[#fff4ed]":"border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-lg"}`}><span className="grid h-11 w-11 place-items-center bg-[#092a46] text-white"><Icon size={21}/></span><b className="mt-4 block text-[#092a46]">{label}</b><span className="mt-1 block text-sm leading-6 text-slate-600">{copy}</span></button>)}</div>
    <div className="mt-10 flex items-center justify-between border-b border-slate-200 pb-4"><h3 className="text-xl font-extrabold text-[#092a46]">Produtos</h3><button onClick={()=>setCategory("all")} className="text-sm font-bold text-[#ef6b2e]">Mostrar todos</button></div>
    {loading ? <div className="grid min-h-56 place-items-center text-sm font-bold text-slate-500">Carregando catálogo...</div> : products.length===0 ? <div className="mt-6 border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Nenhum produto encontrado.</div> : <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map(p=><ProductCard key={p._id||p.codigo} product={p} onOpen={()=>openProduct(p)}/>)}</div>}
  </div></section>;
}

function ProductCard({ product, onOpen }: { product: Product; onOpen:()=>void }) {
  const [label, cls]=statusInfo(product.status);
  return <article className="group overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="relative overflow-hidden bg-slate-100"><img src={imageUrl(product)} alt={product.nome} className="h-64 w-full object-cover transition duration-500 group-hover:scale-[1.03]"/><span className={`absolute left-3 top-3 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${cls}`}>{label}</span></div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#ef6b2e]">{product.codigo}</p><h4 className="mt-1 text-lg font-extrabold text-[#092a46]">{product.nome}</h4></div><span className="bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-600">{product.tamanho}</span></div><p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">{product.descricao}</p><div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Troca solidária</p><p className="mt-1 font-bold text-slate-700">{product.troca}</p></div><button onClick={onOpen} className="mt-5 flex w-full items-center justify-between bg-[#092a46] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#ef6b2e]">VER PRODUTO <ChevronRight size={17}/></button></div></article>;
}

function Details({ product, go, reserve }: { product: Product; go:(s:Screen)=>void; reserve:(p:Product)=>void }) {
  const available=product.status==="available"; const [label,cls]=statusInfo(product.status);
  return <section><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16"><button onClick={()=>go("catalog")} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#092a46]"><ArrowLeft size={17}/> Voltar ao catálogo</button><div className="grid gap-8 lg:grid-cols-2 lg:items-start"><div className="overflow-hidden bg-slate-100"><img src={imageUrl(product)} alt={product.nome} className="h-[380px] w-full object-cover sm:h-[560px]"/></div><div className="lg:sticky lg:top-24"><span className={`inline-flex px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${cls}`}>{label}</span><p className="mt-6 text-xs font-black tracking-[.16em] text-[#ef6b2e]">{product.codigo}</p><h2 className="mt-2 font-serif text-4xl font-bold tracking-tight text-[#092a46] sm:text-5xl">{product.nome}</h2><p className="mt-5 text-lg leading-8 text-slate-600">{product.descricao}</p><dl className="mt-8 grid grid-cols-2 border-y border-slate-200 py-5"><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Tamanho</dt><dd className="mt-1 font-extrabold">{product.tamanho}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Conservação</dt><dd className="mt-1 font-extrabold">{product.estado}</dd></div></dl><div className="mt-6 border-l-4 border-[#ef6b2e] bg-[#fff4ed] p-5"><p className="text-xs font-extrabold uppercase tracking-wide text-[#cf531e]">Valor da troca</p><p className="mt-2 text-lg font-extrabold text-[#092a46]">{product.troca}</p></div><button disabled={!available} onClick={()=>reserve(product)} className="mt-6 w-full bg-[#ef6b2e] px-5 py-4 font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{available?"SOLICITAR RESERVA":"PRODUTO INDISPONÍVEL"}</button></div></div></div></section>;
}

function ReservationForm({ product, onSuccess, go }: { product: Product; onSuccess:(msg:string)=>void; go:(s:Screen)=>void }) {
  const [message,setMessage]=useState(""); const [sending,setSending]=useState(false);
  const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault(); setSending(true); setMessage(""); const fd=new FormData(e.currentTarget); const body={nomeCompleto:fd.get("nomeCompleto"),contato:fd.get("contato"),codigoProduto:product.codigo,nomeProduto:product.nome,tipoDoacao:fd.get("tipoDoacao"),itemDoacao:fd.get("itemDoacao"),quantidade:Number(fd.get("quantidade"))}; try{const r=await fetch(`${API_URL}/reservas`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); if(!r.ok) throw new Error((await r.json()).mensagem||"Erro ao reservar."); onSuccess(`${product.nome} · ${product.codigo}`);}catch(err){setMessage(err instanceof Error?err.message:"Erro ao enviar reserva.");}finally{setSending(false)}};
  return <section><div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16"><button onClick={()=>go("details")} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/> Voltar ao produto</button><div className="border border-slate-200 bg-white p-6 shadow-xl sm:p-9"><SectionHead kicker="RESERVA" title="Solicite sua troca" copy="Preencha seus dados. A equipe vai analisar e confirmar a solicitação."/><div className="mt-7 flex gap-4 border border-slate-200 bg-slate-50 p-4"><img src={imageUrl(product)} alt="" className="h-20 w-20 object-cover"/><div><p className="text-xs font-black tracking-wide text-[#ef6b2e]">{product.codigo}</p><b className="block text-[#092a46]">{product.nome}</b><span className="text-sm text-slate-500">{product.troca}</span></div></div><form onSubmit={submit} className="mt-7 grid gap-5"><Field label="Nome completo"><input name="nomeCompleto" required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field><Field label="Contato (WhatsApp ou telefone)"><input name="contato" required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field><Field label="O que você pretende entregar?"><select name="tipoDoacao" required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"><option value="">Selecione</option><option>Roupa</option><option>Calçado</option><option>Acessório</option><option>Outro</option></select></Field><div className="grid gap-5 sm:grid-cols-[1fr_140px]"><Field label="Item que será doado"><input name="itemDoacao" required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field><Field label="Quantidade"><input name="quantidade" type="number" min="1" defaultValue="1" required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field></div><label className="flex gap-3 bg-[#fff4ed] p-4 text-sm leading-6 text-slate-700"><input type="checkbox" required className="mt-1"/><span>Estou ciente de que esta é uma solicitação de reserva e depende da confirmação da equipe.</span></label>{message&&<p className="font-bold text-red-600">{message}</p>}<button disabled={sending} className="bg-[#ef6b2e] px-5 py-4 font-extrabold text-white disabled:opacity-60">{sending?"ENVIANDO...":"SOLICITAR RESERVA"}</button></form></div></div></section>;
}

function Confirmation({ text, go }: { text:string; go:(s:Screen)=>void }) { return <section><div className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 py-12 sm:px-6"><div className="w-full border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-12"><span className="mx-auto grid h-16 w-16 place-items-center bg-emerald-50 text-emerald-700"><Check size={32}/></span><p className="mt-6 text-xs font-extrabold tracking-[.18em] text-[#ef6b2e]">SOLICITAÇÃO RECEBIDA</p><h2 className="mt-2 font-serif text-3xl font-bold text-[#092a46]">Reserva solicitada!</h2><p className="mx-auto mt-4 max-w-lg leading-7 text-slate-600">Sua solicitação foi registrada e será analisada pela equipe.</p>{text&&<div className="mx-auto mt-6 max-w-md bg-[#fff4ed] p-4 font-bold text-[#092a46]">{text}</div>}<div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={()=>go("catalog")} className="bg-[#092a46] px-5 py-3 font-extrabold text-white">VOLTAR AO CATÁLOGO</button><button onClick={()=>go("feedback")} className="border border-[#ef6b2e] px-5 py-3 font-extrabold text-[#d65820]">PÓS-VENDA</button></div></div></div></section> }

function FeedbackForm({ onDone }: { onDone:()=>void }) {
  const [rating,setRating]=useState(0); const [message,setMessage]=useState(""); const [sending,setSending]=useState(false);
  const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault(); if(!rating){setMessage("Escolha uma nota de 1 a 5.");return;} setSending(true); const fd=new FormData(e.currentTarget); const body={nota:rating,facilidade:fd.get("facilidade"),satisfacao:fd.get("satisfacao"),participariaNovamente:fd.get("participariaNovamente"),recomendaria:fd.get("recomendaria"),sugestao:fd.get("sugestao")}; try{const r=await fetch(`${API_URL}/avaliacoes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); if(!r.ok)throw new Error("Não foi possível enviar sua avaliação."); e.currentTarget.reset(); setRating(0); setMessage("Obrigado! Sua avaliação foi enviada."); onDone();}catch(err){setMessage(err instanceof Error?err.message:"Erro ao enviar.");}finally{setSending(false)}};
  return <section><div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16"><form onSubmit={submit} className="border border-slate-200 bg-white p-6 shadow-xl sm:p-9"><SectionHead kicker="PÓS-VENDA" title="Conte como foi sua experiência" copy="Sua opinião ajuda a tornar a experiência mais acolhedora, organizada e sustentável."/><div className="mt-8"><p className="mb-3 text-sm font-extrabold text-[#092a46]">Como você avalia o atendimento?</p><div className="flex gap-2">{[1,2,3,4,5].map(n=><button type="button" key={n} onClick={()=>setRating(n)} aria-label={`${n} estrelas`} className={`grid h-11 w-11 place-items-center border ${n<=rating?"border-amber-400 bg-amber-50 text-amber-500":"border-slate-200 text-slate-300"}`}><Star size={21} fill={n<=rating?"currentColor":"none"}/></button>)}</div></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><SelectField label="Foi fácil utilizar o site?" name="facilidade" options={["Muito fácil","Fácil","Regular","Difícil"]}/><SelectField label="Ficou satisfeito com o produto?" name="satisfacao" options={["Sim","Parcialmente","Não"]}/><SelectField label="Participaria novamente?" name="participariaNovamente" options={["Sim","Talvez","Não"]}/><SelectField label="Indicaria para outras pessoas?" name="recomendaria" options={["Sim","Não"]}/></div><Field label="Deixe sua sugestão"><textarea name="sugestao" className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10 min-h-28 resize-y" placeholder="Escreva aqui..."/></Field>{message&&<p className={`mt-4 font-bold ${message.startsWith("Obrigado")?"text-emerald-700":"text-red-600"}`}>{message}</p>}<button disabled={sending} className="mt-5 w-full bg-[#ef6b2e] px-5 py-4 font-extrabold text-white disabled:opacity-60">{sending?"ENVIANDO...":"ENVIAR AVALIAÇÃO"}</button></form></div></section>;
}

function AdminLogin({ onUnlock }: { onUnlock:()=>void }) {
  const [message,setMessage]=useState(""); const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault(); const fd=new FormData(e.currentTarget); if(fd.get("code")===ADM_CODE)onUnlock();else setMessage("Código de acesso inválido.")};
  return <section><div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-4 py-12 sm:px-6"><div className="w-full border border-slate-200 bg-white p-7 shadow-xl sm:p-9"><span className="grid h-12 w-12 place-items-center bg-[#092a46] text-white"><ShieldCheck/></span><SectionHead kicker="ÁREA RESTRITA" title="Acesso da equipe" copy="Entre para gerenciar produtos, reservas e avaliações."/><form onSubmit={submit} className="mt-7"><Field label="Código de acesso"><input name="code" type="password" required autoComplete="off" className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field>{message&&<p className="mt-3 text-sm font-bold text-red-600">{message}</p>}<button className="mt-5 w-full bg-[#092a46] px-5 py-4 font-extrabold text-white">ENTRAR NA ADM</button></form></div></div></section>;
}

function Management({ tab,setTab,products,reservations,reviews,reloadProducts,reloadAdmin }: { tab:AdminTab; setTab:(t:AdminTab)=>void; products:Product[]; reservations:Reservation[]; reviews:Review[]; reloadProducts:()=>Promise<void>; reloadAdmin:()=>Promise<void> }) {
  const [editing,setEditing]=useState<Product|null>(null); const [showForm,setShowForm]=useState(false); const [message,setMessage]=useState("");
  const saveProduct=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault(); setMessage(""); const fd=new FormData(e.currentTarget); try{const url=editing?`${API_URL}/produtos/${editing._id}`:`${API_URL}/produtos`; const r=await fetch(url,{method:editing?"PUT":"POST",body:fd}); if(!r.ok)throw new Error((await r.json()).mensagem||"Erro ao salvar produto."); setShowForm(false); setEditing(null); await reloadProducts(); setMessage("Produto salvo com sucesso.");}catch(err){setMessage(err instanceof Error?err.message:"Erro ao salvar.")}};
  const removeProduct=async(p:Product)=>{if(!window.confirm(`Excluir ${p.nome}?`))return; const r=await fetch(`${API_URL}/produtos/${p._id}`,{method:"DELETE"}); if(r.ok)await reloadProducts();};
  const updateReservation=async(r:Reservation,status:string)=>{await fetch(`${API_URL}/reservas/${r._id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...r,status})}); await reloadAdmin(); await reloadProducts();};
  const deleteReservation=async(r:Reservation)=>{if(!window.confirm(`Excluir pedido de ${r.nomeCompleto}?`))return; await fetch(`${API_URL}/reservas/${r._id}`,{method:"DELETE"}); await reloadAdmin();};
  return <section><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14"><SectionHead kicker="PAINEL ADMINISTRATIVO" title="Gestão do Brechó" copy="Gerencie catálogo, acompanhe reservas e consulte o retorno dos clientes."/><div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-4">{([['products','Produtos'],['reservations','Reservas'],['feedback','Pós-venda']] as [AdminTab,string][]).map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`px-4 py-2.5 text-sm font-extrabold ${tab===id?"bg-[#092a46] text-white":"border border-slate-200 bg-white text-slate-600"}`}>{label}</button>)}</div>{message&&<p className="mt-4 font-bold text-emerald-700">{message}</p>}
    {tab==="products"&&<div className="mt-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black tracking-[.16em] text-[#ef6b2e]">CATÁLOGO</p><h3 className="mt-2 text-2xl font-extrabold text-[#092a46]">Produtos</h3></div><button onClick={()=>{setEditing(null);setShowForm(true)}} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#ef6b2e] px-4 font-extrabold text-white"><Plus size={18}/> Adicionar produto</button></div>{showForm&&<ProductForm product={editing} onSubmit={saveProduct} onCancel={()=>{setShowForm(false);setEditing(null)}}/>}<div className="mt-6 grid gap-3">{products.map(p=><div key={p._id} className="grid gap-4 border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[80px_1fr_auto] sm:items-center"><img src={imageUrl(p)} className="h-20 w-20 object-cover" alt=""/><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-[#092a46]">{p.nome}</b><span className="text-xs font-bold text-[#ef6b2e]">{p.codigo}</span></div><p className="mt-1 text-sm text-slate-500">{p.tamanho} · {p.estado} · {statusInfo(p.status)[0]}</p><p className="mt-1 truncate text-sm text-slate-600">{p.troca}</p></div><div className="flex gap-2"><button onClick={()=>{setEditing(p);setShowForm(true)}} className="grid h-10 w-10 place-items-center border border-slate-200" aria-label="Editar"><Pencil size={17}/></button><button onClick={()=>void removeProduct(p)} className="grid h-10 w-10 place-items-center border border-red-200 text-red-600" aria-label="Excluir"><Trash2 size={17}/></button></div></div>)}</div></div>}
    {tab==="reservations"&&<div className="mt-8 grid gap-4">{reservations.length===0?<Empty text="Nenhuma reserva registrada."/>:reservations.map(r=><article key={r._id} className="border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><p className="text-xs font-black tracking-wide text-[#ef6b2e]">{r.codigoProduto}</p><h4 className="mt-1 text-lg font-extrabold text-[#092a46]">{r.nomeProduto}</h4><p className="mt-2 text-sm text-slate-600"><b>{r.nomeCompleto}</b> · {r.contato}</p><p className="mt-1 text-sm text-slate-500">Doação: {r.quantidade}× {r.itemDoacao} ({r.tipoDoacao})</p></div><div className="flex flex-col gap-2 sm:flex-row"><select value={r.status} onChange={e=>void updateReservation(r,e.target.value)} className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10 min-w-44"><option>Pendente</option><option>Em análise</option><option>Confirmada</option><option>Vendido</option></select><button onClick={()=>void deleteReservation(r)} className="inline-flex items-center justify-center gap-2 border border-red-200 px-4 py-2 font-bold text-red-600"><Trash2 size={16}/> Excluir</button></div></div></article>)}</div>}
    {tab==="feedback"&&<div className="mt-8 grid gap-4 md:grid-cols-2">{reviews.length===0?<Empty text="Nenhuma avaliação recebida."/>:reviews.map(r=><article key={r._id} className="border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-1 text-amber-500">{[1,2,3,4,5].map(n=><Star key={n} size={17} fill={n<=r.nota?"currentColor":"none"} className={n<=r.nota?"":"text-slate-300"}/>)}</div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><p><span className="block text-xs font-bold text-slate-400">FACILIDADE</span>{r.facilidade||"—"}</p><p><span className="block text-xs font-bold text-slate-400">SATISFAÇÃO</span>{r.satisfacao||"—"}</p><p><span className="block text-xs font-bold text-slate-400">PARTICIPARIA</span>{r.participariaNovamente||"—"}</p><p><span className="block text-xs font-bold text-slate-400">RECOMENDARIA</span>{r.recomendaria||"—"}</p></div>{r.sugestao&&<p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">“{r.sugestao}”</p>}</article>)}</div>}
  </div></section>;
}

function ProductForm({ product,onSubmit,onCancel }: { product:Product|null; onSubmit:(e:FormEvent<HTMLFormElement>)=>void; onCancel:()=>void }) { return <form onSubmit={onSubmit} className="mt-6 border border-slate-200 bg-white p-5 shadow-xl sm:p-7"><div className="flex items-center justify-between gap-3"><h4 className="text-xl font-extrabold text-[#092a46]">{product?"Editar produto":"Novo produto"}</h4><button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center border border-slate-200"><X size={17}/></button></div><div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Código"><input name="codigo" defaultValue={product?.codigo} required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field><Field label="Nome"><input name="nome" defaultValue={product?.nome} required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field><Field label="Categoria"><select name="categoria" defaultValue={product?.categoria||"adult"} required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"><option value="adult">Vestuário adulto</option><option value="child">Vestuário infantil</option><option value="accessories">Acessórios e calçados</option></select></Field><Field label="Tamanho"><input name="tamanho" defaultValue={product?.tamanho} required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field><Field label="Conservação"><input name="estado" defaultValue={product?.estado} required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field><Field label="Status"><select name="status" defaultValue={product?.status||"available"} className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"><option value="available">Disponível</option><option value="reserved">Reservado</option><option value="exchanged">Trocado</option></select></Field><Field label="Troca solidária"><input name="troca" defaultValue={product?.troca} required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"/></Field><Field label="Imagem"><label className="flex min-h-12 cursor-pointer items-center gap-2 border border-dashed border-slate-300 px-3 text-sm font-bold text-slate-600"><Upload size={17}/> Escolher imagem<input name="imagem" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only"/></label></Field></div><Field label="Descrição"><textarea name="descricao" defaultValue={product?.descricao} required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10 min-h-28 resize-y"/></Field><div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="border border-slate-300 px-5 py-3 font-bold">Cancelar</button><button className="bg-[#ef6b2e] px-5 py-3 font-extrabold text-white">SALVAR PRODUTO</button></div></form> }

function Field({ label,children }: { label:string; children:ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-extrabold text-[#092a46]">{label}</span>{children}</label> }
function SelectField({label,name,options}:{label:string;name:string;options:string[]}) { return <Field label={label}><select name={name} required className="w-full min-h-12 border border-slate-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-[#ef6b2e] focus:ring-4 focus:ring-orange-500/10"><option value="">Selecione</option>{options.map(o=><option key={o}>{o}</option>)}</select></Field> }
function Empty({text}:{text:string}) { return <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">{text}</div> }
function Footer() { return <footer className="mt-10 bg-[#092a46] text-white/65"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-7 text-sm sm:px-6 md:flex-row md:items-center md:justify-between"><span>Brechó Solidário Online · Consumo consciente em movimento.</span><b className="text-white">Escolha. Troque. Faça o bem.</b></div></footer> }