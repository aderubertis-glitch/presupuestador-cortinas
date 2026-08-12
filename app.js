const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n||0);
const fmtMeasure=n=>Number(n||0).toLocaleString("es-AR",{minimumFractionDigits:3,maximumFractionDigits:3});
const num=v=>Number(String(v||"").trim().replace(/\./g,"").replace(",","."))||0;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const unique=a=>[...new Set(a.filter(v=>v!==undefined&&v!==null&&String(v)!=="").map(String))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
const state={lines:JSON.parse(localStorage.getItem("dynamic_budget_lines")||"[]"),discount:Number(localStorage.getItem("dynamic_budget_discount")||0),components:{}};

function save(){localStorage.setItem("dynamic_budget_lines",JSON.stringify(state.lines));localStorage.setItem("dynamic_budget_discount",String(state.discount));}
function typeProducts(){return PRODUCTOS.filter(p=>p.tipoCortina===tipoCortina.value)}
function compProducts(comp){return typeProducts().filter(p=>p.componente===comp)}
function isMultiAccessoryComponent(name){
  const n=normalize(name);
  return n.includes("accesorio");
}
function normalize(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function isAccessory(name){return normalize(name).includes("accesorio")}
function isRepair(name){return normalize(name).includes("repar")}
function isOptionalToggle(name){return isAccessory(name)||isRepair(name)}
function optionalQuestion(name){
  if(isRepair(name)) return "¿Desea agregar reparación?";
  return "¿Desea agregar un accesorio?";
}

function init(){
  tipoCortina.innerHTML='<option value="">Elegir tipo</option>'+unique(Object.keys(CONFIG)).map(x=>`<option>${esc(x)}</option>`).join("");
  discountPercent.value=state.discount;
  renderBudget();calculate();
}

function renderComponents(){
  componentes.innerHTML="";
  state.components={};
  const cfg=CONFIG[tipoCortina.value]||[];

  cfg.forEach((c,idx)=>{
    const id="c"+idx;
    const multi=isAccessory(c.componente);
    const toggle=isOptionalToggle(c.componente);

    state.components[id]={
      config:c,
      selected:"",
      filters:["","","",""],
      multi,
      toggle,
      enabled:!toggle,
      added:[]
    };

    const block=document.createElement("div");
    block.className="component";
    block.id=id;

    const inner=multi
      ? `<div class="component-fields">
           <div class="filters"></div>
           <label>Artículo</label>
           <button type="button" class="picker-field" disabled>
             <span>Elegir ${esc(c.componente.toLowerCase())}</span><span>⌄</span>
           </button>
           <label>Cantidad</label>
           <input class="component-qty" type="number" min="1" value="1">
           <button type="button" class="secondary add-multi-btn" disabled>Agregar accesorio</button>
           <div class="multi-list"></div>
         </div>`
      : `<div class="component-fields">
           <div class="filters"></div>
           <label>Artículo</label>
           <button type="button" class="picker-field" disabled>
             <span>Elegir ${esc(c.componente.toLowerCase())}</span><span>⌄</span>
           </button>
         </div>`;

    block.innerHTML=toggle
      ? `<h3>${esc(c.componente)}</h3>
         <div class="optional-question">
           <span>${esc(optionalQuestion(c.componente))}</span>
           <div class="yes-no">
             <button type="button" class="choice-btn active" data-value="no">No</button>
             <button type="button" class="choice-btn" data-value="yes">Sí</button>
           </div>
         </div>
         <div class="optional-content" hidden>${inner}</div>`
      : `<h3>${esc(c.componente)} <span class="optional">(opcional)</span></h3>${inner}`;

    componentes.appendChild(block);

    if(toggle){
      block.querySelectorAll(".choice-btn").forEach(btn=>
        btn.addEventListener("click",()=>setOptionalEnabled(id,btn.dataset.value==="yes"))
      );
    }else{
      renderFilters(id);
      block.querySelector(".picker-field").addEventListener("click",()=>openPicker(id));
    }

    if(multi){
      const qty=block.querySelector(".component-qty");
      const addMulti=block.querySelector(".add-multi-btn");
      qty.addEventListener("input",()=>updateMultiButton(id));
      addMulti.addEventListener("click",()=>addMultiItem(id));
      renderMultiList(id);
    }
  });

  calculate();
}

function setOptionalEnabled(id,enabled){
  const st=state.components[id],block=$(id);
  if(!st)return;
  st.enabled=enabled;

  block.querySelectorAll(".choice-btn").forEach(btn=>{
    btn.classList.toggle("active",(btn.dataset.value==="yes")===enabled);
  });

  const content=block.querySelector(".optional-content");
  if(content)content.hidden=!enabled;

  if(enabled){
    renderFilters(id);
    const picker=block.querySelector(".picker-field");
    if(picker && !picker.dataset.bound){
      picker.addEventListener("click",()=>openPicker(id));
      picker.dataset.bound="1";
    }
    if(st.multi)renderMultiList(id);
  }else{
    st.selected="";
    st.filters=["","","",""];
    st.added=[];
  }
  calculate();
}
function candidates(id,upto=4){
  const st=state.components[id]; if(!st)return [];
  let arr=compProducts(st.config.componente);
  for(let i=0;i<upto;i++){ if(st.filters[i]) arr=arr.filter(p=>p.filtros[i]===st.filters[i]); }
  return arr;
}

function renderFilters(id){
  const st=state.components[id], block=$(id), wrap=block.querySelector(".filters");
  wrap.innerHTML="";
  st.config.labels.forEach((label,i)=>{
    if(!label)return;
    const lab=document.createElement("label"); lab.textContent=label;
    const sel=document.createElement("select");
    const vals=unique(candidates(id,i).map(p=>p.filtros[i]));
    sel.innerHTML=`<option value="">Elegir ${esc(label.toLowerCase())}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    sel.value=st.filters[i]||"";
    sel.addEventListener("change",()=>{
      st.filters[i]=sel.value;
      for(let j=i+1;j<4;j++)st.filters[j]="";
      st.selected="";
      renderFilters(id);updatePickerButton(id);calculate();
    });
    wrap.append(lab,sel);
  });
  updatePickerButton(id);
}

function filtersComplete(id){
  const st=state.components[id];
  return st.config.labels.every((label,i)=>!label||!!st.filters[i]);
}
function updatePickerButton(id){
  const st=state.components[id],block=$(id);
  if(!st||!block)return;
  const btn=block.querySelector(".picker-field");
  if(!btn)return;
  btn.disabled=!st.enabled||!filtersComplete(id);
  btn.querySelector("span").textContent=st.selected||`Elegir ${st.config.componente.toLowerCase()}`;
  if(st.multi)updateMultiButton(id);
}
function updateMultiButton(id){
  const st=state.components[id], block=$(id);
  if(!st?.multi||!block)return;
  const addBtn=block.querySelector(".add-multi-btn");
  const qty=Math.max(1,Number(block.querySelector(".component-qty")?.value)||1);
  addBtn.disabled=!st.selected||qty<1;
}

function addMultiItem(id){
  const st=state.components[id], block=$(id);
  if(!st?.multi||!st.selected)return;

  const product=candidates(id).find(x=>x.descripcion===st.selected);
  if(!product)return;

  const qty=Math.max(1,Number(block.querySelector(".component-qty").value)||1);

  st.added.push({
    uid:Date.now()+Math.random(),
    descripcion:product.descripcion,
    product,
    qty,
    filters:[...st.filters]
  });

  st.selected="";
  st.filters=["","","",""];
  block.querySelector(".component-qty").value=1;
  renderFilters(id);
  renderMultiList(id);
  calculate();
}

function removeMultiItem(id,uid){
  const st=state.components[id];
  if(!st)return;
  st.added=st.added.filter(x=>String(x.uid)!==String(uid));
  renderMultiList(id);
  calculate();
}

function renderMultiList(id){
  const st=state.components[id], block=$(id);
  if(!st?.multi||!block)return;

  const list=block.querySelector(".multi-list");
  list.innerHTML=st.added.length
    ? st.added.map((x,i)=>`
      <div class="multi-item">
        <div>
          <b>${esc(x.descripcion)}</b>
          <div class="multi-meta">Cantidad: ${x.qty}</div>
        </div>
        <button type="button" class="multi-remove" data-uid="${x.uid}">Eliminar</button>
      </div>`).join("")
    : '<div class="multi-empty">Todavía no agregaste accesorios.</div>';

  list.querySelectorAll(".multi-remove").forEach(btn=>
    btn.addEventListener("click",()=>removeMultiItem(id,btn.dataset.uid))
  );
}
let activeComponent=null;
function openPicker(id){
  activeComponent=id;pickerTitle.textContent=`Elegir ${state.components[id].config.componente}`;
  pickerSearch.value="";pickerModal.hidden=false;document.body.classList.add("modal-open");renderPicker();
  setTimeout(()=>pickerSearch.focus(),80);
}
function renderPicker(){
  const q=normalize(pickerSearch.value);
  let arr=candidates(activeComponent);
  if(q)arr=arr.filter(p=>normalize(p.descripcion).includes(q));
  pickerResults.innerHTML=arr.length?arr.map((p,i)=>`<button class="picker-option" data-desc="${esc(p.descripcion)}">${esc(p.descripcion)}</button>`).join(""):'<div class="picker-empty">No se encontraron resultados.</div>';
  pickerResults.querySelectorAll(".picker-option").forEach(b=>b.addEventListener("click",()=>{
    state.components[activeComponent].selected=b.dataset.desc;updatePickerButton(activeComponent);closePicker();calculate();
  }));
}
function closePicker(){pickerModal.hidden=true;document.body.classList.remove("modal-open");activeComponent=null}

function selectedItems(){
  const out=[];
  Object.entries(state.components).forEach(([id,st])=>{
    if(!st.enabled)return;
    if(st.multi){
      st.added.forEach(entry=>out.push({id,product:entry.product,component:st.config.componente,itemQty:entry.qty,multi:true}));
      return;
    }
    if(!st.selected)return;
    const p=candidates(id).find(x=>x.descripcion===st.selected);
    if(p)out.push({id,product:p,component:st.config.componente,itemQty:1,multi:false});
  });
  return out;
}
function requiredDims(items){
  const units=items.map(x=>String(x.product.unidad||"").toLowerCase());
  return {w:units.some(u=>u==="ml"||u==="m2"),h:units.some(u=>u==="m2")};
}
function updateMeasureVisibility(items){
  const d=requiredDims(items);
  medidas.hidden=!(d.w||d.h);anchoWrap.hidden=!d.w;largoWrap.hidden=!d.h;
  return d;
}
function costInfo(p,w,h,q){
  const unit=String(p.unidad||"").toLowerCase();
  const price=p.precioSinIVA||0;

  if(unit==="ml"){
    const real=w;
    const billable=Math.max(1,real);
    return {
      cost:billable*price*q,
      realQty:real,
      billableQty:billable,
      minimumApplied:real>0&&real<1,
      minimumText:real>0&&real<1?`Mínimo facturable: 1,000 ML (medida real ${fmtMeasure(real)} ML)`:""
    };
  }

  if(unit==="m2"){
    const real=w*h;
    const billable=Math.max(1,real);
    return {
      cost:billable*price*q,
      realQty:real,
      billableQty:billable,
      minimumApplied:real>0&&real<1,
      minimumText:real>0&&real<1?`Mínimo facturable: 1,000 m² (superficie real ${fmtMeasure(real)} m²)`:""
    };
  }

  return {
    cost:price*q,
    realQty:q,
    billableQty:q,
    minimumApplied:false,
    minimumText:""
  };
}

function baseCost(p,w,h,q){
  return costInfo(p,w,h,q).cost;
}
function calculate(){
  const items=selectedItems(),
        dims=updateMeasureVisibility(items),
        w=num(ancho.value),
        h=num(largo.value),
        q=Math.max(1,+cantidad.value||1);

  let subtotal=0;
  itemBreakdown.innerHTML="";
  const details=[];

  items.forEach(({product,component,itemQty,multi})=>{
    const effectiveQty=multi ? itemQty*q : q;
    const ci=costInfo(product,w,h,effectiveQty);
    const base=ci.cost;
    const auto=product.aplica40?base*.40:0;
    const final=base-auto;
    subtotal+=final;

    details.push({
      product,component,base,auto,final,
      itemQty:multi?itemQty:1,
      multi,
      minimumApplied:ci.minimumApplied,
      minimumText:ci.minimumText,
      billableQty:ci.billableQty
    });

    itemBreakdown.insertAdjacentHTML("beforeend",
      `<div class="break-row">
         <span>${esc(component)}${multi?` × ${itemQty}`:""}</span>
         <b>${money(final)}</b>
       </div>
       <div class="break-detail">
         ${esc(product.descripcion)}<br>
         ${ci.minimumApplied?`<span class="minimum-note">${esc(ci.minimumText)}</span><br>`:""}
         ${product.aplica40
           ? `<span class="auto-applied">40% automático: -${money(auto)}</span>`
           : `<span class="auto-no">40% automático: no aplica</span>`}
       </div>`);
  });

  const pct=Math.min(100,Math.max(0,Number(state.discount)||0)),
        extra=subtotal*pct/100,
        total=subtotal-extra;

  $("subtotal").textContent=money(subtotal);
  additionalDiscountLabel.textContent=`Descuento adicional (${pct}%)`;
  additionalDiscount.textContent="-"+money(extra);
  lineTotal.textContent=money(total);

  return {items,details,dims,w,h,q,subtotal,pct,extra,total};
}
function addLine(){
  const c=calculate();
  if(!tipoCortina.value)return alert("Elegí el tipo de cortina.");
  if(!c.items.length)return alert("Elegí al menos un artículo.");
  if(c.dims.w&&c.w<=0)return alert(c.dims.h?"Ingresá ancho y largo.":"Ingresá el ancho.");
  if(c.dims.h&&c.h<=0)return alert("Ingresá el largo.");
  state.lines.push({id:Date.now(),tipo:tipoCortina.value,w:c.w,h:c.h,q:c.q,pct:c.pct,subtotal:c.subtotal,total:c.total,
    items:c.details.map(x=>({component:x.component,descripcion:x.product.descripcion,unidad:x.product.unidad,base:x.base,auto:x.auto,final:x.final,aplica40:x.product.aplica40,itemQty:x.itemQty||1,multi:!!x.multi,minimumApplied:!!x.minimumApplied,minimumText:x.minimumText||"",billableQty:x.billableQty}))});
  save();renderBudget();clearEntry();
}
function clearEntry(){tipoCortina.value="";componentes.innerHTML="";state.components={};ancho.value="";largo.value="";cantidad.value=1;calculate();window.scrollTo({top:0,behavior:"smooth"})}
function removeLine(id){state.lines=state.lines.filter(x=>x.id!==id);save();renderBudget()}
function renderBudget(){
  budgetLines.innerHTML=state.lines.length?state.lines.map((x,i)=>`<article class="line"><div class="line-head"><span>${esc(x.tipo)} ${i+1}</span><span>${money(x.total)}</span></div>
    <div class="line-detail">${x.w||x.h?`${x.q} × ${x.w?fmtMeasure(x.w)+" m":""}${x.w&&x.h?" × ":""}${x.h?fmtMeasure(x.h)+" m":""}`:`Cantidad: ${x.q}`}
    ${x.items.map(it=>`<br><b>${esc(it.component)}${it.multi?` × ${it.itemQty}`:""}:</b> ${esc(it.descripcion)} — ${money(it.final)}${it.minimumApplied?` <span class="minimum-note">(${esc(it.minimumText)})</span>`:""}${it.auto>0?` <span class="auto-applied">(40%: -${money(it.auto)})</span>`:""}`).join("")}
    ${x.pct>0?`<br>Descuento adicional (${x.pct}%): -${money(x.subtotal*x.pct/100)}`:""}</div>
    <div class="actions"><button class="delete" onclick="removeLine(${x.id})">Eliminar</button></div></article>`).join(""):'<p class="empty">Todavía no agregaste nada.</p>';
  grandTotal.textContent=money(state.lines.reduce((s,x)=>s+x.total,0));itemCount.textContent=`${state.lines.length} ${state.lines.length===1?"ítem":"ítems"}`;
}
function sendWhatsApp(){
  if(!state.lines.length)return alert("Agregá al menos un ítem.");
  const blocks=state.lines.map((x,i)=>{
    const lines=[`*${x.tipo.toUpperCase()} ${i+1}*`,x.w||x.h?`📐 ${x.q} × ${x.w?fmtMeasure(x.w)+" m":""}${x.w&&x.h?" × ":""}${x.h?fmtMeasure(x.h)+" m":""}`:`Cantidad: ${x.q}`,""];
    x.items.forEach(it=>{
      lines.push(
        `*${it.component}${it.multi?` × ${it.itemQty}`:""}:* ${it.descripcion}`,
        it.minimumApplied?`_${it.minimumText}_`:"",
        `Precio sin IVA: ${money(it.base)}`,
        it.auto>0?`40% automático: -${money(it.auto)}`:"40% automático: no aplica",
        `*Precio ${it.component.toLowerCase()}: ${money(it.final)}*`,
        ""
      );
    });
    if(x.pct>0)lines.push(`*Descuento adicional (${x.pct}%):* -${money(x.subtotal*x.pct/100)}`,"");
    lines.push(`*TOTAL ${x.tipo.toUpperCase()} ${i+1}: ${money(x.total)}*`);
    return lines.join("\n");
  });
  const msg=["🟢 *PRESUPUESTO*","",...blocks.flatMap((b,i)=>i<blocks.length-1?[b,"","──────────────",""]:[b]),"","━━━━━━━━━━━━━━",`*TOTAL PRESUPUESTO: ${money(state.lines.reduce((s,x)=>s+x.total,0))}*`].join("\n");
  open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
}

tipoCortina.addEventListener("change",renderComponents);
["ancho","largo","cantidad"].forEach(id=>$(id).addEventListener("input",calculate));
discountPercent.addEventListener("input",()=>{state.discount=Number(discountPercent.value)||0;save();calculate()});
pickerSearch.addEventListener("input",renderPicker);pickerClose.addEventListener("click",closePicker);pickerModal.querySelector(".picker-backdrop").addEventListener("click",closePicker);
addBtn.addEventListener("click",addLine);newBudgetBtn.addEventListener("click",()=>{if(!state.lines.length||confirm("¿Empezar un presupuesto nuevo?")){state.lines=[];state.discount=0;discountPercent.value=0;save();renderBudget();clearEntry()}});
whatsappBtn.addEventListener("click",sendWhatsApp);
init();
if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
