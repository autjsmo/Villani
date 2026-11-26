// Chiavi localStorage
const STORAGE_KEY = "villani_cantieri_v1";
const BACKUP_KEY  = "villani_cantieri_backup_v1";

// Stato
let state = { projects: [], selectedProjectId: null };
let filterOnlyActive = false;
let filterQuery = "";
let projectSearchQuery = "";

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
const VARIO_DEVICES_BASE = {
  "Relè 220v 2 contatti": 0,
  "Relè 220v 4 contatti": 0,
  "Dimmer leaf": 0,
  "Termostato": 0
};

// Salvataggio
function saveState(){
  try{
    const json = JSON.stringify(state);
    localStorage.setItem(BACKUP_KEY, json);
    localStorage.setItem(STORAGE_KEY, json);
  }catch(e){
    console.error("Errore salvataggio", e);
    showToast("Attenzione: memoria piena o bloccata.", true);
  }
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? JSON.parse(raw) : { projects: [], selectedProjectId: null };
  }catch(e){
    console.warn("Errore lettura dati principali", e);
    try{
      const backup = localStorage.getItem(BACKUP_KEY);
      state = backup ? JSON.parse(backup) : { projects: [], selectedProjectId: null };
    }catch(e2){
      console.error("Errore lettura backup", e2);
      state = { projects: [], selectedProjectId: null };
    }
  }
  if(!state || !Array.isArray(state.projects)){
    state = { projects: [], selectedProjectId: null };
  }
}

// Helpers
const nowIso = () => new Date().toISOString();
function formatDate(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
const getSelectedProject = () => state.projects.find(p => p.id === state.selectedProjectId) || null;

// Migrazioni e integrità dati
function ensureBaseFrutti(project){
  project.data = project.data || {};
  project.data.frutti = project.data.frutti || {};
  project.data.smart = project.data.smart || {};
  project.data.fruttiCustom = project.data.fruttiCustom || {};
  project.data.smartCustom = project.data.smartCustom || {};
  FRUTTI_BASE.forEach(name => {
    if(!(name in project.data.frutti)) project.data.frutti[name] = 0;
  });
  SMART_BASE.forEach(name => {
    if(!(name in project.data.smart)) project.data.smart[name] = 0;
  });
}
function ensureBaseCoperchi(project){
  project.data = project.data || {};
  project.data.coperchi = project.data.coperchi || {};
  project.data.coperchiCustom = project.data.coperchiCustom || {};
  project.data.coperchiDerivazioni = project.data.coperchiDerivazioni || {};
  COPERCHI_BASE.forEach(name => {
    if(!(name in project.data.coperchi)) project.data.coperchi[name] = 0;
  });
}
function ensureBaseSpine(project){
  project.data = project.data || {};
  project.data.spine = project.data.spine || {};
  project.data.spineCustom = project.data.spineCustom || {};
  SPINE_BASE.forEach(name => {
    if(!(name in project.data.spine)) project.data.spine[name] = 0;
  });
}
function ensureBaseVario(project){
  project.data = project.data || {};
  project.data.varioList = project.data.varioList || [];       // partitori
  project.data.aspiratoriList = project.data.aspiratoriList || []; // aspiratori
  project.data.varioCounters = project.data.varioCounters || { portaLampada: 0, lampadina: 0 };
  project.data.varioDevices = project.data.varioDevices || {};
  project.data.varioDevicesCustom = project.data.varioDevicesCustom || {};
  Object.keys(VARIO_DEVICES_BASE).forEach(k => {
    if(!(k in project.data.varioDevices)) project.data.varioDevices[k] = VARIO_DEVICES_BASE[k];
  });
}
function ensureBaseLinee(project){
  project.data = project.data || {};
  project.data.lineeList = project.data.lineeList || [];
}
function ensureProjectIntegrity(project){
  ensureBaseFrutti(project);
  ensureBaseCoperchi(project);
  ensureBaseSpine(project);
  ensureBaseVario(project);
  ensureBaseLinee(project);
}

// DOM refs
const projectsView        = document.getElementById("projectsView");
const projectDetailView   = document.getElementById("projectDetailView");
const projectsList        = document.getElementById("projectsList");
const projectsCountBadge  = document.getElementById("projectsCountBadge");
const searchWrap          = document.getElementById("searchWrap");
const projectSearchInput  = document.getElementById("projectSearchInput");
const addProjectBtn       = document.getElementById("addProjectBtn");

const modalOverlay        = document.getElementById("modalOverlay");
const modalInput          = document.getElementById("modalInput");
const modalCancel         = document.getElementById("modalCancel");
const modalOk             = document.getElementById("modalOk");

const fruitModalOverlay   = document.getElementById("fruitModalOverlay");
const fruitModalInput     = document.getElementById("fruitModalInput");
const fruitModalCancel    = document.getElementById("fruitModalCancel");
const fruitModalOk        = document.getElementById("fruitModalOk");
const fruitModalTitle     = document.getElementById("fruitModalTitle");

const derivModalOverlay   = document.getElementById("derivModalOverlay");
const derivValueEl        = document.getElementById("derivValue");
const derivDownBtn        = document.getElementById("derivDown");
const derivUpBtn          = document.getElementById("derivUp");
const derivCancelBtn      = document.getElementById("derivCancel");
const derivOkBtn          = document.getElementById("derivOk");

const partModalOverlay    = document.getElementById("partModalOverlay");
const partValueEl         = document.getElementById("partValue");
const partDownBtn         = document.getElementById("partDown");
const partUpBtn           = document.getElementById("partUp");
const partCancelBtn       = document.getElementById("partCancel");
const partOkBtn           = document.getElementById("partOk");
const partRadioNormale    = document.getElementById("partRadioNormale");
const partRadioPassante   = document.getElementById("partRadioPassante");

const projectNameTitle    = document.getElementById("projectNameTitle");
const renameProjectBtn    = document.getElementById("renameProjectBtn");
const projectMeta         = document.getElementById("projectMeta");
const itemFilterInput     = document.getElementById("itemFilterInput");
const onlyActiveToggleBtn = document.getElementById("onlyActiveToggleBtn");

const fruttiBody          = document.getElementById("fruttiBody");
const coperchiBody        = document.getElementById("coperchiBody");
const spineBody           = document.getElementById("spineBody");
const varioBody           = document.getElementById("varioBody");
const lineeBody           = document.getElementById("lineeBody");
const accordion           = document.getElementById("accordion");

const headerBackBtn       = document.getElementById("headerBackBtn");
const headerSubLine       = document.getElementById("headerSubLine");
const headerCopyBtn       = document.getElementById("headerCopyBtn");

// Copy modal refs
const copyModalOverlay    = document.getElementById("copyModalOverlay");
const copyCentralino      = document.getElementById("copyCentralino");
const copyDymo            = document.getElementById("copyDymo");
const copyCitofono        = document.getElementById("copyCitofono");
const copyMorsetti        = document.getElementById("copyMorsetti");
const copyExtraInlineInput= document.getElementById("copyExtraInlineInput");
const copyAddExtraBtn     = document.getElementById("copyAddExtraBtn");
const copyExtraList       = document.getElementById("copyExtraList");
const copyPreviewBox      = document.getElementById("copyPreviewBox");
const copyCancelBtn       = document.getElementById("copyCancel");
const copyShareBtn        = document.getElementById("copyShareBtn");
const copyDoCopyBtn       = document.getElementById("copyDoCopy");

// Aspiratore modal refs
const aspirModalOverlay   = document.getElementById("aspirModalOverlay");
const aspirTimerInput     = document.getElementById("aspirTimer");
const aspirSizeInput      = document.getElementById("aspirSize");
const aspirCancelBtn      = document.getElementById("aspirCancel");
const aspirOkBtn          = document.getElementById("aspirOk");

const toastContainer      = document.getElementById("toastContainer");
const screenFlash         = document.getElementById("screenFlash");

// Stato extra per modal copia
let copyExtras = [];

// --- Feedback visivo e aptico (lampo verde su + / rosso su -) ---
function triggerActionFeedback(type, rowEl = null, badgeEl = null){
  const isAdd = type === "add";

  // 1. Flash periferico sullo schermo (visibile anche con la coda dell'occhio)
  if(screenFlash){
    screenFlash.classList.remove("flash-green", "flash-red");
    void screenFlash.offsetWidth; // force reflow per riavviare animazione rapida
    screenFlash.classList.add(isAdd ? "flash-green" : "flash-red");
  }

  // 2. Flash sulla riga
  if(rowEl){
    rowEl.classList.remove("flash-add", "flash-remove");
    void rowEl.offsetWidth;
    rowEl.classList.add(isAdd ? "flash-add" : "flash-remove");
  }

  // 3. Pulse sul contatore numerico
  if(badgeEl){
    badgeEl.classList.remove("pulse-add", "pulse-remove");
    void badgeEl.offsetWidth;
    badgeEl.classList.add(isAdd ? "pulse-add" : "pulse-remove");
  }

  // 4. Micro-vibrazione su dispositivi mobili compatibili
  if(navigator.vibrate){
    try { navigator.vibrate(isAdd ? 12 : [15, 30, 15]); } catch(_) {}
  }
}

// --- Toast Notification ---
function showToast(msg, isError = false){
  if(!toastContainer) return;
  const el = document.createElement("div");
  el.className = `toast${isError ? " error" : ""}`;
  el.textContent = msg;
  toastContainer.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 220);
  }, 2200);
}

