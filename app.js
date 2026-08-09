const $=id=>document.getElementById(id);
const state={lines:JSON.parse(localStorage.getItem("presupuesto_lines")||"[]"),discount:Number(localStorage.getItem("presupuesto_discount") ?? 0)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n||0);
const num=v=>Number(String(v||"").trim().replace(/\./g,"").replace(",","."))||0;
const price=i=>(i?.precioSinIVA||0)*0.60;
const unique=a=>[...new Set(a.filter(v=>v!==undefined&&v!==null&&String(v)!=="").map(String))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
const option=(value,text=value)=>`<option value="${esc(value)}">${esc(text)}</option>`;
const exact=(list,value)=>list.find(x=>x.descripcion===value)||null;

function mechanismGroups(){return unique(PRODUCTOS.mecanismos.map(x=>x.grupo))}
function mechanismTypes(){return unique(PRODUCTOS.mecanismos.filter(x=>x.grupo===grupoMecanismo.value).map(x=>x.tipo))}
function mechanismSubtypes(){return unique(PRODUCTOS.mecanismos.filter(x=>x.grupo===grupoMecanismo.value&&x.tipo===tipoMecanismo.value).map(x=>x.subtipo))}
function mechanismItems(){return PRODUCTOS.mecanismos.filter(x=>x.grupo===grupoMecanismo.value&&x.tipo===tipoMecanismo.value&&x.subtipo===subtipoMecanismo.value)}
function fabricTypes(){return unique(PRODUCTOS.telas.filter(x=>x.grupo===grupoMecanismo.value).map(x=>x.subtipo))}
function fabricItems(){return PRODUCTOS.telas.filter(x=>x.grupo===grupoMecanismo.value&&x.subtipo===subtipoTela.value)}

function init(){
  grupoMecanismo.innerHTML=option("","Elegir grupo")+mechanismGroups().map(x=>option(x)).join("");
  discountPercent.value=state.discount;
  resetMechanismHierarchy();
  loadFabricTypes();
}

function resetMechanismHierarchy(){
  tipoMecanismo.value="";
  subtipoMecanismo.value="";
  mecanismo.value="";
  mecanismoPickerText.textContent="Elegir mecanismo";
  tipoMecanismo.disabled=true;
  subtipoMecanismo.disabled=true;
  mecanismoPicker.disabled=true;
  tipoMecanismo.innerHTML=option("","Primero elegí un grupo");
  subtipoMecanismo.innerHTML=option("","Primero elegí un tipo");
}

function loadMechanismTypes(){
  tipoMecanismo.value="";
  subtipoMecanismo.value="";
  mecanismo.value="";
  mecanismoPickerText.textContent="Elegir mecanismo";
  const group=grupoMecanismo.value;
  const types=mechanismTypes();
  tipoMecanismo.disabled=!group;
  tipoMecanismo.innerHTML=group?option("","Elegir tipo")+types.map(x=>option(x)).join(""):option("","Primero elegí un grupo");
  subtipoMecanismo.disabled=true;
  subtipoMecanismo.innerHTML=option("","Primero elegí un tipo");
  mecanismoPicker.disabled=true;
}

function loadMechanismSubtypes(){
  subtipoMecanismo.value="";
  mecanismo.value="";
  mecanismoPickerText.textContent="Elegir mecanismo";
  const type=tipoMecanismo.value;
  const subs=mechanismSubtypes();
  subtipoMecanismo.disabled=!type;
  subtipoMecanismo.innerHTML=type?option("","Elegir subtipo")+subs.map(x=>option(x)).join(""):option("","Primero elegí un tipo");
  mecanismoPicker.disabled=true;
}

function enableMechanismPicker(){
  mecanismo.value="";
  mecanismoPickerText.textContent="Elegir mecanismo";
  mecanismoPicker.disabled=!subtipoMecanismo.value;
  calculate();
}

function loadFabricTypes(){
  subtipoTela.value="";
  tela.value="";
  telaPickerText.textContent="Elegir tela";
  const group=grupoMecanismo.value;
  const types=fabricTypes();
  subtipoTela.disabled=!group||types.length===0;
  subtipoTela.innerHTML=types.length?option("","Elegir tipo de tela")+types.map(x=>option(x)).join(""):option("",group?"Sin telas para este grupo":"Primero elegí un grupo");
  telaPicker.disabled=true;
}

function enableFabricPicker(){
  tela.value="";
  telaPickerText.textContent="Elegir tela";
  telaPicker.disabled=!subtipoTela.value;
  calculate();
}

function normalizeText(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}

let activePicker=null;
let activeItems=[];

function renderPickerList(){
  const q=normalizeText(pickerSearch.value);
  const filtered=q?activeItems.filter(item=>normalizeText(item.descripcion).includes(q)):activeItems;
  pickerResults.innerHTML=filtered.length
    ? filtered.map(item=>`<button type="button" class="picker-option" data-value="${esc(item.descripcion)}">${esc(item.descripcion)}</button>`).join("")
    : '<div class="picker-empty">No se encontraron resultados.</div>';

  pickerResults.querySelectorAll(".picker-option").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const value=btn.dataset.value;
      if(activePicker==="mecanismo"){mecanismo.value=value;mecanismoPickerText.textContent=value;}
      if(activePicker==="tela"){tela.value=value;telaPickerText.textContent=value;}
      if(activePicker==="accesorio"){accesorio.value=value;accesorioPickerText.textContent=value||"Sin accesorio";}
      closePicker();calculate();
    });
  });
}
function openPicker(type,title,items){
  activePicker=type;activeItems=items;pickerTitle.textContent=title;pickerSearch.value="";
  pickerModal.hidden=false;document.body.classList.add("modal-open");renderPickerList();
  setTimeout(()=>pickerSearch.focus(),80);
}
function closePicker(){pickerModal.hidden=true;document.body.classList.remove("modal-open");activePicker=null;activeItems=[];}

