// Chiavi localStorage
const STORAGE_KEY = "villani_cantieri_v1";
const BACKUP_KEY  = "villani_cantieri_backup_v1";

// Stato
let state = { projects: [], selectedProjectId: null };

// Liste base
const FRUTTI_BASE = [
  "Supporto 503","Supporto 504","Supporto 507","Falsipolo",
  "Unel","Bipasso","10A","Usb",
  "Interruttore","Deviatore","Invertitore","Pulsante","RJ45","RJ11",
  "TV Finale","TV Passante","Sali/Scendi","Tirante","Ronzatore","Supporto 502",
  "Pulsante campanello","Suoneria","Pateletta 503","Pateletta 504"
];
const SMART_BASE = [
  "Gateway","Entra/Esci","Giorno/Notte","Deviatore","Tapparella",
  "Dimmer","Modulo presa","Tapparella wireless","Interruttore wireless"
];
const COPERCHI_BASE = [
  "Coperchio 503","Coperchio 504","Coperchio 507",
  "Tondo piccolo","Tondo grande","Telefonico"
];
const SPINE_BASE = [
  "10a volante","Bipasso volante","TV femmina","TV maschio","Unel volante"
];

// Salvataggio
function saveState(){
  try{
    const json=JSON.stringify(state);
    localStorage.setItem(BACKUP_KEY,json);
    localStorage.setItem(STORAGE_KEY,json);
  }catch(e){
    console.error("Errore salvataggio",e);
    alert("Attenzione: non riesco a salvare i dati in locale.");
  }
}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    state = raw ? JSON.parse(raw) : { projects: [], selectedProjectId: null };
  }catch(e){
    console.warn("Errore lettura dati principali",e);
    try{
      const backup=localStorage.getItem(BACKUP_KEY);
      state = backup ? JSON.parse(backup) : { projects: [], selectedProjectId: null };
    }catch(e2){
      console.error("Errore lettura backup",e2);
      state = { projects: [], selectedProjectId: null };
    }
  }
}