// Scroll lock basato su conteggio modali aperti
function updateBodyScrollLock() {
  const anyOpen = document.querySelectorAll(".modal:not(.hidden)").length > 0;
  document.body.style.overflow = anyOpen ? "hidden" : "";
}

// Apertura/chiusura base modali
function openModalBase(overlayEl, focusEl) {
  overlayEl.classList.remove("hidden");
  updateBodyScrollLock();
  setTimeout(() => focusEl?.focus(), 50);
}
function closeModalBase(overlayEl) {
  overlayEl.classList.add("hidden");
  updateBodyScrollLock();
}

// Modale generico di input testo (nuovo cantiere, rinomina, quantità, ecc.)
let modalResolve = null;
function openModal(promptText = "Nome cantiere", placeholder = "Nome cantiere", initialValue = "", inputMode = "text") {
  document.getElementById("modalTitle").innerText = promptText;
  modalInput.placeholder = placeholder;
  modalInput.value = initialValue;
  modalInput.setAttribute("inputmode", inputMode);
  openModalBase(modalOverlay, modalInput);
  setTimeout(() => modalInput.select?.(), 60);
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
      : sectionType === "smart"
        ? "Aggiungi frutto smart"
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
const DERIV_MIN = 1, DERIV_MAX = 20;
function openDerivModal() {
  derivCurrent = 4;
  if(derivValueEl) derivValueEl.textContent = String(derivCurrent);
  openModalBase(derivModalOverlay, derivOkBtn);
  return new Promise((resolve) => { derivResolve = resolve; });
}
function closeDerivModal(value = null) {
  closeModalBase(derivModalOverlay);
  if (derivResolve) { derivResolve(value); derivResolve = null; }
}
derivDownBtn?.addEventListener("click", () => {
  if (derivCurrent > DERIV_MIN) {
    derivCurrent--;
    derivValueEl.textContent = String(derivCurrent);
    triggerActionFeedback("remove", null, derivValueEl);
  }
});
derivUpBtn?.addEventListener("click", () => {
  if (derivCurrent < DERIV_MAX) {
    derivCurrent++;
    derivValueEl.textContent = String(derivCurrent);
    triggerActionFeedback("add", null, derivValueEl);
  }
});

// Modale partitore (stile derivazione, radio in alto)
let partResolve = null;
let partCurrent = 4;
const PART_MIN = 1, PART_MAX = 20;
function openPartModal(){
  partCurrent = 4;
  if(partValueEl) partValueEl.textContent = String(partCurrent);
  if(partRadioNormale)  partRadioNormale.checked = true;
  if(partRadioPassante) partRadioPassante.checked = false;
  openModalBase(partModalOverlay, partOkBtn);
  return new Promise((resolve)=>{ partResolve = resolve; });
}
function closePartModal(value=null){
  closeModalBase(partModalOverlay);
  if(partResolve){ partResolve(value); partResolve=null; }
}
partDownBtn?.addEventListener("click",()=>{
  if(partCurrent>PART_MIN){
    partCurrent--;
    partValueEl.textContent=String(partCurrent);
    triggerActionFeedback("remove", null, partValueEl);
  }
});
partUpBtn?.addEventListener("click",()=>{
  if(partCurrent<PART_MAX){
    partCurrent++;
    partValueEl.textContent=String(partCurrent);
    triggerActionFeedback("add", null, partValueEl);
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

// Chiusura modali con tasto Escape o click sullo sfondo
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!modalOverlay.classList.contains("hidden")) closeModal(null);
  else if (!fruitModalOverlay.classList.contains("hidden")) closeFruitModal(null);
  else if (!derivModalOverlay.classList.contains("hidden")) closeDerivModal(null);
  else if (!partModalOverlay.classList.contains("hidden")) closePartModal(null);
  else if (!aspirModalOverlay.classList.contains("hidden")) closeAspirModal(null);
  else if (!copyModalOverlay.classList.contains("hidden")) closeCopyModal();
});

[
  [modalOverlay, () => closeModal(null)],
  [fruitModalOverlay, () => closeFruitModal(null)],
  [derivModalOverlay, () => closeDerivModal(null)],
  [partModalOverlay, () => closePartModal(null)],
  [aspirModalOverlay, () => closeAspirModal(null)],
  [copyModalOverlay, () => closeCopyModal()]
].forEach(([overlay, closeFn]) => {
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeFn();
  });
});

