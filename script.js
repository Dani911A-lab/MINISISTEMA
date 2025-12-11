/* ================================================================
   MINI SISTEMA AGRÍCOLA — MÓDULOS DINÁMICOS CON DETALLES
================================================================ */

const moduloBtns = document.querySelectorAll(".menu-item");
const empresaSelect = document.getElementById("empresaSelect");
const haciendaSelect = document.getElementById("haciendaSelect");
const tablaBody = document.getElementById("tablaBody");
const theadTabla = document.getElementById("theadTabla");
const tituloTabla = document.getElementById("titulo-tabla");
const tituloPrincipal = document.getElementById("titulo");
const tabsContainer = document.querySelector(".tabs");
const kpisContainer = document.querySelector(".kpis");
const tablaDetalle = document.getElementById("tablaDetalle");

let currentModule = "Producción";
let dataModules = {};
let headersModules = {};
let datosFiltrados = [];
let chart = null;
let tipoGrafico = null;

let dataDetalles = null;

// URLs
const sheetURLs = {
  "Producción": "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWUa0XHVhUxy79IY5bv2vppEWhA50Mye4loI4wCErMtGjSM7uP1MHWcCSb8ciUwi6YT2XO7iQhKhFq/pub?gid=0&single=true&output=csv",
  "Gastos": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGqKfSKtI7fdrgu6Ssz43ZFgXrrTf4B8fzWdKt6PAUJiRibhzE75cW9YNAN10T6cU3ORoqst4OTZiD/pub?gid=0&single=true&output=csv",
  "Liquidaciones": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSme-Xj4jhGJVEG8QwV-plPbjvhvpEhLRY4gII1Uf85wmRBeVXa-adOqMkUl8EpQMBKvZdUg504-Zd2/pub?gid=0&single=true&output=csv"
};

const detallesURLs = {
  "Producción": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQITw3POfXAnKjpDthFO7nX3S6-hz-KtZbwI3C0LZMdu-XcGMggDEY3SmbSCxAMzdCsagvVtoDudINJ/pub?gid=0&single=true&output=csv",
  "Gastos": "https://docs.google.com/spreadsheets/d/e/2PACX-1vS3yzCzfky5TeiKNaNOcIdNeGAvotBE-RincIpCt4kOIEnV8-rLLWk4tG0xaNG6Xt2jT2FsTVqr6iC1/pub?gid=0&single=true&output=csv"
};

// ---------------------- UTILIDADES ----------------------
const num = v => +((v || "0").toString().replace(/[$,%\s]/g, "")) || 0;

// ---------------------- CARGA DATOS ----------------------
async function cargarDatosModulo(modulo) {
  if (!sheetURLs[modulo]) return;
  if (dataModules[modulo]) { actualizarUI(); return; }

  const res = await fetch(sheetURLs[modulo]);
  const csv = await res.text();
  const parsed = Papa.parse(csv.trim(), { skipEmptyLines: true });
  const lines = parsed.data;
  if (!lines.length) return;

  const headers = lines[0];
  headersModules[modulo] = headers;

  const data = {};
  for (const row of lines.slice(1)) {
    const empresa = row[1], hacienda = row[2];
    if (!empresa || !hacienda) continue;
    data[empresa] ??= {};
    data[empresa][hacienda] ??= [];
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] ?? "");
    data[empresa][hacienda].push(obj);
  }

  dataModules[modulo] = data;

  // Cargar detalles
  await cargarDetalles(modulo);

  actualizarUI();
}

// ---------------------- CARGA DETALLES ----------------------
async function cargarDetalles(modulo) {
  const url = detallesURLs[modulo];
  if (!url) return;

  const res = await fetch(url);
  const csv = await res.text();
  const parsed = Papa.parse(csv.trim(), { skipEmptyLines: true });
  const lines = parsed.data;
  if (!lines.length) return;

  const headers = lines[0].map(h => h.trim());
  const rows = lines.slice(1);

  const data = {};
  for (const row of rows) {
    const empresa = (row[1] ?? "").trim();
    const hacienda = (row[2] ?? "").trim();
    if (!empresa || !hacienda) continue;
    data[empresa] ??= {};
    data[empresa][hacienda] ??= [];
    const obj = {};
    headers.forEach((h, i) => obj[h] = (row[i] ?? "").replace(/\n/g, " ").trim());
    data[empresa][hacienda].push(obj);
  }

  dataDetalles = { data, headers };
}

