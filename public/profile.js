// Seleccionamos el contenedor donde pondremos la card[cite: 192, 193].
const container = document.getElementById("perfil-container");

// 1. Obtener el ID que viene en la URL (?id=X)[cite: 194, 195].
const urlParams = new URLSearchParams(window.location.search);
const coderId = urlParams.get("id");

// 2. Función para pedir los datos del estudiante específico[cite: 197, 198].
async function getCoderProfile() {
    try {
        // Pedimos los datos a la ruta del servidor[cite: 200, 201].
        const response = await fetch(`/api/coders/${coderId}`);
        const coder = await response.json();

        // Si el estudiante existe, lo dibujamos[cite: 203, 204].
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

// 3. Función para crear el HTML de la tarjeta y la gráfica.
function renderProfile(coder) {
    // Insertamos la estructura de la card con un canvas para la gráfica.
    container.innerHTML = `
        <div class="card shadow">
            <div class="card-header bg-primary text-white text-center">
                <h2>Perfil del Estudiante</h2>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-5">
                        <p><strong>Nombre completo:</strong> ${coder.name} ${coder.lastname}</p>
                        <p><strong>Documento:</strong> ${coder.document}</p>
                        <p><strong>Correo:</strong> ${coder.email}</p>
                        <p><strong>Teléfono:</strong> ${coder.cel}</p>
                        <p><strong>Clan:</strong> ${coder.clan}</p>
                        <p><strong>Jornada:</strong> ${coder.shift}</p>
                        <p><strong>Promedio General:</strong> <span class="badge bg-success">${coder.grade || '0.0'}</span></p>
                    </div>
                    <div class="col-md-7">
                        <h5>Progreso de Notas:</h5>
                        <canvas id="graficaNotas"></canvas>
                    </div>
                </div>
            </div>
            <div class="card-footer d-flex justify-content-center gap-4">
                <button class="btn btn-info w-50">Asignar Cita / Psicoorientación</button>
                <button class="btn btn-dark w-50">Historia</button>
            </div>
        </div>
    `;

    // Llamamos a la función que dibuja la gráfica enviando los datos del coder.
    crearGrafica(coder);
}

// 4. Función que utiliza Chart.js para dibujar la línea.
function crearGrafica(coder) {
    const ctx = document.getElementById('graficaNotas').getContext('2d');
    
    new Chart(ctx, {
        type: 'line', // Tipo de gráfica lineal.
        data: {
            labels: ['Módulo 1', 'Módulo 2', 'Módulo 3', 'Módulo 4'], // Etiquetas horizontales.
            datasets: [{
                label: 'Calificación',
                // Datos obtenidos del objeto coder que viene del servidor.
                data: [
                    coder.module_1 || 0, 
                    coder.module_2 || 0, 
                    coder.module_3 || 0, 
                    coder.module_4 || 0
                ],
                borderColor: '#0d6efd', // Color de la línea (azul Bootstrap).
                backgroundColor: 'rgba(13, 110, 253, 0.1)', // Color de relleno bajo la línea.
                borderWidth: 3,
                fill: true,
                tension: 0.3 // Curvatura de la línea.
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100 // Escala máxima de la nota.
                }
            }
        }
    });
}

// Ejecutar la carga inicial[cite: 245, 246].
if (coderId) {
    getCoderProfile();
}