function itemCost(item,w,h,q,extraQty=1){
  if(!item)return 0;
  const p=price(item);
  const unit=(item.unidad||"").toLowerCase();
  if(unit==="ml") return w*p*q*extraQty;
  if(unit==="m2") return w*h*p*q*extraQty;
  return p*q*extraQty;
}

function calculate(){
  const m=exact(mechanismItems(),mecanismo.value);
  const t=exact(fabricItems(),tela.value);
  const a=exact(PRODUCTOS.accesorios,accesorio.value);
  const w=num(ancho.value),h=num(largo.value),q=Math.max(1,+cantidad.value||1),aq=Math.max(1,+cantidadAccesorio.value||1);

  const mt=itemCost(m,w,h,q,1);
  const tt=itemCost(t,w,h,q,1);
  const at=itemCost(a,w,h,q,aq);
  const subtotal=mt+tt+at;
  const pct=Math.min(100,Math.max(0,Number(state.discount)||0));
  const discount=subtotal*pct/100;
  const total=subtotal-discount;

  mecanismoTotal.textContent=money(mt);telaTotal.textContent=money(tt);accesorioTotal.textContent=money(at);
  lineSubtotal.textContent=money(subtotal);
  lineDiscountLabel.textContent=`Descuento adicional (${pct}%)`;
  lineDiscount.textContent="-"+money(discount);
  lineTotal.textContent=money(total);
  return{m,t,a,w,h,q,aq,subtotal,discount,total};
}

function save(){
  localStorage.setItem("presupuesto_lines",JSON.stringify(state.lines));
  localStorage.setItem("presupuesto_discount",String(state.discount));
}