// ---------------------- SELECTORES ----------------------
function actualizarUI() {
  cargarEmpresas();
  empresaSelect.value = "GLOBAL";
  cargarHaciendas();
  haciendaSelect.value = "GLOBAL";
  tipoGrafico = null;
  actualizarKPIs();
  renderTabla();
  renderGrafico();
  tablaDetalle.innerHTML = ""; // limpiar detalles al cambiar módulo
}

function cargarEmpresas() {
  const data = dataModules[currentModule] || {};
  const empresas = new Set(["GLOBAL", ...Object.keys(data)]);
  empresaSelect.innerHTML = [...empresas].map(e => `<option>${e}</option>`).join("");
}

function cargarHaciendas() {
  const e = empresaSelect.value;
  const data = dataModules[currentModule] || {};
  const haciendas = new Set(["GLOBAL", ...(data[e] ? Object.keys(data[e]) : [])]);
  haciendaSelect.innerHTML = [...haciendas].map(h => `<option>${h}</option>`).join("");
}

// ---------------------- KPIs ----------------------
function actualizarKPIs() {
  const data = dataModules[currentModule] || {};
  const headers = headersModules[currentModule] || [];
  const e = empresaSelect.value, h = haciendaSelect.value;
  const filaKPI = (data[e]?.[h] || []).find(x => x[headers[0]] == "0");

  kpisContainer.innerHTML = "";
  headers.slice(3).forEach(head => {
    const value = filaKPI ? (filaKPI[head] ?? "0") : "0";
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<h4>${head}</h4><span>${value}</span>`;
    kpisContainer.appendChild(div);
  });
}

// ---------------------- TABLA PRINCIPAL ----------------------
function renderTabla() {
  const data = dataModules[currentModule] || {};
  const headers = headersModules[currentModule] || [];
  const e = empresaSelect.value, h = haciendaSelect.value;

  datosFiltrados = (data[e]?.[h] || []).filter(r => r[headers[0]] != "0");
  const headersTabla = headers.filter((_, idx) => idx !== 1 && idx !== 2);
  theadTabla.innerHTML = headersTabla.map(hd => `<th>${hd}</th>`).join("");

  // Columna clickeable
  let colClickeable = -1;
  if (currentModule === "Producción") {
    colClickeable = headersTabla.findIndex(h => h.toLowerCase().includes("rechazado"));
  } else if (currentModule === "Gastos") {
    colClickeable = headersTabla.findIndex(h => h.toLowerCase() === "riego"); // solo Riego
  }

  tablaBody.innerHTML = datosFiltrados.map(row =>
    `<tr>${headersTabla.map((hd, colIndex) => {
      let valor = row[hd] ?? "";
      if (colIndex === colClickeable) {
        valor = `<span class="detalle-clic" data-semana="${row[headers[0]]}" data-col="${hd}">${valor}</span>`;
      }
      return `<td>${valor}</td>`;
    }).join("")}</tr>`
  ).join("");

  document.querySelectorAll(".detalle-clic").forEach(el => {
    el.addEventListener("click", () => renderDetalles(el.dataset.semana, el.dataset.col));
  });

  tituloTabla.innerText = `${currentModule} - ${e} / ${h}`;
}

// ---------------------- RENDER DETALLES ----------------------
function renderDetalles(semana, columna) {
  if (!dataDetalles) return;
  const e = empresaSelect.value.trim();
  const h = haciendaSelect.value.trim();
  const detallesRaw = dataDetalles.data[e]?.[h] || [];

  let detalles = detallesRaw.filter(d => (d.SEM ?? "").trim() === semana);

  if (currentModule === "Gastos" && columna === "Riego") {
    detalles = detalles.filter(d => (d.RUBRO ?? "").toUpperCase().includes("MATERIAL DE RIEGO"));
  }

  tablaDetalle.innerHTML = detalles.map(d =>
    `<tr>
      <td>${d.TIPO ?? ""}</td>
      <td>${d.DETALLE ?? ""}</td>
      <td>${d.VALOR ?? ""}</td>
    </tr>`
  ).join("");
}

// ---------------------- GRÁFICO ----------------------
function renderGrafico(tipo = tipoGrafico) {
  const headers = headersModules[currentModule] || [];
  if (!datosFiltrados.length || headers.length < 4) {
    tabsContainer.innerHTML = "";
    if (chart) { chart.destroy(); chart = null; }
    return;
  }
  if (!tipo) { tipo = headers[3]; tipoGrafico = tipo; }

  const labels = datosFiltrados.map(x => `Sem ${x[headers[0]]}`);
  const valores = datosFiltrados.map(x => num(x[tipo]));
  if (chart) chart.destroy();

const pointLabelsPlugin = {
  id: "pointLabels",
  beforeDatasetsDraw(chartInstance) {
    const { ctx } = chartInstance;
    chartInstance.data.datasets.forEach((dataset, i) => {
      const meta = chartInstance.getDatasetMeta(i);
      meta.data.forEach((point, index) => {
        const value = dataset.data[index];

        // Formateo con separador de miles
        const formattedValue = new Intl.NumberFormat('es-EC').format(value);

        ctx.save();
        ctx.fillStyle = "#000";
        ctx.font = "11px -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(formattedValue, point.x, point.y - 8);
        ctx.restore();
      });
    });
  }
};


  const ctx = document.getElementById("grafico");
  chart = new Chart(ctx, {
    type: "line", // seguimos usando 'line' pero con fill
    data: {
      labels,
      datasets: [{
        label: tipo,
        data: valores,
        tension: 0.4,                      // curvas suaves
        borderColor: "rgba(186,2,125,0.3)",// línea menos intensa
        backgroundColor: "rgba(186,2,125,0.25)", // área bajo la curva
        fill: true,                         // activa área
        pointRadius: 0                      // puntos invisibles
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      elements: { line: { borderWidth: 2 } },
      scales: {
        x: { grid: { display: false } },        // sin grilla vertical
        y: { grid: { color: "#e5e7eb" } }       // grilla horizontal sutil
      }
    },
    plugins: [pointLabelsPlugin]
  });

  // ---------------------- CREACIÓN DE TABS ----------------------
  tabsContainer.innerHTML = "";
  headers.slice(3).forEach(head => {
    const btn = document.createElement("button");
    btn.className = "tab" + (head === tipo ? " active" : "");
    btn.textContent = head;
    btn.onclick = () => { tipoGrafico = head; renderGrafico(head); };
    tabsContainer.appendChild(btn);
  });
}

// ---------------------- CAMBIO DE MÓDULO ----------------------
moduloBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    moduloBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentModule =
      btn.dataset.modulo === "produccion" ? "Producción" :
      btn.dataset.modulo === "gastos" ? "Gastos" :
      btn.dataset.modulo === "liquidaciones" ? "Liquidaciones" :
      btn.dataset.modulo === "cxc" ? "Cuentas por Cobrar" : currentModule;

    tituloPrincipal.innerText = currentModule;
    tablaDetalle.innerHTML = ""; // limpiar detalles al cambiar módulo

    if (!sheetURLs[currentModule]) {
      tablaBody.innerHTML = "";
      theadTabla.innerHTML = "";
      kpisContainer.innerHTML = "";
      tabsContainer.innerHTML = "";
      if (chart) { chart.destroy(); chart = null; }
      return;
    }

    cargarDatosModulo(currentModule);
  });
});


// ---------------------- EVENTOS SELECTORES ----------------------
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

// ---------------------- INICIO ----------------------
cargarDatosModulo(currentModule);
