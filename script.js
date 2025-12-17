/* ================================================================
   MÓDULO RESUMEN — KPIs IZQUIERDA + GASTOS DERECHA COMPACTO
================================================================ */

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRk5A0GczheFss5URcUT0kHoaCEQvnPlLHBYJNjKULyhfLgolqwjqwttJlNTr50_mzxEByQ6yaCNCPS/pub?gid=0&single=true&output=csv";

const tablaFlujo = document.querySelector(".tabla-flujo tbody");
const theadFlujo = document.querySelector(".tabla-flujo thead tr");

const totalUtilidadElem = document.querySelector(".card-saldo .saldo-principal strong");
const ingresosElem = document.querySelector(".card-saldo .saldo-detalle div:nth-child(1) span");
const egresosElem = document.querySelector(".card-saldo .saldo-detalle div:nth-child(2) span");

const resumenEmpresaSelect = document.getElementById("resumenEmpresaSelect");
const resumenHaciendaSelect = document.getElementById("resumenHaciendaSelect");

const contenedorKPIs = document.querySelector(".card-saldo");

let datosOriginales = [];
let headers = [];
const colorValor = v => v >= 0 ? "#0b5394" : "#a73b3e";

function formatoUSD(valor) {
    return new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}

// ================= CARGA CSV =================
function cargarResumen() {
    Papa.parse(SHEET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: ({ data, meta }) => {
            datosOriginales = data
                .map(f => ({
                    ...f,
                    EMPRESA: (f.EMPRESA || "").trim(),
                    HACIENDA: (f.HACIENDA || "").trim()
                }))
                .filter(f => f.EMPRESA !== "" && f.HACIENDA !== "");

            headers = meta.fields;

            llenarEmpresas();
            renderTablaResumen();
            insertarCarteraMinimalista();
        }
    });
}

function llenarEmpresas() {
    let empresas = [...new Set(datosOriginales.map(f => f.EMPRESA))];

    if (empresas.includes("GLOBAL")) {
        empresas = ["GLOBAL", ...empresas.filter(e => e !== "GLOBAL")];
    }

    resumenEmpresaSelect.innerHTML = "";
    empresas.forEach(e => resumenEmpresaSelect.append(new Option(e, e)));
    resumenEmpresaSelect.value = "GLOBAL";

    actualizarHaciendas();
}


function actualizarHaciendas() {
    const empresa = resumenEmpresaSelect.value;
    let haciendas = [...new Set(
        datosOriginales
            .filter(f => f.EMPRESA === empresa)
            .map(f => f.HACIENDA)
    )];

    if (haciendas.includes("GLOBAL")) {
        haciendas = ["GLOBAL", ...haciendas.filter(h => h !== "GLOBAL")];
    }

    resumenHaciendaSelect.innerHTML = "";
    haciendas.forEach(h => resumenHaciendaSelect.append(new Option(h, h)));
    resumenHaciendaSelect.value = "GLOBAL";
}

function filtrarDatos() {
    return datosOriginales.filter(f =>
        f.EMPRESA === resumenEmpresaSelect.value &&
        f.HACIENDA === resumenHaciendaSelect.value
    );
}

