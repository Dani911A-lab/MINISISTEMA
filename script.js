/* ================================================================
   MINI SISTEMA AGRÍCOLA — MÓDULOS DINÁMICOS REFACTORIZADO
================================================================ */

const moduloBtns = document.querySelectorAll(".menu-item");
const empresaSelect = document.getElementById("empresaSelect");
const haciendaSelect = document.getElementById("haciendaSelect");
const tablaBody = document.getElementById("tablaBody");
const theadTabla = document.getElementById("theadTabla");
const tituloTabla = document.getElementById("titulo-tabla");
const tituloPrincipal = document.getElementById("titulo");
const tabsContainer = document.querySelector(".tabs");
const kpiElements = document.querySelectorAll(".kpis .kpi span");
const kpiTitles = document.querySelectorAll(".kpis .kpi h4");

let currentModule = "Producción";
let dataModules = {};
let headersModules = {};
let datosFiltrados = [];
let chart;
let tipoGrafico = null;

// URLs de Google Sheets por módulo
const sheetURLs = {
  "Producción": "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWUa0XHVhUxy79IY5bv2vppEWhA50Mye4loI4wCErMtGjSM7uP1MHWcCSb8ciUwi6YT2XO7iQhKhFq/pub?gid=0&single=true&output=csv",
  "Gastos": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGqKfSKtI7fdrgu6Ssz43ZFgXrrTf4B8fzWdKt6PAUJiRibhzE75cW9YNAN10T6cU3ORoqst4OTZiD/pub?gid=0&single=true&output=csv"
};

// ====================== UTILIDADES ======================
const num = v => +((v || "0").toString().replace(/[$,%\s]/g, "")) || 0;
const parseCSV = line => {
  let arr = [], curr = "", q = false;
  for (let ch of line) {
    if (ch === '"') { q = !q; continue; }
    if (ch === "," && !q) { arr.push(curr.trim()); curr = ""; continue; }
    curr += ch;
  }
  arr.push(curr.trim());
  return arr;
};

// ====================== CARGAR DATOS MÓDULO ======================
async function cargarDatosModulo(modulo) {
  // Si el módulo no tiene sheet, solo limpiar UI
  if (!sheetURLs[modulo]) {
    limpiarUI(modulo);
    return;
  }

  // Si ya cargamos datos, solo actualizar UI
  if (dataModules[modulo]) {
    actualizarUI();
    return;
  }

  const url = sheetURLs[modulo];
  const lines = (await (await fetch(url)).text()).split("\n").filter(Boolean);
  if (!lines.length) return;

  const headers = parseCSV(lines[0]);
  headersModules[modulo] = headers;

  const data = {};
  lines.slice(1).map(parseCSV).forEach(row => {
    const e = row[1], h = row[2];
    if (!e || !h) return;
    data[e] ??= {};
    data[e][h] ??= [];
    const obj = {};
    headers.forEach((head, idx) => obj[head] = row[idx]);
    data[e][h].push(obj);
  });

  dataModules[modulo] = data;
  actualizarUI();
}

// ====================== ACTUALIZAR UI ======================
function actualizarUI() {
  cargarEmpresas();
  empresaSelect.value = "GLOBAL";
  cargarHaciendas();
  haciendaSelect.value = "GLOBAL";
  tipoGrafico = null;
  actualizarKPIs();
  renderTabla();
  renderGrafico();
}

// ====================== LIMPIAR UI ======================
function limpiarUI(modulo) {
  tablaBody.innerHTML = "";
  theadTabla.innerHTML = "";
  kpiElements.forEach(el => el.innerText = "0");
  kpiTitles.forEach(title => title.innerText = "");
  tabsContainer.innerHTML = "";
  if (chart) chart.destroy();
  tituloTabla.innerText = `${modulo}`;
}

// ====================== SELECTORES ======================
function cargarEmpresas() {
  const data = dataModules[currentModule] || {};
  empresaSelect.innerHTML = "<option>GLOBAL</option>" +
    Object.keys(data).map(e => `<option>${e}</option>`).join("");
}

