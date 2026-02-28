// ==========================
// 🔹 OBTENER CONFIGURACIÓN
// ==========================
async function loadFirebaseConfig() {
    const response = await fetch("http://localhost:3000/firebase-config");
    if (!response.ok) {
        throw new Error("No se pudo obtener la configuración de Firebase");
    }
    return await response.json();
}

// ==========================
// 🔒 CACHE EN MEMORIA
// ==========================
let emailsCache = [];

function saveEmails(emails) {
    emailsCache = emails;
}

function loadEmails() {
    return emailsCache;
}

function loadFromStorage() {
    const stored = localStorage.getItem("dashboardEmails");
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

window.addEventListener("beforeunload", () => {
    emailsCache = [];
});

// ==========================
// 🔥 INICIALIZAR FIREBASE
// ==========================
async function initApp() {
    try {
        const firebaseConfig = await loadFirebaseConfig();

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        window.auth = firebase.auth();
        console.log("✅ Firebase inicializado");

        setupAuthListener();
        setupLogoutButton();

    } catch (error) {
        console.error("Error inicializando Firebase:", error);
    }
}

initApp();

// ==========================
// 👤 AUTH LISTENER
// ==========================
function setupAuthListener() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "../../index.html";
            return;
        }

        const avatar = document.getElementById("userAvatar");
        const name = document.getElementById("userName");
        const email = document.getElementById("userEmail");

        if (name) name.textContent = user.displayName || "Usuario";
        if (email) email.textContent = user.email;

        if (avatar) {
            avatar.textContent = (
                user.displayName?.charAt(0) ||
                user.email?.charAt(0) ||
                "U"
            ).toUpperCase();
        }

        // 🔹 CARGAR CORREOS DESDE LOCALSTORAGE
        const emails = loadFromStorage();
    });
}

// ==========================
// 🔑 LOGOUT
// ==========================
function setupLogoutButton() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("dashboardEmails");
            auth.signOut()
                .then(() => window.location.href = "../../index.html")
                .catch(err => console.error("Error cerrando sesión:", err));
        });
    }
}