// ================= TABLA + KPIs =================
function renderTablaResumen() {
    const datos = filtrarDatos();
    const cols = headers.filter(h =>
        !h.toLowerCase().includes("empresa") &&
        !h.toLowerCase().includes("hacienda")
    );

    theadFlujo.innerHTML = "";
    let idxSEM = -1;
    let idxUtilProd = -1;

    cols.forEach((c, i) => {
        const th = document.createElement("th");
        th.textContent = c;
        const name = c.toLowerCase();
        if (name === "sem") { idxSEM = i; th.style.width = "55px"; th.style.background = "#eeeeee"; }
        if (name.includes("utilidad productiva")) { idxUtilProd = i; th.style.width = "160px"; th.style.background = "#fff6cc"; }
        theadFlujo.appendChild(th);
    });

    const totales = Object.fromEntries(cols.map(c => [c, 0]));
    tablaFlujo.innerHTML = "";

    datos.forEach(fila => {
        const tr = document.createElement("tr");
        cols.forEach((c, i) => {
            const td = document.createElement("td");
            const txt = fila[c] || "$0.00";
            const num = parseFloat(txt.replace(/[$,]/g, "")) || 0;
            totales[c] += num;
            td.textContent = txt;
            const name = c.toLowerCase();
            if (i === idxSEM) td.style.width = "55px";
            if (i === idxUtilProd) td.style.width = "160px";
            if (name.includes("total ingresos")) td.style.background = "#d8f0d8";
            if (name.includes("total egresos") || name.includes("total gastos")) td.style.background = "#f8d8d8";
            if (i === idxSEM) { td.style.background = "#f3f3f3"; td.style.fontWeight = "600"; }
            if (i === idxUtilProd) { td.style.background = num < 0 ? "#f8d8d8" : "#fff9d9"; td.style.fontWeight = "600"; }
            tr.appendChild(td);
        });
        tablaFlujo.appendChild(tr);
    });

    // Total fila
    const trTotal = document.createElement("tr");
    trTotal.className = "total";
    cols.forEach((c, i) => {
        const td = document.createElement("td");
        const name = c.toLowerCase();
        if (i === 0) { td.textContent = "TOTAL"; td.style.fontWeight = "700"; }
        else {
            const v = totales[c];
            td.textContent = formatoUSD(v);
            td.style.color = colorValor(v);
            if (name.includes("total ingresos")) td.style.background = "#b3e6b3";
            if (name.includes("total egresos") || name.includes("total gastos")) td.style.background = "#f0b3b3";
            if (i === idxUtilProd) { td.style.background = v < 0 ? "#f0b3b3" : "#ffe699"; td.style.fontWeight = "700"; td.style.fontSize = "15px"; }
        }
        if (i === idxSEM) { td.style.width = "55px"; td.style.background = "#dfdfdf"; td.style.fontWeight = "700"; }
        if (i === idxUtilProd) td.style.width = "160px";
        trTotal.appendChild(td);
    });
    tablaFlujo.appendChild(trTotal);

    // KPIs
    let totalIngresos = 0;
    let totalEgresos = 0;
    let totalUtilidad = 0;

    cols.forEach(c => {
        const v = totales[c] || 0;
        const k = c.toLowerCase();
        if (k.includes("ingresos")) { ingresosElem.textContent = formatoUSD(v); ingresosElem.style.color = "#1b5e20"; totalIngresos = v; }
        if (k.includes("egresos") || k.includes("gastos")) { egresosElem.textContent = formatoUSD(v); egresosElem.style.color = "#7a1f1f"; totalEgresos = v; }
        if (k.includes("utilidad")) { totalUtilidadElem.textContent = formatoUSD(v); totalUtilidadElem.style.color = colorValor(v); totalUtilidad = v; }
    });

    // Lista de gastos reales alineada a la derecha
    renderGastos(totalIngresos, datos, cols);
}

