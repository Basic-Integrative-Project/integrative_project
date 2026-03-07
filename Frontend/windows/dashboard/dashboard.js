// ==========================
// 🔹 OBTENER CONFIGURACIÓN
// ==========================
async function loadFirebaseConfig() {
  const response = await fetch("http://localhost:3000/firebase-config");
  if (!response.ok) throw new Error("No se pudo obtener la configuración de Firebase");
  return await response.json();
}

// ==========================
// 🔒 CACHE EN MEMORIA
// ==========================
let emailsCache = [];

function saveEmails(emails) { emailsCache = emails; }
function loadEmails() { return emailsCache; }

function loadFromStorage() {
  const stored = localStorage.getItem("dashboardEmails");
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
}

window.addEventListener("beforeunload", () => { emailsCache = []; });

// ✅ HELPER: parsea la respuesta de n8n
function parseEmailsFromN8n(data) {
  console.log("📬 Respuesta raw de n8n:", JSON.stringify(data, null, 2));
  if (Array.isArray(data) && data.length > 0 && data[0]?.id) return data;
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.emails)) return data[0].emails;
  if (Array.isArray(data?.emails)) return data.emails;
  if (Array.isArray(data?.json?.emails)) return data.json.emails;
  if (Array.isArray(data) && data[0]?.json?.id) return data.map(d => d.json);
  return [];
}

// ✅ FIX 3 — Renovar token si está por vencer
async function getValidAccessToken() {
  try {
    const stored = localStorage.getItem("gmail_access_token");
    const tokenAge = localStorage.getItem("gmail_token_time");
    const now = Date.now();
    if (tokenAge && (now - parseInt(tokenAge)) > 3000000) {
      console.log("🔄 Token próximo a vencer, renovando...");
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.modify');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      const reauth = await auth.currentUser.reauthenticateWithPopup(provider);
      const newToken = reauth.credential.accessToken;
      localStorage.setItem("gmail_access_token", newToken);
      localStorage.setItem("gmail_token_time", now.toString());
      return newToken;
    }
    return stored;
  } catch (err) {
    console.warn("⚠️ No se pudo renovar token:", err);
    return localStorage.getItem("gmail_access_token");
  }
}

// ✅ HELPER: marcar como leído silencioso
async function marcarLeidoSilencioso(id, accessToken) {
  try {
    await fetch("http://localhost:3000/read-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, access_token: accessToken })
    });
  } catch (err) {
    console.warn(`⚠️ No se pudo marcar como leído: ${id}`, err);
  }
}

// ==========================
// 🔥 INICIALIZAR FIREBASE
// ==========================
async function initApp() {
  try {
    const firebaseConfig = await loadFirebaseConfig();
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
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
// 👤 AUTH LISTENER
// ==========================
function setupAuthListener() {
  auth.onAuthStateChanged((user) => {
    if (!user) { window.location.href = "../../index.html"; return; }
    const avatar = document.getElementById("userAvatar");
    const name = document.getElementById("userName");
    const email = document.getElementById("userEmail");
    if (name) name.textContent = user.displayName || "Usuario";
    if (email) email.textContent = user.email;
    if (avatar) {
      avatar.textContent = (user.displayName?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase();
    }
    const emails = loadFromStorage();
    saveEmails(emails);
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
      localStorage.removeItem("dashboardEmails");
      localStorage.removeItem("gmail_access_token");
      localStorage.removeItem("gmail_token_time");
      auth.signOut()
        .then(() => window.location.href = "../../index.html")
        .catch(err => console.error("Error cerrando sesión:", err));
    });
  }
}

// ==========================
// 🔄 HELPER INTERNO: fetch + classify + render
// ==========================
async function fetchClassifyAndRender(user) {
  const left = document.getElementById("emailList");
  const center = document.getElementById("emailList2");
  if (left) left.innerHTML = '<p class="text-muted text-center py-3"><span class="spinner-border spinner-border-sm me-2"></span>Sincronizando...</p>';
  if (center) center.innerHTML = '<p class="text-muted text-center py-3">Cargando correos...</p>';

  const accessToken = await getValidAccessToken();

  const res = await fetch("https://n8n.andrescortes.dev/webhook/get-mails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, uid: user.uid })
  });

  const data = await res.json();
  const emails = parseEmailsFromN8n(data);

  const batchRes = await fetch("http://localhost:3000/classify-emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emails: emails.map(m => ({
        subject: m.subject || "",
        text: (m.text || "").substring(0, 500)
      }))
    }),
  });

  const batchData = await batchRes.json();
  const colorMap = {
    alertas: "secondary", reunion: "warning",
    faltas_justificadas: "success", faltas_injustificadas: "danger", importantes: "info",
  };

  const processed = emails
    .map((mail, i) => ({
      ...mail,
      tag: batchData[i]?.tag || "importantes",
      colorClass: colorMap[batchData[i]?.tag] || "info",
      revisado: false,
    }))
    .filter(m => m.tag !== "alertas");

  localStorage.setItem("dashboardEmails", JSON.stringify(processed));
  saveEmails(processed);
  renderEmails();
}

