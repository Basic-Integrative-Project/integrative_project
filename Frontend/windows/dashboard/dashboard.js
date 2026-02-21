// ==========================
// 🔹 OBTENER CONFIGURACIÓN DESDE EL BACKEND
// ==========================
async function loadFirebaseConfig() {
  const response = await fetch("http://localhost:3000/firebase-config"); // apunta a tu server.js

  if (!response.ok) {
    throw new Error("No se pudo obtener la configuración de Firebase");
  }

  return await response.json();
}

// ==========================
// 🔥 INICIALIZAR FIREBASE Y AUTH
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
    setupRefreshButton();

  } catch (error) {
    console.error("Error inicializando Firebase:", error);
  }
}

initApp();

// ==========================
// 👤 AUTH STATE LISTENER
// ==========================
function setupAuthListener() {
  auth.onAuthStateChanged(user => {
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
      avatar.textContent = (user.displayName?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase();
    }

    renderEmails();
  });
}

// ==========================
// 🔑 LOGOUT
// ==========================
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.signOut()
        .then(() => window.location.href = "../../index.html")
        .catch(err => console.error("Error cerrando sesión:", err));
    });
  }
}

// ==========================
//  BOTÓN RECARGAR ***** REPARAR ******
// ==========================
function setupRefreshButton() {
  // const refreshBtn = document.getElementById("refreshBtn");

  // if (!refreshBtn) return;

  // refreshBtn.addEventListener("click", async () => {
  //   try {
  //     const user = auth.currentUser;
  //     if (!user) return;

  //     const res = await fetch(`https://n8n.andrescortes.dev/webhook/get-mails?uid=${encodeURIComponent(user.uid)}`);
  //     const data = await res.json();
  //     const emails = Array.isArray(data) ? data : data.emails || [];

  //     const processed = [];
  //     for (const mail of emails) {
  //       const tag = await classifyEmail(mail);
  //       processed.push({ ...mail, tag, revisado: false });
  //     }

  //     localStorage.setItem("dashboardEmails", JSON.stringify(processed));
  //     renderEmails();

  //   } catch (err) {
  //     console.error("Error recargando correos:", err);
  //   }
  // });
}

