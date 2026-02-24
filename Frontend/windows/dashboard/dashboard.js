// ==========================
// 🔹 OBTENER CONFIGURACIÓN DESDE EL BACKEND
// ==========================
async function loadFirebaseConfig() {
  const response = await fetch("http://localhost:3000/firebase-config");
  if (!response.ok) {
    throw new Error("No se pudo obtener la configuración de Firebase");
  }
  return await response.json();
}

// ==========================
// 🔒 CACHÉ SOLO EN MEMORIA
// ==========================
let emailsCache = [];

function saveEmails(emails) {
  emailsCache = emails;
}

function loadEmails() {
  return emailsCache;
}

localStorage.removeItem("dashboardEmails");

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
    setupRefreshButton();

  } catch (error) {
    console.error("Error inicializando Firebase:", error);
  }
}

initApp();

// ==========================
// 🚀 FUNCIÓN CENTRAL DE CARGA
// ==========================
async function fetchAndProcessEmails() {
  const user = auth.currentUser;
  if (!user) return;

  const res = await fetch(
    `https://n8n.andrescortes.dev/webhook/get-mails?uid=${encodeURIComponent(user.uid)}`
  );
  const data = await res.json();
  const emails = Array.isArray(data) ? data : data.emails || [];

  const tagResults = await classifyEmailsBatch(emails);

  const colorMap = {
    alertas: "secondary",
    reunion: "warning",
    faltas_justificadas: "success",
    faltas_injustificadas: "danger",
    importantes: "info",
  };

  const processed = emails.map((mail, i) => {
    const tag = tagResults[i]?.tag || "importantes";
    return {
      ...mail,
      tag,
      colorClass: colorMap[tag] || "info",
      revisado: false,
    };
  });

  saveEmails(processed);
  renderEmails();
}

// ==========================
// 👤 AUTH LISTENER
// ==========================
function setupAuthListener() {
  auth.onAuthStateChanged(async (user) => {
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

    await fetchAndProcessEmails(); // 🔥 CARGA AUTOMÁTICA EN F5
  });
}

// ==========================
// 🔑 LOGOUT
// ==========================
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      emailsCache = [];
      auth.signOut()
        .then(() => window.location.href = "../../index.html")
        .catch(err => console.error("Error cerrando sesión:", err));
    });
  }
}

// ==========================
//  BOTÓN RECARGAR
// ==========================
function setupRefreshButton() {
  const refreshBtn = document.getElementById("refreshBtn");
  if (!refreshBtn) return;

  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Cargando...';

    try {
      const user = auth.currentUser;
      if (!user) return;

      const res = await fetch(`https://n8n.andrescortes.dev/webhook/get-mails?uid=${encodeURIComponent(user.uid)}`);
      const data = await res.json();
      const emails = Array.isArray(data) ? data : data.emails || [];

      // ✅ Clasificar todos en paralelo
      const processed = await Promise.all(
        emails.map(async (mail) => {
          const tag = await classifyEmail(mail);
          let colorClass = "primary";
          if (tag === "alertas") colorClass = "secondary";
          if (tag === "reunion") colorClass = "warning";
          if (tag === "faltas_justificadas") colorClass = "success";
          if (tag === "faltas_injustificadas") colorClass = "danger";
          if (tag === "importantes") colorClass = "info";
          return { ...mail, tag, colorClass, revisado: false };
        })
      );

      localStorage.setItem("dashboardEmails", JSON.stringify(processed));
      renderEmails();

    } catch (err) {
      console.error("Error recargando correos:", err);
      alert("Error al recargar correos. Revisa la consola.");
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Recargar';
    }
  });
}

// ==========================
// 🧠 CLASIFICACIÓN IA + fallback local (solo usada por el botón Recargar)
// ==========================
async function classifyEmailsBatch(emails) {
  try {
    const res = await fetch("http://localhost:3000/classify-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emails: emails.map(m => ({
          subject: m.subject || "",
          text: m.text || ""
        }))
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();

  } catch (err) {
    console.error("Error en clasificación batch:", err);
    return emails.map(mail => ({
      tag: localFallback(mail.subject, mail.text)
    }));
  }
}