// ================= FUNCION LISTA DE GASTOS CON PORCENTAJES SUAVES =================
function renderGastos(totalIngresos, datos, cols) {
    const derecha = document.querySelector(".card-saldo .gastos-lista");
    derecha.innerHTML = "";
    derecha.style.display = "flex";
    derecha.style.flexDirection = "column";
    derecha.style.gap = "4px";

    const idxTotalIngreso = cols.findIndex(c => c.toLowerCase().includes("total ingresos"));
    const idxTotalEgreso = cols.findIndex(c => c.toLowerCase().includes("total egresos") || c.toLowerCase().includes("total gastos"));
    const gastosCols = cols.slice(idxTotalIngreso + 1, idxTotalEgreso);

    const maxValor = Math.max(
        totalIngresos,
        ...gastosCols.map(col => datos.reduce((sum, f) => sum + (parseFloat((f[col] || "$0.00").replace(/[$,]/g, "")) || 0), 0))
    );

    function crearBarra(labelText, valor, color) {
        const fila = document.createElement("div");
        fila.style.display = "flex";
        fila.style.alignItems = "center";

        // Label con viñeta
        const label = document.createElement("div");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.width = "140px";
        label.style.fontSize = "12px";
        label.style.fontWeight = "500";
        label.style.color = "#666";

        const viñeta = document.createElement("span");
        viñeta.style.display = "inline-block";
        viñeta.style.width = "8px";
        viñeta.style.height = "8px";
        viñeta.style.borderRadius = "50%";
        viñeta.style.backgroundColor = color;
        viñeta.style.marginRight = "6px";
        viñeta.style.flexShrink = "0";

        label.appendChild(viñeta);
        label.appendChild(document.createTextNode(labelText));

        // Barra de fondo
        const barraFondo = document.createElement("div");
        barraFondo.style.flex = "1";
        barraFondo.style.height = "12px";
        barraFondo.style.background = "#f2f2f2";
        barraFondo.style.borderRadius = "6px";
        barraFondo.style.overflow = "hidden";
        barraFondo.style.position = "relative";

        // Barra de color
        const barraColor = document.createElement("div");
        barraColor.style.height = "100%";
        barraColor.style.width = "0%";
        barraColor.style.background = color;
        barraColor.style.borderRadius = "6px";
        barraColor.style.transition = "width 0.6s ease";

        // Texto porcentaje suave
        const porcentaje = document.createElement("span");
        porcentaje.style.position = "absolute";
        porcentaje.style.right = "6px";
        porcentaje.style.top = "50%";
        porcentaje.style.transform = "translateY(-50%)";
        porcentaje.style.fontSize = "10px";
        porcentaje.style.fontWeight = "600";
        porcentaje.style.color = "#888"; // gris suave
        porcentaje.textContent = totalIngresos > 0 ? `${Math.round((valor / totalIngresos) * 100)}%` : "0%";

        barraFondo.appendChild(barraColor);
        barraFondo.appendChild(porcentaje);

        fila.appendChild(label);
        fila.appendChild(barraFondo);
        derecha.appendChild(fila);

        setTimeout(() => {
            barraColor.style.width = `${maxValor > 0 ? (valor / maxValor) * 100 : 0}%`;
        }, 50);

        return fila;
    }

    const colorIngreso = "#a8d5ba";
    const colorGasto = "#f4c2c2";

    // Total Ingresos
    crearBarra("Total Ingresos", totalIngresos, colorIngreso);

    // Barras de gastos
    gastosCols.forEach(col => {
        const valor = datos.reduce((sum, f) => sum + (parseFloat((f[col] || "$0.00").replace(/[$,]/g, "")) || 0), 0);
        crearBarra(col, valor, colorGasto);
    });
}



