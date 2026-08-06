const $=id=>document.getElementById(id);
const state={lines:JSON.parse(localStorage.getItem("presupuesto_lines")||"[]"),priceMode:localStorage.getItem("presupuesto_price_mode")||"conIVA",discount:Number(localStorage.getItem("presupuesto_discount")||0)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n||0);
const num=v=>Number(String(v||"").trim().replace(/\./g,"").replace(",","."))||0;
const price=i=>state.priceMode==="conIVA"?i?.precioConIVA||0:i?.precioSinIVA||0;
const unique=a=>[...new Set(a.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
const option=(value,text=value)=>`<option value="${esc(value)}">${esc(text)}</option>`;

function init(){
  grupoMecanismo.innerHTML=option("","Elegir grupo")+unique(PRODUCTOS.mecanismos.map(x=>x.grupo)).map(x=>option(x)).join("");
  subtipoTela.innerHTML=option("","Elegir tipo de tela")+unique(PRODUCTOS.telas.map(x=>x.subtipo)).map(x=>option(x)).join("");
  accesorio.innerHTML=option("","Sin accesorio")+PRODUCTOS.accesorios.map(x=>option(x.descripcion)).join("");
  discountPercent.value=state.discount;
}

function selected(list,description){return list.find(x=>x.descripcion===description)||null}

function loadMechanisms(){
  const group=grupoMecanismo.value;
  const items=PRODUCTOS.mecanismos.filter(x=>x.grupo===group);
  mecanismo.disabled=!group;
  mecanismo.innerHTML=group?option("","Elegir mecanismo")+items.map(x=>option(x.descripcion)).join(""):option("","Primero elegí un grupo");
  calculate();
}

function loadFabrics(){
  const subtype=subtipoTela.value;
  const items=PRODUCTOS.telas.filter(x=>x.subtipo===subtype);
  tela.disabled=!subtype;
  tela.innerHTML=subtype?option("","Elegir tela")+items.map(x=>option(x.descripcion)).join(""):option("","Primero elegí un tipo de tela");
  calculate();
}

function calculate(){
  const m=selected(PRODUCTOS.mecanismos,mecanismo.value);
  const t=selected(PRODUCTOS.telas,tela.value);
  const a=selected(PRODUCTOS.accesorios,accesorio.value);
  const w=num(ancho.value),h=num(largo.value),q=Math.max(1,+cantidad.value||1),aq=Math.max(1,+cantidadAccesorio.value||1);
  const mt=m?w*price(m)*q:0;
  const tt=t?w*h*price(t)*q:0;
  const at=a?(a.unidad==="ML"?w*price(a)*aq*q:price(a)*aq*q):0;
  const total=mt+tt+at;
  mecanismoTotal.textContent=money(mt);
  telaTotal.textContent=money(tt);
  accesorioTotal.textContent=money(at);
  lineTotal.textContent=money(total);
  return{m,t,a,w,h,q,aq,total};
}

function save(){
  localStorage.setItem("presupuesto_lines",JSON.stringify(state.lines));
  localStorage.setItem("presupuesto_price_mode",state.priceMode);
  localStorage.setItem("presupuesto_discount",String(state.discount));
}

function render(){
  budgetLines.innerHTML=state.lines.length?state.lines.map((x,i)=>`<article class="line"><div class="line-head"><span>Cortina ${i+1}</span><span>${money(x.total)}</span></div><div class="line-detail">${x.q} × ${x.w.toFixed(2).replace(".",",")} m × ${x.h.toFixed(2).replace(".",",")} m<br>${esc(x.grupo)} → ${esc(x.m)}<br>${esc(x.subtipo)} → ${esc(x.t)}${x.a?`<br>Accesorio: ${x.aq} × ${esc(x.a)}`:""}</div><div class="actions"><button class="edit" onclick="editLine(${x.id})">Editar</button><button class="delete" onclick="removeLine(${x.id})">Eliminar</button></div></article>`).join(""):'<p class="empty">Todavía no agregaste ninguna cortina.</p>';

  const subtotal=state.lines.reduce((s,x)=>s+x.total,0);
  const pct=Math.min(100,Math.max(0,Number(state.discount)||0));
  const discount=subtotal*pct/100;
  subtotalGeneral.textContent=money(subtotal);
  discountAmount.textContent="-"+money(discount);
  grandTotal.textContent=money(subtotal-discount);
  itemCount.textContent=`${state.lines.length} ${state.lines.length===1?"cortina":"cortinas"}`;
  const iva=state.priceMode==="conIVA";
  priceModeText.textContent=iva?"Precios con IVA":"Precios sin IVA";
  withVatBtn.classList.toggle("active",iva);
  withoutVatBtn.classList.toggle("active",!iva);
}

function clearEntry(resetSelectors=false){
  if(resetSelectors){
    grupoMecanismo.value="";
    subtipoTela.value="";
    loadMechanisms();
    loadFabrics();
  }
  ancho.value="";
  largo.value="";
  cantidad.value=1;
  accesorio.value="";
  cantidadAccesorio.value=1;
  calculate();
}

function addLine(){
  const c=calculate();
  if(!grupoMecanismo.value)return alert("Elegí el grupo del mecanismo.");
  if(!c.m)return alert("Elegí un mecanismo.");
  if(!subtipoTela.value)return alert("Elegí el tipo de tela.");
  if(!c.t)return alert("Elegí una tela.");
  if(c.w<=0||c.h<=0)return alert("Ingresá ancho y largo.");

  state.lines.push({
    id:Date.now(),
    grupo:grupoMecanismo.value,
    m:c.m.descripcion,
    subtipo:subtipoTela.value,
    t:c.t.descripcion,
    a:c.a?.descripcion||"",
    w:c.w,h:c.h,q:c.q,aq:c.a?c.aq:0,total:c.total
  });
  save();render();clearEntry(false);ancho.focus();
}

function removeLine(id){state.lines=state.lines.filter(x=>x.id!==id);save();render()}

function editLine(id){
  const x=state.lines.find(y=>y.id===id);if(!x)return;
  grupoMecanismo.value=x.grupo;loadMechanisms();mecanismo.value=x.m;
  subtipoTela.value=x.subtipo;loadFabrics();tela.value=x.t;
  ancho.value=String(x.w).replace(".",",");largo.value=String(x.h).replace(".",",");cantidad.value=x.q;
  accesorio.value=x.a;cantidadAccesorio.value=x.aq||1;
  removeLine(id);calculate();scrollTo({top:0,behavior:"smooth"});
}

function copyLast(){
  const x=state.lines.at(-1);if(!x)return alert("Todavía no hay una cortina para copiar.");
  grupoMecanismo.value=x.grupo;loadMechanisms();mecanismo.value=x.m;
  subtipoTela.value=x.subtipo;loadFabrics();tela.value=x.t;
  ancho.value=String(x.w).replace(".",",");largo.value=String(x.h).replace(".",",");cantidad.value=x.q;
  accesorio.value=x.a;cantidadAccesorio.value=x.aq||1;
  calculate();scrollTo({top:0,behavior:"smooth"});
}

function newBudget(){
  if(!state.lines.length||confirm("¿Empezar un presupuesto nuevo?")){
    state.lines=[];state.discount=0;discountPercent.value=0;save();render();clearEntry(true);
  }
}

function changeMode(mode){
  if(state.lines.length&&!confirm("Al cambiar el tipo de precio se vaciará el presupuesto. ¿Continuar?"))return;
  state.priceMode=mode;state.lines=[];save();render();calculate();
}

function sendWhatsApp(){
  if(!state.lines.length)return alert("Agregá al menos una cortina.");
  const subtotal=state.lines.reduce((s,x)=>s+x.total,0);
  const pct=Math.min(100,Math.max(0,Number(state.discount)||0));
  const discount=subtotal*pct/100;
  const total=subtotal-discount;
  const discountLines=pct>0?[`Subtotal: ${money(subtotal)}`,`Descuento ${pct}%: -${money(discount)}`]:[];
  const msg=["PRESUPUESTO DE CORTINAS","",...state.lines.flatMap((x,i)=>[
    `Cortina ${i+1}`,
    `${x.q} × ${x.w.toFixed(2).replace(".",",")} m × ${x.h.toFixed(2).replace(".",",")} m`,
    `${x.grupo}: ${x.m}`,
    `${x.subtipo}: ${x.t}`,
    x.a?`Accesorio: ${x.aq} × ${x.a}`:"",
    money(x.total),""
  ]).filter(Boolean),...discountLines,`TOTAL: ${money(total)}`,state.priceMode==="conIVA"?"Precios con IVA":"Precios sin IVA"].join("\\n");
  open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
}

grupoMecanismo.addEventListener("change",loadMechanisms);
subtipoTela.addEventListener("change",loadFabrics);
["mecanismo","tela","ancho","largo","cantidad","accesorio","cantidadAccesorio"].forEach(id=>$(id).addEventListener("input",calculate));
discountPercent.addEventListener("input",()=>{state.discount=Math.min(100,Math.max(0,Number(discountPercent.value)||0));save();render()});
addBtn.onclick=addLine;
copyLastBtn.onclick=copyLast;
whatsappBtn.onclick=sendWhatsApp;
newBudgetBtn.onclick=newBudget;
withVatBtn.onclick=()=>changeMode("conIVA");
withoutVatBtn.onclick=()=>changeMode("sinIVA");

init();render();calculate();
if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});