// Chiave principale per localStorage
const STORAGE_KEY = "villani_cantieri_v1";
const BACKUP_KEY  = "villani_cantieri_backup_v1";

// Stato in memoria
let state = {
  projects: [],
  selectedProjectId: null
};

// Frutti normali base
const FRUTTI_BASE = [
  "Supporto 503","Supporto 504","Supporto 507","Falsipolo",
  "Unel","Bipasso","10A","Usb",
  "Interruttore","Deviatore","Invertitore","Pulsante","RJ45","RJ11",
  "TV Finale","TV Passante","Sali/Scendi","Tirante","Ronzatore","Supporto 502",
  "Pulsante campanello","Suoneria",
  "Pateletta 503","Pateletta 504"
];

// Smart frutti base
const SMART_BASE = [
  "Gateway",
  "Entra/Esci",
  "Giorno/Notte",
  "Deviatore",
  "Tapparella",
  "Dimmer",
  "Modulo presa",
  "Tapparella wireless",
  "Interruttore wireless"
];

// Coperchi base: da "Coperchio 503" fino a "Telefonico"
const COPERCHI_BASE = [
  "Coperchio 503",
  "Coperchio 504",
  "Coperchio 507",
  "Tondo piccolo",
  "Tondo grande",
  "Telefonico"
];

// --- Utility salvataggio sicuro ---
function saveState() {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(BACKUP_KEY, json);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.error("Errore salvataggio", e);
    alert("Attenzione: non riesco a salvare i dati in locale.");
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
    } else {
      state = { projects: [], selectedProjectId: null };
    }
  } catch (e) {
    console.warn("Errore lettura dati principali, provo da backup", e);
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        state = JSON.parse(backup);
      } else {
        state = { projects: [], selectedProjectId: null };
      }
    } catch (e2) {
      console.error("Errore lettura backup", e2);
      state = { projects: [], selectedProjectId: null };
    }
  }
}

// --- Helpers vari ---
function nowIso() { return new Date().toISOString(); }

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function getSelectedProject() {
  return state.projects.find(p => p.id === state.selectedProjectId) || null;
}

// --- Migrazione dati per Coperchi base e custom ---
function ensureBaseCoperchi(project) {
  project.data = project.data || {};
  project.data.coperchi = project.data.coperchi || {};
  project.data.coperchiCustom = project.data.coperchiCustom || {};
  COPERCHI_BASE.forEach(name => {
    if (!(name in project.data.coperchi)) {
      project.data.coperchi[name] = 0;
    }
  });
}

// --- DOM references ---
const projectsView       = document.getElementById("projectsView");
const projectDetailView  = document.getElementById("projectDetailView");
const projectsList       = document.getElementById("projectsList");
const addProjectBtn      = document.getElementById("addProjectBtn");

const modalOverlay = document.getElementById("modalOverlay");
const modalInput   = document.getElementById("modalInput");
const modalCancel  = document.getElementById("modalCancel");
const modalOk      = document.getElementById("modalOk");

const fruitModalOverlay = document.getElementById("fruitModalOverlay");
const fruitModalInput   = document.getElementById("fruitModalInput");
const fruitModalCancel  = document.getElementById("fruitModalCancel");
const fruitModalOk      = document.getElementById("fruitModalOk");
const fruitModalTitle   = document.getElementById("fruitModalTitle");

const derivModalOverlay = document.getElementById("derivModalOverlay");
const derivValueEl      = document.getElementById("derivValue");
const derivDownBtn      = document.getElementById("derivDown");
const derivUpBtn        = document.getElementById("derivUp");
const derivCancelBtn    = document.getElementById("derivCancel");
const derivOkBtn        = document.getElementById("derivOk");

const projectNameTitle  = document.getElementById("projectNameTitle");
const projectMeta       = document.getElementById("projectMeta");
const fruttiBody        = document.getElementById("fruttiBody");
const coperchiBody      = document.getElementById("coperchiBody");
const accordion         = document.getElementById("accordion");

const headerBackBtn     = document.getElementById("headerBackBtn");
const headerSubLine     = document.getElementById("headerSubLine");

