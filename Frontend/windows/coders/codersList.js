// Fetches the coders list from the backend API, renders the table, and handles document search.

const tbody = document.getElementById("lista-coders");
const formBusqueda = document.getElementById("form-busqueda");
const inputDocumento = document.getElementById("input-documento");

// Fetches coders from the backend, optionally filtered by document number, and renders the table.
async function getCoders(documento = "") {
  try {
    let url = "http://localhost:3000/api/coders";
    if (documento !== "") url += `?document=${encodeURIComponent(documento)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not fetch coders from server");

    const coders = await response.json();
    renderCoders(coders);
  } catch (error) {
    console.error("Error in getCoders:", error);
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error al cargar los datos</td></tr>`;
  }
}

// Builds and inserts a table row for each coder with a color-coded grade badge and a profile link.
function renderCoders(codersList) {
  if (!tbody) return;
  tbody.innerHTML = "";

  if (codersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center">No se encontraron resultados</td></tr>`;
    return;
  }

  codersList.forEach((coder) => {
    const nota = parseFloat(coder.grade) || 0;
    let colorBadge = "bg-success";
    if (nota < 50) colorBadge = "bg-danger";
    else if (nota >= 50 && nota <= 70) colorBadge = "bg-warning";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${coder.id}</td>
      <td>${coder.name}</td>
      <td>${coder.lastname}</td>
      <td>${coder.document}</td>
      <td>${coder.email}</td>
      <td>${coder.cel}</td>
      <td>${coder.clan}</td>
      <td>${coder.shift}</td>
      <td><span class="badge ${colorBadge}">${nota}</span></td>
      <td>
        <a href="coder_profile.html?id=${coder.id}" class="btn btn-warning btn-sm">
          <i class="bi bi-search"></i>
        </a>
      </td>`;
    tbody.appendChild(row);
  });
}

// Listens for the search form submission and triggers a filtered fetch based on the typed document number.
if (formBusqueda) {
  formBusqueda.addEventListener("submit", (e) => {
    e.preventDefault();
    getCoders(inputDocumento.value.trim());
  });
}

document.querySelector(".inbox")?.addEventListener("click", () => {
  window.location.href = "../dashboard/dashboard.html";
});

getCoders();