document.addEventListener("DOMContentLoaded", () => {
    // 1. Selección de elementos principales del DOM
    const container = document.getElementById("perfil-container"); // Contenedor del perfil [cite: 14, 219]
    const tablaCitas = document.getElementById("citas-coder"); // Cuerpo de la tabla de citas [cite: 30, 219]
    const urlParams = new URLSearchParams(window.location.search); // Captura parámetros de la URL [cite: 219]
    const coderId = urlParams.get("id"); // Obtiene el ID del coder de la URL [cite: 219]
    let infoCoder = {}; // Variable global para almacenar datos del coder [cite: 220]

    // 2. Función para cargar datos al iniciar la página [cite: 221]
    async function cargarInicial() {
        if (coderId) { // Solo ejecuta si hay un ID presente [cite: 222]
            await getPerfil(); // Carga datos personales [cite: 223]
            await getCitas(); // Carga historial de citas [cite: 224]
        }
    }

    // 3. Obtener y mostrar el perfil con colores dinámicos según la nota [cite: 225]
    async function getPerfil() {
        const resp = await fetch(`http://localhost:3000/api/coders/${coderId}`); // Petición al servidor [cite: 226]
        infoCoder = await resp.json(); // Convierte respuesta a JSON [cite: 226]

        if (container) {
            // LÓGICA DE COLORES SOLICITADA
            const nota = parseFloat(infoCoder.grade) || 0; // Convierte nota a número [cite: 248]
            let colorBadge = "bg-success"; // Color verde por defecto (mayor a 70)

            if (nota < 50) {
                colorBadge = "bg-danger"; // Rojo si es menor a 50
            } else if (nota >= 50 && nota <= 70) {
                colorBadge = "bg-warning"; // Amarillo entre 50 y 70
            }

            container.innerHTML = `
                <div class="card shadow">
                    <div class="card-header fw-bold text-center">
                        <h2>Perfil del Estudiante</h2>
                    </div>
                    <div class="card-body p-3">
                        <div class="row">
                            <div class="col-md-5 d-flex flex-column align-items-center">
                                <p><strong>Nombre:</strong> ${infoCoder.name} ${infoCoder.lastname}</p>
                                <p><strong>Documento:</strong> ${infoCoder.document}</p>
                                <p><strong>Correo:</strong> ${infoCoder.email}</p>
                                <p><strong>Teléfono:</strong> ${infoCoder.cel}</p>
                                <p><strong>Clan:</strong> ${infoCoder.clan}</p>
                                <p><strong>Jornada:</strong> ${infoCoder.shift}</p>
                                <p><strong>Promedio:</strong> <span class="badge ${colorBadge}">${nota}</span></p>
                            </div>
                            <div class="col-md-7 d-flex justify-content-center">
                                <canvas class="" id="graficaNotas"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer d-flex justify-content-center">
                        <button class="btn btn-purple w-75" data-bs-toggle="modal" data-bs-target="#modalCita">Asignar Cita</button>
                    </div>
                </div>`;
            crearGrafica(infoCoder); // Genera la gráfica de módulos [cite: 258]
        }
    }

    // 4. Obtener y mostrar la tabla de citas [cite: 261]
    async function getCitas() {
        const resp = await fetch(`http://localhost:3000/appointment/${coderId}`); // Petición de citas [cite: 262]
        const citas = await resp.json(); // Convierte a JSON [cite: 263]
        
        if (tablaCitas) {
            tablaCitas.innerHTML = ""; // Limpia la tabla antes de llenar [cite: 265]
            citas.forEach(c => {
                const atendido = c.state === 1; // Verifica si la cita ya fue procesada [cite: 267]
                const row = document.createElement("tr"); // Crea fila [cite: 268]
                row.innerHTML = `
                    <td>${c.id}</td>
                    <td>${c.subject}</td>
                    <td>${c.professional}</td>
                    <td>${new Date(c.date).toLocaleDateString()}</td>
                    <td><span class="badge ${atendido ? 'bg-success' : 'bg-danger'}">${atendido ? 'Atendido' : 'Pendiente'}</span></td>
                    <td class="text-center">
                        ${atendido 
                            ? `<button class="btn btn-purple btn-sm" onclick="verH(${c.id}, '${c.subject}', '${c.professional}')"><i class="bi bi-search"></i></button>`
                            : `<button class="btn btn-danger btn-sm"><i class="bi bi-trash"></i></button>`}
                    </td>
                    <td class="text-center">
                        <button class="btn btn-dark btn-sm" ${atendido ? 'disabled' : `onclick="abrirH(${c.id}, '${c.subject}', '${c.professional}')"`}>
                            <i class="bi bi-file-earmark-text"></i>
                        </button>
                    </td>`;
                tablaCitas.appendChild(row); // Agrega la fila a la tabla [cite: 289]
            });
        }
    }

    // 5. GESTIÓN DEL FORMULARIO DE CITA (Soluciona error de recarga y tabla vacía) [cite: 303, 304]
    const formCita = document.getElementById("form-cita"); // [cite: 45]
    if (formCita) {
        formCita.addEventListener("submit", async (e) => {
            e.preventDefault(); // DETIENE LA RECARGA DE PÁGINA [cite: 304]

            const data = {
                id_coder: coderId, // ID del estudiante actual
                subject: document.getElementById("cita-motivo").value, // [cite: 52]
                professional: document.getElementById("cita-profesional").value, // [cite: 59]
                date: document.getElementById("cita-fecha").value // [cite: 48]
            };

            try {
                const resp = await fetch("http://localhost:3000/appointment", { // Envía al servidor [cite: 309, 333]
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                if (resp.ok) {
                    // Cierra el modal de Bootstrap [cite: 318]
                    const modalElement = document.getElementById('modalCita');
                    const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                    modalInstance.hide();
                    
                    formCita.reset(); // Limpia el formulario
                    await getCitas(); // Refresca la tabla automáticamente [cite: 319]
                }
            } catch (err) {
                console.error("Error al guardar cita:", err);
            }
        });
    }

    // 6. Funciones globales para Historia Clínica
    window.abrirH = (id, mot, prof) => {
        document.getElementById("h-id-cita").innerText = id; // [cite: 87, 291]
        document.getElementById("h-nombre").innerText = `${infoCoder.name} ${infoCoder.lastname}`; // [cite: 81, 292]
        document.getElementById("h-motivo").innerText = mot; // [cite: 83, 294]
        document.getElementById("h-profesional").innerText = prof; // [cite: 85, 295]
        
        const formH = document.getElementById("form-historia"); // [cite: 89, 296]
        formH.reset(); // Limpia campos [cite: 297]
        
        // Habilita edición [cite: 298]
        document.getElementById("h-objetivo").readOnly = false;
        document.getElementById("h-desarrollo").readOnly = false;
        document.getElementById("h-compromisos").readOnly = false;
        document.getElementById("btn-finalizar").style.display = "block"; // [cite: 299]
        
        new bootstrap.Modal(document.getElementById('modalHistoria')).show(); // [cite: 301, 302]
    };

    // Guardar Historia [cite: 303]
    const formHistoria = document.getElementById("form-historia");
    if (formHistoria) {
        formHistoria.addEventListener("submit", async (e) => {
            e.preventDefault(); // [cite: 304]
            const data = {
                id_appointment: document.getElementById("h-id-cita").innerText,
                objetive: document.getElementById("h-objetivo").value,
                tracking: document.getElementById("h-desarrollo").value,
                goals: document.getElementById("h-compromisos").value
            };

            const resp = await fetch("http://localhost:3000/history_coder", { // [cite: 309, 334]
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (resp.ok) {
                bootstrap.Modal.getInstance(document.getElementById('modalHistoria')).hide(); // [cite: 318]
                await getCitas(); // Refresca para mostrar la lupa [cite: 319]
            }
        });
    }

    window.verH = async (id, mot, prof) => {
        const resp = await fetch(`http://localhost:3000/history_coder/${id}`); // [cite: 321, 336]
        const h = await resp.json(); // [cite: 322]
        
        window.abrirH(id, mot, prof); // Reutiliza la apertura de modal
        
        // Llena con datos existentes [cite: 322, 323]
        document.getElementById("h-objetivo").value = h.objetive;
        document.getElementById("h-desarrollo").value = h.tracking;
        document.getElementById("h-compromisos").value = h.goals;
        
        // Modo lectura [cite: 324]
        document.getElementById("h-objetivo").readOnly = true;
        document.getElementById("h-desarrollo").readOnly = true;
        document.getElementById("h-compromisos").readOnly = true;
        document.getElementById("btn-finalizar").style.display = "none";
    };

    // 7. Generación de Gráfica [cite: 325]
    function crearGrafica(coder) {
        const ctx = document.getElementById('graficaNotas'); // [cite: 251, 324]
        if (!ctx) return;
        new Chart(ctx, { // [cite: 325]
            type: 'line',
            data: {
                labels: ['M1', 'M2', 'M3', 'M4'],
                datasets: [{ 
                    label: 'Notas de Módulos', 
                    data: [coder.module_1, coder.module_2, coder.module_3, coder.module_4], 
                    borderColor: '#0d6efd' 
                }]
            }
        });
    }

    cargarInicial(); // Ejecuta la carga de datos [cite: 327]
    document.querySelector('.inbox').addEventListener('click', () => window.location.href = '../dashboard/dashboard.html')
});