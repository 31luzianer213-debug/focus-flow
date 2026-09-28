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
  usingFallback: false
};

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
  if(["adult","adulto","vestuario adulto"].includes(v)) return "adult";
  if(["children","child","infantil","vestuario infantil"].includes(v)) return "children";
  if(["shoes","shoe","calcados","calcado","acessorios","acessorio","calcados e acessorios","accessories"].includes(v)) return "shoes";
  return v || "other";
}
function categoryLabel(value){
  return ({adult:"Vestuário adulto",children:"Vestuário infantil",shoes:"Calçados e acessórios"})[categoryKey(value)] || value || "Não informado";
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

function showScreen(id){
  if(id==="management" && !state.adminUnlocked) id="adm";
  const target=document.getElementById(id) || document.getElementById("home");
  $$(".screen").forEach(s=>s.classList.toggle("active",s===target));
  $$("[data-screen-link]").forEach(b=>b.classList.toggle("active",b.dataset.screenLink===target.id));
  closeMenu();
  window.scrollTo({top:0,behavior:"smooth"});
  if(target.id==="catalog") renderCatalog();
  if(target.id==="management"){renderAdminProducts();renderReservations();renderReviews();}
  iconRefresh();
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
    if(box) box.classList.add("hidden");
  }catch(error){
    console.warn(error);
    state.products=FALLBACK_PRODUCTS.map(normalizeProduct);
    state.usingFallback=true;
    if(box){box.textContent="A API está demorando para responder. Mostrando uma prévia do catálogo enquanto isso.";box.classList.remove("hidden");}
  }
  applyReservationStatuses();
  renderCatalog();
  renderAdminProducts();
}
async function loadReservations(){
  try{state.reservations=await api("/reservas");applyReservationStatuses();renderCatalog();renderReservations()}catch(error){console.warn(error);state.reservations=[]}
}
async function loadReviews(){
  try{state.reviews=await api("/avaliacoes");renderReviews()}catch(error){console.warn(error);state.reviews=[]}
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
function openProduct(code){
  const p=state.products.find(x=>x.code===code); if(!p) return;
  state.selectedProduct=p;
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
  showScreen("details");
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
  event.preventDefault();const button=$("#feedback-submit"),msg=$("#feedback-message");
  const payload={
    nota:Number($('input[name="rating"]:checked')?.value||0),
    facilidade:$("#ease").value,satisfacao:$("#satisfaction").value,
    participariaNovamente:$("#again").value,recomendaria:$("#recommend").value,
    sugestao:$("#suggestion").value.trim()
  };
  button.disabled=true;button.textContent="Enviando…";
  try{
    const created=await api("/avaliacoes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    state.reviews.unshift(created);event.currentTarget.reset();setMessage(msg,"Obrigado! Sua avaliação foi enviada.","success");renderReviews()
  }catch(error){setMessage(msg,error.message||"Não foi possível enviar sua avaliação.","error")}
  finally{button.disabled=false;button.textContent="Enviar avaliação"}
}

function adminLogin(event){
  event.preventDefault();const msg=$("#adm-message");
  if($("#adm-code").value.trim()!==ADM_CODE){setMessage(msg,"Código de acesso inválido.","error");return}
  state.adminUnlocked=true;$("#adm-code").value="";setMessage(msg,"");showScreen("management");toast("Área administrativa liberada")
}
function adminLogout(){state.adminUnlocked=false;showScreen("adm");toast("Sessão administrativa encerrada")}
function setAdminTab(tab){
  $$("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===tab));
  $$("[data-admin-section]").forEach(s=>s.classList.toggle("active",s.dataset.adminSection===tab));
}
function renderAdminProducts(){
  const list=$("#admin-product-list");if(!list) return;
  list.innerHTML=state.products.length?state.products.map(p=>`<article class="admin-card">
    <div><h4>${esc(p.name)} · ${esc(p.code)} <span class="status ${esc(p.status)}">${esc(statusLabel(p.status))}</span></h4>
    <p>${esc(categoryLabel(p.category))} · Tam. ${esc(p.size)} · ${esc(p.condition)}</p>
    <div class="admin-card-meta"><span>${esc(String(p.trade).replace(/^[^\wÀ-ÿ]+/,""))}</span></div></div>
    <div class="admin-actions">
      <button class="mini-btn" type="button" data-edit-product="${esc(p.code)}">Editar</button>
      <button class="mini-btn primary" type="button" data-cycle-product="${esc(p.code)}">Alterar status</button>
      <button class="mini-btn danger" type="button" data-delete-product="${esc(p.code)}">Excluir</button>
    </div>
  </article>`).join(""):`<div class="state-box">Nenhum produto cadastrado.</div>`;
}
function openProductForm(product=null){
  $("#admin-product-form").reset();
  $("#admin-product-id").value=product?.id||"";
  $("#admin-product-code").value=product?.code||"";
  $("#admin-product-name").value=product?.name||"";
  $("#admin-product-category").value=product?.category||"";
  $("#admin-product-size").value=product?.size||"";
  $("#admin-product-condition").value=product?.condition||"";
  $("#admin-product-status").value=product?.status||"available";
  $("#admin-product-trade").value=product?.trade||"";
  $("#admin-product-description").value=product?.description||"";
  $("#admin-product-form-wrap").classList.remove("hidden");
  $("#admin-product-form-wrap").scrollIntoView({behavior:"smooth",block:"start"});
}
function closeProductForm(){ $("#admin-product-form-wrap").classList.add("hidden");$("#admin-product-form").reset() }
async function saveProduct(event){
  event.preventDefault();const id=$("#admin-product-id").value,button=$("#admin-product-save"),msg=$("#management-message");
  const form=new FormData();
  form.set("codigo",$("#admin-product-code").value.trim());
  form.set("nome",$("#admin-product-name").value.trim());
  form.set("categoria",$("#admin-product-category").value);
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
    await api(`/produtos/${p.id}`,{method:"PUT",body:form});await loadProducts();toast("Status atualizado")
  }catch(error){toast(error.message)}
}
function editProduct(code){const p=state.products.find(x=>x.code===code);if(!p?.id)return toast("Este item de prévia não pode ser editado.");openProductForm(p)}

function reservationStatusClass(status){return status==="Vendido"?"exchanged":["Pendente","Em análise","Confirmada"].includes(status)?"reserved":"available"}
function renderReservations(){
  const list=$("#reservation-list");if(!list)return;
  list.innerHTML=state.reservations.length?state.reservations.map(r=>`<article class="admin-card">
    <div><h4>${esc(r.nomeCompleto||"Cliente")} · ${esc(r.nomeProduto||r.codigoProduto||"Produto")} <span class="status ${reservationStatusClass(r.status)}">${esc(r.status||"Pendente")}</span></h4>
    <p>${esc(r.contato||"Sem contato")} · Doação: ${esc(r.itemDoacao||"—")} · Qtde. ${esc(r.quantidade||1)}</p>
    ${r.observacoesEquipe?`<div class="admin-card-meta"><span>${esc(r.observacoesEquipe)}</span></div>`:""}</div>
    <div class="admin-actions">
      <button class="mini-btn" type="button" data-reservation-status="${esc(r._id)}|Em análise">Em análise</button>
      <button class="mini-btn primary" type="button" data-reservation-status="${esc(r._id)}|Confirmada">Confirmar</button>
      <button class="mini-btn" type="button" data-reservation-status="${esc(r._id)}|Vendido">Concluir</button>
      <button class="mini-btn danger" type="button" data-delete-reservation="${esc(r._id)}">Excluir</button>
    </div>
  </article>`).join(""):`<div class="state-box">Nenhuma reserva recebida.</div>`;
}
async function updateReservation(id,status){
  const notes=status==="Em análise"?"Reserva recebida e aguardando análise da equipe.":status==="Confirmada"?"Reserva aprovada pela equipe.":status==="Vendido"?"Troca concluída.":"";
  try{
    const updated=await api(`/reservas/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,observacoesEquipe:notes})});
    const i=state.reservations.findIndex(r=>r._id===id);if(i>=0)state.reservations[i]=updated;
    applyReservationStatuses();renderReservations();renderCatalog();toast("Reserva atualizada")
  }catch(error){toast(error.message)}
}
async function deleteReservation(id){
  if(!confirm("Excluir esta reserva?")) return;
  try{await api(`/reservas/${id}`,{method:"DELETE"});state.reservations=state.reservations.filter(r=>r._id!==id);renderReservations();toast("Reserva excluída")}catch(error){toast(error.message)}
}
function renderReviews(){
  const list=$("#feedback-list");if(!list)return;
  list.innerHTML=state.reviews.length?state.reviews.map(r=>{
    const stars="★".repeat(Math.max(0,Math.min(5,Number(r.nota)||0)))+"☆".repeat(Math.max(0,5-(Number(r.nota)||0)));
    return `<article class="admin-card"><div><h4>${stars}</h4><p>Facilidade: ${esc(r.facilidade||"—")} · Satisfação: ${esc(r.satisfacao||"—")} · Participaria novamente: ${esc(r.participariaNovamente||"—")}</p>${r.sugestao?`<div class="admin-card-meta"><span>${esc(r.sugestao)}</span></div>`:""}</div></article>`
  }).join(""):`<div class="state-box">Nenhuma avaliação recebida.</div>`;
}

function bind(){
  document.addEventListener("click",event=>{
    const screenLink=event.target.closest("[data-screen-link]");if(screenLink){showScreen(screenLink.dataset.screenLink);return}
    const open=event.target.closest("[data-open-product]");if(open){openProduct(open.dataset.openProduct);return}
    const filter=event.target.closest("[data-category]");if(filter){state.category=filter.dataset.category;$$("[data-category]").forEach(b=>b.classList.toggle("active",b===filter));renderCatalog();return}
    const tab=event.target.closest("[data-admin-tab]");if(tab){setAdminTab(tab.dataset.adminTab);return}
    const edit=event.target.closest("[data-edit-product]");if(edit){editProduct(edit.dataset.editProduct);return}
    const cycle=event.target.closest("[data-cycle-product]");if(cycle){cycleProduct(cycle.dataset.cycleProduct);return}
    const del=event.target.closest("[data-delete-product]");if(del){deleteProduct(del.dataset.deleteProduct);return}
    const rs=event.target.closest("[data-reservation-status]");if(rs){const [id,status]=rs.dataset.reservationStatus.split("|");updateReservation(id,status);return}
    const rd=event.target.closest("[data-delete-reservation]");if(rd){deleteReservation(rd.dataset.deleteReservation)}
  });
  $("#menu-toggle")?.addEventListener("click",toggleMenu);
  $("#catalog-search")?.addEventListener("input",e=>{state.search=e.target.value;renderCatalog()});
  $("#reserve-button")?.addEventListener("click",startReservation);
  $("#reservation-back")?.addEventListener("click",()=>showScreen("details"));
  $("#reservation-form")?.addEventListener("submit",submitReservation);
  $("#feedback-form")?.addEventListener("submit",submitFeedback);
  $("#adm-form")?.addEventListener("submit",adminLogin);
  $("#admin-logout")?.addEventListener("click",adminLogout);
  $("#admin-add-product")?.addEventListener("click",()=>openProductForm());
  $("#admin-product-cancel")?.addEventListener("click",closeProductForm);
  $("#admin-product-form")?.addEventListener("submit",saveProduct);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
}

async function init(){
  bind();showScreen("home");iconRefresh();
  await Promise.allSettled([loadProducts(),loadReservations(),loadReviews()]);
  iconRefresh();
}
window.addEventListener("DOMContentLoaded",init);