const $=id=>document.getElementById(id);
const state={lines:JSON.parse(localStorage.getItem("presupuesto_lines")||"[]"),discount:Number(localStorage.getItem("presupuesto_discount") ?? 0)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n||0);
const num=v=>Number(String(v||"").trim().replace(/\./g,"").replace(",","."))||0;
const price=i=>(i?.precioSinIVA||0)*0.60;
const unique=a=>[...new Set(a.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
const option=(value,text=value)=>`<option value="${esc(value)}">${esc(text)}</option>`;
const exact=(list,value)=>list.find(x=>x.descripcion===value)||null;

function init(){
  discountPercent.value=state.discount;
  grupoMecanismo.innerHTML=option("","Elegir grupo")+unique(PRODUCTOS.mecanismos.map(x=>x.grupo)).map(x=>option(x)).join("");
  subtipoTela.innerHTML=option("","Primero elegí un grupo");
  subtipoTela.disabled=true;
}

function mechanismItems(){return PRODUCTOS.mecanismos.filter(x=>x.grupo===grupoMecanismo.value)}
function fabricItems(){return PRODUCTOS.telas.filter(x=>x.grupo===grupoMecanismo.value&&x.subtipo===subtipoTela.value)}
function loadFabricTypes(){
  subtipoTela.value="";
  tela.value="";
  const group=grupoMecanismo.value;
  const types=unique(PRODUCTOS.telas.filter(x=>x.grupo===group).map(x=>x.subtipo));
  subtipoTela.disabled=!group;
  subtipoTela.innerHTML=group?option("","Elegir tipo de tela")+types.map(x=>option(x)).join(""):option("","Primero elegí un grupo");
  tela.disabled=true;
  telasResults.hidden=true;
  telasResults.innerHTML="";
}

function loadMechanisms(){
  mecanismo.value="";
  mecanismoPickerText.textContent="Elegir mecanismo";
  const enabled=!!grupoMecanismo.value;
  mecanismoPicker.disabled=!enabled;
  calculate();
}

function loadFabrics(){
  tela.value="";
  telaPickerText.textContent="Elegir tela";
  const enabled=!!subtipoTela.value;
  telaPicker.disabled=!enabled;
  calculate();
}





function normalizeText(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}

let activePicker=null;
let activeItems=[];

function renderPickerList(){
  const q=normalizeText(pickerSearch.value);
  const filtered=q
    ? activeItems.filter(item=>normalizeText(item.descripcion).includes(q))
    : activeItems;

  pickerResults.innerHTML=filtered.length
    ? filtered.map(item=>`<button type="button" class="picker-option" data-value="${esc(item.descripcion)}">${esc(item.descripcion)}</button>`).join("")
    : '<div class="picker-empty">No se encontraron resultados.</div>';

  pickerResults.querySelectorAll(".picker-option").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const value=btn.dataset.value;
      if(activePicker==="mecanismo"){
        mecanismo.value=value;
        mecanismoPickerText.textContent=value;
      }else if(activePicker==="tela"){
        tela.value=value;
        telaPickerText.textContent=value;
      }else if(activePicker==="accesorio"){
        accesorio.value=value;
        accesorioPickerText.textContent=value||"Sin accesorio";
      }
      closePicker();
      calculate();
    });
  });
}

function openPicker(type,title,items){
  activePicker=type;
  activeItems=items;
  pickerTitle.textContent=title;
  pickerSearch.value="";
  pickerModal.hidden=false;
  document.body.classList.add("modal-open");
  renderPickerList();
  setTimeout(()=>pickerSearch.focus(),80);
}

function closePicker(){
  pickerModal.hidden=true;
  document.body.classList.remove("modal-open");
  activePicker=null;
  activeItems=[];
}

