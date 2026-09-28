const API_URL = "https://brecho-api-zebo.onrender.com/api";
const ADM_CODE = "537586";

const FALLBACK_PRODUCTS = [
  {code:"001",name:"Jaqueta Jeans",category:"adult",size:"M",condition:"Muito bom",status:"available",description:"Jaqueta jeans versátil e bem conservada para acompanhar diferentes combinações.",trade:"3 alimentos não perecíveis",image:"https://images.pexels.com/photos/4440566/pexels-photo-4440566.jpeg?auto=compress&cs=tinysrgb&w=900"},
  {code:"002",name:"Calça Jeans",category:"adult",size:"40",condition:"Muito bom",status:"available",description:"Calça jeans clássica, resistente e confortável para o dia a dia.",trade:"3 alimentos não perecíveis",image:"https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=900"},
  {code:"003",name:"Tênis Urbano",category:"shoes",size:"38",condition:"Muito bom",status:"reserved",description:"Tênis urbano seminovo, confortável e pronto para novas caminhadas.",trade:"2 produtos de higiene pessoal",image:"https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=900"},
  {code:"004",name:"Bolsa Caramelo",category:"shoes",size:"Único",condition:"Ótimo estado",status:"available",description:"Bolsa funcional com acabamento clássico e amplo espaço interno.",trade:"2 alimentos não perecíveis",image:"https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=900"},
  {code:"005",name:"Vestido Infantil",category:"children",size:"8 anos",condition:"Ótimo estado",status:"available",description:"Vestido infantil alegre e bem conservado para ganhar novas memórias.",trade:"2 produtos de higiene pessoal",image:"https://images.pexels.com/photos/15625985/pexels-photo-15625985.jpeg?auto=compress&cs=tinysrgb&w=900"},
  {code:"006",name:"Sandália Bege",category:"shoes",size:"36",condition:"Bom estado",status:"exchanged",description:"Sandália elegante que já encontrou uma nova história.",trade:"2 alimentos não perecíveis",image:"https://images.pexels.com/photos/27204291/pexels-photo-27204291.jpeg?auto=compress&cs=tinysrgb&w=900"}
];

const state = {
  products: [],
  reservations: [],
  reviews: [],
  selectedProduct: null,
  category: "all",
  search: "",
  adminUnlocked: false,
  usingFallback: false,
  apiStatus: {products:false,reservations:false,reviews:false},
  adminProductSearch: "",
  adminProductCategory: "all",
  adminProductStatus: "all",
  adminProductSort: "recent",
  adminReservationSearch: "",
  adminReservationStatus: "all",
  adminReviewRating: "all",
  pendingAdminRoute: ""
};

const SCREEN_ROUTES = {
  home: "/",
  catalog: "/catalogo",
  how: "/como-funciona",
  rules: "/regras",
  impact: "/impacto",
  feedback: "/avaliacao",
  adm: "/adm",
  reservation: "/reserva",
  confirmation: "/confirmacao"
};
const ROUTE_SCREENS = Object.fromEntries(Object.entries(SCREEN_ROUTES).map(([screen,path])=>[path,screen]));
const ADMIN_ROUTES = {
  overview: "/admin",
  products: "/admin/produtos",
  categories: "/admin/categorias",
  reservations: "/admin/reservas",
  reviews: "/admin/avaliacoes",
  tools: "/admin/ferramentas"
};
const ROUTE_ADMIN_TABS = Object.fromEntries(Object.entries(ADMIN_ROUTES).map(([tab,path])=>[path,tab]));

const $ = (selector, scope=document) => scope.querySelector(selector);
const $$ = (selector, scope=document) => [...scope.querySelectorAll(selector)];
const esc = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