// ================= CARTERA MINIMALISTA + BANNER =================
function insertarCarteraMinimalista() {
    const card = document.querySelector(".card-actividad");
    if (!card || card.querySelector(".cartera-minimalista")) return;

    const empresas = [
        { nombre: "TECNIAGREX S.A.", semanas: [0, 55714.88, 0, 0] },
        { nombre: "KRASNAYA S.A.", semanas: [2264.64, 108256.51, 0, 0] }
    ];

    const totalColumnas = empresas[0].semanas.map((_, i) =>
        empresas.reduce((sum, e) => sum + e.semanas[i], 0)
    );
    const totalGlobal = totalColumnas.reduce((a, b) => a + b, 0);

    let html = `
        <div class="cartera-minimalista" style="
            border-radius:6px;
            overflow:hidden;
            background:#fafafa;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.11);
            font-family:'Segoe UI', sans-serif;
            font-size:13px;
            margin-bottom:6px;
        ">
            <div style="
                display:flex;
                font-weight:600;
                background:#ffffffff;
                color:#555;
                padding:6px 8px;
                border-bottom:1px solid #ccc;
            ">
                <div style="flex:2;">EMPRESA</div>
                <div style="flex:1; text-align:center;">SEM 48</div>
                <div style="flex:1; text-align:center;">SEM 49</div>
                <div style="flex:1; text-align:center;">SEM 50</div>
                <div style="flex:1; text-align:center;">SEM 51</div>
                <div style="flex:1; text-align:center;">TOTAL</div>
            </div>
    `;

    empresas.forEach(e => {
        const total = e.semanas.reduce((a, b) => a + b, 0);
        html += `
            <div style="
                display:flex;
                padding:6px 8px;
                border-bottom:1px solid #ddd;
                background:#fff;
            ">
                <div style="flex:2; font-weight:500;">${e.nombre}</div>
                ${e.semanas.map(s => `
                    <div style="flex:1; text-align:center; color:${s === 0 ? '#999' : '#0b5394'};">
                        ${formatoUSD(s)}
                    </div>
                `).join("")}
                <div style="
                    flex:1;
                    text-align:center;
                    font-weight:600;
                    color:${total === 0 ? '#ffffffff' : '#000'};
                ">
                    ${formatoUSD(total)}
                </div>
            </div>
        `;
    });

    html += `
        <div style="
            display:flex;
            padding:6px 8px;
            background:#f5f5f5;
            font-weight:700;
            border-top:1px solid #ccccccff;
        ">
            <div style="flex:2; text-align:right;">TOTAL</div>
            ${totalColumnas.map(t => `
                <div style="flex:1; text-align:center;">${formatoUSD(t)}</div>
            `).join("")}
            <div style="flex:1; text-align:center;">${formatoUSD(totalGlobal)}</div>
        </div>
        </div>

        <!-- BANNER INFORMATIVO -->
<div class="cartera-banner" style="
    background:#fff1f8;
    color:#757474;
    font-size:18px;
    display:flex;
    align-items:center;
    justify-content:flex-start;;
    gap:6px;
    padding:4px 6px;
    border-radius:4px;
    margin-top:14px;
">
    <span style="
        color:#db0871;
        font-weight:100;
        font-size:20px;
        line-height:1;
    ">🛈</span>
    <span>
    Valores tentativos sem 49</span>
</div>
    `;

    card.insertAdjacentHTML("beforeend", html);
}


resumenEmpresaSelect.addEventListener("change", () => {
    actualizarHaciendas();
    renderTablaResumen();
});
resumenHaciendaSelect.addEventListener("change", renderTablaResumen);

document.addEventListener("DOMContentLoaded", cargarResumen);

// ================= AGREGAR IMAGEN ENTRE TOTAL UTILIDAD E INGRESOS/EGRESOS, PEGADA A LA IZQUIERDA =================
function insertarBarritaImagen() {
    const contenedor = document.querySelector(".card-saldo");

    // Evitar duplicar la imagen
    if (contenedor.querySelector(".barrita-imagen")) return;

    const imgWrapper = document.createElement("div");
    imgWrapper.style.display = "flex";
    imgWrapper.style.justifyContent = "flex-start"; // pegada a la izquierda
    imgWrapper.style.alignItems = "center";
    imgWrapper.style.margin = "6px 0"; // margen arriba y abajo

    const img = document.createElement("img");
    img.src = "barrita.png"; // ruta local
    img.alt = "Barrita decorativa";
    img.className = "barrita-imagen";
    img.style.width = "80px"; // tamaño pequeño
    img.style.height = "auto"; 
    img.style.objectFit = "contain";

    imgWrapper.appendChild(img);

    // Insertar justo **entre Total Utilidad y Ingresos/Egresos**
    const totalUtilidadElem = contenedor.querySelector(".saldo-principal");
    totalUtilidadElem.insertAdjacentElement("afterend", imgWrapper);
}

// Llamar función después de cargar KPIs
document.addEventListener("DOMContentLoaded", () => {
    insertarBarritaImagen();
});