function render(){
  budgetLines.innerHTML=state.lines.length?state.lines.map((x,i)=>{
    const pct=Number(x.discountPct||0);
    const discountAmount=(x.subtotal||0)*pct/100;
    return `<article class="line">
      <div class="line-head"><span>Cortina ${i+1}</span><span>${money(x.total)}</span></div>
      <div class="line-detail">
        ${x.q} × ${x.w.toFixed(2).replace(".",",")} m × ${x.h.toFixed(2).replace(".",",")} m<br>
        ${esc(x.grupo)} → ${esc(x.tipoM)} → ${esc(x.subtipoM)}<br>
        ${esc(x.m)}<br>
        ${esc(x.subtipoTela)} → ${esc(x.t)}
        ${x.a?`<br>Accesorio: ${x.aq} × ${esc(x.a)}`:""}
      </div>
      <div class="actions">
        <button class="edit" onclick="editLine(${x.id})">Editar</button>
        <button class="delete" onclick="removeLine(${x.id})">Eliminar</button>
      </div>
      <div class="line-discount-row"><span>Descuento adicional (${pct}%)</span><b>-${money(discountAmount)}</b></div>
    </article>`;
  }).join(""):'<p class="empty">Todavía no agregaste ninguna cortina.</p>';

  grandTotal.textContent=money(state.lines.reduce((s,x)=>s+x.total,0));
  itemCount.textContent=`${state.lines.length} ${state.lines.length===1?"cortina":"cortinas"}`;
}

function clearEntry(resetAll=false){
  if(resetAll){
    grupoMecanismo.value="";
    resetMechanismHierarchy();
    loadFabricTypes();
  }else{
    mecanismo.value="";mecanismoPickerText.textContent="Elegir mecanismo";
  }
  tela.value="";telaPickerText.textContent="Elegir tela";
  ancho.value="";largo.value="";cantidad.value=1;
  accesorio.value="";accesorioPickerText.textContent="Sin accesorio";cantidadAccesorio.value=1;
  calculate();
}

function addLine(){
  const c=calculate();
  if(!grupoMecanismo.value)return alert("Elegí el grupo.");
  if(!tipoMecanismo.value)return alert("Elegí el tipo.");
  if(!subtipoMecanismo.value)return alert("Elegí el subtipo.");
  if(!c.m)return alert("Elegí el mecanismo o artículo.");
  if(!subtipoTela.value)return alert("Elegí el tipo de tela.");
  if(!c.t)return alert("Elegí una tela.");
  if(c.w<=0||c.h<=0)return alert("Ingresá ancho y largo.");

  state.lines.push({
    id:Date.now(),grupo:grupoMecanismo.value,tipoM:tipoMecanismo.value,subtipoM:subtipoMecanismo.value,m:c.m.descripcion,
    subtipoTela:subtipoTela.value,t:c.t.descripcion,a:c.a?.descripcion||"",
    w:c.w,h:c.h,q:c.q,aq:c.a?c.aq:0,subtotal:c.subtotal,discountPct:state.discount,total:c.total
  });
  save();render();clearEntry(false);addBtn.textContent="Agregar cortina";
}

function removeLine(id){state.lines=state.lines.filter(x=>x.id!==id);save();render()}

function editLine(id){
  const x=state.lines.find(v=>v.id===id);if(!x)return;
  grupoMecanismo.value=x.grupo;loadMechanismTypes();
  tipoMecanismo.value=x.tipoM;loadMechanismSubtypes();
  subtipoMecanismo.value=x.subtipoM;enableMechanismPicker();
  mecanismo.value=x.m;mecanismoPickerText.textContent=x.m;

  loadFabricTypes();subtipoTela.value=x.subtipoTela;enableFabricPicker();
  tela.value=x.t;telaPickerText.textContent=x.t;

  ancho.value=String(x.w).replace(".",",");largo.value=String(x.h).replace(".",",");cantidad.value=x.q;
  accesorio.value=x.a||"";accesorioPickerText.textContent=x.a||"Sin accesorio";cantidadAccesorio.value=x.aq||1;
  state.discount=Number(x.discountPct||0);discountPercent.value=state.discount;

  state.lines=state.lines.filter(v=>v.id!==id);save();render();calculate();
  addBtn.textContent="Guardar cambios";window.scrollTo({top:0,behavior:"smooth"});
}