function calculate(){
  const m=exact(mechanismItems(),mecanismo.value);
  const t=exact(fabricItems(),tela.value);
  const a=exact(PRODUCTOS.accesorios,accesorio.value);
  const w=num(ancho.value),h=num(largo.value),q=Math.max(1,+cantidad.value||1),aq=Math.max(1,+cantidadAccesorio.value||1);

  const mt=m?w*price(m)*q:0;
  const tt=t?w*h*price(t)*q:0;
  const at=a?(a.unidad==="ML"?w*price(a)*aq*q:price(a)*aq*q):0;
  const subtotal=mt+tt+at;

  const pct=Math.min(100,Math.max(0,Number(state.discount)||0));
  const discount=subtotal*pct/100;
  const total=subtotal-discount;

  mecanismoTotal.textContent=money(mt);
  telaTotal.textContent=money(tt);
  accesorioTotal.textContent=money(at);
  if($("lineSubtotal")) $("lineSubtotal").textContent=money(subtotal);
  if($("lineDiscount")) $("lineDiscount").textContent="-"+money(discount);
  lineTotal.textContent=money(total);

  return{m,t,a,w,h,q,aq,subtotal,discount,total};
}

function save(){
  localStorage.setItem("presupuesto_lines",JSON.stringify(state.lines));
  localStorage.setItem("presupuesto_discount",String(state.discount));
}

function render(){
  budgetLines.innerHTML=state.lines.length?state.lines.map((x,i)=>`<article class="line"><div class="line-head"><span>Cortina ${i+1}</span><span>${money(x.total)}</span></div><div class="line-detail">${x.q} × ${x.w.toFixed(2).replace(".",",")} m × ${x.h.toFixed(2).replace(".",",")} m<br>${esc(x.grupo)} → ${esc(x.m)}<br>${esc(x.subtipo)} → ${esc(x.t)}${x.a?`<br>Accesorio: ${x.aq} × ${esc(x.a)}`:""}${x.discountPct?`<br>Descuento adicional: ${x.discountPct}%`:""}</div><div class="actions"><button class="edit" onclick="editLine(${x.id})">Editar</button><button class="delete" onclick="removeLine(${x.id})">Eliminar</button></div></article>`).join(""):'<p class="empty">Todavía no agregaste ninguna cortina.</p>';

  const total=state.lines.reduce((s,x)=>s+x.total,0);
  grandTotal.textContent=money(total);
  itemCount.textContent=`${state.lines.length} ${state.lines.length===1?"cortina":"cortinas"}`;
  if($("discountPercent")) $("discountPercent").value=state.discount;
}

function clearEntry(resetSelectors=false){
  if(resetSelectors){
    grupoMecanismo.value="";
    loadMechanisms();
    loadFabricTypes();
    loadFabrics();
  }
  ancho.value="";
  largo.value="";
  cantidad.value=1;
  accesorio.value="";accesorioPickerText.textContent="Sin accesorio";
  cantidadAccesorio.value=1;
  calculate();
}

function addLine(){
  const c=calculate();
  if(!grupoMecanismo.value)return alert("Elegí el grupo del mecanismo.");
  if(!c.m)return alert("Elegí un mecanismo de los resultados.");
  if(!subtipoTela.value)return alert("Elegí el tipo de tela.");
  if(!c.t)return alert("Elegí una tela de los resultados.");
  if(c.w<=0||c.h<=0)return alert("Ingresá ancho y largo.");

  state.lines.push({
    id:Date.now(),
    grupo:grupoMecanismo.value,
    m:c.m.descripcion,
    subtipo:subtipoTela.value,
    t:c.t.descripcion,
    a:c.a?.descripcion||"",
    w:c.w,h:c.h,q:c.q,aq:c.a?c.aq:0,discountPct:state.discount,total:c.total
  });
  save();render();clearEntry(false);addBtn.textContent="Agregar cortina";ancho.focus();
}

function removeLine(id){state.lines=state.lines.filter(x=>x.id!==id);save();render()}