function cargarHaciendas() {
  const e = empresaSelect.value;
  const data = dataModules[currentModule] || {};
  haciendaSelect.innerHTML = "<option>GLOBAL</option>" +
    (data[e] ? Object.keys(data[e]).map(h => `<option>${h}</option>`).join("") : "");
}

// ====================== KPIs ======================
function actualizarKPIs() {
  const data = dataModules[currentModule] || {};
  const headers = headersModules[currentModule] || [];
  const e = empresaSelect.value;
  const h = haciendaSelect.value;

  const filaKPI = data[e]?.[h]?.find(x => x[headers[0]] == "0");
  if (!filaKPI) {
    kpiElements.forEach(el => el.innerText = "0");
    kpiTitles.forEach((title, idx) => title.innerText = headers[idx + 3] || `KPI${idx + 1}`);
    return;
  }

  headers.slice(3, 8).forEach((head, idx) => {
    kpiElements[idx].innerText = filaKPI[head] ?? "0";
    kpiTitles[idx].innerText = head ?? `KPI${idx + 1}`;
  });
}

// ====================== TABLA ======================
function renderTabla() {
  const data = dataModules[currentModule] || {};
  const headers = headersModules[currentModule] || [];
  const e = empresaSelect.value, h = haciendaSelect.value;

  datosFiltrados = (data[e]?.[h] || []).filter(x => x[headers[0]] != "0");

  const headersTabla = headers.filter((_, idx) => idx !== 1 && idx !== 2);

  theadTabla.innerHTML = headersTabla.map(hd => `<th>${hd}</th>`).join("");
  tablaBody.innerHTML = datosFiltrados.map(row => `<tr>${headersTabla.map(hd => `<td>${row[hd] ?? ""}</td>`).join("")}</tr>`).join("");

  tituloTabla.innerText = `${currentModule} - ${e} / ${h}`;
}

// ====================== GRÁFICO ======================
function renderGrafico(tipo = tipoGrafico) {
  const headers = headersModules[currentModule] || [];
  if (!datosFiltrados.length) {
    if (chart) chart.destroy();
    return;
  }

  if (!tipo) { tipo = headers[3]; tipoGrafico = tipo; }

  const labels = datosFiltrados.map(x => `Sem ${x[headers[0]]}`);
  const valores = datosFiltrados.map(x => num(x[tipo]));

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("grafico"), {
    type: "line",
    data: { labels, datasets: [{ label: tipo, data: valores, tension: .35, borderColor: "#ba027d", backgroundColor: "#ba027d" }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });

  // Tabs dinámicas
  tabsContainer.innerHTML = "";
  headers.slice(3, 8).forEach(head => {
    const btn = document.createElement("button");
    btn.className = "tab" + (head === tipo ? " active" : "");
    btn.innerText = head;
    btn.onclick = () => { tipoGrafico = head; renderGrafico(head); };
    tabsContainer.appendChild(btn);
  });
}

// ====================== CAMBIO DE MÓDULO ======================
moduloBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    moduloBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentModule = btn.dataset.modulo === "produccion" ? "Producción" :
                    btn.dataset.modulo === "gastos" ? "Gastos" :
                    btn.dataset.modulo === "rrhh" ? "Recursos Humanos" :
                    btn.dataset.modulo === "cxc" ? "Cuentas por Cobrar" : "";

    tituloPrincipal.innerText = currentModule;
    cargarDatosModulo(currentModule);
  });
});

// ====================== EVENTOS SELECTORES ======================
empresaSelect.addEventListener("change", () => {
  cargarHaciendas();
  haciendaSelect.value = "GLOBAL";
  actualizarKPIs();
  renderTabla();
  renderGrafico();
});

haciendaSelect.addEventListener("change", () => {
  actualizarKPIs();
  renderTabla();
  renderGrafico();
});

// ====================== INICIO ======================
cargarDatosModulo(currentModule);