// --- Modal cantiere ---
let modalResolve = null;

function setModalKeyboardMode(active, overlayEl) {
  if (!overlayEl) return;
  if (active) {
    overlayEl.classList.add("keyboard");
  } else {
    overlayEl.classList.remove("keyboard");
  }
}

function openModal(promptText = "Nome cantiere") {
  if (!modalOverlay) return null;
  document.getElementById("modalTitle").innerText = promptText;
  modalInput.value = "";
  modalOverlay.classList.remove("hidden");
  setModalKeyboardMode(false, modalOverlay);
  setTimeout(() => modalInput.focus(), 100);
  return new Promise(resolve => { modalResolve = resolve; });
}

function closeModal(value = null) {
  if (!modalOverlay) return;
  modalOverlay.classList.add("hidden");
  setModalKeyboardMode(false, modalOverlay);
  if (modalResolve) {
    modalResolve(value);
    modalResolve = null;
  }
}

if (modalCancel) modalCancel.addEventListener("click", () => closeModal(null));
if (modalOk) modalOk.addEventListener("click", () => {
  const value = modalInput.value.trim();
  if (!value) return;
  closeModal(value);
});
if (modalInput) {
  modalInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      modalOk.click();
    }
  });
  modalInput.addEventListener("focus", () => setModalKeyboardMode(true, modalOverlay));
  modalInput.addEventListener("blur",  () => setModalKeyboardMode(false, modalOverlay));
}

// --- Modal aggiungi frutto/coperchio ---
let fruitModalResolve = null;
let fruitModalContext = null; // "smart" o "normal" o "coperchio"

function openFruitModal(sectionType) {
  fruitModalContext = sectionType;
  fruitModalTitle.textContent = sectionType === "coperchio" ? "Aggiungi coperchio" : "Aggiungi frutto";
  fruitModalInput.value = "";
  fruitModalOverlay.classList.remove("hidden");
  setModalKeyboardMode(false, fruitModalOverlay);
  setTimeout(() => fruitModalInput.focus(), 100);
  return new Promise(resolve => { fruitModalResolve = resolve; });
}

function closeFruitModal(value = null) {
  fruitModalOverlay.classList.add("hidden");
  setModalKeyboardMode(false, fruitModalOverlay);
  if (fruitModalResolve) {
    fruitModalResolve({ value, type: fruitModalContext });
    fruitModalResolve = null;
    fruitModalContext = null;
  }
}

if (fruitModalCancel) fruitModalCancel.addEventListener("click", () => closeFruitModal(null));
if (fruitModalOk) fruitModalOk.addEventListener("click", () => {
  const value = fruitModalInput.value.trim();
  if (!value) return;
  closeFruitModal(value);
});
if (fruitModalInput) {
  fruitModalInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      fruitModalOk.click();
    }
  });
  fruitModalInput.addEventListener("focus", () => setModalKeyboardMode(true, fruitModalOverlay));
  fruitModalInput.addEventListener("blur",  () => setModalKeyboardMode(false, fruitModalOverlay));
}

// --- Modal Derivazione PT ---
let derivResolve = null;
let derivCurrent = 4;
const DERIV_MIN = 4;
const DERIV_MAX = 10;

function openDerivModal() {
  derivCurrent = DERIV_MIN;
  if (derivValueEl) derivValueEl.textContent = String(derivCurrent);
  derivModalOverlay.classList.remove("hidden");
  setModalKeyboardMode(false, derivModalOverlay);
  return new Promise(resolve => { derivResolve = resolve; });
}

function closeDerivModal(value = null) {
  derivModalOverlay.classList.add("hidden");
  setModalKeyboardMode(false, derivModalOverlay);
  if (derivResolve) {
    derivResolve(value);
    derivResolve = null;
  }
}