// Helpers
const nowIso = () => new Date().toISOString();
function formatDate(iso){
  if(!iso) return "";
  const d=new Date(iso);
  const dd=String(d.getDate()).padStart(2,"0");
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const yyyy=d.getFullYear();
  const hh=String(d.getHours()).padStart(2,"0");
  const mi=String(d.getMinutes()).padStart(2,"0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
const getSelectedProject = () => state.projects.find(p=>p.id===state.selectedProjectId)||null;

// Migrazioni
function ensureBaseCoperchi(project){
  project.data=project.data||{};
  project.data.coperchi=project.data.coperchi||{};
  project.data.coperchiCustom=project.data.coperchiCustom||{};
  COPERCHI_BASE.forEach(name=>{
    if(!(name in project.data.coperchi)) project.data.coperchi[name]=0;
  });
}
function ensureBaseSpine(project){
  project.data = project.data || {};
  project.data.spine = project.data.spine || {};
  project.data.spineCustom = project.data.spineCustom || {};
  SPINE_BASE.forEach(name=>{
    if(!(name in project.data.spine)) project.data.spine[name]=0;
  });
}
function ensureBaseVario(project){
  project.data = project.data || {};
  project.data.varioList = project.data.varioList || [];       // partitori
  project.data.aspiratoriList = project.data.aspiratoriList || []; // aspiratori
  project.data.varioCounters = project.data.varioCounters || { portaLampada:0, lampadina:0 };
  project.data.varioDevices = project.data.varioDevices || {};
  project.data.varioDevicesCustom = project.data.varioDevicesCustom || {};
  const defaults = {
    "Relè 220v 2 contatti": 0,
    "Relè 220v 4 contatti": 0,
    "Dimmer leaf": 0,
    "Termostato": 0
  };
  Object.keys(defaults).forEach(k=>{
    if(!(k in project.data.varioDevices)) project.data.varioDevices[k]=defaults[k];
  });
}
function ensureBaseLinee(project){
  project.data = project.data || {};
  project.data.lineeList = project.data.lineeList || []; // elenco linee personalizzate
}

// DOM refs
const projectsView       = document.getElementById("projectsView");
const projectDetailView  = document.getElementById("projectDetailView");
const projectsList       = document.getElementById("projectsList");
const addProjectBtn      = document.getElementById("addProjectBtn");

const modalOverlay       = document.getElementById("modalOverlay");
const modalInput         = document.getElementById("modalInput");
const modalCancel        = document.getElementById("modalCancel");
const modalOk            = document.getElementById("modalOk");

const fruitModalOverlay  = document.getElementById("fruitModalOverlay");
const fruitModalInput    = document.getElementById("fruitModalInput");
const fruitModalCancel   = document.getElementById("fruitModalCancel");
const fruitModalOk       = document.getElementById("fruitModalOk");
const fruitModalTitle    = document.getElementById("fruitModalTitle");

const derivModalOverlay  = document.getElementById("derivModalOverlay");
const derivValueEl       = document.getElementById("derivValue");
const derivDownBtn       = document.getElementById("derivDown");
const derivUpBtn         = document.getElementById("derivUp");
const derivCancelBtn     = document.getElementById("derivCancel");
const derivOkBtn         = document.getElementById("derivOk");

const partModalOverlay   = document.getElementById("partModalOverlay");
const partValueEl        = document.getElementById("partValue");
const partDownBtn        = document.getElementById("partDown");
const partUpBtn          = document.getElementById("partUp");
const partCancelBtn      = document.getElementById("partCancel");
const partOkBtn          = document.getElementById("partOk");
const partRadioNormale   = document.getElementById("partRadioNormale");
const partRadioPassante  = document.getElementById("partRadioPassante");

const projectNameTitle   = document.getElementById("projectNameTitle");
const projectMeta        = document.getElementById("projectMeta");
const fruttiBody         = document.getElementById("fruttiBody");
const coperchiBody       = document.getElementById("coperchiBody");
const spineBody          = document.getElementById("spineBody");
const varioBody          = document.getElementById("varioBody");
const accordion          = document.getElementById("accordion");
const lineeBody          = document.getElementById("lineeBody"); // deve esistere nel markup

const headerBackBtn      = document.getElementById("headerBackBtn");
const headerSubLine      = document.getElementById("headerSubLine");
const headerCopyBtn      = document.getElementById("headerCopyBtn"); // bottone copia

// Copy modal refs
const copyModalOverlay   = document.getElementById("copyModalOverlay");
const copyCentralino     = document.getElementById("copyCentralino");
const copyDymo           = document.getElementById("copyDymo");
const copyCitofono       = document.getElementById("copyCitofono");
const copyMorsetti       = document.getElementById("copyMorsetti");
const copyAddExtraBtn    = document.getElementById("copyAddExtraBtn");
const copyExtraList      = document.getElementById("copyExtraList");
const copyCancelBtn      = document.getElementById("copyCancel");
const copyDoCopyBtn      = document.getElementById("copyDoCopy");

// Stato extra per modal copia
let copyExtras = []; // array di stringhe

// Aspiratore modal refs
const aspirModalOverlay  = document.getElementById("aspirModalOverlay");
const aspirTimerInput    = document.getElementById("aspirTimer");
const aspirSizeInput     = document.getElementById("aspirSize");
const aspirCancelBtn     = document.getElementById("aspirCancel");
const aspirOkBtn         = document.getElementById("aspirOk");

// Scroll lock
function lockBody() {
  document.body.dataset.prevOverflow = document.body.style.overflow || "";
  document.body.style.overflow = "hidden";
}
function unlockBody() {
  document.body.style.overflow = document.body.dataset.prevOverflow || "";
}

// Apertura/chiusura base modali
function openModalBase(overlayEl, focusEl) {
  overlayEl.classList.remove("hidden");
  lockBody();
  setTimeout(() => focusEl?.focus(), 50);
}
function closeModalBase(overlayEl) {
  overlayEl.classList.add("hidden");
  unlockBody();
}

// Modale cantiere
let modalResolve = null;
function openModal(promptText = "Nome cantiere", placeholder = "Nome cantiere") {
  document.getElementById("modalTitle").innerText = promptText;
  modalInput.placeholder = placeholder;
  modalInput.value = "";
  openModalBase(modalOverlay, modalInput);
  return new Promise((resolve) => { modalResolve = resolve; });
}
function closeModal(value = null) {
  closeModalBase(modalOverlay);
  if (modalResolve) { modalResolve(value); modalResolve = null; }
}

// Modale frutto/coperchio/spina
let fruitModalResolve = null;
let fruitModalContext = null;
function openFruitModal(sectionType) {
  fruitModalContext = sectionType;
  fruitModalTitle.textContent = sectionType === "coperchio"
    ? "Aggiungi coperchio"
    : sectionType === "spina"
      ? "Aggiungi spina"
      : "Aggiungi frutto";
  fruitModalInput.value = "";
  openModalBase(fruitModalOverlay, fruitModalInput);
  return new Promise((resolve) => { fruitModalResolve = resolve; });
}
function closeFruitModal(value = null) {
  closeModalBase(fruitModalOverlay);
  if (fruitModalResolve) {
    fruitModalResolve({ value, type: fruitModalContext });
    fruitModalResolve = null; fruitModalContext = null;
  }
}

// Modale derivazione
let derivResolve = null;
let derivCurrent = 4;
const DERIV_MIN = 4, DERIV_MAX = 10;
function openDerivModal() {
  derivCurrent = DERIV_MIN;
  derivValueEl && (derivValueEl.textContent = String(derivCurrent));
  openModalBase(derivModalOverlay, derivCancelBtn);
  return new Promise((resolve) => { derivResolve = resolve; });
}
function closeDerivModal(value = null) {
  closeModalBase(derivModalOverlay);
  if (derivResolve) { derivResolve(value); derivResolve = null; }
}
derivDownBtn?.addEventListener("click", () => {
  if (derivCurrent > DERIV_MIN) {
    derivCurrent--; derivValueEl.textContent = String(derivCurrent);
  }
});
derivUpBtn?.addEventListener("click", () => {
  if (derivCurrent < DERIV_MAX) {
    derivCurrent++; derivValueEl.textContent = String(derivCurrent);
  }
});

// Modale partitore (stile derivazione, radio in alto)
let partResolve = null;
let partCurrent = 4;
const PART_MIN = 4, PART_MAX = 10;
function openPartModal(){
  partCurrent = PART_MIN;
  partValueEl && (partValueEl.textContent = String(partCurrent));
  if(partRadioNormale)  partRadioNormale.checked = true;
  if(partRadioPassante) partRadioPassante.checked = false;
  openModalBase(partModalOverlay, partCancelBtn);
  return new Promise((resolve)=>{ partResolve = resolve; });
}
function closePartModal(value=null){
  closeModalBase(partModalOverlay);
  if(partResolve){ partResolve(value); partResolve=null; }
}
partDownBtn?.addEventListener("click",()=>{
  if(partCurrent>PART_MIN){
    partCurrent--; partValueEl.textContent=String(partCurrent);
  }
});
partUpBtn?.addEventListener("click",()=>{
  if(partCurrent<PART_MAX){
    partCurrent++; partValueEl.textContent=String(partCurrent);
  }
});
partCancelBtn?.addEventListener("click",()=>closePartModal(null));
partOkBtn?.addEventListener("click",()=>{
  const type = partRadioPassante?.checked ? "passante" : "normale";
  closePartModal({ count: partCurrent, type });
});

// Modale aspiratore
let aspirResolve = null;
function openAspirModal(){
  if(aspirTimerInput) aspirTimerInput.checked = false;
  if(aspirSizeInput) aspirSizeInput.value = "";
  if(aspirOkBtn) aspirOkBtn.disabled = false; // sempre abilitato
  openModalBase(aspirModalOverlay, aspirSizeInput);
  return new Promise((resolve)=>{ aspirResolve = resolve; });
}
function closeAspirModal(value=null){
  closeModalBase(aspirModalOverlay);
  if(aspirResolve){ aspirResolve(value); aspirResolve=null; }
}
aspirCancelBtn?.addEventListener("click", ()=>closeAspirModal(null));
aspirOkBtn?.addEventListener("click", ()=>{
  const size = aspirSizeInput?.value.trim() || "";
  const timer = !!aspirTimerInput?.checked;
  closeAspirModal({ size, timer });
});
aspirSizeInput?.addEventListener("keydown", (e)=>{
  if(e.key==="Enter"){
    e.preventDefault();
    aspirOkBtn?.click();
  }
});

// Eventi modali base
modalCancel?.addEventListener("click", () => closeModal(null));
modalOk?.addEventListener("click", () => {
  const v = modalInput.value.trim();
  if (!v) return;
  closeModal(v);
});
modalInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); modalOk.click(); } });

