const form = document.getElementById("bitacoraForm");
const tabla = document.getElementById("tablaRegistros");
const totalHorasSpan = document.getElementById("totalHoras");
const paginationContainer = document.getElementById("pagination");

let registros = [];
let currentPage = 1;
const registrosPorPagina = 10;
//
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRihrn2T9b9-vQJwlJSIInWY77Tbcd4VtF3ty_wPoxqic02ZDovHjMW8qjZd8VSJjnxPoQwT8CtBG3Z/pub?output=csv";

// Al inicio del script, justo después de declarar variables:
cargarRegistrosDesdeSheet();

// Función para leer datos:
async function cargarRegistrosDesdeSheet() {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error("HTTP status " + response.status);
    const data = await response.text();
    const filas = data.trim().split("\n").map(r => r.split(","));
    const headers = filas[0].map(h => h.trim());
    const registrosSheet = filas.slice(1).map(row => ({
      fecha: row[0]?.trim(),
      mes: row[1]?.trim(),
      actividad: row[2]?.trim(),
      detalle: row[3]?.trim(),
      cantidadHoras: parseFloat(row[4]) || 0,
      evidencia: null
    })).filter(r => r.fecha); // excluye filas vacías

    registros.push(...registrosSheet);
    mostrarRegistros();

  } catch (err) {
    console.error("Error al cargar datos desde Google Sheets:", err);
  }
}

// 🚀 Guardar registro desde el formulario
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const evidenciaInput = document.getElementById("evidencia");
  let evidenciaURL = null;

  if (evidenciaInput && evidenciaInput.files.length > 0) {
    const archivo = evidenciaInput.files[0];
    evidenciaURL = URL.createObjectURL(archivo);
  }

  const registro = {
    fecha: document.getElementById("fecha").value,
    cantidadHoras: parseFloat(document.getElementById("cantidadHoras").value),
    actividad: document.getElementById("actividad").value,
    detalle: document.getElementById("detalle").value,
    mes: document.getElementById("mes").value,
    evidencia: evidenciaURL
  };

  registros.push(registro);
  form.reset();
  mostrarRegistros();
});

// 🎯 Filtros
document.getElementById("filterFecha").addEventListener("input", () => { currentPage = 1; mostrarRegistros(); });
document.getElementById("filterMes").addEventListener("change", () => { currentPage = 1; mostrarRegistros(); });
document.getElementById("filterActividad").addEventListener("input", () => { currentPage = 1; mostrarRegistros(); });

