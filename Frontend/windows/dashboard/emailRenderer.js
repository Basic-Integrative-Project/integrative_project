// Builds and inserts the email card HTML into the dashboard columns based on category.

// Updates the badge counters in the sidebar for total inbox count and engagement count.
function updateCounters(emails) {
  const total = emails.length;
  const el = document.getElementById("inboxCount");
  if (el) el.textContent = total;
}

// Builds an email card HTML string with action buttons appropriate to the email category.
function buildEmailCard(mail, index) {
  const colorClass = mail.colorClass || "info";

  const selectHTML = `
    <div class="mt-2">
      <select class="form-select form-select-sm" onchange="cambiarCategoria(${index}, this.value)">
        <option value="importantes" ${mail.tag === "importantes" ? "selected" : ""}>Importante</option>
        <option value="reunion" ${mail.tag === "reunion" ? "selected" : ""}>Reunion</option>
        <option value="faltas_justificadas" ${mail.tag === "faltas_justificadas" ? "selected" : ""}>Falta Justificada</option>
        <option value="faltas_injustificadas" ${mail.tag === "faltas_injustificadas" ? "selected" : ""}>Falta Injustificada</option>
      </select>
    </div>`;

  const agendarBtn = mail.tag === "reunion"
    ? `<button class="btn btn-sm btn-outline-secondary" onclick="agendarEnCalendar(${index})">Agendar</button>`
    : "";

  const buttonsHTML = `
    <div class="mt-2 d-flex gap-2 flex-wrap">
      <button class="btn btn-sm btn-outline-success" onclick="marcarRevisado(${index})">Revisado</button>
      <button class="btn btn-sm btn-outline-primary" onclick="leerCorreo(${index})">Leer</button>
      <button class="btn btn-sm btn-outline-dark" onclick="responderCorreo(${index})">Responder</button>
      ${agendarBtn}
    </div>`;

  const footerHTML = `<div class="email-card-footer mt-2"><small>${mail.date ? new Date(mail.date).toLocaleString() : ""}</small></div>`;

  return `
    <div class="email-card border-${colorClass} mb-3 w-100 d-flex flex-column ${mail.revisado ? "opacity-50" : ""}">
      <div class="email-card-header"><span class="badge bg-${colorClass}">${mail.tag.toUpperCase()}</span></div>
      <div class="email-card-sender">${mail.from || "Desconocido"}</div>
      <div class="email-card-subject">${mail.subject || "Sin asunto"}</div>
      ${selectHTML}
      ${buttonsHTML}
      ${footerHTML}
    </div>`;
}

// Renders all emails from cache into the dashboard layout, separating them by category column.
function renderEmails() {
  const emails = loadEmails();
  const leftContainer = document.getElementById("emailList");
  const centerContainer = document.getElementById("emailList2");
  if (!leftContainer || !centerContainer) return;

  centerContainer.innerHTML = `
    <div class="row w-100">
      <div class="col-12 col-md-6 mb-4">
        <h5 class="text-center mb-3 text-info">IMPORTANTES</h5>
        <div id="importantesHeader" class="mb-2"></div>
        <div id="importantColumn" class="d-flex flex-column gap-3"></div>
      </div>
      <div class="col-12 col-md-6 mb-4">
        <h5 class="text-center mb-3 text-warning">REUNIONES</h5>
        <div id="reunionesHeader" class="mb-2"></div>
        <div id="meetingColumn" class="d-flex flex-column gap-3"></div>
      </div>
    </div>`;

  let leftHtml = "", importantHtml = "", meetingHtml = "";

  const faltasEmails = emails.filter(m => m.tag === "faltas_justificadas" || m.tag === "faltas_injustificadas");
  const importantesEmails = emails.filter(m => m.tag === "importantes");
  const reunionesEmails = emails.filter(m => m.tag === "reunion");

  emails.forEach((mail, index) => {
    if (mail.tag === "alertas") return;
    const card = buildEmailCard(mail, index);
    if (mail.tag === "importantes") importantHtml += card;
    else if (mail.tag === "reunion") meetingHtml += card;
    else leftHtml += card;
  });

  leftContainer.innerHTML = faltasEmails.length > 0 ? `
    <div class="mb-3">
      <h5 class="text-center mb-3 text-danger">FALTAS</h5>
      <div class="mb-3">
        <button class="btn btn-danger w-100" onclick="responderTodos()">
          <i class="bi bi-reply-all-fill"></i> Responder todos (${faltasEmails.length})
        </button>
      </div>
      ${leftHtml}
    </div>` : "";

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

window.renderEmails = renderEmails;