fruitModalCancel?.addEventListener("click", () => closeFruitModal(null));
fruitModalOk?.addEventListener("click", () => {
  const v = fruitModalInput.value.trim();
  if (!v) return;
  closeFruitModal(v);
});
fruitModalInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fruitModalOk.click(); } });

derivCancelBtn?.addEventListener("click", () => closeDerivModal(null));
derivOkBtn?.addEventListener("click", () => closeDerivModal(derivCurrent));

// --- Copia riepilogo: testo base (righe vuote tra blocchi) ---
function buildProjectSummary(project){
  const lines = [];
  const data = project.data || {};

  const addBlock = (title, items) => {
    if (!items || items.length === 0) return;
    if (lines.length > 0) lines.push(""); // riga vuota tra i titoli
    lines.push(title);
    items.forEach((s) => lines.push(`- ${s}`));
  };

  const entriesFromObject = (obj) =>
    Object.keys(obj || {})
      .filter((k) => (obj[k] ?? 0) > 0)
      .map((k) => `${k}: ${obj[k]}`);

  // Frutti (normali + custom)
  const fruttiItems = [
    ...entriesFromObject(data.frutti),
    ...entriesFromObject(data.fruttiCustom),
  ];
  addBlock("Frutti", fruttiItems);

  // Frutti smart (smart + custom)
  const fruttiSmartItems = [
    ...entriesFromObject(data.smart),
    ...entriesFromObject(data.smartCustom),
  ];
  addBlock("Frutti smart", fruttiSmartItems);

  // Coperchi
  const coperchiItems = [
    ...entriesFromObject(data.coperchi),
    ...entriesFromObject(data.coperchiCustom),
  ];
  addBlock("Coperchi", coperchiItems);

  // Derivazioni PT
  addBlock("Derivazioni PT", entriesFromObject(data.coperchiDerivazioni));

  // Spine
  const spineItems = [
    ...entriesFromObject(data.spine),
    ...entriesFromObject(data.spineCustom),
  ];
  addBlock("Spine", spineItems);

  // Partitori (solo lista)
  if ((data.varioList || []).length) {
    addBlock("Partitori", data.varioList.map((e) => e.label));
  }

  // Aspiratori (solo lista)
  if ((data.aspiratoriList || []).length) {
    addBlock("Aspiratori", data.aspiratoriList.map((e) => e.label));
  }

  // Illuminazione
  const vc = data.varioCounters || {};
  const illumItems = [];
  if ((vc.portaLampada || 0) > 0) illumItems.push(`Porta lampada: ${vc.portaLampada}`);
  if ((vc.lampadina || 0) > 0) illumItems.push(`Lampadina: ${vc.lampadina}`);
  addBlock("Illuminazione", illumItems);

  // Dispositivi vari
  const devicesItems = [
    ...entriesFromObject(data.varioDevices),
    ...entriesFromObject(data.varioDevicesCustom),
  ];
  addBlock("Dispositivi vari", devicesItems);

  // Linee (solo lista)
  if ((data.lineeList || []).length) {
    addBlock("Linee", data.lineeList.map((l) => l.name));
  }

  return lines.join("\n");
}