// 📌 Mostrar registros en la tabla con paginación
function mostrarRegistros() {
  tabla.innerHTML = "";
  let totalHoras = 0;

  const filterFecha = document.getElementById("filterFecha").value;
  const filterMes = document.getElementById("filterMes").value;
  const filterActividad = document.getElementById("filterActividad").value.toLowerCase();

  const filtrados = registros.filter(r => {
    return (!filterFecha || r.fecha === filterFecha) &&
      (!filterMes || r.mes === filterMes) &&
      (!filterActividad || r.actividad.toLowerCase().includes(filterActividad));
  });

  // 📌 Calculamos totalHoras con TODOS los filtrados
  totalHoras = filtrados.reduce((sum, r) => sum + r.cantidadHoras, 0);

  // Paginación
  const totalPaginas = Math.ceil(filtrados.length / registrosPorPagina);
  if (currentPage > totalPaginas) currentPage = totalPaginas || 1;

  const inicio = (currentPage - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const paginaRegistros = filtrados.slice(inicio, fin);

  paginaRegistros.forEach((r, index) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${r.fecha}</td>
      <td>${r.cantidadHoras}</td>
      <td>${r.actividad}</td>
      <td>${r.detalle}</td>
      <td>${r.mes}</td>
      <td>
        ${r.evidencia
        ? `<button class="verBtn">Ver evidencia</button>`
        : `<input type="file" id="evidenciaInput${index}" style="display:none;">
             <button class="agregarBtn">Agregar evidencia</button>`}
      </td>
      <td>
        <button class="editarBtn">Editar</button>
      </td>
    `;
    tabla.appendChild(fila);

    // 🖼️ Ver evidencia
    if (r.evidencia) {
      fila.querySelector(".verBtn").addEventListener("click", () => verEvidencia(r.evidencia));
    } else {
      fila.querySelector(".agregarBtn").addEventListener("click", () => {
        const inputFile = document.getElementById(`evidenciaInput${index}`);
        inputFile.click();
        inputFile.onchange = () => {
          const archivo = inputFile.files[0];
          if (archivo) {
            const url = URL.createObjectURL(archivo);
            r.evidencia = url;
            mostrarRegistros();
          }
        };
      });
    }

    // ✏️ Editar registro
    fila.querySelector(".editarBtn").addEventListener("click", function () {
      if (this.textContent === "Editar") {
        // Convertir celdas en inputs
        fila.cells[0].innerHTML = `<input type="date" value="${r.fecha}">`;
        fila.cells[1].innerHTML = `<input type="number" value="${r.cantidadHoras}">`;
        fila.cells[2].innerHTML = `<input type="text" value="${r.actividad}">`;
        fila.cells[3].innerHTML = `<textarea>${r.detalle}</textarea>`;
        fila.cells[4].innerHTML = `<input type="text" value="${r.mes}">`;

        this.textContent = "Guardar";
      } else {
        // Guardar cambios
        r.fecha = fila.cells[0].querySelector("input").value;
        r.cantidadHoras = parseFloat(fila.cells[1].querySelector("input").value);
        r.actividad = fila.cells[2].querySelector("input").value;
        r.detalle = fila.cells[3].querySelector("textarea").value;
        r.mes = fila.cells[4].querySelector("input").value;

        this.textContent = "Editar";
        mostrarRegistros();
      }
    });
  });

  // ✅ Mostrar el total
  totalHorasSpan.textContent = totalHoras;

  dibujarPaginacion(totalPaginas);
}

// 📌 Controles de paginación
function dibujarPaginacion(totalPaginas) {
  paginationContainer.innerHTML = "";

  if (totalPaginas <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Anterior";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; mostrarRegistros(); };
  paginationContainer.appendChild(prevBtn);

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => { currentPage = i; mostrarRegistros(); };
    paginationContainer.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Siguiente";
  nextBtn.disabled = currentPage === totalPaginas;
  nextBtn.onclick = () => { currentPage++; mostrarRegistros(); };
  paginationContainer.appendChild(nextBtn);
}

// 🖼️ Modal
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modalImg");
const cerrar = document.querySelector(".cerrar");

function verEvidencia(src) {
  modal.style.display = "block";
  modalImg.src = src;
}

cerrar.onclick = function () {
  modal.style.display = "none";
}

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

// 📥 Cargar CSV/Excel
document.getElementById("archivoExcel").addEventListener("change", function (e) {
  const archivo = e.target.files[0];
  if (!archivo) return;

  Papa.parse(archivo, {
    header: true,
    skipEmptyLines: true,
    complete: function (resultado) {
      resultado.data.forEach(row => {
        const registro = {
          fecha: row.Fecha,
          cantidadHoras: parseFloat(row.CantidadHoras),
          actividad: row.Actividad,
          detalle: row.Detalle,
          mes: row.Mes,
          evidencia: null
        };
        registros.push(registro);
      });
      mostrarRegistros();
    }
  });
});
// =============================
// CONFIGURACIÓN
// =============================
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRihrn2T9b9-vQJwlJSIInWY77Tbcd4VtF3ty_wPoxqic02ZDovHjMW8qjZd8VSJjnxPoQwT8CtBG3Z/pub?gid=0&single=true&output=csv"; 
// 👆 Reemplaza XXXXX con tu ID de Google Sheets

// =============================
// FUNCIONES PRINCIPALES
// =============================

// Función para cargar datos desde Google Sheets (CSV)
async function cargarDesdeGoogleSheets() {
  try {
    const response = await fetch(SHEET_URL);
    const data = await response.text();

    // Convertir CSV a array de objetos
    const filas = data.split("\n").map(r => r.split(","));
    const headers = filas[0].map(h => h.trim());
    const registros = filas.slice(1).map(fila => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = fila[i] ? fila[i].trim() : "");
      return obj;
    });

    mostrarEnTabla(registros);

  } catch (error) {
    console.error("Error cargando Google Sheets:", error);
  }
}

// Mostrar registros en la tabla
function mostrarEnTabla(registros) {
  const tbody = document.querySelector("#bitacoraTable tbody");
  tbody.innerHTML = "";

  registros.forEach((registro) => {
    const row = document.createElement("tr");

    // Asume que en tu Google Sheets tenés estas columnas:
    // Fecha, Mes, Actividad, Detalle, CantidadHoras
    row.innerHTML = `
      <td>${registro["Fecha"] || ""}</td>
      <td>${registro["Mes"] || ""}</td>
      <td>${registro["Actividad"] || ""}</td>
      <td>${registro["Detalle"] || ""}</td>
      <td>${registro["CantidadHoras"] || ""}</td>
    `;

    tbody.appendChild(row);
  });

  calcularTotalHoras(registros);
}

// Calcular total de horas (si existe la columna)
function calcularTotalHoras(registros) {
  let total = 0;
  registros.forEach(r => {
    const horas = parseFloat(r["CantidadHoras"]);
    if (!isNaN(horas)) total += horas;
  });

  document.getElementById("totalHoras").textContent = `Total de horas: ${total}`;
}

// =============================
// INICIO
// =============================
document.addEventListener("DOMContentLoaded", () => {
  cargarDesdeGoogleSheets();
});