// --- Conteggi e Badge Sezioni ---
function sumObjectValues(obj){
  if(!obj) return 0;
  return Object.values(obj).reduce((acc, v) => acc + (Number(v) || 0), 0);
}
function getSectionTotals(project){
  const d = project?.data || {};
  const fruttiCount = sumObjectValues(d.frutti) + sumObjectValues(d.fruttiCustom) + sumObjectValues(d.smart) + sumObjectValues(d.smartCustom);
  const coperchiCount = sumObjectValues(d.coperchi) + sumObjectValues(d.coperchiCustom) + sumObjectValues(d.coperchiDerivazioni);
  const spineCount = sumObjectValues(d.spine) + sumObjectValues(d.spineCustom);
  const vc = d.varioCounters || {};
  const varioCount = (d.varioList?.length || 0) + (d.aspiratoriList?.length || 0) + (Number(vc.portaLampada) || 0) + (Number(vc.lampadina) || 0) + sumObjectValues(d.varioDevices) + sumObjectValues(d.varioDevicesCustom);
  const lineeCount = d.lineeList?.length || 0;
  return {
    frutti: fruttiCount,
    coperchi: coperchiCount,
    spine: spineCount,
    vario: varioCount,
    linee: lineeCount,
    total: fruttiCount + coperchiCount + spineCount + varioCount + lineeCount
  };
}
function updateSectionBadges(project){
  if(!project) return;
  const totals = getSectionTotals(project);
  ["frutti", "coperchi", "spine", "vario", "linee"].forEach(sec => {
    const badge = document.getElementById(`badge-${sec}`);
    if(!badge) return;
    const val = totals[sec] || 0;
    badge.textContent = String(val);
    badge.classList.toggle("hidden", val <= 0);
  });
}
function touchProject(project){
  project.updatedAt = nowIso();
  saveState();
  if(projectMeta) projectMeta.textContent = `Ultima modifica: ${formatDate(project.updatedAt)}`;
  updateSectionBadges(project);
}

// --- Filtro voci in dettaglio cantiere ---
function applyDetailFilter(){
  const q = filterQuery.trim().toLowerCase();
  const rows = projectDetailView.querySelectorAll(".frutto-row");
  rows.forEach(row => {
    const name = (row.querySelector(".frutto-name")?.textContent || "").toLowerCase();
    const valEl = row.querySelector(".counter-value");
    // Se una riga non ha counter-value (es. Partitori, Aspiratori, Linee), è già un elemento inserito (> 0)
    const count = valEl ? (Number(valEl.textContent) || 0) : 1;
    const matchText = !q || name.includes(q);
    const matchActive = !filterOnlyActive || count > 0;
    row.classList.toggle("filtered-out", !(matchText && matchActive));
  });
}
itemFilterInput?.addEventListener("input", () => {
  filterQuery = itemFilterInput.value || "";
  applyDetailFilter();
});
onlyActiveToggleBtn?.addEventListener("click", () => {
  filterOnlyActive = !filterOnlyActive;
  onlyActiveToggleBtn.classList.toggle("active", filterOnlyActive);
  applyDetailFilter();
});

// --- Copia riepilogo: testo base (righe vuote tra blocchi) ---
function buildProjectSummary(project){
  const lines = [];
  const data = project.data || {};

  const addBlock = (title, items) => {
    if (!items || items.length === 0) return;
    if (lines.length > 0) lines.push("");
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

  // Partitori (raggruppati per etichetta se multipli)
  if ((data.varioList || []).length) {
    const counts = {};
    data.varioList.forEach(e => { counts[e.label] = (counts[e.label] || 0) + 1; });
    const partItems = Object.keys(counts).map(k => counts[k] > 1 ? `${k}: ${counts[k]}` : k);
    addBlock("Partitori", partItems);
  }

  // Aspiratori (raggruppati per etichetta se multipli)
  if ((data.aspiratoriList || []).length) {
    const counts = {};
    data.aspiratoriList.forEach(e => { counts[e.label] = (counts[e.label] || 0) + 1; });
    const aspItems = Object.keys(counts).map(k => counts[k] > 1 ? `${k}: ${counts[k]}` : k);
    addBlock("Aspiratori", aspItems);
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

  // Linee
  if ((data.lineeList || []).length) {
    addBlock("Linee", data.lineeList.map((l) => l.name));
  }

  return lines.join("\n");
}

function buildFinalSummaryText(project){
  if(!project) return "";
  const base = buildProjectSummary(project);
  const selected = [];
  if(copyCentralino?.checked) selected.push("Centralino");
  if(copyDymo?.checked) selected.push("Dymo");
  if(copyCitofono?.checked) selected.push("Citofono");
  if(copyMorsetti?.checked) selected.push("Morsetti");
  copyExtras.forEach(x => selected.push(x));

  const parts = [];
  parts.push(`Cantiere: ${project.name}`);

  if(base){
    parts.push("");
    parts.push(base);
  }

  if(selected.length){
    parts.push("");
    parts.push("Altro");
    selected.forEach(x => parts.push(`- ${x}`));
  }

  if(!base && !selected.length){
    parts.push("");
    parts.push("(Nessun materiale inserito)");
  }

  return parts.join("\n");
}

function updateCopyPreview(){
  if(!copyPreviewBox) return;
  const project = getSelectedProject();
  copyPreviewBox.textContent = buildFinalSummaryText(project);
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
      triggerActionFeedback("remove");
      renderCopyExtras();
      updateCopyPreview();
    });

    row.appendChild(label);
    row.appendChild(remove);
    copyExtraList.appendChild(row);
  });
}