function editLine(id){
  const x=state.lines.find(item=>item.id===id);
  if(!x)return;

  grupoMecanismo.value=x.grupo;
  loadMechanisms();
  loadFabricTypes();

  mecanismo.value=x.m;mecanismoPickerText.textContent=x.m;
  subtipoTela.value=x.subtipo;
  loadFabrics();
  tela.value=x.t;telaPickerText.textContent=x.t;

  ancho.value=String(x.w).replace(".",",");
  largo.value=String(x.h).replace(".",",");
  cantidad.value=x.q;
  accesorio.value=x.a||"";
  cantidadAccesorio.value=x.aq||1;
  state.discount=Number(x.discountPct ?? 0);
  if($("discountPercent")) $("discountPercent").value=state.discount;

  state.lines=state.lines.filter(item=>item.id!==id);
  save();
  render();
  calculate();

  addBtn.textContent="Guardar cambios";
  window.scrollTo({top:0,behavior:"smooth"});
  setTimeout(()=>ancho.focus(),350);
}

function copyLast(){
  const x=state.lines.at(-1);if(!x)return alert("Todavía no hay una cortina para copiar.");
  grupoMecanismo.value=x.grupo;loadMechanisms();loadFabricTypes();mecanismo.value=x.m;mecanismoPickerText.textContent=x.m;
  subtipoTela.value=x.subtipo;loadFabrics();tela.value=x.t;telaPickerText.textContent=x.t;
  ancho.value=String(x.w).replace(".",",");largo.value=String(x.h).replace(".",",");cantidad.value=x.q;
  accesorio.value=x.a;accesorioPickerText.textContent=x.a||"Sin accesorio";cantidadAccesorio.value=x.aq||1;
  state.discount=Number(x.discountPct ?? 0);
  if($("discountPercent")) $("discountPercent").value=state.discount;
  calculate();scrollTo({top:0,behavior:"smooth"});
}

function newBudget(){
  if(!state.lines.length||confirm("¿Empezar un presupuesto nuevo?")){
    state.lines=[];
    state.discount=0;
    if($("discountPercent")) $("discountPercent").value=3;
    save();
    render();
    clearEntry(true);
    addBtn.textContent="Agregar cortina";
  }
}


function sendWhatsApp(){
  if(!state.lines.length)return alert("Agregá al menos una cortina.");

  const total=state.lines.reduce((s,x)=>s+x.total,0);
  const msg=["PRESUPUESTO DE CORTINAS","",
    ...state.lines.flatMap((x,i)=>[
      `Cortina ${i+1}`,
      `${x.q} × ${x.w.toFixed(2).replace(".",",")} m × ${x.h.toFixed(2).replace(".",",")} m`,
      `${x.grupo}: ${x.m}`,
      `${x.subtipo}: ${x.t}`,
      x.a?`Accesorio: ${x.aq} × ${x.a}`:"",
      x.discountPct?`Descuento adicional: ${x.discountPct}%`:"",
      money(x.total),""
    ]).filter(Boolean),
    `TOTAL: ${money(total)}`
  ].join("\\n");

  open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
}

grupoMecanismo.addEventListener("change",()=>{loadMechanisms();loadFabricTypes();calculate();});
subtipoTela.addEventListener("change",loadFabrics);
["ancho","largo","cantidad","cantidadAccesorio"].forEach(id=>$(id).addEventListener("input",calculate));

mecanismoPicker.addEventListener("click",()=>openPicker("mecanismo","Elegir mecanismo",mechanismItems()));
telaPicker.addEventListener("click",()=>openPicker("tela","Elegir tela",fabricItems()));
accesorioPicker.addEventListener("click",()=>openPicker("accesorio","Elegir accesorio",PRODUCTOS.accesorios));
pickerSearch.addEventListener("input",renderPickerList);
pickerClose.addEventListener("click",closePicker);
pickerModal.querySelector(".picker-backdrop").addEventListener("click",closePicker);
if($("discountPercent")){
  $("discountPercent").addEventListener("input",()=>{
    state.discount=Math.min(100,Math.max(0,Number($("discountPercent").value)||0));
    save();
    calculate();
  });
}
addBtn.onclick=addLine;
copyLastBtn.onclick=copyLast;
whatsappBtn.onclick=sendWhatsApp;
newBudgetBtn.onclick=newBudget;

init();loadMechanisms();loadFabricTypes();loadFabrics();render();calculate();
if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});