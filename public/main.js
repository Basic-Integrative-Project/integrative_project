// Seleccionamos los elementos del DOM.
const tbody = document.getElementById("lista-coders");
const formBusqueda = document.getElementById("form-busqueda");
const inputDocumento = document.getElementById("input-documento");

// Función para obtener los datos desde el servidor (acepta un documento opcional).
async function getCoders(documento = "") {
    try {
        // Si hay un documento, lo agregamos como parámetro en la URL.
        let url = "/api/coders";
        if (documento) {
            url += `?document=${documento}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Error en la respuesta de la red");
        
        const coders = await response.json();
        renderCoders(coders);
    } catch (error) {
        console.error("Error al obtener coders:", error);
    }
}

// Función para dibujar las filas en la tabla.
function renderCoders(codersList) {
    tbody.innerHTML = "";

    // Si no hay resultados, mostramos un mensaje.
    if (codersList.length === 0) {
        tbody.innerHTML = "<tr><td colspan='10' class='text-center'>No se encontraron resultados</td></tr>";
        return;
    }

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

// Escuchamos el evento cuando se envía el formulario de búsqueda.
formBusqueda.addEventListener("submit", (event) => {
    // Evitamos que la página se recargue.
    event.preventDefault();
    
    // Obtenemos el valor del input.
    const docValue = inputDocumento.value.trim();
    
    // Llamamos a la función de obtener datos con el filtro.
    getCoders(docValue);
});

// Carga inicial de todos los datos.
getCoders();