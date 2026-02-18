// Seleccionamos el cuerpo de la tabla.
const tbody = document.getElementById("lista-coders");

// Obtener todos los coders.
async function getCoders() {
    try {
        const response = await fetch("/api/coders");
        const coders = await response.json();
        renderCoders(coders);
    } catch (error) {
        console.error("Error al obtener coders:", error);
    }
}

// Dibujar la tabla.
function renderCoders(codersList) {
    tbody.innerHTML = "";
    codersList.forEach((coder) => {
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
            <td>${coder.grade || 'N/A'}</td>
            <td>
                <a href="coder_profile.html?id=${coder.id}" class="btn btn-warning">
                    <i class="bi bi-search"></i>
                </a>
            </td>
        `;
        tbody.appendChild(row);
    });
}

getCoders();