function iconRefresh(){ if(window.lucide) window.lucide.createIcons(); }
function toast(message){
  const el=$("#toast"); if(!el) return;
  el.textContent=message; el.classList.add("show");
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove("show"),2600);
}
function setMessage(el,message,type=""){
  if(!el) return; el.textContent=message; el.className=`form-message ${type}`;
}
function categoryKey(value=""){
  const v=String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  if(!v||["selecione uma categoria","selecionar categoria"].includes(v)) return "other";
  if(["adult","adulto","vestuario adulto"].includes(v)) return "adult";
  if(["children","child","infantil","vestuario infantil"].includes(v)) return "children";
  if(["shoes","shoe","calcados","calcado","acessorios","acessorio","calcados e acessorios","accessories"].includes(v)) return "shoes";
  return v;
}
function categoryLabel(value){
  const key=categoryKey(value);
  const known={adult:"Vestuário adulto",children:"Vestuário infantil",shoes:"Calçados e acessórios"};
  if(known[key]) return known[key];
  if(!key||key==="other") return "Outros";
  return key.replace(/(^|\s)\S/g,m=>m.toUpperCase());
}
function statusLabel(status){
  return ({available:"Disponível",reserved:"Reservado",exchanged:"Trocado"})[status] || status || "Disponível";
}
function resolveImage(value,code){
  const fallback=FALLBACK_PRODUCTS.find(p=>p.code===code)?.image || "";
  if(!value) return fallback;
  if(/^https?:\/\//i.test(value)||value.startsWith("data:")||value.startsWith("blob:")) return value;
  try{return new URL(value,new URL(API_URL).origin).href}catch{return fallback}
}
function normalizeProduct(p){
  return {
    id:p._id||p.id||"",
    code:p.codigo||p.code||"",
    name:p.nome||p.name||"Produto",
    category:categoryKey(p.categoria||p.category),
    size:p.tamanho||p.size||"—",
    condition:p.estado||p.condition||"—",
    status:p.status||"available",
    description:p.descricao||p.description||"",
    trade:p.troca||p.trade||"Consulte a equipe",
    image:resolveImage(p.imagem||p.image,p.codigo||p.code)
  };
}

function normalizePath(path=window.location.pathname){
  const clean=String(path||"/").replace(/\/+$/,"");
  return clean||"/";
}
function updateUrl(path,{replace=false}={}){
  const target=normalizePath(path);
  if(normalizePath(window.location.pathname)===target)return;
  window.history[replace?"replaceState":"pushState"]({},"",target);
}
function persistAdminSession(unlocked){
  try{
    if(unlocked) sessionStorage.setItem("brecho:admin-session","1");
    else sessionStorage.removeItem("brecho:admin-session");
  }catch{}
}
function restoreAdminSession(){
  try{return sessionStorage.getItem("brecho:admin-session")==="1"}catch{return false}
}
function persistSelectedProduct(code=""){
  try{
    if(code)sessionStorage.setItem("brecho:selected-product",code);
    else sessionStorage.removeItem("brecho:selected-product");
  }catch{}
}
function restoreRedirectPath(){
  try{
    const redirect=sessionStorage.getItem("brecho:route-redirect");
    if(!redirect)return;
    sessionStorage.removeItem("brecho:route-redirect");
    if(normalizePath(window.location.pathname)==="/")window.history.replaceState({},"",redirect);
  }catch{}
}
function showScreen(id,{updateRoute=true,replace=false}={}){
  if(id==="management" && !state.adminUnlocked) id="adm";
  const target=document.getElementById(id) || document.getElementById("home");
  $(".screen").forEach(s=>s.classList.toggle("active",s===target));
  $("[data-screen-link]").forEach(b=>b.classList.toggle("active",b.dataset.screenLink===target.id));
  closeMenu();
  window.scrollTo({top:0,behavior:"smooth"});
  if(target.id==="catalog") renderCatalog();
  if(target.id==="management") renderAdminAll();
  if(updateRoute){
    const route=target.id==="management"?ADMIN_ROUTES.overview:SCREEN_ROUTES[target.id];
    if(route)updateUrl(route,{replace});
  }
  iconRefresh();
}
function routeToCurrentLocation({replaceInvalid=false}={}){
  const path=normalizePath();
  const adminTab=ROUTE_ADMIN_TABS[path];
  if(adminTab){
    if(!state.adminUnlocked){
      state.pendingAdminRoute=path;
      showScreen("adm",{updateRoute:false});
      updateUrl("/adm",{replace:true});
      return;
    }
    showScreen("management",{updateRoute:false});
    setAdminTab(adminTab,{updateRoute:false});
    return;
  }

  if(path.startsWith("/produto/")){
    const code=decodeURIComponent(path.slice("/produto/".length));
    if(code&&state.products.some(p=>p.code===code)){
      openProduct(code,{updateRoute:false});
      return;
    }
    showScreen("catalog",{updateRoute:false});
    updateUrl("/catalogo",{replace:true});
    return;
  }

  if(path==="/reserva"){
    const savedCode=state.selectedProduct?.code||(()=>{try{return sessionStorage.getItem("brecho:selected-product")||""}catch{return ""}})();
    const product=state.products.find(p=>p.code===savedCode);
    if(product&&product.status==="available"){
      state.selectedProduct=product;
      $("#reservation-summary").textContent=`Você está solicitando a reserva de ${product.name} — código ${product.code}. Troca: ${String(product.trade).replace(/^[^\wÀ-ÿ]+/,"")}.`;
      showScreen("reservation",{updateRoute:false});
      return;
    }
    showScreen("catalog",{updateRoute:false});
    updateUrl("/catalogo",{replace:true});
    return;
  }

  const screen=ROUTE_SCREENS[path];
  if(screen){
    showScreen(screen,{updateRoute:false});
    return;
  }

  showScreen("home",{updateRoute:false});
  if(replaceInvalid)updateUrl("/",{replace:true});
}
function closeMenu(){
  $("#mobile-menu")?.classList.remove("open");
  $("#mobile-menu")?.setAttribute("aria-hidden","true");
  $("#menu-toggle")?.setAttribute("aria-expanded","false");
}
function toggleMenu(){
  const menu=$("#mobile-menu"); if(!menu) return;
  const open=menu.classList.toggle("open");
  menu.setAttribute("aria-hidden",String(!open));
  $("#menu-toggle")?.setAttribute("aria-expanded",String(open));
}

async function api(path,options={}){
  const response=await fetch(`${API_URL}${path}`,options);
  if(!response.ok){
    let data={}; try{data=await response.json()}catch{}
    throw new Error(data.erro||data.mensagem||`Erro ${response.status}`);
  }
  return response.status===204?null:response.json();
}

async function loadProducts(){
  const box=$("#catalog-state");
  try{
    const data=await api("/produtos");
    state.products=data.map(normalizeProduct);
    state.usingFallback=false;
    state.apiStatus.products=true;
    if(box) box.classList.add("hidden");
  }catch(error){
    console.warn(error);
    state.products=FALLBACK_PRODUCTS.map(normalizeProduct);
    state.usingFallback=true;
    state.apiStatus.products=false;
    if(box){box.textContent="A API está demorando para responder. Mostrando uma prévia do catálogo enquanto isso.";box.classList.remove("hidden");}
  }
  applyReservationStatuses();
  renderCatalog();
  renderAdminProducts();
  renderAdminCategories();
  renderAdminOverview();
  renderAdminDataStatus();
}
async function loadReservations(){
  try{
    state.reservations=await api("/reservas");
    state.apiStatus.reservations=true;
    applyReservationStatuses();
    renderCatalog();
    renderReservations();
  }catch(error){
    console.warn(error);
    state.reservations=[];
    state.apiStatus.reservations=false;
    renderReservations();
  }
  renderAdminOverview();
  renderAdminDataStatus();
}
async function loadReviews(){
  try{
    state.reviews=await api("/avaliacoes");
    state.apiStatus.reviews=true;
  }catch(error){
    console.warn(error);
    state.reviews=[];
    state.apiStatus.reviews=false;
  }
  renderReviews();
  renderAdminOverview();
  renderAdminDataStatus();
}
function applyReservationStatuses(){
  state.reservations.forEach(r=>{
    const p=state.products.find(x=>x.code===r.codigoProduto); if(!p) return;
    if(["Pendente","Em análise","Confirmada"].includes(r.status)) p.status="reserved";
    if(r.status==="Vendido") p.status="exchanged";
  });
}

function filteredProducts(){
  const term=state.search.toLowerCase().trim();
  return state.products.filter(p=>{
    const cat=state.category==="all"||p.category===state.category;
    const text=!term||[p.name,p.code,p.category,p.description].join(" ").toLowerCase().includes(term);
    return cat&&text;
  });
}
function productCard(p){
  return `<article class="product-card">
    <div class="product-media">
      <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.opacity='.2'" />
      <span class="status ${esc(p.status)}">${esc(statusLabel(p.status))}</span>
    </div>
    <div class="product-body">
      <span class="product-code">CÓDIGO ${esc(p.code)}</span>
      <h3>${esc(p.name)}</h3>
      <div class="product-meta"><span>${esc(categoryLabel(p.category))}</span><span>Tam. ${esc(p.size)}</span></div>
      <div class="product-trade"><small>TROCA SOLIDÁRIA</small><strong>${esc(String(p.trade).replace(/^[^\wÀ-ÿ]+/,""))}</strong></div>
      <button class="btn btn-secondary" type="button" data-open-product="${esc(p.code)}">Ver produto <i data-lucide="arrow-up-right"></i></button>
    </div>
  </article>`;
}
function renderCatalog(){
  const list=filteredProducts(),grid=$("#product-grid"),count=$("#product-count");
  if(count) count.textContent=String(list.length);
  if(grid) grid.innerHTML=list.length?list.map(productCard).join(""):`<div class="state-box">Nenhuma peça encontrada com esses filtros.</div>`;
  iconRefresh();
}
function openProduct(code,{updateRoute=true,replace=false}={}){
  const p=state.products.find(x=>x.code===code); if(!p) return;
  state.selectedProduct=p;
  persistSelectedProduct(p.code);
  $("#detail-image").src=p.image; $("#detail-image").alt=p.name;
  $("#detail-code").textContent=`CÓDIGO ${p.code}`;
  $("#detail-name").textContent=p.name;
  $("#detail-description").textContent=p.description;
  $("#detail-category").textContent=categoryLabel(p.category);
  $("#detail-size").textContent=p.size;
  $("#detail-condition").textContent=p.condition;
  $("#detail-trade").textContent=String(p.trade).replace(/^[^\wÀ-ÿ]+/,"");
  const status=$("#detail-status"); status.textContent=statusLabel(p.status); status.className=`status ${p.status}`;
  const reserve=$("#reserve-button");
  reserve.disabled=p.status!=="available";
  reserve.innerHTML=p.status==="available"?'Reservar esta peça <i data-lucide="calendar-plus"></i>':`${statusLabel(p.status)}`;
  showScreen("details",{updateRoute:false});
  if(updateRoute)updateUrl(`/produto/${encodeURIComponent(p.code)}`,{replace});
}
function startReservation(){
  const p=state.selectedProduct;if(!p||p.status!=="available") return;
  $("#reservation-summary").textContent=`Você está solicitando a reserva de ${p.name} — código ${p.code}. Troca: ${String(p.trade).replace(/^[^\wÀ-ÿ]+/,"")}.`;
  $("#reservation-form").reset(); setMessage($("#reservation-message"),"");
  showScreen("reservation");
}
async function submitReservation(event){
  event.preventDefault(); const p=state.selectedProduct;if(!p) return;
  const button=$("#reservation-submit"),msg=$("#reservation-message");
  const donation=$('input[name="donation-type"]:checked')?.value||"";
  const payload={
    nomeCompleto:$("#full-name").value.trim(),contato:$("#contact").value.trim(),
    codigoProduto:p.code,nomeProduto:p.name,tipoDoacao:donation,
    itemDoacao:$("#donation-item").value.trim(),quantidade:Number($("#donation-quantity").value||1),
    status:"Pendente",observacoesEquipe:""
  };
  button.disabled=true;button.textContent="Enviando…";setMessage(msg,"Enviando sua solicitação…");
  try{
    const created=await api("/reservas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    state.reservations.unshift(created);p.status="reserved";
    $("#confirmation-text").textContent=`Sua solicitação para ${p.name} foi registrada. A equipe vai analisar o pedido e poderá entrar em contato pelo número informado.`;
    renderCatalog();showScreen("confirmation");
  }catch(error){setMessage(msg,error.message||"Não foi possível enviar a reserva.","error")}
  finally{button.disabled=false;button.innerHTML='Enviar solicitação <i data-lucide="send"></i>';iconRefresh()}
}

async function submitFeedback(event){
  event.preventDefault();
  const form=event.currentTarget;
  const button=$("#feedback-submit"),msg=$("#feedback-message");
  const rating=$('input[name="rating"]:checked');

  if(!rating){
    setMessage(msg,"Selecione uma nota antes de enviar.","error");
    return;
  }

  const payload={
    nota:Number(rating.value),
    facilidade:$("#ease").value,
    satisfacao:$("#satisfaction").value,
    participariaNovamente:$("#again").value,
    recomendaria:$("#recommend").value,
    sugestao:$("#suggestion").value.trim()
  };

  button.disabled=true;
  button.textContent="Enviando…";
  setMessage(msg,"Enviando sua avaliação…");

  try{
    const created=await api("/avaliacoes",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    state.reviews.unshift(created);
    form.reset();
    setMessage(msg,"Obrigado! Sua avaliação foi enviada.","success");
    renderReviews();
  }catch(error){
    console.error("Erro ao enviar avaliação:",error);
    setMessage(msg,error.message||"Não foi possível enviar sua avaliação. Tente novamente.","error");
  }finally{
    button.disabled=false;
    button.textContent="Enviar avaliação";
  }
}

function adminLogin(event){
  event.preventDefault();const msg=$("#adm-message");
  if($("#adm-code").value.trim()!==ADM_CODE){setMessage(msg,"Código de acesso inválido.","error");return}
  state.adminUnlocked=true;
  persistAdminSession(true);
  $("#adm-code").value="";setMessage(msg,"");
  const pending=state.pendingAdminRoute;
  state.pendingAdminRoute="";
  showScreen("management",{updateRoute:false});
  if(pending&&ROUTE_ADMIN_TABS[pending])setAdminTab(ROUTE_ADMIN_TABS[pending]);
  else setAdminTab("overview");
  toast("Área administrativa liberada")
}
function adminLogout(){
  state.adminUnlocked=false;
  state.pendingAdminRoute="";
  persistAdminSession(false);
  showScreen("adm");
  toast("Sessão administrativa encerrada")
}

function setAdminTab(tab,{updateRoute=true,replace=false}={}){
  $$("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===tab));
  $$("[data-admin-section]").forEach(s=>s.classList.toggle("active",s.dataset.adminSection===tab));
  if(tab==="overview") renderAdminOverview();
  if(tab==="products") renderAdminProducts();
  if(tab==="categories") renderAdminCategories();
  if(tab==="reservations") renderReservations();
  if(tab==="reviews") renderReviews();
  if(tab==="tools") renderAdminDataStatus();
  if(updateRoute&&state.adminUnlocked&&ADMIN_ROUTES[tab])updateUrl(ADMIN_ROUTES[tab],{replace});
  iconRefresh();
}

function renderAdminAll(){
  renderAdminOverview();
  renderAdminProducts();
  renderAdminCategories();
  renderReservations();
  renderReviews();
  renderAdminDataStatus();
  iconRefresh();
}

function categoryCounts(){
  return state.products.reduce((acc,p)=>{
    const key=categoryKey(p.category);
    if(!key)return acc;
    acc[key]=(acc[key]||0)+1;
    return acc;
  },{});
}

function renderAdminOverview(){
  const stats=$("#admin-overview-stats");
  if(stats){
    const pending=state.reservations.filter(r=>["Pendente","Em análise"].includes(r.status)).length;
    const confirmed=state.reservations.filter(r=>r.status==="Confirmada").length;
    const avg=state.reviews.length?(state.reviews.reduce((sum,r)=>sum+(Number(r.nota)||0),0)/state.reviews.length).toFixed(1):"—";
    const items=[
      ["package",state.products.length,"Produtos"],
      ["circle-check",state.products.filter(p=>p.status==="available").length,"Disponíveis"],
      ["clock-3",state.products.filter(p=>p.status==="reserved").length,"Reservados"],
      ["repeat-2",state.products.filter(p=>p.status==="exchanged").length,"Trocados"],
      ["clipboard-clock",pending,"Reservas pendentes"],
      ["badge-check",confirmed,"Confirmadas"],
      ["star",avg,"Nota média"]
    ];
    stats.innerHTML=items.map(([icon,value,label])=>`<article class="stat-card"><i data-lucide="${icon}"></i><div><strong>${esc(value)}</strong><span>${esc(label)}</span></div></article>`).join("");
  }

  const attention=$("#admin-attention-list");
  if(attention){
    const pending=state.reservations.filter(r=>["Pendente","Em análise"].includes(r.status)).slice(0,5);
    attention.innerHTML=pending.length?pending.map(r=>`<button class="compact-row" type="button" data-admin-jump="reservations"><span><strong>${esc(r.nomeCompleto||"Cliente")}</strong><small>${esc(r.nomeProduto||r.codigoProduto||"Produto")}</small></span><b>${esc(r.status||"Pendente")}</b></button>`).join(""):`<div class="empty-mini"><i data-lucide="circle-check-big"></i><span>Nenhuma reserva pendente.</span></div>`;
  }

  const categories=$("#admin-overview-categories");
  if(categories){
    const counts=categoryCounts();
    const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
    categories.innerHTML=entries.length?entries.map(([key,count])=>`<button class="compact-row" type="button" data-admin-category="${esc(key)}"><span><strong>${esc(categoryLabel(key))}</strong><small>${count} item(ns)</small></span><b>${count}</b></button>`).join(""):`<div class="empty-mini">Sem categorias ainda.</div>`;
  }
  iconRefresh();
}

function renderAdminProductFilters(){
  const select=$("#admin-product-category-filter");if(!select)return;
  const current=state.adminProductCategory;
  const categories=[...new Set(state.products.map(p=>categoryKey(p.category)))].sort((a,b)=>categoryLabel(a).localeCompare(categoryLabel(b),"pt-BR"));
  select.innerHTML=`<option value="all">Todas as categorias</option>`+categories.map(c=>`<option value="${esc(c)}">${esc(categoryLabel(c))}</option>`).join("");
  select.value=categories.includes(current)?current:"all";
  if(select.value!==current) state.adminProductCategory="all";
}

function filteredAdminProducts(){
  const q=state.adminProductSearch.trim().toLowerCase();
  let items=state.products.filter(p=>{
    const matchesSearch=!q||[p.name,p.code,p.size,p.condition,p.trade,categoryLabel(p.category)].some(v=>String(v||"").toLowerCase().includes(q));
    const matchesCategory=state.adminProductCategory==="all"||categoryKey(p.category)===state.adminProductCategory;
    const matchesStatus=state.adminProductStatus==="all"||p.status===state.adminProductStatus;
    return matchesSearch&&matchesCategory&&matchesStatus;
  });
  if(state.adminProductSort==="name") items.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  if(state.adminProductSort==="code") items.sort((a,b)=>String(a.code).localeCompare(String(b.code),"pt-BR",{numeric:true}));
  if(state.adminProductSort==="category") items.sort((a,b)=>categoryLabel(a.category).localeCompare(categoryLabel(b.category),"pt-BR"));
  if(state.adminProductSort==="status") items.sort((a,b)=>statusLabel(a.status).localeCompare(statusLabel(b.status),"pt-BR"));
  return items;
}

function renderAdminProducts(){
  const list=$("#admin-product-list");if(!list) return;
  renderAdminProductFilters();
  const items=filteredAdminProducts();
  const count=$("#admin-product-count");if(count)count.textContent=`${items.length} de ${state.products.length} produto(s)`;
  list.innerHTML=items.length?items.map(p=>`<article class="admin-card admin-product-card">
    <div class="admin-product-main">
      <div class="admin-thumb">${p.image?`<img src="${esc(p.image)}" alt="" onerror="this.parentElement.classList.add('image-error');this.remove()" />`:`<i data-lucide="image-off"></i>`}</div>
      <div><h4>${esc(p.name)} <span class="code-chip">#${esc(p.code)}</span> <span class="status ${esc(p.status)}">${esc(statusLabel(p.status))}</span></h4>
      <p>${esc(categoryLabel(p.category))} · Tam. ${esc(p.size)} · ${esc(p.condition)}</p>
      <div class="admin-card-meta"><span>${esc(String(p.trade).replace(/^[^\wÀ-ÿ]+/,""))}</span></div></div>
    </div>
    <div class="admin-actions">
      <button class="mini-btn" type="button" data-edit-product="${esc(p.code)}">Editar</button>
      <button class="mini-btn" type="button" data-duplicate-product="${esc(p.code)}">Duplicar</button>
      <button class="mini-btn primary" type="button" data-cycle-product="${esc(p.code)}">Status</button>
      <button class="mini-btn danger" type="button" data-delete-product="${esc(p.code)}">Excluir</button>
    </div>
  </article>`).join(""):`<div class="state-box">Nenhum produto corresponde aos filtros.</div>`;
  iconRefresh();
}

function renderAdminCategories(){
  const grid=$("#admin-category-grid");if(!grid)return;
  const counts=categoryCounts();
  const categories=Object.keys(counts).sort((a,b)=>categoryLabel(a).localeCompare(categoryLabel(b),"pt-BR"));
  grid.innerHTML=categories.length?categories.map(key=>{
    const products=state.products.filter(p=>categoryKey(p.category)===key);
    const available=products.filter(p=>p.status==="available").length;
    const removable=!["other","outros"].includes(key);
    return `<article class="category-admin-card">
      <button class="category-admin-main" type="button" data-admin-category="${esc(key)}">
        <span class="category-admin-icon"><i data-lucide="tag"></i></span>
        <span class="category-admin-copy"><strong>${esc(categoryLabel(key))}</strong><small>${products.length} produto(s) · ${available} disponível(is)</small></span>
        <span class="category-admin-action">Ver produtos <i data-lucide="arrow-right"></i></span>
      </button>
      <div class="category-admin-buttons">
        <button class="mini-btn" type="button" data-edit-category="${esc(key)}"><i data-lucide="pencil"></i> Editar</button>
        ${removable?`<button class="mini-btn danger" type="button" data-remove-category="${esc(key)}"><i data-lucide="trash-2"></i> Remover</button>`:""}
      </div>
    </article>`;
  }).join(""):`<div class="state-box">Nenhuma categoria encontrada.</div>`;
  iconRefresh();
}

function populateProductCategorySelect(selectedValue="",extraValue=""){
  const select=$("#admin-product-category");if(!select)return;
  const byKey=new Map();
  state.products.forEach(p=>{
    const key=categoryKey(p.category);
    if(key)byKey.set(key,categoryLabel(key));
  });
  if(extraValue){
    const extraKey=categoryKey(extraValue);
    if(extraKey)byKey.set(extraKey,extraValue.trim());
  }
  if(selectedValue){
    const selectedKey=categoryKey(selectedValue);
    if(selectedKey&&!byKey.has(selectedKey))byKey.set(selectedKey,categoryLabel(selectedValue));
  }
  const options=[...byKey.entries()].sort((a,b)=>a[1].localeCompare(b[1],"pt-BR"));
  select.innerHTML=`<option value="" disabled selected hidden>Selecione uma categoria</option>`+options.filter(([key])=>key!=="other"||byKey.get(key)==="Outros").map(([key,label])=>`<option value="${esc(label)}" data-category-key="${esc(key)}">${esc(label)}</option>`).join("");
  if(selectedValue){
    const selectedKey=categoryKey(selectedValue);
    const match=options.find(([key])=>key===selectedKey);
    if(match)select.value=match[1];
  }
}

function openCategoryEditor(key=null){
  if(state.usingFallback){toast("O catálogo está em modo de prévia. Reconecte a API antes de gerenciar categorias.");return}
  const creating=!key;
  if(!creating){
    const products=state.products.filter(p=>categoryKey(p.category)===key);
    if(!products.length)return;
  }
  $("#admin-category-original").value=key||"";
  $("#admin-category-name").value=creating?"":categoryLabel(key);
  const title=$("#admin-category-editor-title");
  const help=$("#admin-category-editor-help");
  const save=$("#admin-category-save");
  if(title)title.textContent=creating?"Adicionar categoria":"Editar categoria";
  if(help)help.textContent=creating
    ?"Digite o nome da categoria. Em seguida, cadastre o primeiro produto para que ela seja salva de verdade na API."
    :"Todos os produtos desta categoria serão atualizados para o novo nome.";
  if(save)save.textContent=creating?"Continuar":"Salvar categoria";
  $("#admin-category-editor").classList.remove("hidden");
  $("#admin-category-editor").scrollIntoView({behavior:"smooth",block:"center"});
  $("#admin-category-name")?.focus();
}
function closeCategoryEditor(){
  $("#admin-category-editor")?.classList.add("hidden");
  $("#admin-category-form")?.reset();
  if($("#admin-category-original"))$("#admin-category-original").value="";
}
async function updateCategoryProducts(originalKey,newName){
  const targets=state.products.filter(p=>categoryKey(p.category)===originalKey);
  if(!targets.length)throw new Error("Nenhum produto encontrado nesta categoria.");
  if(targets.some(p=>!p.id))throw new Error("Existem itens de prévia nesta categoria. Atualize os dados reais antes de continuar.");
  for(const product of targets){
    const form=new FormData();
    form.set("categoria",newName);
    await api(`/produtos/${product.id}`,{method:"PUT",body:form});
  }
  return targets.length;
}
async function saveCategory(event){
  event.preventDefault();
  const originalKey=$("#admin-category-original").value;
  const newName=$("#admin-category-name").value.trim();
  const button=$("#admin-category-save");
  if(!newName)return;

  if(!originalKey){
    closeCategoryEditor();
    setAdminTab("products");
    openProductForm(null,newName);
    $("#admin-product-category").value=newName;
    const title=$("#admin-product-form-title");
    if(title)title.textContent=`Novo produto em ${newName}`;
    setMessage($("#management-message"),`Cadastre o primeiro produto para concluir a criação da categoria "${newName}".`,"success");
    $("#admin-product-code")?.focus();
    return;
  }

  if(categoryKey(newName)===originalKey){closeCategoryEditor();return}
  button.disabled=true;button.textContent="Salvando…";
  try{
    const count=await updateCategoryProducts(originalKey,newName);
    closeCategoryEditor();
    await loadProducts();
    renderAdminAll();
    toast(`Categoria atualizada em ${count} produto(s).`);
  }catch(error){
    await loadProducts();
    toast(error.message||"Não foi possível atualizar a categoria.");
  }finally{
    button.disabled=false;button.textContent="Salvar categoria";
  }
}
async function removeCategory(key){
  if(state.usingFallback){toast("O catálogo está em modo de prévia. Reconecte a API antes de remover categorias.");return}
  if(["other","outros"].includes(key)){toast("A categoria Outros é usada como destino padrão e não pode ser removida.");return}
  const products=state.products.filter(p=>categoryKey(p.category)===key);
  if(!products.length)return;
  if(!confirm(`Remover a categoria "${categoryLabel(key)}"? Os ${products.length} produto(s) serão movidos para "Outros". Nenhum produto será excluído.`))return;
  try{
    const count=await updateCategoryProducts(key,"Outros");
    closeCategoryEditor();
    await loadProducts();
    renderAdminAll();
    toast(`Categoria removida. ${count} produto(s) movido(s) para Outros.`);
  }catch(error){
    await loadProducts();
    toast(error.message||"Não foi possível remover a categoria.");
  }
}

function openProductForm(product=null,extraCategory=""){
  $("#admin-product-form").reset();
  $("#admin-product-id").value=product?.id||"";
  $("#admin-product-code").value=product?.code||"";
  $("#admin-product-name").value=product?.name||"";
  populateProductCategorySelect(product?.category||"",extraCategory);
  $("#admin-product-size").value=product?.size||"";
  $("#admin-product-condition").value=product?.condition||"";
  $("#admin-product-status").value=product?.status||"available";
  $("#admin-product-trade").value=product?.trade||"";
  $("#admin-product-description").value=product?.description||"";
  const title=$("#admin-product-form-title");if(title)title.textContent=product?"Editar produto":"Novo produto";
  $("#admin-product-form-wrap").classList.remove("hidden");
  $("#admin-product-form-wrap").scrollIntoView({behavior:"smooth",block:"start"});
}
function closeProductForm(){ $("#admin-product-form-wrap").classList.add("hidden");$("#admin-product-form").reset() }

function duplicateProduct(code){
  const p=state.products.find(x=>x.code===code);if(!p)return;
  openProductForm({...p,id:"",code:"",name:`${p.name} - cópia`});
  $("#admin-product-code")?.focus();
}

async function saveProduct(event){
  event.preventDefault();const id=$("#admin-product-id").value,button=$("#admin-product-save"),msg=$("#management-message");
  const form=new FormData();
  form.set("codigo",$("#admin-product-code").value.trim());
  form.set("nome",$("#admin-product-name").value.trim());
  form.set("categoria",$("#admin-product-category").value.trim());
  form.set("tamanho",$("#admin-product-size").value.trim());
  form.set("estado",$("#admin-product-condition").value.trim());
  form.set("status",$("#admin-product-status").value);
  form.set("troca",$("#admin-product-trade").value.trim());
  form.set("descricao",$("#admin-product-description").value.trim());
  const image=$("#admin-product-image").files[0];if(image) form.set("imagem",image);
  button.disabled=true;button.textContent="Salvando…";
  try{
    await api(id?`/produtos/${id}`:"/produtos",{method:id?"PUT":"POST",body:form});
    await loadProducts();closeProductForm();setMessage(msg,id?"Produto atualizado com sucesso.":"Produto criado com sucesso.","success")
  }catch(error){setMessage(msg,error.message||"Não foi possível salvar o produto.","error")}
  finally{button.disabled=false;button.textContent="Salvar produto"}
}
async function deleteProduct(code){
  const p=state.products.find(x=>x.code===code);if(!p?.id) return toast("Este item de prévia não pode ser excluído.");
  if(!confirm(`Excluir "${p.name}"?`)) return;
  try{await api(`/produtos/${p.id}`,{method:"DELETE"});await loadProducts();toast("Produto excluído")}catch(error){toast(error.message)}
}
async function cycleProduct(code){
  const p=state.products.find(x=>x.code===code);if(!p?.id) return toast("Este item de prévia não pode ser alterado.");
  const next={available:"reserved",reserved:"exchanged",exchanged:"available"}[p.status]||"available";
  try{
    const form=new FormData();form.set("status",next);
    await api(`/produtos/${p.id}`,{method:"PUT",body:form});await loadProducts();toast(`Status: ${statusLabel(next)}`)
  }catch(error){toast(error.message)}
}
function editProduct(code){const p=state.products.find(x=>x.code===code);if(!p?.id)return toast("Este item de prévia não pode ser editado.");openProductForm(p)}

function reservationStatusClass(status){return status==="Vendido"?"exchanged":["Pendente","Em análise","Confirmada"].includes(status)?"reserved":"available"}
function whatsappUrl(contact=""){
  let digits=String(contact).replace(/\D/g,"");
  if((digits.length===10||digits.length===11)&&!digits.startsWith("55"))digits="55"+digits;
  return digits.length>=10?`https://wa.me/${digits}`:"";
}
function filteredReservations(){
  const q=state.adminReservationSearch.trim().toLowerCase();
  return state.reservations.filter(r=>{
    const matchesSearch=!q||[r.nomeCompleto,r.nomeProduto,r.codigoProduto,r.contato,r.itemDoacao].some(v=>String(v||"").toLowerCase().includes(q));
    const matchesStatus=state.adminReservationStatus==="all"||r.status===state.adminReservationStatus;
    return matchesSearch&&matchesStatus;
  });
}
function renderReservations(){
  const list=$("#reservation-list");if(!list)return;
  const items=filteredReservations();
  const count=$("#admin-reservation-count");if(count)count.textContent=`${items.length} de ${state.reservations.length} reserva(s)`;
  list.innerHTML=items.length?items.map(r=>{
    const wa=whatsappUrl(r.contato);
    return `<article class="admin-card">
      <div><h4>${esc(r.nomeCompleto||"Cliente")} · ${esc(r.nomeProduto||r.codigoProduto||"Produto")} <span class="status ${reservationStatusClass(r.status)}">${esc(r.status||"Pendente")}</span></h4>
      <p>${esc(r.contato||"Sem contato")} · Doação: ${esc(r.itemDoacao||"—")} · Qtde. ${esc(r.quantidade||1)}</p>
      ${r.observacoesEquipe?`<div class="admin-card-meta"><span>${esc(r.observacoesEquipe)}</span></div>`:""}</div>
      <div class="admin-actions">
        ${wa?`<a class="mini-btn whatsapp" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`:""}
        <button class="mini-btn" type="button" data-reservation-status="${esc(r._id)}|Em análise">Em análise</button>
        <button class="mini-btn primary" type="button" data-reservation-status="${esc(r._id)}|Confirmada">Confirmar</button>
        <button class="mini-btn" type="button" data-reservation-status="${esc(r._id)}|Vendido">Concluir</button>
        <button class="mini-btn danger" type="button" data-delete-reservation="${esc(r._id)}">Excluir</button>
      </div>
    </article>`;
  }).join(""):`<div class="state-box">Nenhuma reserva corresponde aos filtros.</div>`;
}
async function updateReservation(id,status){
  const notes=status==="Em análise"?"Reserva recebida e aguardando análise da equipe.":status==="Confirmada"?"Reserva aprovada pela equipe.":status==="Vendido"?"Troca concluída.":"";
  try{
    const updated=await api(`/reservas/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,observacoesEquipe:notes})});
    const i=state.reservations.findIndex(r=>r._id===id);if(i>=0)state.reservations[i]=updated;
    applyReservationStatuses();renderReservations();renderCatalog();renderAdminOverview();toast("Reserva atualizada")
  }catch(error){toast(error.message)}
}
async function deleteReservation(id){
  if(!confirm("Excluir esta reserva?")) return;
  try{
    await api(`/reservas/${id}`,{method:"DELETE"});
    state.reservations=state.reservations.filter(r=>r._id!==id);
    renderReservations();renderAdminOverview();toast("Reserva excluída")
  }catch(error){toast(error.message)}
}

function renderReviewSummary(){
  const box=$("#admin-review-summary");if(!box)return;
  if(!state.reviews.length){box.innerHTML=`<div class="state-box">Ainda não há avaliações para resumir.</div>`;return}
  const avg=state.reviews.reduce((sum,r)=>sum+(Number(r.nota)||0),0)/state.reviews.length;
  const distribution=[5,4,3,2,1].map(n=>[n,state.reviews.filter(r=>Number(r.nota)===n).length]);
  box.innerHTML=`<div class="review-score"><strong>${avg.toFixed(1)}</strong><span>★</span><small>${state.reviews.length} avaliação(ões)</small></div>
    <div class="review-bars">${distribution.map(([n,count])=>`<div><span>${n}★</span><div class="review-bar"><i style="width:${state.reviews.length?(count/state.reviews.length)*100:0}%"></i></div><b>${count}</b></div>`).join("")}</div>`;
}
function renderReviews(){
  const list=$("#feedback-list");if(!list)return;
  renderReviewSummary();
  const min=state.adminReviewRating==="all"?0:Number(state.adminReviewRating);
  const items=state.reviews.filter(r=>(Number(r.nota)||0)>=min);
  list.innerHTML=items.length?items.map(r=>{
    const note=Math.max(0,Math.min(5,Number(r.nota)||0));
    const stars="★".repeat(note)+"☆".repeat(5-note);
    return `<article class="admin-card review-card"><div><h4 class="review-stars">${stars}</h4><p>Facilidade: ${esc(r.facilidade||"—")} · Satisfação: ${esc(r.satisfacao||"—")} · Participaria novamente: ${esc(r.participariaNovamente||"—")} · Indicaria: ${esc(r.recomendaria||"—")}</p>${r.sugestao?`<div class="admin-card-meta"><span>${esc(r.sugestao)}</span></div>`:""}</div></article>`;
  }).join(""):`<div class="state-box">Nenhuma avaliação corresponde ao filtro.</div>`;
}

function csvCell(value){
  const text=String(value??"");
  return `"${text.replace(/"/g,'""')}"`;
}
function downloadCsv(filename,headers,rows){
  const csv=[headers.map(csvCell).join(";"),...rows.map(row=>row.map(csvCell).join(";"))].join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
function exportProducts(){
  downloadCsv("brecho-produtos.csv",["Código","Nome","Categoria","Tamanho","Conservação","Status","Troca"],state.products.map(p=>[p.code,p.name,categoryLabel(p.category),p.size,p.condition,statusLabel(p.status),p.trade]));
}
function exportReservations(){
  downloadCsv("brecho-reservas.csv",["Cliente","Contato","Produto","Código","Doação","Quantidade","Status","Observação"],state.reservations.map(r=>[r.nomeCompleto,r.contato,r.nomeProduto,r.codigoProduto,r.itemDoacao,r.quantidade,r.status,r.observacoesEquipe]));
}
function exportReviews(){
  downloadCsv("brecho-avaliacoes.csv",["Nota","Facilidade","Satisfação","Participaria novamente","Indicaria","Sugestão"],state.reviews.map(r=>[r.nota,r.facilidade,r.satisfacao,r.participariaNovamente,r.recomendaria,r.sugestao]));
}

function renderAdminDataStatus(){
  const box=$("#admin-data-status");if(!box)return;
  const ok=Object.values(state.apiStatus).filter(Boolean).length;
  const total=Object.keys(state.apiStatus).length;
  box.classList.toggle("warning",ok<total);
  box.innerHTML=`<i data-lucide="${ok===total?"database":"triangle-alert"}"></i><span>${ok===total?"Produtos, reservas e avaliações foram carregados da API.":`Conexão parcial: ${ok}/${total} conjuntos de dados responderam. ${state.usingFallback?"O catálogo está usando itens de prévia.":""}`}</span>`;
  iconRefresh();
}
async function refreshAdminData(){
  const buttons=[$("#admin-refresh-data"),$("#admin-tool-refresh")].filter(Boolean);
  buttons.forEach(b=>b.disabled=true);
  setMessage($("#management-message"),"Atualizando dados…");
  await Promise.allSettled([loadProducts(),loadReservations(),loadReviews()]);
  renderAdminAll();
  setMessage($("#management-message"),"Dados atualizados.","success");
  buttons.forEach(b=>b.disabled=false);
}

function clearAdminFilters(type){
  if(type==="products"){
    state.adminProductSearch="";state.adminProductCategory="all";state.adminProductStatus="all";state.adminProductSort="recent";
    if($("#admin-product-search"))$("#admin-product-search").value="";
    if($("#admin-product-category-filter"))$("#admin-product-category-filter").value="all";
    if($("#admin-product-status-filter"))$("#admin-product-status-filter").value="all";
    if($("#admin-product-sort"))$("#admin-product-sort").value="recent";
    renderAdminProducts();
  }
  if(type==="reservations"){
    state.adminReservationSearch="";state.adminReservationStatus="all";
    if($("#admin-reservation-search"))$("#admin-reservation-search").value="";
    if($("#admin-reservation-status-filter"))$("#admin-reservation-status-filter").value="all";
    renderReservations();
  }
}

function bind(){
  document.addEventListener("click",event=>{
    const screenLink=event.target.closest("[data-screen-link]");if(screenLink){showScreen(screenLink.dataset.screenLink);return}
    const open=event.target.closest("[data-open-product]");if(open){openProduct(open.dataset.openProduct);return}
    const filter=event.target.closest("[data-category]");if(filter){state.category=filter.dataset.category;$("[data-category]").forEach(b=>b.classList.toggle("active",b===filter));renderCatalog();return}
    const tab=event.target.closest("[data-admin-tab]");if(tab){setAdminTab(tab.dataset.adminTab);return}
    const jump=event.target.closest("[data-admin-jump]");if(jump){setAdminTab(jump.dataset.adminJump);return}
    const category=event.target.closest("[data-admin-category]");if(category){state.adminProductCategory=category.dataset.adminCategory;setAdminTab("products");renderAdminProducts();return}
    const editCategory=event.target.closest("[data-edit-category]");if(editCategory){openCategoryEditor(editCategory.dataset.editCategory);return}
    const removeCategoryButton=event.target.closest("[data-remove-category]");if(removeCategoryButton){removeCategory(removeCategoryButton.dataset.removeCategory);return}
    const clear=event.target.closest("[data-admin-clear]");if(clear){clearAdminFilters(clear.dataset.adminClear);return}
    const edit=event.target.closest("[data-edit-product]");if(edit){editProduct(edit.dataset.editProduct);return}
    const duplicate=event.target.closest("[data-duplicate-product]");if(duplicate){duplicateProduct(duplicate.dataset.duplicateProduct);return}
    const cycle=event.target.closest("[data-cycle-product]");if(cycle){cycleProduct(cycle.dataset.cycleProduct);return}
    const del=event.target.closest("[data-delete-product]");if(del){deleteProduct(del.dataset.deleteProduct);return}
    const rs=event.target.closest("[data-reservation-status]");if(rs){const [id,status]=rs.dataset.reservationStatus.split("|");updateReservation(id,status);return}
    const rd=event.target.closest("[data-delete-reservation]");if(rd){deleteReservation(rd.dataset.deleteReservation)}
  });
  $("#menu-toggle")?.addEventListener("click",toggleMenu);
  $("#catalog-search")?.addEventListener("input",e=>{state.search=e.target.value;renderCatalog()});
  $("#reserve-button")?.addEventListener("click",startReservation);
  $("#reservation-back")?.addEventListener("click",()=>{if(state.selectedProduct)openProduct(state.selectedProduct.code);else showScreen("catalog")});
  $("#reservation-form")?.addEventListener("submit",submitReservation);
  $("#feedback-form")?.addEventListener("submit",submitFeedback);
  $("#adm-form")?.addEventListener("submit",adminLogin);
  $("#admin-logout")?.addEventListener("click",adminLogout);
  $("#admin-refresh-data")?.addEventListener("click",refreshAdminData);
  $("#admin-tool-refresh")?.addEventListener("click",refreshAdminData);
  $("#admin-add-product")?.addEventListener("click",()=>openProductForm());
  $("#admin-add-category")?.addEventListener("click",()=>openCategoryEditor());
  $("#admin-product-cancel")?.addEventListener("click",closeProductForm);
  $("#admin-product-cancel-x")?.addEventListener("click",closeProductForm);
  $("#admin-product-form")?.addEventListener("submit",saveProduct);
  $("#admin-category-form")?.addEventListener("submit",saveCategory);
  $("#admin-category-cancel")?.addEventListener("click",closeCategoryEditor);
  $("#admin-category-cancel-x")?.addEventListener("click",closeCategoryEditor);
  $("#admin-product-search")?.addEventListener("input",e=>{state.adminProductSearch=e.target.value;renderAdminProducts()});
  $("#admin-product-category-filter")?.addEventListener("change",e=>{state.adminProductCategory=e.target.value;renderAdminProducts()});
  $("#admin-product-status-filter")?.addEventListener("change",e=>{state.adminProductStatus=e.target.value;renderAdminProducts()});
  $("#admin-product-sort")?.addEventListener("change",e=>{state.adminProductSort=e.target.value;renderAdminProducts()});
  $("#admin-reservation-search")?.addEventListener("input",e=>{state.adminReservationSearch=e.target.value;renderReservations()});
  $("#admin-reservation-status-filter")?.addEventListener("change",e=>{state.adminReservationStatus=e.target.value;renderReservations()});
  $("#admin-review-rating-filter")?.addEventListener("change",e=>{state.adminReviewRating=e.target.value;renderReviews()});
  $("#admin-export-products")?.addEventListener("click",exportProducts);
  $("#admin-export-reservations")?.addEventListener("click",exportReservations);
  $("#admin-export-reviews")?.addEventListener("click",exportReviews);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeMenu();if(state.adminUnlocked){closeProductForm();closeCategoryEditor()}}});
  window.addEventListener("popstate",()=>routeToCurrentLocation());
}

async function init(){
  restoreRedirectPath();
  state.adminUnlocked=restoreAdminSession();
  bind();
  showScreen("home",{updateRoute:false});
  iconRefresh();
  await Promise.allSettled([loadProducts(),loadReservations(),loadReviews()]);
  routeToCurrentLocation({replaceInvalid:true});
  iconRefresh();
}
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => { void init(); }, { once: true });
} else {
  void init();
}