// ==========================
// 🔄 BOTÓN RECARGAR
// ==========================
function setupRefreshButton() {
  const refreshBtn = document.getElementById("refreshBtn");
  if (!refreshBtn) return;
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = "Cargando...";
    try {
      const user = auth.currentUser;
      if (!user) return;
      await fetchClassifyAndRender(user);
    } catch (err) {
      console.error("Error recargando:", err);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> RECARGAR';
    }
  });
}

async function singleRefresh() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await fetchClassifyAndRender(user);
  } catch (err) {
    console.error("Error recargando:", err);
  } finally {
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> RECARGAR';
    }
  }
}

// ==========================
// 📝 RENDER DE CORREOS
// ==========================
function renderEmails() {
  const emails = loadEmails();
  const leftContainer = document.getElementById("emailList");
  const centerContainer = document.getElementById("emailList2");
  if (!leftContainer || !centerContainer) return;

  centerContainer.innerHTML = `
    <div class="row w-100">
      <div class="col-12 col-md-6 mb-4">
        <h5 class="text-center mb-3 text-info">📋 IMPORTANTES</h5>
        <div id="importantesHeader" class="mb-2"></div>
        <div id="importantColumn" class="d-flex flex-column gap-3"></div>
      </div>
      <div class="col-12 col-md-6 mb-4">
        <h5 class="text-center mb-3 text-warning">📅 REUNIONES</h5>
        <div id="reunionesHeader" class="mb-2"></div>
        <div id="meetingColumn" class="d-flex flex-column gap-3"></div>
      </div>
    </div>
  `;

  let leftHtml = "", importantHtml = "", meetingHtml = "";

  const faltasEmails = emails.filter(m => m.tag === "faltas_justificadas" || m.tag === "faltas_injustificadas");
  const importantesEmails = emails.filter(m => m.tag === "importantes");
  const reunionesEmails = emails.filter(m => m.tag === "reunion");

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
      </div>`;

    // ✅ NUEVO — botón "Agendar" solo para reuniones
    const agendarBtn = mail.tag === "reunion"
      ? `<button class="btn btn-sm btn-outline-secondary" onclick="agendarEnCalendar(${index})">📅 Agendar</button>`
      : '';

    const buttonsHTML = `
      <div class="mt-2 d-flex gap-2 flex-wrap">
        <button class="btn btn-sm btn-outline-success" onclick="marcarRevisado(${index})">Revisado</button>
        <button class="btn btn-sm btn-outline-primary" onclick="leerCorreo(${index})">Leer</button>
        <button class="btn btn-sm btn-outline-dark" onclick="responderCorreo(${index})">Responder</button>
        ${agendarBtn}
      </div>`;

    const footerHTML = `<div class="email-card-footer mt-2"><small>${mail.date ? new Date(mail.date).toLocaleString() : ""}</small></div>`;

    const cardHTML = `
      <div class="email-card border-${colorClass} mb-3 w-100 d-flex flex-column ${mail.revisado ? 'opacity-50' : ''}">
        <div class="email-card-header"><span class="badge bg-${colorClass}">${mail.tag.toUpperCase()}</span></div>
        <div class="email-card-sender">${mail.from || "Desconocido"}</div>
        <div class="email-card-subject">${mail.subject || "Sin asunto"}</div>
        ${selectHTML}
        ${buttonsHTML}
        ${footerHTML}
      </div>`;

    if (mail.tag === "importantes") importantHtml += cardHTML;
    else if (mail.tag === "reunion") meetingHtml += cardHTML;
    else leftHtml += cardHTML;
  });

  leftContainer.innerHTML = faltasEmails.length > 0 ? `
    <div class="mb-3">
      <h5 class="text-center mb-3 text-danger">⚠️ FALTAS</h5>
      <div class="mb-3">
        <button class="btn btn-danger w-100" onclick="responderTodos()" id="btnResponderTodos">
          <i class="bi bi-reply-all-fill"></i> Responder todos (${faltasEmails.length})
        </button>
      </div>
      ${leftHtml}
    </div>` : '';

  document.getElementById("importantColumn").innerHTML = importantHtml;
  document.getElementById("meetingColumn").innerHTML = meetingHtml;

  if (importantesEmails.length > 0) {
    document.getElementById("importantesHeader").innerHTML = `
      <button class="btn btn-outline-info w-100 btn-sm mb-2" onclick="revisarTodo('importantes')">
        <i class="bi bi-check-all"></i> Revisar todo (${importantesEmails.length})
      </button>`;
  }

  if (reunionesEmails.length > 0) {
    document.getElementById("reunionesHeader").innerHTML = `
      <button class="btn btn-outline-warning w-100 btn-sm mb-2" onclick="revisarTodo('reunion')">
        <i class="bi bi-check-all"></i> Revisar todo (${reunionesEmails.length})
      </button>`;
  }

  updateCounters(emails);
}

// ==========================
// 📊 CONTADORES
// ==========================
function updateCounters(emails) {
  setCount("inboxCount", emails.length);
  setCount("engageCount", emails.length - emails.filter(e =>
    ["importantes", "reunion", "faltas_justificadas", "faltas_injustificadas"].includes(e.tag)
  ).length);
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
    alertas: "secondary", reunion: "warning",
    faltas_justificadas: "success", faltas_injustificadas: "danger", importantes: "info",
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

window.marcarRevisado = async function (index) {
  const emails = loadEmails();
  if (!emails[index]) return;
  const id = emails[index].id;
  const accessToken = await getValidAccessToken();
  const updated = emails.filter((_, i) => i !== index);
  saveEmails(updated);
  localStorage.setItem("dashboardEmails", JSON.stringify(updated));
  renderEmails();
  marcarLeidoSilencioso(id, accessToken);
};

// ==========================
// ✅ RESPONDER CORREO — con sugerencia de IA
// ==========================
window.responderCorreo = async function (index) {
  const emails = loadEmails();
  if (!emails[index]) return;
  const accessToken = await getValidAccessToken();

  if (emails[index].tag === "faltas_injustificadas" || emails[index].tag === "faltas_justificadas") {
    const id = emails[index].id;
    const response = await fetch("http://localhost:3000/send-by-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, access_token: accessToken })
    });
    const data = await response.json();
    console.log(data);
    singleRefresh();

  } else if (emails[index].tag === "reunion" || emails[index].tag === "importantes") {
    const modal = new bootstrap.Modal(document.getElementById("emailModal_respuesta"));
    const colors = { importantes: "bg-info", reunion: "bg-warning" };
    const tagColor = colors[emails[index].tag] || "bg-secondary";

    document.getElementById("modalSubject_r").textContent = emails[index].subject || "Sin asunto";
    document.getElementById("modalFrom_r").textContent = emails[index].from || "Desconocido";
    document.getElementById("modalDate_r").textContent = emails[index].date
      ? new Date(emails[index].date).toLocaleString() : "";

    const tagElement = document.getElementById("modalTag_r");
    tagElement.className = "badge " + tagColor;
    tagElement.textContent = (emails[index].tag || "SIN CATEGORIA").replace("_", " ").toUpperCase();
    document.getElementById("modalBody_r").textContent = emails[index].text || emails[index].body || "Sin contenido";

    const inputText = document.getElementById("text_r");
    inputText.value = "";

    // ✅ NUEVO — botón Sugerir respuesta con IA
    let btnSuggest = document.getElementById("btnSuggest_r");
    if (btnSuggest) {
      btnSuggest.replaceWith(btnSuggest.cloneNode(true));
      btnSuggest = document.getElementById("btnSuggest_r");
      btnSuggest.disabled = false;

      btnSuggest.addEventListener("click", async () => {
        btnSuggest.disabled = true;
        btnSuggest.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generando...';
        try {
          const res = await fetch("http://localhost:3000/suggest-reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: emails[index].subject || "",
              text: emails[index].text || emails[index].body || "",
              from: emails[index].from || "",
              tag: emails[index].tag || ""
            })
          });
          const data = await res.json();
          if (data.suggestion) {
            inputText.value = data.suggestion;
            btnSend.disabled = false;
          }
        } catch (err) {
          console.error("Error sugiriendo respuesta:", err);
        } finally {
          btnSuggest.disabled = false;
          btnSuggest.innerHTML = '✨ Sugerir respuesta';
        }
      });
    }

    modal.show();

    let btnSend = document.getElementById("btnSend_r");
    btnSend.replaceWith(btnSend.cloneNode(true));
    btnSend = document.getElementById("btnSend_r");
    btnSend.disabled = true;

    inputText.addEventListener("input", () => {
      btnSend.disabled = inputText.value.trim() === "";
    });

    btnSend.addEventListener("click", () => {
      const message = inputText.value.trim();
      if (!message) return;
      sendMessage(message, index);
      modal.hide();
    });

    async function sendMessage(message, index) {
      const accessToken = await getValidAccessToken();
      const response = await fetch("http://localhost:3000/send-by-From", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: emails[index].id,
          message,
          access_token: accessToken,
          to: emails[index].from,
          subject: emails[index].subject || "",
          threadId: emails[index].threadId || ""
        })
      });
      const data = await response.json();
      console.log(data);
      singleRefresh();
    }
  }
};

// ==========================
// ✅ NUEVO — AGENDAR EN GOOGLE CALENDAR
// ==========================
window.agendarEnCalendar = async function (index) {
  const emails = loadEmails();
  const mail = emails[index];
  if (!mail) return;

  const accessToken = await getValidAccessToken();

  // 1️⃣ Mostrar loading
  Swal.fire({
    title: "Analizando reunión...",
    html: "La IA está extrayendo los datos del correo 🤖",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    // 2️⃣ Extraer datos con IA
    const extractRes = await fetch("http://localhost:3000/extract-meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: mail.subject || "",
        text: mail.text || mail.body || "",
        from: mail.from || ""
      })
    });

    const meetingData = await extractRes.json();

    if (meetingData.error) throw new Error(meetingData.error);

    Swal.close();

    // 3️⃣ Mostrar modal de confirmación con los datos extraídos
    const { value: formValues } = await Swal.fire({
      title: "📅 Confirmar reunión",
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label class="form-label fw-bold">Título</label>
            <input id="swal-title" class="form-control" value="${meetingData.title || mail.subject || ''}" />
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold">Fecha</label>
            <input id="swal-date" type="date" class="form-control" value="${meetingData.date || ''}" />
          </div>
          <div class="row mb-3">
            <div class="col">
              <label class="form-label fw-bold">Hora inicio</label>
              <input id="swal-start" type="time" class="form-control" value="${meetingData.startTime || '09:00'}" />
            </div>
            <div class="col">
              <label class="form-label fw-bold">Hora fin</label>
              <input id="swal-end" type="time" class="form-control" value="${meetingData.endTime || '10:00'}" />
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold">Descripción</label>
            <textarea id="swal-desc" class="form-control" rows="2">${meetingData.description || ''}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Agendar en Calendar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0d6efd",
      preConfirm: () => {
        const date = document.getElementById("swal-date").value;
        const start = document.getElementById("swal-start").value;
        const end = document.getElementById("swal-end").value;

        if (!date) {
          Swal.showValidationMessage("La fecha es obligatoria");
          return false;
        }

        return {
          title: document.getElementById("swal-title").value,
          date,
          startTime: start,
          endTime: end,
          description: document.getElementById("swal-desc").value,
        };
      }
    });

    if (!formValues) return; // usuario canceló

    // 4️⃣ Crear evento en Google Calendar API
    Swal.fire({
      title: "Agendando...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const startDateTime = `${formValues.date}T${formValues.startTime}:00`;
    const endDateTime = `${formValues.date}T${formValues.endTime}:00`;

    // Construir lista de asistentes
    const attendees = [];
    if (mail.from) attendees.push({ email: mail.from.match(/<(.+)>/)?.[1] || mail.from });
    if (auth.currentUser?.email) attendees.push({ email: auth.currentUser.email });
    if (meetingData.attendees?.length) {
      meetingData.attendees.forEach(a => {
        if (!attendees.find(x => x.email === a)) attendees.push({ email: a });
      });
    }

    const event = {
      summary: formValues.title,
      description: formValues.description,
      start: { dateTime: startDateTime, timeZone: "America/Bogota" },
      end: { dateTime: endDateTime, timeZone: "America/Bogota" },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 }
        ]
      }
    };

    const calendarRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      }
    );

    const calendarData = await calendarRes.json();

    if (!calendarRes.ok) throw new Error(calendarData.error?.message || "Error al crear el evento");

    // ✅ Marcar como leído en Gmail y quitar del dashboard
    marcarLeidoSilencioso(mail.id, accessToken);
    const emailsActualizados = loadEmails().filter((_, i) => i !== index);
    saveEmails(emailsActualizados);
    localStorage.setItem("dashboardEmails", JSON.stringify(emailsActualizados));

    await Swal.fire({
      icon: "success",
      title: "¡Reunión agendada! 🎉",
      html: `El evento <strong>${formValues.title}</strong> fue creado en tu Google Calendar.<br><br>
        <a href="${calendarData.htmlLink}" target="_blank" class="btn btn-sm btn-outline-primary">Ver en Calendar</a>`,
      confirmButtonText: "Cerrar"
    });

    // Recargar dashboard para reflejar cambios
    renderEmails();

  } catch (err) {
    console.error("Error agendando reunión:", err);
    Swal.fire({
      icon: "error",
      title: "Error al agendar",
      text: err.message
    });
  }
};

// ==========================
// ✅ REVISAR TODO — segundo plano
// ==========================
window.revisarTodo = async function (tag) {
  const emails = loadEmails();
  const accessToken = await getValidAccessToken();
  const aRevisar = emails.filter(m => m.tag === tag);
  if (aRevisar.length === 0) return;
  const restantes = emails.filter(m => m.tag !== tag);
  saveEmails(restantes);
  localStorage.setItem("dashboardEmails", JSON.stringify(restantes));
  renderEmails();
  (async () => {
    for (const mail of aRevisar) {
      await marcarLeidoSilencioso(mail.id, accessToken);
      await new Promise(r => setTimeout(r, 300));
    }
    console.log(`✅ ${aRevisar.length} correos de '${tag}' marcados como leídos`);
  })();
};

// ==========================
// ✅ RESPONDER TODOS — faltas, segundo plano
// ==========================
window.responderTodos = async function () {
  const emails = loadEmails();
  const accessToken = await getValidAccessToken();
  const faltas = emails.filter(m => m.tag === "faltas_justificadas" || m.tag === "faltas_injustificadas");
  if (faltas.length === 0) return;
  const restantes = emails.filter(m => m.tag !== "faltas_justificadas" && m.tag !== "faltas_injustificadas");
  saveEmails(restantes);
  localStorage.setItem("dashboardEmails", JSON.stringify(restantes));
  renderEmails();
  (async () => {
    let enviados = 0;
    for (const mail of faltas) {
      try {
        await fetch("http://localhost:3000/send-by-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mail.id, access_token: accessToken })
        });
        enviados++;
        await new Promise(r => setTimeout(r, 800));
      } catch (err) {
        console.warn(`⚠️ Error respondiendo ${mail.id}:`, err);
      }
    }
    console.log(`✅ ${enviados} / ${faltas.length} faltas respondidas`);
  })();
};

// coders button
document.querySelector('#codersBtn')?.addEventListener('click', () => {
  window.location.href = '../coders/index.html';
});