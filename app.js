// Chiave principale per localStorage
const STORAGE_KEY = "villani_cantieri_v1";
const BACKUP_KEY  = "villani_cantieri_backup_v1";

// Stato in memoria
let state = {
  projects: [],       // {id, name, createdAt, updatedAt, data:{frutti:{...}}}
  selectedProjectId: null
};

// Definizione dei frutti come in screenshot
const FRUTTI_LIST = [
  "Supporto 503",
  "Supporto 504",
  "Supporto 507",
  "Falsipolo",
  "Unel",
  "Bipasso",
  "10A",
  "Usb",
  "Interruttore",
  "Deviatore"
];

// --- Utility salvataggio sicuro ---

function saveState() {
  try {
    const json = JSON.stringify(state);
    // backup prima
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

function nowIso() {
  return new Date().toISOString();
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function getSelectedProject() {
  return state.projects.find(p => p.id === state.selectedProjectId) || null;
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

const backBtn           = document.getElementById("backBtn");
const deleteProjectBtn  = document.getElementById("deleteProjectBtn");
const projectNameTitle  = document.getElementById("projectNameTitle");
const projectMeta       = document.getElementById("projectMeta");
const fruttiBody        = document.getElementById("fruttiBody");
const accordion         = document.getElementById("accordion");

// --- Modal gestione ---

let modalResolve = null;

function openModal(promptText = "Nome cantiere") {
  document.getElementById("modalTitle").innerText = promptText;
  modalInput.value = "";
  modalOverlay.classList.remove("hidden");
  // piccolo timeout per dare tempo al browser di mostrare l'overlay
  setTimeout(() => modalInput.focus(), 100);

  return new Promise(resolve => {
    modalResolve = resolve;
  });
}

function closeModal(value = null) {
  modalOverlay.classList.add("hidden");
  if (modalResolve) {
    modalResolve(value);
    modalResolve = null;
  }
}

modalCancel.addEventListener("click", () => closeModal(null));
modalOk.addEventListener("click", () => {
  const value = modalInput.value.trim();
  if (!value) return;
  closeModal(value);
});

modalInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    modalOk.click();
  }
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
      delBtn.className = "project-delete";
      delBtn.textContent = "–";
      delBtn.addEventListener("click", e => {
        e.stopPropagation();
        if (confirm(`Eliminare il cantiere "${project.name}"?`)) {
          state.projects = state.projects.filter(p => p.id !== project.id);
          if (state.selectedProjectId === project.id) {
            state.selectedProjectId = null;
          }
          saveState();
          renderProjectsList();
          showProjectsView();
        }
      });

      row.addEventListener("click", () => {
        state.selectedProjectId = project.id;
        saveState();
        openProjectDetail();
      });

      row.appendChild(delBtn);
      projectsList.appendChild(row);
    });
}

addProjectBtn.addEventListener("click", async () => {
  const name = await openModal("Nome nuovo cantiere");
  if (!name) return;

  const createdAt = nowIso();
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  // inizializza i frutti a 0
  const fruttiData = {};
  FRUTTI_LIST.forEach(f => { fruttiData[f] = 0; });

  const newProject = {
    id,
    name,
    createdAt,
    updatedAt: createdAt,
    data: {
      frutti: fruttiData
    }
  };

  state.projects.push(newProject);
  state.selectedProjectId = id;
  saveState();
  renderProjectsList();
  openProjectDetail();
});

// --- Vista dettaglio cantiere ---

function showProjectsView() {
  projectsView.classList.remove("hidden");
  projectDetailView.classList.add("hidden");
}

function showProjectDetailView() {
  projectsView.classList.add("hidden");
  projectDetailView.classList.remove("hidden");
}

backBtn.addEventListener("click", () => {
  state.selectedProjectId = null;
  saveState();
  showProjectsView();
});

// elimina cantiere dalla vista dettaglio
deleteProjectBtn.addEventListener("click", () => {
  const project = getSelectedProject();
  if (!project) return;
  if (confirm(`Eliminare il cantiere "${project.name}"?`)) {
    state.projects = state.projects.filter(p => p.id !== project.id);
    state.selectedProjectId = null;
    saveState();
    renderProjectsList();
    showProjectsView();
  }
});

function openProjectDetail() {
  const project = getSelectedProject();
  if (!project) {
    showProjectsView();
    return;
  }
  projectNameTitle.textContent = project.name;
  projectMeta.textContent =
    `Ultima modifica: ${formatDate(project.updatedAt || project.createdAt)}`;

  renderFruttiSection(project);
  initAccordion("frutti"); // apri di default Frutti
  showProjectDetailView();
}

// --- Sezione frutti ---

function renderFruttiSection(project) {
  fruttiBody.innerHTML = "";
  const data = project.data.frutti || {};
  FRUTTI_LIST.forEach(name => {
    const row = document.createElement("div");
    row.className = "frutto-row";

    const label = document.createElement("div");
    label.className = "frutto-name";
    label.textContent = name;

    const counterWrap = document.createElement("div");
    counterWrap.className = "counter";

    const minus = document.createElement("button");
    minus.className = "counter-btn";
    minus.textContent = "−";

    const value = document.createElement("div");
    value.className = "counter-value";
    value.textContent = data[name] ?? 0;

    const plus = document.createElement("button");
    plus.className = "counter-btn";
    plus.textContent = "+";

    minus.addEventListener("click", () => {
      let v = Number(value.textContent) || 0;
      if (v > 0) v--;
      value.textContent = v;
      project.data.frutti[name] = v;
      project.updatedAt = nowIso();
      saveState();
      projectMeta.textContent =
        `Ultima modifica: ${formatDate(project.updatedAt)}`;
    });

    plus.addEventListener("click", () => {
      let v = Number(value.textContent) || 0;
      v++;
      value.textContent = v;
      project.data.frutti[name] = v;
      project.updatedAt = nowIso();
      saveState();
      projectMeta.textContent =
        `Ultima modifica: ${formatDate(project.updatedAt)}`;
    });

    counterWrap.appendChild(minus);
    counterWrap.appendChild(value);
    counterWrap.appendChild(plus);

    row.appendChild(label);
    row.appendChild(counterWrap);
    fruttiBody.appendChild(row);
  });
}

// --- Accordion: uno aperto alla volta ---

function initAccordion(openSection) {
  const items = accordion.querySelectorAll(".acc-item");
  items.forEach(item => {
    const body = item.querySelector(".acc-body");
    const chevron = item.querySelector(".chevron");
    const section = item.getAttribute("data-section");
    const open = section === openSection;
    body.style.display = open ? "block" : "none";
    chevron.textContent = open ? "▴" : "▾";

    const btn = item.querySelector(".acc-toggle");
    btn.onclick = () => {
      items.forEach(it => {
        const b = it.querySelector(".acc-body");
        const c = it.querySelector(".chevron");
        if (it === item) {
          const currentlyOpen = b.style.display !== "none";
          b.style.display = currentlyOpen ? "none" : "block";
          c.textContent = currentlyOpen ? "▾" : "▴";
        } else {
          b.style.display = "none";
          c.textContent = "▾";
        }
      });
    };
  });
}

// --- Init app ---

loadState();
renderProjectsList();

if (state.selectedProjectId && getSelectedProject()) {
  openProjectDetail();
} else {
  showProjectsView();
}
