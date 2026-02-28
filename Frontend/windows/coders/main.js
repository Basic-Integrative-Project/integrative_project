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
        saveEmails(emails);
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

// 1. Selección de elementos del DOM
// Seleccionamos el cuerpo de la tabla donde se mostrarán los resultados
const tbody = document.getElementById("lista-coders");
// Seleccionamos el formulario de búsqueda para capturar el evento de envío
const formBusqueda = document.getElementById("form-busqueda");
// Seleccionamos el cuadro de texto donde el usuario escribe el documento
const inputDocumento = document.getElementById("input-documento");

// 2. Función principal para obtener los coders (acepta un documento opcional)
async function getCoders(documento = "") {
    try {
        // Construimos la URL base del endpoint
        let url = "http://localhost:3000/api/coders";

        // Si el usuario proporcionó un documento, lo añadimos a la URL como parámetro de consulta
        // Es vital usar las comillas invertidas (backticks) y el símbolo ${}
        if (documento !== "") {
            url = `http://localhost:3000/api/coders?document=${documento}`;
        }

        // Realizamos la petición al servidor
        const response = await fetch(url);

        // Verificamos si la respuesta del servidor es correcta
        if (!response.ok) {
            throw new Error("No se pudo obtener la información del servidor");
        }

        // Convertimos la respuesta a un objeto JSON (lista de coders)
        const coders = await response.json();

        // Llamamos a la función para dibujar la tabla con los datos recibidos
        renderCoders(coders);

    } catch (error) {
        console.error("Error en getCoders:", error);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error al cargar los datos</td></tr>`;
    }
}

// 3. Función para pintar las filas en el HTML
function renderCoders(codersList) {
    // Limpiamos el contenido actual de la tabla
    tbody.innerHTML = "";

    // Si la lista está vacía (no se encontró el documento), mostramos un mensaje
    if (codersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">No se encontraron resultados</td></tr>`;
        return;
    }

    // Recorremos cada coder y creamos su fila correspondiente
    codersList.forEach((coder) => {
        const row = document.createElement("tr");

        // Lógica para el color del badge del promedio
        const nota = parseFloat(coder.grade) || 0;
        let colorBadge = "bg-success"; // Verde por defecto (> 70)

        if (nota < 50) {
            colorBadge = "bg-danger"; // Rojo (< 50)
        } else if (nota >= 50 && nota <= 70) {
            colorBadge = "bg-warning"; // Amarillo (50 - 70)
        }

        // Insertamos el contenido de la fila
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
            </td>
        `;
        // Agregamos la fila al cuerpo de la tabla
        tbody.appendChild(row);
    });
}

// 4. EVENTO DE BÚSQUEDA
// Este código detecta cuando el usuario hace click en el botón "Buscar" o presiona Enter
if (formBusqueda) {
    formBusqueda.addEventListener("submit", (e) => {
        // Evitamos que la página se refresque (comportamiento por defecto de los formularios)
        e.preventDefault();

        // Obtenemos el valor escrito en el input y quitamos espacios en blanco
        const valorABuscar = inputDocumento.value.trim();

        // Llamamos a la función getCoders pasando el valor del input
        getCoders(valorABuscar);
    });
}

// return dashboard
document.querySelector('.inbox').addEventListener('click', () => window.location.href = '../dashboard/dashboard.html')

// 5. Carga inicial: al abrir la página, muestra a todos los estudiantes
getCoders();