function copyLast(){
  const x=state.lines.at(-1);if(!x)return alert("Todavía no hay una cortina para copiar.");
  grupoMecanismo.value=x.grupo;loadMechanismTypes();
  tipoMecanismo.value=x.tipoM;loadMechanismSubtypes();
  subtipoMecanismo.value=x.subtipoM;enableMechanismPicker();
  mecanismo.value=x.m;mecanismoPickerText.textContent=x.m;
  loadFabricTypes();subtipoTela.value=x.subtipoTela;enableFabricPicker();tela.value=x.t;telaPickerText.textContent=x.t;
  ancho.value=String(x.w).replace(".",",");largo.value=String(x.h).replace(".",",");cantidad.value=x.q;
  accesorio.value=x.a||"";accesorioPickerText.textContent=x.a||"Sin accesorio";cantidadAccesorio.value=x.aq||1;
  state.discount=Number(x.discountPct||0);discountPercent.value=state.discount;calculate();window.scrollTo({top:0,behavior:"smooth"});
}

function newBudget(){
  if(!state.lines.length||confirm("¿Empezar un presupuesto nuevo?")){
    state.lines=[];state.discount=0;discountPercent.value=0;save();render();clearEntry(true);addBtn.textContent="Agregar cortina";
  }
}

function sendWhatsApp(){
  if(!state.lines.length)return alert("Agregá al menos una cortina.");
  const total=state.lines.reduce((s,x)=>s+x.total,0);
  const msg=["PRESUPUESTO DE CORTINAS","",...state.lines.flatMap((x,i)=>{
    const pct=Number(x.discountPct||0),d=(x.subtotal||0)*pct/100;
    return [`Cortina ${i+1}`,`${x.q} × ${x.w.toFixed(2).replace(".",",")} m × ${x.h.toFixed(2).replace(".",",")} m`,
      `${x.grupo} / ${x.tipoM} / ${x.subtipoM}`,x.m,`${x.subtipoTela}: ${x.t}`,
      x.a?`Accesorio: ${x.aq} × ${x.a}`:"",`Descuento adicional (${pct}%): -${money(d)}`,money(x.total),""];
  }).filter(Boolean),`TOTAL: ${money(total)}`].join("\\n");
  open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
}

grupoMecanismo.addEventListener("change",()=>{loadMechanismTypes();loadFabricTypes();calculate();});
tipoMecanismo.addEventListener("change",()=>{loadMechanismSubtypes();calculate();});
subtipoMecanismo.addEventListener("change",enableMechanismPicker);
subtipoTela.addEventListener("change",enableFabricPicker);
["ancho","largo","cantidad","cantidadAccesorio"].forEach(id=>$(id).addEventListener("input",calculate));
discountPercent.addEventListener("input",()=>{state.discount=Math.min(100,Math.max(0,Number(discountPercent.value)||0));save();calculate();});

mecanismoPicker.addEventListener("click",()=>openPicker("mecanismo","Elegir mecanismo",mechanismItems()));
telaPicker.addEventListener("click",()=>openPicker("tela","Elegir tela",fabricItems()));
accesorioPicker.addEventListener("click",()=>openPicker("accesorio","Elegir accesorio",PRODUCTOS.accesorios));
pickerSearch.addEventListener("input",renderPickerList);pickerClose.addEventListener("click",closePicker);
pickerModal.querySelector(".picker-backdrop").addEventListener("click",closePicker);

addBtn.onclick=addLine;copyLastBtn.onclick=copyLast;whatsappBtn.onclick=sendWhatsApp;newBudgetBtn.onclick=newBudget;
init();render();calculate();
if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