// Clipboard helper
async function writeToClipboard(text){
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

// --- Modale Copia: UI + logica ---
function renderCopyExtras(){
  if(!copyExtraList) return;
  copyExtraList.innerHTML = "";
  copyExtras.forEach((name, idx)=>{
    const row = document.createElement("div");
    row.className = "copy-extra-item";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "−";
    remove.addEventListener("click", ()=>{
      copyExtras = copyExtras.filter((_, i)=> i !== idx);
      renderCopyExtras();
    });

    row.appendChild(label);
    row.appendChild(remove);
    copyExtraList.appendChild(row);
  });
}

function openCopyModal(){
  if(copyCentralino) copyCentralino.checked = false;
  if(copyDymo) copyDymo.checked = false;
  if(copyCitofono) copyCitofono.checked = false;
  if(copyMorsetti) copyMorsetti.checked = false;

  copyExtras = [];
  renderCopyExtras();

  openModalBase(copyModalOverlay, copyDoCopyBtn);
}

function closeCopyModal(){
  closeModalBase(copyModalOverlay);
}

copyCancelBtn?.addEventListener("click", closeCopyModal);

copyAddExtraBtn?.addEventListener("click", async ()=>{
  // FIX: chiudo momentaneamente il modal copia così il prompt si vede sempre
  closeCopyModal();

  const name = await openModal("Aggiungi altro", "Nome elemento");
  if(name){
    const v = name.trim();
    if(v) copyExtras.push(v);
  }

  // riapro il modal copia e ridisegno lista
  openModalBase(copyModalOverlay, copyDoCopyBtn);
  renderCopyExtras();
});

copyDoCopyBtn?.addEventListener("click", async ()=>{
  const project = getSelectedProject();
  if(!project){
    alert("Nessun cantiere selezionato.");
    closeCopyModal();
    return;
  }

  const base = buildProjectSummary(project);

  // elementi selezionati + aggiunti (questi vanno in fondo col titolo "Altro")
  const selected = [];
  if(copyCentralino?.checked) selected.push("Centralino");
  if(copyDymo?.checked) selected.push("Dymo");
  if(copyCitofono?.checked) selected.push("Citofono");
  if(copyMorsetti?.checked) selected.push("Morsetti");
  copyExtras.forEach(x => selected.push(x));

  const parts = [];
  parts.push(`Cantiere: ${project.name}`);

  if(base){
    parts.push(""); // riga vuota
    parts.push(base);
  }

  if(selected.length){
    parts.push(""); // riga vuota
    parts.push("Altro");
    selected.forEach(x => parts.push(`- ${x}`));
  }

  const finalText = parts.join("\n");

  try{
    await writeToClipboard(finalText);
    alert("Riepilogo copiato negli appunti.");
    closeCopyModal();
  }catch(e){
    console.error("Copy failed", e);
    alert("Non riesco a copiare negli appunti.");
  }
});


function renderProjectsList(){
  projectsList.innerHTML="";
  if(!state.projects.length){
    projectsList.innerHTML=`<div style="padding:12px 16px;font-size:14px;color:#777;">
      Nessun cantiere. Tocca + per crearne uno.
    </div>`;
    return;
  }
  state.projects.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).forEach(project=>{
    const row=document.createElement("div");
    row.className="project-item";
    const bar=document.createElement("div"); bar.className="project-bar";
    const main=document.createElement("div"); main.className="project-main";
    const name=document.createElement("div"); name.className="project-name"; name.textContent=project.name;
    const meta=document.createElement("div"); meta.className="project-meta"; meta.textContent=`Creato: ${formatDate(project.createdAt)}`;
    main.appendChild(name); main.appendChild(meta);
    row.appendChild(bar); row.appendChild(main);
    const delBtn=document.createElement("button");
    delBtn.className="project-delete-btn"; delBtn.textContent="−";
    delBtn.addEventListener("click",e=>{
      e.stopPropagation();
      if(confirm(`Vuoi eliminare il cantiere "${project.name}"?`)){
        state.projects=state.projects.filter(p=>p.id!==project.id);
        if(state.selectedProjectId===project.id) state.selectedProjectId=null;
        saveState(); renderProjectsList();
      }
    });
    row.appendChild(delBtn);
    row.addEventListener("click",()=>{
      state.selectedProjectId=project.id;
      saveState();
      openProjectDetail();
    });
    projectsList.appendChild(row);
  });
}