// Fallback local (solo si el backend no responde)
function localFallback(subject = "", text = "") {
  const s = (subject + " " + text).toLowerCase();
  if (/(notificación|notification|alerta|promoción|oferta|descuento|newsletter|no-reply|noreply|marketing|publicidad|facebook|instagram|twitter|linkedin|github)/.test(s)) return "alertas";
  if (/(reunión|reunion|meet|call|zoom|teams|agendar|calendario|llamada)/.test(s)) return "reunion";
  if (/(baja médica|certificado médico|incapacidad|accidente|enfermedad|médico|hospital|urgencia|duelo|matrimonio|nacimiento|paternidad|maternidad|judicial|citación)/.test(s)) return "faltas_justificadas";
  if (/(me qued[eé]\s+dormid[oa]|me dorm[ií]|no vine|no fui|no asist[ií]|falte sin avisar|no avis[eé]|sin permiso|olvid[eé]|llegu[eé] tarde|no ten[ií]a ganas)/.test(s)) return "faltas_injustificadas";
  return "importantes";
}

// ==========================
// 📧 RENDER DE CORREOS (DOM eficiente: acumula strings, un solo innerHTML)
// ==========================
function renderEmails() {
  const emails = loadEmails();

  const leftContainer = document.getElementById("emailList");
  const centerContainer = document.getElementById("emailList2");
  if (!leftContainer || !centerContainer) return;

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

  // Acumular HTML por columna (evita re-parsear el DOM en cada iteración)
  let leftHtml = "";
  let importantHtml = "";
  let meetingHtml = "";

  emails.forEach((mail, index) => {
    if (mail.tag === "alertas") return;

    const colorClass = mail.colorClass || "info";

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

    if (mail.tag === "importantes") importantHtml += cardHTML;
    else if (mail.tag === "reunion") meetingHtml += cardHTML;
    else leftHtml += cardHTML; // faltas_justificadas y faltas_injustificadas
  });

  // Asignar todo de una sola vez
  leftContainer.innerHTML = leftHtml;
  document.getElementById("importantColumn").innerHTML = importantHtml;
  document.getElementById("meetingColumn").innerHTML = meetingHtml;

  updateCounters(emails);
}

// ==========================
// 📊 CONTADORES
// ==========================
function updateCounters(emails) {
  setCount("inboxCount", emails.length);
  setCount("engageCount", emails.length - emails.filter(e => ["importantes", "reunion", "faltas_justificadas", "faltas_injustificadas"].includes(e.tag)).length);
}

function setCount(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ==========================
// 🔘 FUNCIONES GLOBALES
// ==========================
window.cambiarCategoria = function (index, nuevaCategoria) {
  const emails = loadEmails();
  if (!emails[index]) return;

  const colorMap = {
    alertas: "secondary",
    reunion: "warning",
    faltas_justificadas: "success",
    faltas_injustificadas: "danger",
    importantes: "info",
  };

  emails[index].tag = nuevaCategoria;
  emails[index].colorClass = colorMap[nuevaCategoria] || "info";
  saveEmails(emails);
  renderEmails();
};

window.leerCorreo = function (index) {
  const emails = loadEmails();
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

window.marcarRevisado = function (index) {
  const emails = loadEmails();
  if (!emails[index]) return;

  emails[index].revisado = true;
  saveEmails(emails);
  renderEmails();
};

window.responderCorreo = async function (index) {
  const emails = loadEmails();
  if (!emails[index]) return;

  if (emails[index].tag === "faltas_injustificadas" || emails[index].tag === "faltas_justificadas") {
    const id = emails[index].id;
    const response = await fetch("http://localhost:3000/send-by-id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id })
    });

    const data = await response.json();
    console.log(data);
  }
};

// coders button
document.querySelector('#codersBtn').addEventListener('click', () => {
  window.location.href = '../coders/index.html';
});