// ==========================
// 🧠 CLASIFICACIÓN IA + fallback local
// ==========================
async function classifyEmail(mail) {
  try {
    const res = await fetch("http://localhost:3000/classify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: mail.subject || "", text: mail.text || "" }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.tag || "importantes";

  } catch (err) {
    console.error("Error conectando al backend, fallback local:", err);

    const text = ((mail.subject || "") + " " + (mail.text || "")).toLowerCase();

    if (/reunión|meeting|zoom|teams|meet/.test(text)) return "reunion";
    if (/médico|hospital|certificado|incapacidad/.test(text)) return "faltas_justificadas";
    if (/no fui|me dormí|sin permiso/.test(text)) return "faltas_injustificadas";

    return "importantes";
  }
}

// ==========================
// 📧 RENDER DE CORREOS
// ==========================
function renderEmails() {
  const emails = JSON.parse(localStorage.getItem("dashboardEmails")) || [];

  const leftContainer = document.getElementById("emailList");
  const centerContainer = document.getElementById("emailList2");
  if (!leftContainer || !centerContainer) return;

  leftContainer.innerHTML = "";
  centerContainer.innerHTML = `
    <div class="row w-100">
      <div class="col-lg-6">
        <h5 class="text-center mb-3 text-info">📋 IMPORTANTES</h5>
        <div id="importantColumn"></div>
      </div>
      <div class="col-lg-6">
        <h5 class="text-center mb-3 text-warning">📅 REUNIONES</h5>
        <div id="meetingColumn"></div>
      </div>
    </div>
  `;

  const importantColumn = document.getElementById("importantColumn");
  const meetingColumn = document.getElementById("meetingColumn");

  emails.forEach((mail, index) => {
    if (mail.tag === "alertas") return;

    const selectHTML = `
      <div class="mt-2">
        <select class="form-select form-select-sm" onchange="cambiarCategoria(${index}, this.value)">
          <option value="importantes" ${mail.tag === "importantes" ? "selected" : ""}>Importante</option>
          <option value="reunion" ${mail.tag === "reunion" ? "selected" : ""}>Reunión</option>
          <option value="faltas_justificadas" ${mail.tag === "faltas_justificadas" ? "selected" : ""}>Falta Justificada</option>
          <option value="faltas_injustificadas" ${mail.tag === "faltas_injustificadas" ? "selected" : ""}>Falta Injustificada</option>
        </select>
      </div>
    `;

    const buttonsHTML = `
      <div class="mt-2 d-flex gap-2">
        <button class="btn btn-sm btn-outline-success" onclick="marcarRevisado(${index})">Revisado</button>
        <button class="btn btn-sm btn-outline-primary" onclick="leerCorreo(${index})">Leer</button>
        <button class="btn btn-sm btn-outline-dark" onclick="responderCorreo(${index})">Responder</button>
      </div>
    `;

    const footerHTML = `<div class="email-card-footer mt-2"><small>${mail.date ? new Date(mail.date).toLocaleString() : ""}</small></div>`;

    let colorClass = "info";
    if (mail.tag === "reunion") colorClass = "warning";
    if (mail.tag === "faltas_justificadas") colorClass = "success";
    if (mail.tag === "faltas_injustificadas") colorClass = "danger";

    const cardHTML = `
      <div class="email-card border-${colorClass} mb-3 ${mail.revisado ? 'opacity-50' : ''}">
        <div class="email-card-header"><span class="badge bg-${colorClass}">${mail.tag.toUpperCase()}</span></div>
        <div class="email-card-sender">${mail.from || "Desconocido"}</div>
        <div class="email-card-subject">${mail.subject || "Sin asunto"}</div>
        ${selectHTML}
        ${buttonsHTML}
        ${footerHTML}
      </div>
    `;

    if (mail.tag === "importantes") importantColumn.innerHTML += cardHTML;
    if (mail.tag === "reunion") meetingColumn.innerHTML += cardHTML;
    if (mail.tag === "faltas_justificadas" || mail.tag === "faltas_injustificadas") leftContainer.innerHTML += cardHTML;
  });

  updateCounters(emails);
}

// ==========================
// 📊 CONTADORES
// ==========================
function updateCounters(emails) {
  setCount("inboxCount", emails.length);
  setCount("engageCount", emails.length - emails.filter(e => ["importantes", "reunion","faltas_justificadas", "faltas_injustificadas"].includes(e.tag)).length);
}

function setCount(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ==========================
// 🔘 FUNCIONES GLOBALES
// ==========================
window.cambiarCategoria = function(index, nuevaCategoria) {
  const emails = JSON.parse(localStorage.getItem("dashboardEmails")) || [];
  if (!emails[index]) return;

  emails[index].tag = nuevaCategoria;
  localStorage.setItem("dashboardEmails", JSON.stringify(emails));
  renderEmails();
};

window.leerCorreo = function(index) {
  const emails = JSON.parse(localStorage.getItem("dashboardEmails")) || [];
  const mail = emails[index];
  if (!mail) return;

  const modal = new bootstrap.Modal(document.getElementById("emailModal"));
  const colors = { importantes: "bg-info", reunion: "bg-warning", faltas_justificadas: "bg-success", faltas_injustificadas: "bg-danger" };
  const tagColor = colors[mail.tag] || "bg-secondary";

  document.getElementById("modalSubject").textContent = mail.subject || "Sin asunto";
  document.getElementById("modalFrom").textContent = mail.from || "Desconocido";
  document.getElementById("modalDate").textContent = mail.date ? new Date(mail.date).toLocaleString() : "";
  const tagElement = document.getElementById("modalTag");
  tagElement.className = "badge " + tagColor;
  tagElement.textContent = (mail.tag || "SIN CATEGORIA").replace("_", " ").toUpperCase();
  document.getElementById("modalBody").textContent = mail.text || mail.body || "Sin contenido";

  modal.show();
};

window.marcarRevisado = function(index) {
  const emails = JSON.parse(localStorage.getItem("dashboardEmails")) || [];
  if (!emails[index]) return;

  emails[index].revisado = true;
  localStorage.setItem("dashboardEmails", JSON.stringify(emails));
  renderEmails();
};

window.responderCorreo = function(index) {
  const emails = JSON.parse(localStorage.getItem("dashboardEmails")) || [];
  const mail = emails[index];
  if (!mail) return;

  const destino = mail.replyTo || mail.from;
  window.location.href = `mailto:${destino}?subject=Re: ${mail.subject || ""}`;
};

// coders button
document.querySelector('#codersBtn').addEventListener('click', ()=> {
  window.location.href = '../coders/index.html'
  // console.log('../coders/index.html')
});