if (derivDownBtn) derivDownBtn.addEventListener("click", () => {
  if (derivCurrent > DERIV_MIN) {
    derivCurrent--;
    derivValueEl.textContent = String(derivCurrent);
  }
});
if (derivUpBtn) derivUpBtn.addEventListener("click", () => {
  if (derivCurrent < DERIV_MAX) {
    derivCurrent++;
    derivValueEl.textContent = String(derivCurrent);
  }
});
if (derivCancelBtn) derivCancelBtn.addEventListener("click", () => closeDerivModal(null));
if (derivOkBtn) derivOkBtn.addEventListener("click", () => closeDerivModal(derivCurrent));
[derivDownBtn, derivUpBtn, derivCancelBtn, derivOkBtn].forEach(el => {
  if (!el) return;
  el.addEventListener("focus", () => setModalKeyboardMode(true, derivModalOverlay));
  el.addEventListener("blur",  () => setModalKeyboardMode(false, derivModalOverlay));
});

// --- Vista cantieri ---
function renderProjectsList() {
  projectsList.innerHTML = "";
  if (!state.projects.length) {
    projectsList.innerHTML =
      `<div style="padding:12px 16px;font-size:14px;color:#777;">
        Nessun cantiere. Tocca + per crearne uno.
       </div>`;
    return;
  }

  state.projects
    .slice()
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(project => {
      const row = document.createElement("div");
      row.className = "project-item";

      const bar = document.createElement("div");
      bar.className = "project-bar";

      const main = document.createElement("div");
      main.className = "project-main";

      const name = document.createElement("div");
      name.className = "project-name";
      name.textContent = project.name;

      const meta = document.createElement("div");
      meta.className = "project-meta";
      meta.textContent = `Creato: ${formatDate(project.createdAt)}`;

      main.appendChild(name);
      main.appendChild(meta);

      row.appendChild(bar);
      row.appendChild(main);

      const delBtn = document.createElement("button");
      delBtn.className = "project-delete-btn";
      delBtn.textContent = "−";
      delBtn.addEventListener("click", e => {
        e.stopPropagation();
        if (confirm(`Vuoi eliminare il cantiere "${project.name}"?`)) {
          state.projects = state.projects.filter(p => p.id !== project.id);
          if (state.selectedProjectId === project.id) {
            state.selectedProjectId = null;
          }
          saveState();
          renderProjectsList();
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
  const name = await openModal("Nome nuovo cantiere");
  if (!name) return;

  const createdAt = nowIso();
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const fruttiData = {};
  FRUTTI_BASE.forEach(f => { fruttiData[f] = 0; });

  const smartData = {};
  SMART_BASE.forEach(f => { smartData[f] = 0; });

  const coperchiData = {};
  COPERCHI_BASE.forEach(c => { coperchiData[c] = 0; });

  const newProject = {
    id,
    name,
    createdAt,
    updatedAt: createdAt,
    data: {
      frutti: fruttiData,
      smart: smartData,
      fruttiCustom: {},
      smartCustom: {},
      coperchi: coperchiData,
      coperchiCustom: {},
      coperchiDerivazioni: {}
    }
  };

  state.projects.push(newProject);
  saveState();
  renderProjectsList();
});

// --- Navigazione ---
function showProjectsView() {
  projectsView.classList.remove("hidden");
  projectDetailView.classList.add("hidden");
  headerBackBtn.classList.add("hidden");
  headerSubLine.textContent = "";
  addProjectBtn.classList.remove("hidden");
}

function showProjectDetailView() {
  projectsView.classList.add("hidden");
  projectDetailView.classList.remove("hidden");
  headerBackBtn.classList.remove("hidden");
  addProjectBtn.classList.add("hidden");
  const project = getSelectedProject();
  headerSubLine.textContent = project ? project.name : "";
}

headerBackBtn.addEventListener("click", () => {
  state.selectedProjectId = null;
  saveState();
  showProjectsView();
});

// --- Dettaglio cantiere ---
function openProjectDetail() {
  const project = getSelectedProject();
  if (!project) {
    showProjectsView();
    return;
  }

  // Migrazione: assicura i coperchi base e inizializza coperchiCustom
  ensureBaseCoperchi(project);

  projectNameTitle.textContent = project.name;
  projectMeta.textContent =
    `Ultima modifica: ${formatDate(project.updatedAt || project.createdAt)}`;

  renderFruttiSection(project);
  renderCoperchiSection(project);
  initAccordion(null);
  showProjectDetailView();
}

// --- Helpers contatori ---
function updateCounterAppearance(valueElement, minusBtn, numericValue, isCustom) {
  valueElement.classList.remove("zero","nonzero");
  minusBtn.classList.remove("zero");
  if (numericValue > 0) {
    valueElement.classList.add("nonzero");
  } else {
    valueElement.classList.add("zero");
    if (isCustom) {
      minusBtn.classList.add("zero");
    }
  }
}

function createCounterRow(project, store, key, labelText, isCustom) {
  const row = document.createElement("div");
  row.className = "frutto-row";

  const label = document.createElement("div");
  label.className = "frutto-name";
  label.textContent = labelText;

  const counterWrap = document.createElement("div");
  counterWrap.className = "counter";

  const minus = document.createElement("button");
  minus.className = "counter-btn minus";
  minus.textContent = "−";

  const value = document.createElement("div");
  value.className = "counter-value";
  const initial = store[key] ?? 0;
  value.textContent = initial;

  const plus = document.createElement("button");
  plus.className = "counter-btn";
  plus.textContent = "+";

  updateCounterAppearance(value, minus, initial, isCustom);

  minus.addEventListener("click", () => {
    let v = Number(value.textContent) || 0;
    if (v > 0) {
      v--;
      value.textContent = v;
      store[key] = v;
      project.updatedAt = nowIso();
      updateCounterAppearance(value, minus, v, isCustom);
      saveState();
      projectMeta.textContent = `Ultima modifica: ${formatDate(project.updatedAt)}`;
    } else {
      if (!isCustom) return;
      const msg = `Vuoi rimuovere questo elemento?\n"${labelText}"`;
      if (confirm(msg)) {
        delete store[key];
        row.remove();
        project.updatedAt = nowIso();
        saveState();
        projectMeta.textContent = `Ultima modifica: ${formatDate(project.updatedAt)}`;
      }
    }
  });

  plus.addEventListener("click", () => {
    let v = Number(value.textContent) || 0;
    v++;
    value.textContent = v;
    store[key] = v;
    project.updatedAt = nowIso();
    updateCounterAppearance(value, minus, v, isCustom);
    saveState();
    projectMeta.textContent = `Ultima modifica: ${formatDate(project.updatedAt)}`;
  });

  counterWrap.appendChild(minus);
  counterWrap.appendChild(value);
  counterWrap.appendChild(plus);

  row.appendChild(label);
  row.appendChild(counterWrap);
  return row;
}

// --- Sezione FRUTTI ---
async function handleAddFruit(project, sectionType) {
  const res = await openFruitModal(sectionType);
  if (!res || !res.value) return;

  const name = res.value.trim();
  if (!name) return;

  let store;
  if (sectionType === "smart") {
    project.data.smartCustom = project.data.smartCustom || {};
    store = project.data.smartCustom;
  } else {
    project.data.fruttiCustom = project.data.fruttiCustom || {};
    store = project.data.fruttiCustom;
  }

  const key = name;
  if (store[key] == null) {
    store[key] = 0;
  }

  project.updatedAt = nowIso();
  saveState();
  renderFruttiSection(project);
  projectMeta.textContent = `Ultima modifica: ${formatDate(project.updatedAt)}`;
}

function renderFruttiSection(project) {
  fruttiBody.innerHTML = "";

  const data = project.data || {};
  data.frutti = data.frutti || {};
  data.smart = data.smart || {};
  data.fruttiCustom = data.fruttiCustom || {};
  data.smartCustom = data.smartCustom || {};

  // --- NORMALI ---
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
  addNormBtn.className = "add-fruit-btn";
  addNormBtn.innerHTML = `<span class="plus">+</span><span>Aggiungi frutto</span>`;
  addNormBtn.addEventListener("click", () => handleAddFruit(project, "normal"));
  fruttiBody.appendChild(addNormBtn);

  fruttiBody.appendChild(document.createElement("hr")).style.border = "none";

  // --- SMART ---
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
  addSmartBtn.className = "add-fruit-btn";
  addSmartBtn.innerHTML = `<span class="plus">+</span><span>Aggiungi frutto</span>`;
  addSmartBtn.addEventListener("click", () => handleAddFruit(project, "smart"));
  fruttiBody.appendChild(addSmartBtn);
}

// --- Sezione COPERCHI con Derivazioni PT ---
async function handleAddDerivazione(project) {
  const val = await openDerivModal();
  if (!val) return;

  project.data.coperchiDerivazioni = project.data.coperchiDerivazioni || {};
  const key = `Derivazione PT ${val}`;

  if (!project.data.coperchiDerivazioni[key]) {
    project.data.coperchiDerivazioni[key] = 1;
  } else {
    project.data.coperchiDerivazioni[key] += 1;
  }

  project.updatedAt = nowIso();
  saveState();
  renderCoperchiSection(project);
  projectMeta.textContent = `Ultima modifica: ${formatDate(project.updatedAt)}`;
}

function renderCoperchiSection(project) {
  coperchiBody.innerHTML = "";

  const data = project.data || {};
  data.coperchi = data.coperchi || {};
  data.coperchiCustom = data.coperchiCustom || {};
  data.coperchiDerivazioni = data.coperchiDerivazioni || {};

  // --- BLOCCO DERIVAZIONI PT ---
  const derivHeader = document.createElement("div");
  derivHeader.className = "deriv-header";

  const derivTitle = document.createElement("div");
  derivTitle.className = "deriv-header-title";
  derivTitle.textContent = "Derivazioni PT";

  const derivAddBtn = document.createElement("button");
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
      true // derivazioni PT sono custom, eliminabili
    );
    coperchiBody.appendChild(row);
  });

  coperchiBody.appendChild(document.createElement("hr")).style.border = "none";

  // --- COPERCHI NORMALI BASE + CUSTOM ---
  const coperchiTitle = document.createElement("div");
  coperchiTitle.className = "frutti-section-title";
  coperchiTitle.textContent = "Coperchi";
  coperchiBody.appendChild(coperchiTitle);

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
  addCoperchioBtn.className = "add-fruit-btn";
  addCoperchioBtn.innerHTML = `<span class="plus">+</span><span>Aggiungi coperchio</span>`;
  addCoperchioBtn.addEventListener("click", async () => {
    const res = await openFruitModal("coperchio");
    if (!res || !res.value) return;
    const name = res.value.trim();
    if (!name) return;

    data.coperchiCustom[name] = data.coperchiCustom[name] ?? 0; // aggiungi ai custom

    project.updatedAt = nowIso();
    saveState();
    renderCoperchiSection(project);
    projectMeta.textContent = `Ultima modifica: ${formatDate(project.updatedAt)}`;
  });

  coperchiBody.appendChild(addCoperchioBtn);
}

// --- Accordion: tutte chiuse, una sola aperta alla volta (display) ---
function toggleAccordionItem(targetItem) {
  const items = accordion.querySelectorAll(".acc-item");

  items.forEach(item => {
    const body = item.querySelector(".acc-body");
    const chevron = item.querySelector(".chevron");
    const isTarget = item === targetItem;
    const isOpen = body.classList.contains("open");

    if (isTarget) {
      if (isOpen) {
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

function initAccordion(openSection) {
  const items = accordion.querySelectorAll(".acc-item");

  items.forEach(item => {
    const body = item.querySelector(".acc-body");
    const chevron = item.querySelector(".chevron");
    const section = item.getAttribute("data-section");

    if (openSection && section === openSection) {
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

// --- Init app ---
loadState();

// Migra tutti i progetti esistenti per includere i nuovi coperchi base e lo store custom
state.projects.forEach(p => ensureBaseCoperchi(p));

renderProjectsList();

if (state.selectedProjectId && getSelectedProject()) {
  openProjectDetail();
} else {
  showProjectsView();
}