function addInlineCopyExtra(){
  if(!copyExtraInlineInput) return;
  const v = copyExtraInlineInput.value.trim();
  if(!v) return;
  copyExtras.push(v);
  copyExtraInlineInput.value = "";
  triggerActionFeedback("add");
  renderCopyExtras();
  updateCopyPreview();
  copyExtraInlineInput.focus();
}

function openCopyModal(){
  if(copyCentralino) copyCentralino.checked = false;
  if(copyDymo) copyDymo.checked = false;
  if(copyCitofono) copyCitofono.checked = false;
  if(copyMorsetti) copyMorsetti.checked = false;
  if(copyExtraInlineInput) copyExtraInlineInput.value = "";

  copyExtras = [];
  renderCopyExtras();
  updateCopyPreview();

  if(copyShareBtn){
    copyShareBtn.classList.toggle("hidden", typeof navigator.share !== "function");
  }

  openModalBase(copyModalOverlay, copyDoCopyBtn);
}

function closeCopyModal(){
  closeModalBase(copyModalOverlay);
}

[copyCentralino, copyDymo, copyCitofono, copyMorsetti].forEach(chk => {
  chk?.addEventListener("change", () => {
    triggerActionFeedback(chk.checked ? "add" : "remove");
    updateCopyPreview();
  });
});

copyCancelBtn?.addEventListener("click", closeCopyModal);
copyAddExtraBtn?.addEventListener("click", addInlineCopyExtra);
copyExtraInlineInput?.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){
    e.preventDefault();
    addInlineCopyExtra();
  }
});

copyShareBtn?.addEventListener("click", async () => {
  const project = getSelectedProject();
  if(!project) return;
  const finalText = buildFinalSummaryText(project);
  try{
    await navigator.share({ title: `Cantiere ${project.name}`, text: finalText });
  }catch(e){
    if(e?.name !== "AbortError") showToast("Condivisione annullata o non riuscita.", true);
  }
});

copyDoCopyBtn?.addEventListener("click", async ()=>{
  const project = getSelectedProject();
  if(!project){
    showToast("Nessun cantiere selezionato.", true);
    closeCopyModal();
    return;
  }

  const finalText = buildFinalSummaryText(project);

  try{
    await writeToClipboard(finalText);
    triggerActionFeedback("add");
    showToast("Riepilogo copiato negli appunti!");
    closeCopyModal();
  }catch(e){
    console.error("Copy failed", e);
    showToast("Non riesco a copiare negli appunti.", true);
  }
});

// --- Lista Cantieri ---
projectSearchInput?.addEventListener("input", () => {
  projectSearchQuery = projectSearchInput.value || "";
  renderProjectsList();
});