addProjectBtn.addEventListener("click", async ()=>{
  const name=await openModal("Nome nuovo cantiere","Nome cantiere");
  if(!name) return;
  const createdAt=nowIso();
  const id=`${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const fruttiData={}; FRUTTI_BASE.forEach(f=>fruttiData[f]=0);
  const smartData={};  SMART_BASE.forEach(f=>smartData[f]=0);
  const coperchiData={}; COPERCHI_BASE.forEach(c=>coperchiData[c]=0);
  const spineData={}; SPINE_BASE.forEach(s=>spineData[s]=0);
  const newProject={
    id,name,createdAt,updatedAt:createdAt,
    data:{
      frutti:fruttiData,
      smart:smartData,
      fruttiCustom:{},
      smartCustom:{},
      coperchi:coperchiData,
      coperchiCustom:{},
      coperchiDerivazioni:{},
      spine:spineData,
      spineCustom:{},
      varioList:[],
      aspiratoriList:[],
      varioCounters:{ portaLampada:0, lampadina:0 },
      varioDevices:{
        "Relè 220v 2 contatti":0,
        "Relè 220v 4 contatti":0,
        "Dimmer leaf":0,
        "Termostato":0
      },
      varioDevicesCustom:{},
      lineeList:[]
    }
  };
  state.projects.push(newProject);
  saveState();
  renderProjectsList();
});

// Navigazione
function showProjectsView(){
  projectsView.classList.remove("hidden");
  projectDetailView.classList.add("hidden");
  headerBackBtn.classList.add("hidden");
  headerCopyBtn.classList.add("hidden");
  headerSubLine.textContent="";
  addProjectBtn.classList.remove("hidden");
}
function showProjectDetailView(){
  projectsView.classList.add("hidden");
  projectDetailView.classList.remove("hidden");
  headerBackBtn.classList.remove("hidden");
  headerCopyBtn.classList.remove("hidden");
  addProjectBtn.classList.add("hidden");
  const project=getSelectedProject();
  headerSubLine.textContent=project?project.name:"";
}
headerBackBtn.addEventListener("click",()=>{
  state.selectedProjectId=null;
  saveState();
  showProjectsView();
});
headerCopyBtn?.addEventListener("click", openCopyModal);

// Dettaglio
function openProjectDetail(){
  const project=getSelectedProject();
  if(!project){ showProjectsView(); return; }
  ensureBaseCoperchi(project);
  ensureBaseSpine(project);
  ensureBaseVario(project);
  ensureBaseLinee(project);
  projectNameTitle.textContent=project.name;
  projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt||project.createdAt)}`;
  renderFruttiSection(project);
  renderCoperchiSection(project);
  renderSpineSection(project);
  renderVarioSection(project);
  renderLineeSection(project);
  initAccordion(null);
  showProjectDetailView();
}

// Helpers contatori
function updateCounterAppearance(valueElement, minusBtn, numericValue, isCustom){
  valueElement.classList.remove("zero","nonzero");
  minusBtn.classList.remove("zero");
  if(numericValue>0){ valueElement.classList.add("nonzero"); }
  else { valueElement.classList.add("zero"); if(isCustom) minusBtn.classList.add("zero"); }
}

function createCounterRow(project, store, key, labelText, isCustom, { hidePlus=false, removeOnSingleClick=false, hideValue=false } = {}){
  const row=document.createElement("div");
  row.className="frutto-row";

  const label=document.createElement("div");
  label.className="frutto-name";
  label.textContent=labelText;

  const counterWrap=document.createElement("div");
  counterWrap.className="counter";

  const minus=document.createElement("button");
  minus.className="counter-btn minus";
  minus.textContent="−";

  const value=document.createElement("div");
  value.className="counter-value";
  const initial=store[key]??0;
  value.textContent=initial;

  if(hideValue){
    value.style.display="none";
    minus.classList.add("force-red"); // rosso forzato
  }

  let plus=null;
  if(!hidePlus){
    plus=document.createElement("button");
    plus.className="counter-btn";
    plus.textContent="+";
  }

  updateCounterAppearance(value, minus, initial, isCustom);

  minus.addEventListener("click",()=>{
    if(removeOnSingleClick){
      delete store[key];
      row.remove();
      project.updatedAt=nowIso();
      saveState();
      projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
      return;
    }

    let v=Number(value.textContent)||0;
    if(v>0){
      v--; value.textContent=v; store[key]=v;
      project.updatedAt=nowIso();
      updateCounterAppearance(value, minus, v, isCustom);
      saveState();
      projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
    }else if(isCustom || hidePlus){
      const msg=`Vuoi rimuovere questo elemento?\n"${labelText}"`;
      if(confirm(msg)){
        delete store[key];
        row.remove();
        project.updatedAt=nowIso();
        saveState();
        projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
      }
    }
  });

  if(plus){
    plus.addEventListener("click",()=>{
      let v=Number(value.textContent)||0;
      v++; value.textContent=v; store[key]=v;
      project.updatedAt=nowIso();
      updateCounterAppearance(value, minus, v, isCustom);
      saveState();
      projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
    });
  }

  counterWrap.appendChild(minus);
  counterWrap.appendChild(value);
  if(plus) counterWrap.appendChild(plus);

  row.appendChild(label);
  row.appendChild(counterWrap);
  return row;
}

// Partitori (lista, multi-entry, conferma su rimozione)
function createPartitoreRow(project, entryId, label){
  const row=document.createElement("div");
  row.className="frutto-row";

  const nameEl=document.createElement("div");
  nameEl.className="frutto-name";
  nameEl.textContent=label;

  const counterWrap=document.createElement("div");
  counterWrap.className="counter";

  const minus=document.createElement("button");
  minus.className="counter-btn minus force-red";
  minus.textContent="−";
  minus.addEventListener("click",()=>{
    const msg = `Vuoi rimuovere questo elemento?\n"${label}"`;
    if(!confirm(msg)) return;
    project.data.varioList = project.data.varioList.filter(e=>e.id!==entryId);
    project.updatedAt=nowIso();
    saveState();
    renderVarioSection(project);
    projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
  });

  counterWrap.appendChild(minus);
  row.appendChild(nameEl);
  row.appendChild(counterWrap);
  return row;
}

// Aspiratore (lista, multi-entry, conferma su rimozione)
function createAspiratoreRow(project, entryId, label){
  const row=document.createElement("div");
  row.className="frutto-row";

  const nameEl=document.createElement("div");
  nameEl.className="frutto-name";
  nameEl.textContent=label;

  const counterWrap=document.createElement("div");
  counterWrap.className="counter";

  const minus=document.createElement("button");
  minus.className="counter-btn minus force-red";
  minus.textContent="−";
  minus.addEventListener("click",()=>{
    const msg = `Vuoi rimuovere questo elemento?\n"${label}"`;
    if(!confirm(msg)) return;
    project.data.aspiratoriList = project.data.aspiratoriList.filter(e=>e.id!==entryId);
    project.updatedAt=nowIso();
    saveState();
    renderVarioSection(project);
    projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
  });

  counterWrap.appendChild(minus);
  row.appendChild(nameEl);
  row.appendChild(counterWrap);
  return row;
}

// Sezione FRUTTI
async function handleAddFruit(project, sectionType){
  const res=await openFruitModal(sectionType);
  if(!res || !res.value) return;

  const name=res.value.trim();
  if(!name) return;

  let store;
  if(sectionType==="smart"){
    project.data.smartCustom=project.data.smartCustom||{};
    store=project.data.smartCustom;
  } else {
    project.data.fruttiCustom=project.data.fruttiCustom||{};
    store=project.data.fruttiCustom;
  }

  if(store[name]==null) store[name]=0;

  project.updatedAt=nowIso();
  saveState();
  renderFruttiSection(project);
  projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
}

function renderFruttiSection(project){
  fruttiBody.innerHTML="";

  const data=project.data||{};
  data.frutti=data.frutti||{};
  data.smart=data.smart||{};
  data.fruttiCustom=data.fruttiCustom||{};
  data.smartCustom=data.smartCustom||{};

  const normTitle=document.createElement("div");
  normTitle.className="frutti-section-title";
  normTitle.textContent="Normali";
  fruttiBody.appendChild(normTitle);

  const normAll={ ...data.frutti, ...data.fruttiCustom };
  Object.keys(normAll).forEach(name=>{
    const isCustom=Object.prototype.hasOwnProperty.call(data.fruttiCustom,name);
    const row=createCounterRow(
      project,
      isCustom ? data.fruttiCustom : data.frutti,
      name,
      name,
      isCustom
    );
    fruttiBody.appendChild(row);
  });

  const addNormBtn=document.createElement("button");
  addNormBtn.className="add-fruit-btn";
  addNormBtn.innerHTML=`<span class="plus">+</span><span>Aggiungi frutto</span>`;
  addNormBtn.addEventListener("click",()=>handleAddFruit(project,"normal"));
  fruttiBody.appendChild(addNormBtn);

  fruttiBody.appendChild(document.createElement("hr")).style.border="none";

  const smartTitle=document.createElement("div");
  smartTitle.className="frutti-section-title";
  smartTitle.textContent="Smart";
  fruttiBody.appendChild(smartTitle);

  const smartAll={ ...data.smart, ...data.smartCustom };
  Object.keys(smartAll).forEach(name=>{
    const isCustom=Object.prototype.hasOwnProperty.call(data.smartCustom,name);
    const row=createCounterRow(
      project,
      isCustom ? data.smartCustom : data.smart,
      name,
      name,
      isCustom
    );
    fruttiBody.appendChild(row);
  });

  const addSmartBtn=document.createElement("button");
  addSmartBtn.className="add-fruit-btn";
  addSmartBtn.innerHTML=`<span class="plus">+</span><span>Aggiungi frutto</span>`;
  addSmartBtn.addEventListener("click",()=>handleAddFruit(project,"smart"));
  fruttiBody.appendChild(addSmartBtn);
}

// Sezione Coperchi (Coperchi sopra, Derivazioni PT sotto)
async function handleAddDerivazione(project){
  const val=await openDerivModal();
  if(!val) return;

  project.data.coperchiDerivazioni=project.data.coperchiDerivazioni||{};
  const key=`Derivazione PT ${val}`;

  project.data.coperchiDerivazioni[key]=(project.data.coperchiDerivazioni[key]||0)+1;

  project.updatedAt=nowIso();
  saveState();
  renderCoperchiSection(project);
  projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
}

function renderCoperchiSection(project){
  coperchiBody.innerHTML="";

  const data=project.data||{};
  data.coperchi=data.coperchi||{};
  data.coperchiCustom=data.coperchiCustom||{};
  data.coperchiDerivazioni=data.coperchiDerivazioni||{};

  const coperchiTitle=document.createElement("div");
  coperchiTitle.className="frutti-section-title";
  coperchiTitle.textContent="Coperchi";
  coperchiBody.appendChild(coperchiTitle);

  // Derivazioni PT subito sotto "Coperchi"
  const derivHeader=document.createElement("div");
  derivHeader.className="deriv-header";
  const derivTitle=document.createElement("div");
  derivTitle.className="deriv-header-title";
  derivTitle.textContent="Derivazioni PT";
  const derivAddBtn=document.createElement("button");
  derivAddBtn.className="deriv-header-btn";
  derivAddBtn.textContent="+";
  derivAddBtn.addEventListener("click",()=>handleAddDerivazione(project));
  derivHeader.appendChild(derivTitle);
  derivHeader.appendChild(derivAddBtn);
  coperchiBody.appendChild(derivHeader);

  Object.keys(data.coperchiDerivazioni).forEach(name=>{
    const row=createCounterRow(
      project,
      data.coperchiDerivazioni,
      name,
      name,
      true
    );
    coperchiBody.appendChild(row);
  });

  coperchiBody.appendChild(document.createElement("hr")).style.border="none";

  // Lista coperchi + aggiungi
  const allCoperchi={ ...data.coperchi, ...data.coperchiCustom };
  Object.keys(allCoperchi).forEach(name=>{
    const isCustom=Object.prototype.hasOwnProperty.call(data.coperchiCustom,name);
    const row=createCounterRow(
      project,
      isCustom ? data.coperchiCustom : data.coperchi,
      name,
      name,
      isCustom
    );
    coperchiBody.appendChild(row);
  });

  const addCoperchioBtn=document.createElement("button");
  addCoperchioBtn.className="add-fruit-btn";
  addCoperchioBtn.innerHTML=`<span class="plus">+</span><span>Aggiungi coperchio</span>`;
  addCoperchioBtn.addEventListener("click", async ()=>{
    const res=await openFruitModal("coperchio");
    if(!res || !res.value) return;
    const name=res.value.trim();
    if(!name) return;

    data.coperchiCustom[name]=data.coperchiCustom[name]??0;

    project.updatedAt=nowIso();
    saveState();
    renderCoperchiSection(project);
    projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
  });
  coperchiBody.appendChild(addCoperchioBtn);
}

// Sezione SPINE
async function handleAddSpina(project){
  const res=await openFruitModal("spina");
  if(!res || !res.value) return;
  const name=res.value.trim();
  if(!name) return;
  project.data.spineCustom=project.data.spineCustom||{};
  if(project.data.spineCustom[name]==null) project.data.spineCustom[name]=0;
  project.updatedAt=nowIso();
  saveState();
  renderSpineSection(project);
  projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
}

function renderSpineSection(project){
  spineBody.innerHTML="";
  const data=project.data||{};
  data.spine=data.spine||{};
  data.spineCustom=data.spineCustom||{};

  const title=document.createElement("div");
  title.className="frutti-section-title";
  title.textContent="Spine";
  spineBody.appendChild(title);

  const allSpine={ ...data.spine, ...data.spineCustom };
  Object.keys(allSpine).forEach(name=>{
    const isCustom=Object.prototype.hasOwnProperty.call(data.spineCustom,name);
    const row=createCounterRow(
      project,
      isCustom ? data.spineCustom : data.spine,
      name,
      name,
      isCustom
    );
    spineBody.appendChild(row);
  });

  const addBtn=document.createElement("button");
  addBtn.className="add-fruit-btn";
  addBtn.innerHTML=`<span class="plus">+</span><span>Aggiungi spina</span>`;
  addBtn.addEventListener("click",()=>handleAddSpina(project));
  spineBody.appendChild(addBtn);
}

// Sezione VARIO (Partitore + Aspiratore + Illuminazione + Dispositivi extra + Custom)
async function handleAddPartitore(project){
  const res=await openPartModal();
  if(!res) return;
  const { count, type } = res;
  const label = type === "passante"
    ? `Partitore passante ${count}out`
    : `Partitore ${count}out`;

  project.data.varioList = project.data.varioList || [];
  project.data.varioList.push({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, label });

  project.updatedAt=nowIso();
  saveState();
  renderVarioSection(project);
  projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
}

async function handleAddAspiratore(project){
  const res = await openAspirModal();
  if(!res) return;
  const { size, timer } = res;
  const sizeLabel = size ? ` ${size} cm` : "";
  const label = `Aspiratore${sizeLabel}${timer ? " (Timer)" : ""}`;
  project.data.aspiratoriList = project.data.aspiratoriList || [];
  project.data.aspiratoriList.push({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, label });
  project.updatedAt=nowIso();
  saveState();
  renderVarioSection(project);
  projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
}

async function handleAddVarioCustom(project){
  const name = await openModal("Nome elemento vario","Nome elemento");
  if(!name) return;
  project.data.varioDevicesCustom = project.data.varioDevicesCustom || {};
  if(!(name in project.data.varioDevicesCustom)) project.data.varioDevicesCustom[name]=0;
  project.updatedAt=nowIso();
  saveState();
  renderVarioSection(project);
  projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
}

// Porta lampada / Lampadina (linkati, ma il minus di Porta lampada non tocca Lampadina)
function makeLinkedRow(project, counters, key, label, onPlus, onMinus){
  const row=document.createElement("div");
  row.className="frutto-row";

  const nameEl=document.createElement("div");
  nameEl.className="frutto-name";
  nameEl.textContent=label;

  const counterWrap=document.createElement("div");
  counterWrap.className="counter";

  const minus=document.createElement("button");
  minus.className="counter-btn minus";
  minus.textContent="−";

  const value=document.createElement("div");
  value.className="counter-value";

  const plus=document.createElement("button");
  plus.className="counter-btn";
  plus.textContent="+";

  const refresh=()=>{
    value.textContent = counters[key] ?? 0;
    updateCounterAppearance(value, minus, counters[key]??0, false);
  };

  minus.addEventListener("click",()=>{
    onMinus();
    project.updatedAt=nowIso();
    saveState();
    projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
    refreshAll();
  });

  plus.addEventListener("click",()=>{
    onPlus();
    project.updatedAt=nowIso();
    saveState();
    projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
    refreshAll();
  });

  counterWrap.appendChild(minus);
  counterWrap.appendChild(value);
  counterWrap.appendChild(plus);

  row.appendChild(nameEl);
  row.appendChild(counterWrap);

  const refreshAll = ()=>{ refresh(); if(refreshLinked) refreshLinked(); };
  let refreshLinked = null;

  return { row, setLinkedRefresh: fn=>{ refreshLinked=fn; }, refresh };
}

function renderVarioSection(project){
  varioBody.innerHTML="";
  const data=project.data||{};
  data.varioList=data.varioList||[];
  data.aspiratoriList=data.aspiratoriList||[];
  data.varioCounters=data.varioCounters||{ portaLampada:0, lampadina:0 };
  data.varioDevices=data.varioDevices||{
    "Relè 220v 2 contatti":0,
    "Relè 220v 4 contatti":0,
    "Dimmer leaf":0,
    "Termostato":0
  };
  data.varioDevicesCustom=data.varioDevicesCustom||{};

  // Header Partitore
  const partHeader=document.createElement("div");
  partHeader.className="deriv-header";
  const partTitle=document.createElement("div");
  partTitle.className="deriv-header-title";
  partTitle.textContent="Partitore";
  const partAddBtn=document.createElement("button");
  partAddBtn.className="deriv-header-btn";
  partAddBtn.textContent="+";
  partAddBtn.addEventListener("click",()=>handleAddPartitore(project));
  partHeader.appendChild(partTitle);
  partHeader.appendChild(partAddBtn);
  varioBody.appendChild(partHeader);

  data.varioList.forEach(entry=>{
    const row=createPartitoreRow(project, entry.id, entry.label);
    varioBody.appendChild(row);
  });

  // Header Aspiratore (distanziato)
  const aspHeader=document.createElement("div");
  aspHeader.className="deriv-header aspiratore-header";
  const aspTitle=document.createElement("div");
  aspTitle.className="deriv-header-title";
  aspTitle.textContent="Aspiratore";
  const aspAddBtn=document.createElement("button");
  aspAddBtn.className="deriv-header-btn";
  aspAddBtn.textContent="+";
  aspAddBtn.addEventListener("click",()=>handleAddAspiratore(project));
  aspHeader.appendChild(aspTitle);
  aspHeader.appendChild(aspAddBtn);
  varioBody.appendChild(aspHeader);

  data.aspiratoriList.forEach(entry=>{
    const row=createAspiratoreRow(project, entry.id, entry.label);
    varioBody.appendChild(row);
  });

  // Titolo VARIO (maiuscolo) sotto Aspiratore, distanziato
  const varioLabel=document.createElement("div");
  varioLabel.className="frutti-section-title";
  varioLabel.textContent="VARIO";
  varioLabel.style.marginTop = "12px";
  varioBody.appendChild(varioLabel);

  // Porta lampada / Lampadina
  const counters=data.varioCounters;
  const porta = makeLinkedRow(
    project, counters, "portaLampada", "Porta lampada",
    ()=>{ counters.portaLampada++; counters.lampadina++; },
    ()=>{ if(counters.portaLampada>0){ counters.portaLampada--; } } // non tocca lampadina in decremento
  );
  const lamp = makeLinkedRow(
    project, counters, "lampadina", "Lampadina",
    ()=>{ counters.lampadina++; },
    ()=>{ if(counters.lampadina>0) counters.lampadina--; }
  );
  porta.setLinkedRefresh(lamp.refresh);
  lamp.setLinkedRefresh(porta.refresh);
  porta.refresh();
  lamp.refresh();
  varioBody.appendChild(porta.row);
  varioBody.appendChild(lamp.row);

  // Dispositivi extra (base + custom)
  const allDevices = { ...data.varioDevices, ...data.varioDevicesCustom };
  Object.keys(allDevices).forEach(name=>{
    const isCustom = Object.prototype.hasOwnProperty.call(data.varioDevicesCustom, name);
    const row=createCounterRow(project, isCustom ? data.varioDevicesCustom : data.varioDevices, name, name, isCustom);
    varioBody.appendChild(row);
  });

  // Pulsante aggiungi altro
  const addOtherBtn=document.createElement("button");
  addOtherBtn.className="add-fruit-btn";
  addOtherBtn.innerHTML=`<span class="plus">+</span><span>Aggiungi altro</span>`;
  addOtherBtn.addEventListener("click",()=>handleAddVarioCustom(project));
  varioBody.appendChild(addOtherBtn);
}

// Sezione LINEE: aggiungi, mostra elenco, solo "-" rosso per rimozione
async function handleAddLinea(project){
  const name = await openModal("Nome linea","Nome linea");
  if(!name) return;
  project.data.lineeList = project.data.lineeList || [];
  project.data.lineeList.push({ id:`${Date.now()}_${Math.random().toString(16).slice(2)}`, name });
  project.updatedAt=nowIso();
  saveState();
  renderLineeSection(project);
  projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
}

function renderLineeSection(project){
  if(!lineeBody) return;
  lineeBody.innerHTML="";
  const data=project.data||{};
  data.lineeList=data.lineeList||[];

  const addBtn=document.createElement("button");
  addBtn.className="add-fruit-btn";
  addBtn.innerHTML=`<span class="plus">+</span><span>Aggiungi linea</span>`;
  addBtn.addEventListener("click",()=>handleAddLinea(project));
  lineeBody.appendChild(addBtn);

  data.lineeList.forEach(entry=>{
    const row=document.createElement("div");
    row.className="frutto-row";

    const nameEl=document.createElement("div");
    nameEl.className="frutto-name";
    nameEl.textContent=entry.name;

    const counterWrap=document.createElement("div");
    counterWrap.className="counter";

    const minus=document.createElement("button");
    minus.className="counter-btn minus force-red";
    minus.textContent="−";
    minus.addEventListener("click",()=>{
      project.data.lineeList = project.data.lineeList.filter(l=>l.id!==entry.id);
      project.updatedAt=nowIso();
      saveState();
      renderLineeSection(project);
      projectMeta.textContent=`Ultima modifica: ${formatDate(project.updatedAt)}`;
    });

    counterWrap.appendChild(minus);
    row.appendChild(nameEl);
    row.appendChild(counterWrap);
    lineeBody.appendChild(row);
  });
}

// Accordion
function toggleAccordionItem(targetItem){
  const items=accordion.querySelectorAll(".acc-item");

  items.forEach(item=>{
    const body=item.querySelector(".acc-body");
    const chevron=item.querySelector(".chevron");
    const isTarget=item===targetItem;
    const isOpen=body.classList.contains("open");

    if(isTarget){
      if(isOpen){
        body.classList.remove("open");
        chevron.textContent="▾";
      } else {
        body.classList.add("open");
        chevron.textContent="▴";
      }
    } else {
      body.classList.remove("open");
      chevron.textContent="▾";
    }
  });
}

function initAccordion(openSection){
  const items=accordion.querySelectorAll(".acc-item");

  items.forEach(item=>{
    const body=item.querySelector(".acc-body");
    const chevron=item.querySelector(".chevron");
    const section=item.getAttribute("data-section");

    if(openSection && section===openSection){
      body.classList.add("open");
      chevron.textContent="▴";
    } else {
      body.classList.remove("open");
      chevron.textContent="▾";
    }

    const btn=item.querySelector(".acc-toggle");
    btn.onclick=()=>toggleAccordionItem(item);
  });
}

// Init app
loadState();
state.projects.forEach(p=>{
  ensureBaseCoperchi(p);
  ensureBaseSpine(p);
  ensureBaseVario(p);
  ensureBaseLinee(p);
});
renderProjectsList();

if(state.selectedProjectId && getSelectedProject()){
  openProjectDetail();
} else {
  showProjectsView();
}
