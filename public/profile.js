// Seleccionamos el contenedor donde pondremos la card.
const container = document.getElementById("perfil-container");

// 1. Obtener el ID que viene en la URL (?id=X).
const urlParams = new URLSearchParams(window.location.search);
const coderId = urlParams.get("id");

// 2. Función para pedir los datos del estudiante específico.
async function getCoderProfile() {
    try {
        // Pedimos los datos a la nueva ruta que creamos en el servidor.
        const response = await fetch(`/api/coders/${coderId}`);
        const coder = await response.json();

        // Si el estudiante existe, lo dibujamos.
        if (coder) {
            renderProfile(coder);
        } else {
            container.innerHTML = "<div class='alert alert-danger'>Estudiante no encontrado</div>";
        }
    } catch (error) {
        console.error("Error:", error);
        container.innerHTML = "<div class='alert alert-danger'>Error al conectar con el servidor</div>";
    }
}

// 3. Función para crear el HTML de la tarjeta.
function renderProfile(coder) {
    container.innerHTML = `
        <div class="card shadow">
            <div class="card-header bg-primary text-white text-center">
                <h2>Perfil del Estudiante</h2>
            </div>
            <div class="card-body">
                <p><strong>Nombre completo:</strong> ${coder.name} ${coder.lastname}</p>
                <p><strong>Documento:</strong> ${coder.document}</p>
                <p><strong>Correo:</strong> ${coder.email}</p>
                <p><strong>Teléfono:</strong> ${coder.cel}</p>
                <p><strong>Clan:</strong> ${coder.clan}</p>
                <p><strong>Jornada:</strong> ${coder.shift}</p>
                <p><strong>Promedio General:</strong> <span class="badge bg-success">${coder.grade || '0.0'}</span></p>
                
                <hr>
                <h5>Notas por Módulo:</h5>
                <ul>
                    <li>Módulo 1: ${coder.module_1 || '0.0'}</li>
                    <li>Módulo 2: ${coder.module_2 || '0.0'}</li>
                    <li>Módulo 3: ${coder.module_3 || '0.0'}</li>
                    <li>Módulo 4: ${coder.module_4 || '0.0'}</li>
                </ul>
            </div>
            <div class="card-footer d-flex justify-content-between">
                <button class="btn btn-info">Asignar Cita / Psicoorientación</button>
                <button class="btn btn-dark">Historia</button>
            </div>
        </div>
    `;
}

// Ejecutar la función al cargar la página.
if (coderId) {
    getCoderProfile();
} else {
    container.innerHTML = "<div class='alert alert-warning'>No se especificó un ID de estudiante</div>";
}