function renderProjectsList(){
  projectsList.innerHTML = "";
  const totalProjects = state.projects.length;
  if(projectsCountBadge) projectsCountBadge.textContent = String(totalProjects);
  if(searchWrap) searchWrap.classList.toggle("hidden", totalProjects < 2);

  if(!totalProjects){
    projectsList.innerHTML = `<div class="empty-state">
      Nessun cantiere presente.<br/>Tocca <strong>+</strong> in basso a destra per crearne uno.
    </div>`;
    return;
  }

  const q = projectSearchQuery.trim().toLowerCase();
  const filtered = state.projects
    .slice()
    .sort((a,b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .filter(p => !q || (p.name || "").toLowerCase().includes(q));

  if(!filtered.length){
    projectsList.innerHTML = `<div class="empty-state">
      Nessun cantiere trovato per "${projectSearchQuery.trim()}".
    </div>`;
    return;
  }

  filtered.forEach(project => {
    const row = document.createElement("div");
    row.className = "project-item";
    const bar = document.createElement("div"); bar.className = "project-bar";
    const main = document.createElement("div"); main.className = "project-main";
    const name = document.createElement("div"); name.className = "project-name"; name.textContent = project.name;

    const totals = getSectionTotals(project);
    const meta = document.createElement("div");
    meta.className = "project-meta";
    meta.textContent = `Modificato: ${formatDate(project.updatedAt || project.createdAt)} • ${totals.total} ${totals.total === 1 ? "voce" : "voci"}`;

    main.appendChild(name);
    main.appendChild(meta);
    row.appendChild(bar);
    row.appendChild(main);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "project-delete-btn";
    delBtn.textContent = "−";
    delBtn.title = "Elimina cantiere";
    delBtn.addEventListener("click", e => {
      e.stopPropagation();
      if(confirm(`Vuoi eliminare il cantiere "${project.name}"?`)){
        state.projects = state.projects.filter(p => p.id !== project.id);
        if(state.selectedProjectId === project.id) state.selectedProjectId = null;
        saveState();
        triggerActionFeedback("remove");
        renderProjectsList();
        showToast(`Cantiere "${project.name}" eliminato.`);
      }
    });
    row.appendChild(delBtn);

    row.addEventListener("click", () => {
      state.selectedProjectId = project.id;
      saveState();
      openProjectDetail();
    });
    projectsList.appendChild(row);
  });
}

addProjectBtn.addEventListener("click", async () => {
  const name = await openModal("Nome nuovo cantiere", "Nome cantiere");
  if(!name) return;
  const createdAt = nowIso();
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const newProject = {
    id, name, createdAt, updatedAt: createdAt,
    data: {}
  };
  ensureProjectIntegrity(newProject);
  state.projects.push(newProject);
  state.selectedProjectId = newProject.id;
  saveState();
  triggerActionFeedback("add");
  renderProjectsList();
  openProjectDetail();
  showToast(`Cantiere "${name}" creato!`);
});

renameProjectBtn?.addEventListener("click", async () => {
  const project = getSelectedProject();
  if(!project) return;
  const newName = await openModal("Rinomina cantiere", "Nome cantiere", project.name);
  if(!newName || newName === project.name) return;
  project.name = newName;
  projectNameTitle.textContent = project.name;
  headerSubLine.textContent = project.name;
  touchProject(project);
  renderProjectsList();
  showToast("Cantiere rinominato.");
});

// Navigazione
function showProjectsView(){
  projectsView.classList.remove("hidden");
  projectDetailView.classList.add("hidden");
  headerBackBtn.classList.add("hidden");
  headerCopyBtn.classList.add("hidden");
  headerSubLine.textContent = "";
  addProjectBtn.classList.remove("hidden");
  renderProjectsList();
}
function showProjectDetailView(){
  projectsView.classList.add("hidden");
  projectDetailView.classList.remove("hidden");
  headerBackBtn.classList.remove("hidden");
  headerCopyBtn.classList.remove("hidden");
  addProjectBtn.classList.add("hidden");
  const project = getSelectedProject();
  headerSubLine.textContent = project ? project.name : "";
}
headerBackBtn.addEventListener("click", () => {
  state.selectedProjectId = null;
  saveState();
  showProjectsView();
});
headerCopyBtn?.addEventListener("click", openCopyModal);

// Dettaglio
function openProjectDetail(){
  const project = getSelectedProject();
  if(!project){ showProjectsView(); return; }
  ensureProjectIntegrity(project);

  // Reset filtri all'apertura del cantiere
  filterQuery = "";
  filterOnlyActive = false;
  if(itemFilterInput) itemFilterInput.value = "";
  if(onlyActiveToggleBtn) onlyActiveToggleBtn.classList.remove("active");

  projectNameTitle.textContent = project.name;
  projectMeta.textContent = `Ultima modifica: ${formatDate(project.updatedAt || project.createdAt)}`;
  renderFruttiSection(project);
  renderCoperchiSection(project);
  renderSpineSection(project);
  renderVarioSection(project);
  renderLineeSection(project);
  updateSectionBadges(project);
  initAccordion(null);
  showProjectDetailView();
}

// Helpers contatori
function updateCounterAppearance(valueElement, minusBtn, numericValue, isCustom){
  valueElement.classList.remove("zero","nonzero");
  minusBtn.classList.remove("zero");
  if(numericValue > 0){
    valueElement.classList.add("nonzero");
  } else {
    valueElement.classList.add("zero");
    if(isCustom) minusBtn.classList.add("zero");
  }
}

function createCounterRow(project, store, key, labelText, isCustom, { hidePlus=false, removeOnSingleClick=false, hideValue=false } = {}){
  const row = document.createElement("div");
  row.className = "frutto-row";

  const label = document.createElement("div");
  label.className = "frutto-name";
  label.textContent = labelText;

  const counterWrap = document.createElement("div");
  counterWrap.className = "counter";

  const minus = document.createElement("button");
  minus.type = "button";
  minus.className = "counter-btn minus";
  minus.textContent = "−";

  const value = document.createElement("div");
  value.className = "counter-value";
  value.title = "Tocca per inserire la quantità manualmente";
  const initial = store[key] ?? 0;
  value.textContent = initial;

  if(hideValue){
    value.style.display = "none";
    minus.classList.add("force-red");
  }

  let plus = null;
  if(!hidePlus){
    plus = document.createElement("button");
    plus.type = "button";
    plus.className = "counter-btn";
    plus.textContent = "+";
  }

  updateCounterAppearance(value, minus, initial, isCustom);

  minus.addEventListener("click", () => {
    if(removeOnSingleClick){
      delete store[key];
      triggerActionFeedback("remove", row);
      row.remove();
      touchProject(project);
      return;
    }

    let v = Number(value.textContent) || 0;
    if(v > 0){
      v--;
      value.textContent = v;
      store[key] = v;
      updateCounterAppearance(value, minus, v, isCustom);
      triggerActionFeedback("remove", row, value);
      touchProject(project);
      applyDetailFilter();
    } else if(isCustom || hidePlus){
      const msg = `Vuoi rimuovere questo elemento?\n"${labelText}"`;
      if(confirm(msg)){
        delete store[key];
        triggerActionFeedback("remove", row);
        row.remove();
        touchProject(project);
      }
    }
  });

  if(plus){
    plus.addEventListener("click", () => {
      let v = Number(value.textContent) || 0;
      v++;
      value.textContent = v;
      store[key] = v;
      updateCounterAppearance(value, minus, v, isCustom);
      triggerActionFeedback("add", row, value);
      touchProject(project);
      applyDetailFilter();
    });
  }

  // Tocco sul valore per impostare rapidamente la quantità a mano
  if(!hideValue){
    value.addEventListener("click", async () => {
      const currentVal = Number(value.textContent) || 0;
      const inputStr = await openModal(`Quantità: ${labelText}`, "Inserisci numero", String(currentVal), "numeric");
      if(inputStr === null) return;
      const parsed = parseInt(inputStr, 10);
      if(Number.isNaN(parsed) || parsed < 0) return;
      if(parsed === currentVal) return;
      const diffType = parsed > currentVal ? "add" : "remove";
      value.textContent = parsed;
      store[key] = parsed;
      updateCounterAppearance(value, minus, parsed, isCustom);
      triggerActionFeedback(diffType, row, value);
      touchProject(project);
      applyDetailFilter();
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
  const row = document.createElement("div");
  row.className = "frutto-row";

  const nameEl = document.createElement("div");
  nameEl.className = "frutto-name";
  nameEl.textContent = label;

  const counterWrap = document.createElement("div");
  counterWrap.className = "counter";

  const minus = document.createElement("button");
  minus.type = "button";
  minus.className = "counter-btn minus force-red";
  minus.textContent = "−";
  minus.addEventListener("click", () => {
    const msg = `Vuoi rimuovere questo elemento?\n"${label}"`;
    if(!confirm(msg)) return;
    project.data.varioList = project.data.varioList.filter(e => e.id !== entryId);
    triggerActionFeedback("remove", row);
    touchProject(project);
    renderVarioSection(project);
  });

  counterWrap.appendChild(minus);
  row.appendChild(nameEl);
  row.appendChild(counterWrap);
  return row;
}

// Aspiratore (lista, multi-entry, conferma su rimozione)
function createAspiratoreRow(project, entryId, label){
  const row = document.createElement("div");
  row.className = "frutto-row";

  const nameEl = document.createElement("div");
  nameEl.className = "frutto-name";
  nameEl.textContent = label;

  const counterWrap = document.createElement("div");
  counterWrap.className = "counter";

  const minus = document.createElement("button");
  minus.type = "button";
  minus.className = "counter-btn minus force-red";
  minus.textContent = "−";
  minus.addEventListener("click", () => {
    const msg = `Vuoi rimuovere questo elemento?\n"${label}"`;
    if(!confirm(msg)) return;
    project.data.aspiratoriList = project.data.aspiratoriList.filter(e => e.id !== entryId);
    triggerActionFeedback("remove", row);
    touchProject(project);
    renderVarioSection(project);
  });

  counterWrap.appendChild(minus);
  row.appendChild(nameEl);
  row.appendChild(counterWrap);
  return row;
}

// Sezione FRUTTI
async function handleAddFruit(project, sectionType){
  const res = await openFruitModal(sectionType);
  if(!res || !res.value) return;

  const name = res.value.trim();
  if(!name) return;

  let store;
  if(sectionType === "smart"){
    project.data.smartCustom = project.data.smartCustom || {};
    store = project.data.smartCustom;
  } else {
    project.data.fruttiCustom = project.data.fruttiCustom || {};
    store = project.data.fruttiCustom;
  }

  store[name] = (store[name] ?? 0) + 1;

  touchProject(project);
  renderFruttiSection(project);
  triggerActionFeedback("add");
}

function renderFruttiSection(project){
  fruttiBody.innerHTML = "";

  const data = project.data || {};
  data.frutti = data.frutti || {};
  data.smart = data.smart || {};
  data.fruttiCustom = data.fruttiCustom || {};
  data.smartCustom = data.smartCustom || {};

  const normTitle = document.createElement("div");
  normTitle.className = "frutti-section-title";
  normTitle.textContent = "Normali";
  fruttiBody.appendChild(normTitle);

  const normAll = { ...data.frutti, ...data.fruttiCustom };
  Object.keys(normAll).forEach(name => {
    const isCustom = Object.prototype.hasOwnProperty.call(data.fruttiCustom, name);
    const row = createCounterRow(
      project,
      isCustom ? data.fruttiCustom : data.frutti,
      name,
      name,
      isCustom
    );
    fruttiBody.appendChild(row);
  });

  const addNormBtn = document.createElement("button");
  addNormBtn.type = "button";
  addNormBtn.className = "add-fruit-btn";
  addNormBtn.innerHTML = `<span class="plus">+</span><span>Aggiungi frutto</span>`;
  addNormBtn.addEventListener("click", () => handleAddFruit(project, "normal"));
  fruttiBody.appendChild(addNormBtn);

  const hr = document.createElement("hr");
  hr.className = "section-divider";
  fruttiBody.appendChild(hr);

  const smartTitle = document.createElement("div");
  smartTitle.className = "frutti-section-title";
  smartTitle.textContent = "Smart";
  fruttiBody.appendChild(smartTitle);

  const smartAll = { ...data.smart, ...data.smartCustom };
  Object.keys(smartAll).forEach(name => {
    const isCustom = Object.prototype.hasOwnProperty.call(data.smartCustom, name);
    const row = createCounterRow(
      project,
      isCustom ? data.smartCustom : data.smart,
      name,
      name,
      isCustom
    );
    fruttiBody.appendChild(row);
  });

  const addSmartBtn = document.createElement("button");
  addSmartBtn.type = "button";
  addSmartBtn.className = "add-fruit-btn";
  addSmartBtn.innerHTML = `<span class="plus">+</span><span>Aggiungi frutto smart</span>`;
  addSmartBtn.addEventListener("click", () => handleAddFruit(project, "smart"));
  fruttiBody.appendChild(addSmartBtn);

  applyDetailFilter();
}

// Sezione Coperchi (Coperchi sopra, Derivazioni PT sotto)
async function handleAddDerivazione(project){
  const val = await openDerivModal();
  if(!val) return;

  project.data.coperchiDerivazioni = project.data.coperchiDerivazioni || {};
  const key = `Derivazione PT ${val}`;

  project.data.coperchiDerivazioni[key] = (project.data.coperchiDerivazioni[key] || 0) + 1;

  touchProject(project);
  renderCoperchiSection(project);
  triggerActionFeedback("add");
}

function renderCoperchiSection(project){
  coperchiBody.innerHTML = "";

  const data = project.data || {};
  data.coperchi = data.coperchi || {};
  data.coperchiCustom = data.coperchiCustom || {};
  data.coperchiDerivazioni = data.coperchiDerivazioni || {};

  const coperchiTitle = document.createElement("div");
  coperchiTitle.className = "frutti-section-title";
  coperchiTitle.textContent = "Coperchi";
  coperchiBody.appendChild(coperchiTitle);

  // Derivazioni PT subito sotto "Coperchi"
  const derivHeader = document.createElement("div");
  derivHeader.className = "deriv-header";
  const derivTitle = document.createElement("div");
  derivTitle.className = "deriv-header-title";
  derivTitle.textContent = "Derivazioni PT";
  const derivAddBtn = document.createElement("button");
  derivAddBtn.type = "button";
  derivAddBtn.className = "deriv-header-btn";
  derivAddBtn.textContent = "+";
  derivAddBtn.addEventListener("click", () => handleAddDerivazione(project));
  derivHeader.appendChild(derivTitle);
  derivHeader.appendChild(derivAddBtn);
  coperchiBody.appendChild(derivHeader);

  Object.keys(data.coperchiDerivazioni).forEach(name => {
    const row = createCounterRow(
      project,
      data.coperchiDerivazioni,
      name,
      name,
      true
    );
    coperchiBody.appendChild(row);
  });

  const hr = document.createElement("hr");
  hr.className = "section-divider";
  coperchiBody.appendChild(hr);

  // Lista coperchi + aggiungi
  const allCoperchi = { ...data.coperchi, ...data.coperchiCustom };
  Object.keys(allCoperchi).forEach(name => {
    const isCustom = Object.prototype.hasOwnProperty.call(data.coperchiCustom, name);
    const row = createCounterRow(
      project,
      isCustom ? data.coperchiCustom : data.coperchi,
      name,
      name,
      isCustom
    );
    coperchiBody.appendChild(row);
  });

  const addCoperchioBtn = document.createElement("button");
  addCoperchioBtn.type = "button";
  addCoperchioBtn.className = "add-fruit-btn";
  addCoperchioBtn.innerHTML = `<span class="plus">+</span><span>Aggiungi coperchio</span>`;
  addCoperchioBtn.addEventListener("click", async () => {
    const res = await openFruitModal("coperchio");
    if(!res || !res.value) return;
    const name = res.value.trim();
    if(!name) return;

    data.coperchiCustom[name] = (data.coperchiCustom[name] ?? 0) + 1;

    touchProject(project);
    renderCoperchiSection(project);
    triggerActionFeedback("add");
  });
  coperchiBody.appendChild(addCoperchioBtn);

  applyDetailFilter();
}

// Sezione SPINE
async function handleAddSpina(project){
  const res = await openFruitModal("spina");
  if(!res || !res.value) return;
  const name = res.value.trim();
  if(!name) return;
  project.data.spineCustom = project.data.spineCustom || {};
  project.data.spineCustom[name] = (project.data.spineCustom[name] ?? 0) + 1;
  touchProject(project);
  renderSpineSection(project);
  triggerActionFeedback("add");
}

function renderSpineSection(project){
  spineBody.innerHTML = "";
  const data = project.data || {};
  data.spine = data.spine || {};
  data.spineCustom = data.spineCustom || {};

  const title = document.createElement("div");
  title.className = "frutti-section-title";
  title.textContent = "Spine";
  spineBody.appendChild(title);

  const allSpine = { ...data.spine, ...data.spineCustom };
  Object.keys(allSpine).forEach(name => {
    const isCustom = Object.prototype.hasOwnProperty.call(data.spineCustom, name);
    const row = createCounterRow(
      project,
      isCustom ? data.spineCustom : data.spine,
      name,
      name,
      isCustom
    );
    spineBody.appendChild(row);
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-fruit-btn";
  addBtn.innerHTML = `<span class="plus">+</span><span>Aggiungi spina</span>`;
  addBtn.addEventListener("click", () => handleAddSpina(project));
  spineBody.appendChild(addBtn);

  applyDetailFilter();
}

// Sezione VARIO (Partitore + Aspiratore + Illuminazione + Dispositivi extra + Custom)
async function handleAddPartitore(project){
  const res = await openPartModal();
  if(!res) return;
  const { count, type } = res;
  const label = type === "passante"
    ? `Partitore passante ${count}out`
    : `Partitore ${count}out`;

  project.data.varioList = project.data.varioList || [];
  project.data.varioList.push({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, label });

  touchProject(project);
  renderVarioSection(project);
  triggerActionFeedback("add");
}

async function handleAddAspiratore(project){
  const res = await openAspirModal();
  if(!res) return;
  const { size, timer } = res;
  const sizeLabel = size ? ` ${size} cm` : "";
  const label = `Aspiratore${sizeLabel}${timer ? " (Timer)" : ""}`;
  project.data.aspiratoriList = project.data.aspiratoriList || [];
  project.data.aspiratoriList.push({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, label });
  touchProject(project);
  renderVarioSection(project);
  triggerActionFeedback("add");
}

async function handleAddVarioCustom(project){
  const name = await openModal("Nome elemento vario", "Nome elemento");
  if(!name) return;
  project.data.varioDevicesCustom = project.data.varioDevicesCustom || {};
  project.data.varioDevicesCustom[name] = (project.data.varioDevicesCustom[name] ?? 0) + 1;
  touchProject(project);
  renderVarioSection(project);
  triggerActionFeedback("add");
}

// Porta lampada / Lampadina (linkati, ma il minus di Porta lampada non tocca Lampadina)
function makeLinkedRow(project, counters, key, label, onPlus, onMinus){
  const row = document.createElement("div");
  row.className = "frutto-row";

  const nameEl = document.createElement("div");
  nameEl.className = "frutto-name";
  nameEl.textContent = label;

  const counterWrap = document.createElement("div");
  counterWrap.className = "counter";

  const minus = document.createElement("button");
  minus.type = "button";
  minus.className = "counter-btn minus";
  minus.textContent = "−";

  const value = document.createElement("div");
  value.className = "counter-value";
  value.title = "Tocca per inserire la quantità manualmente";

  const plus = document.createElement("button");
  plus.type = "button";
  plus.className = "counter-btn";
  plus.textContent = "+";

  const refresh = () => {
    value.textContent = counters[key] ?? 0;
    updateCounterAppearance(value, minus, counters[key] ?? 0, false);
  };

  minus.addEventListener("click", () => {
    const before = counters[key] ?? 0;
    if(before <= 0) return;
    onMinus();
    refreshAll();
    triggerActionFeedback("remove", row, value);
    touchProject(project);
    applyDetailFilter();
  });

  plus.addEventListener("click", () => {
    onPlus();
    refreshAll();
    triggerActionFeedback("add", row, value);
    touchProject(project);
    applyDetailFilter();
  });

  value.addEventListener("click", async () => {
    const currentVal = counters[key] ?? 0;
    const inputStr = await openModal(`Quantità: ${label}`, "Inserisci numero", String(currentVal), "numeric");
    if(inputStr === null) return;
    const parsed = parseInt(inputStr, 10);
    if(Number.isNaN(parsed) || parsed < 0 || parsed === currentVal) return;
    const diffType = parsed > currentVal ? "add" : "remove";
    counters[key] = parsed;
    refreshAll();
    triggerActionFeedback(diffType, row, value);
    touchProject(project);
    applyDetailFilter();
  });

  counterWrap.appendChild(minus);
  counterWrap.appendChild(value);
  counterWrap.appendChild(plus);

  row.appendChild(nameEl);
  row.appendChild(counterWrap);

  const refreshAll = () => { refresh(); if(refreshLinked) refreshLinked(); };
  let refreshLinked = null;

  return { row, value, setLinkedRefresh: fn => { refreshLinked = fn; }, refresh };
}

function renderVarioSection(project){
  varioBody.innerHTML = "";
  const data = project.data || {};
  data.varioList = data.varioList || [];
  data.aspiratoriList = data.aspiratoriList || [];
  data.varioCounters = data.varioCounters || { portaLampada: 0, lampadina: 0 };
  data.varioDevices = data.varioDevices || { ...VARIO_DEVICES_BASE };
  data.varioDevicesCustom = data.varioDevicesCustom || {};

  // Header Partitore
  const partHeader = document.createElement("div");
  partHeader.className = "deriv-header";
  const partTitle = document.createElement("div");
  partTitle.className = "deriv-header-title";
  partTitle.textContent = "Partitore";
  const partAddBtn = document.createElement("button");
  partAddBtn.type = "button";
  partAddBtn.className = "deriv-header-btn";
  partAddBtn.textContent = "+";
  partAddBtn.addEventListener("click", () => handleAddPartitore(project));
  partHeader.appendChild(partTitle);
  partHeader.appendChild(partAddBtn);
  varioBody.appendChild(partHeader);

  data.varioList.forEach(entry => {
    const row = createPartitoreRow(project, entry.id, entry.label);
    varioBody.appendChild(row);
  });

  // Header Aspiratore (distanziato)
  const aspHeader = document.createElement("div");
  aspHeader.className = "deriv-header aspiratore-header";
  const aspTitle = document.createElement("div");
  aspTitle.className = "deriv-header-title";
  aspTitle.textContent = "Aspiratore";
  const aspAddBtn = document.createElement("button");
  aspAddBtn.type = "button";
  aspAddBtn.className = "deriv-header-btn";
  aspAddBtn.textContent = "+";
  aspAddBtn.addEventListener("click", () => handleAddAspiratore(project));
  aspHeader.appendChild(aspTitle);
  aspHeader.appendChild(aspAddBtn);
  varioBody.appendChild(aspHeader);

  data.aspiratoriList.forEach(entry => {
    const row = createAspiratoreRow(project, entry.id, entry.label);
    varioBody.appendChild(row);
  });

  // Titolo VARIO (maiuscolo) sotto Aspiratore, distanziato
  const varioLabel = document.createElement("div");
  varioLabel.className = "frutti-section-title";
  varioLabel.textContent = "VARIO";
  varioLabel.style.marginTop = "12px";
  varioBody.appendChild(varioLabel);

  // Porta lampada / Lampadina
  const counters = data.varioCounters;
  let lampObj = null;
  const porta = makeLinkedRow(
    project, counters, "portaLampada", "Porta lampada",
    () => {
      counters.portaLampada++;
      counters.lampadina++;
      if(lampObj){
        lampObj.row.classList.remove("flash-add");
        void lampObj.row.offsetWidth;
        lampObj.row.classList.add("flash-add");
      }
    },
    () => { if(counters.portaLampada > 0){ counters.portaLampada--; } }
  );
  const lamp = makeLinkedRow(
    project, counters, "lampadina", "Lampadina",
    () => { counters.lampadina++; },
    () => { if(counters.lampadina > 0) counters.lampadina--; }
  );
  lampObj = lamp;
  porta.setLinkedRefresh(lamp.refresh);
  lamp.setLinkedRefresh(porta.refresh);
  porta.refresh();
  lamp.refresh();
  varioBody.appendChild(porta.row);
  varioBody.appendChild(lamp.row);

  // Dispositivi extra (base + custom)
  const allDevices = { ...data.varioDevices, ...data.varioDevicesCustom };
  Object.keys(allDevices).forEach(name => {
    const isCustom = Object.prototype.hasOwnProperty.call(data.varioDevicesCustom, name);
    const row = createCounterRow(project, isCustom ? data.varioDevicesCustom : data.varioDevices, name, name, isCustom);
    varioBody.appendChild(row);
  });

  // Pulsante aggiungi altro
  const addOtherBtn = document.createElement("button");
  addOtherBtn.type = "button";
  addOtherBtn.className = "add-fruit-btn";
  addOtherBtn.innerHTML = `<span class="plus">+</span><span>Aggiungi altro</span>`;
  addOtherBtn.addEventListener("click", () => handleAddVarioCustom(project));
  varioBody.appendChild(addOtherBtn);

  applyDetailFilter();
}

// Sezione LINEE: aggiungi, mostra elenco, "-" rosso con conferma per rimozione
async function handleAddLinea(project){
  const name = await openModal("Nome linea", "Nome linea");
  if(!name) return;
  project.data.lineeList = project.data.lineeList || [];
  project.data.lineeList.push({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, name });
  touchProject(project);
  renderLineeSection(project);
  triggerActionFeedback("add");
}

function renderLineeSection(project){
  if(!lineeBody) return;
  lineeBody.innerHTML = "";
  const data = project.data || {};
  data.lineeList = data.lineeList || [];

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-fruit-btn";
  addBtn.innerHTML = `<span class="plus">+</span><span>Aggiungi linea</span>`;
  addBtn.addEventListener("click", () => handleAddLinea(project));
  lineeBody.appendChild(addBtn);

  data.lineeList.forEach(entry => {
    const row = document.createElement("div");
    row.className = "frutto-row";

    const nameEl = document.createElement("div");
    nameEl.className = "frutto-name";
    nameEl.textContent = entry.name;

    const counterWrap = document.createElement("div");
    counterWrap.className = "counter";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "counter-btn minus force-red";
    minus.textContent = "−";
    minus.addEventListener("click", () => {
      if(!confirm(`Vuoi rimuovere la linea "${entry.name}"?`)) return;
      project.data.lineeList = project.data.lineeList.filter(l => l.id !== entry.name && l.id !== entry.id);
      triggerActionFeedback("remove", row);
      touchProject(project);
      renderLineeSection(project);
    });

    counterWrap.appendChild(minus);
    row.appendChild(nameEl);
    row.appendChild(counterWrap);
    lineeBody.appendChild(row);
  });

  applyDetailFilter();
}

// Accordion
function toggleAccordionItem(targetItem){
  const items = accordion.querySelectorAll(".acc-item");

  items.forEach(item => {
    const body = item.querySelector(".acc-body");
    const chevron = item.querySelector(".chevron");
    const isTarget = item === targetItem;
    const isOpen = body.classList.contains("open");

    if(isTarget){
      if(isOpen){
        body.classList.remove("open");
        chevron.textContent = "▾";
      } else {
        body.classList.add("open");
        chevron.textContent = "▴";
      }
    } else {
      body.classList.remove("open");
      chevron.textContent = "▾";
    }
  });
}

function initAccordion(openSection){
  const items = accordion.querySelectorAll(".acc-item");

  items.forEach(item => {
    const body = item.querySelector(".acc-body");
    const chevron = item.querySelector(".chevron");
    const section = item.getAttribute("data-section");

    if(openSection && section === openSection){
      body.classList.add("open");
      chevron.textContent = "▴";
    } else {
      body.classList.remove("open");
      chevron.textContent = "▾";
    }

    const btn = item.querySelector(".acc-toggle");
    btn.onclick = () => toggleAccordionItem(item);
  });
}

// Init app
loadState();
state.projects.forEach(p => ensureProjectIntegrity(p));
renderProjectsList();

if(state.selectedProjectId && getSelectedProject()){
  openProjectDetail();
} else {
  showProjectsView();
}
