// Implements the interactive email actions: reading, responding with AI suggestions, marking as reviewed, and category changes.

// Updates the category tag and color of an email in cache and re-renders the dashboard.
window.cambiarCategoria = function (index, nuevaCategoria) {
  const emails = loadEmails();
  if (!emails[index]) return;
  emails[index].tag = nuevaCategoria;
  emails[index].colorClass = COLOR_MAP[nuevaCategoria] || "info";
  saveEmails(emails);
  renderEmails();
};

// Opens the read modal and populates it with the selected email's content and metadata.
window.leerCorreo = function (index) {
  const emails = loadEmails();
  const mail = emails[index];
  if (!mail) return;

  const modal = new bootstrap.Modal(document.getElementById("emailModal"));
  const colors = {
    importantes: "bg-info",
    reunion: "bg-warning",
    faltas_justificadas: "bg-success",
    faltas_injustificadas: "bg-danger",
  };

  document.getElementById("modalSubject").textContent = mail.subject || "Sin asunto";
  document.getElementById("modalFrom").textContent = mail.from || "Desconocido";
  document.getElementById("modalDate").textContent = mail.date ? new Date(mail.date).toLocaleString() : "";

  const tagEl = document.getElementById("modalTag");
  tagEl.className = "badge " + (colors[mail.tag] || "bg-secondary");
  tagEl.textContent = (mail.tag || "SIN CATEGORIA").replace("_", " ").toUpperCase();
  document.getElementById("modalBody").textContent = mail.text || mail.body || "Sin contenido";

  modal.show();
};

// Removes the email from cache, marks it as read in Gmail, and re-renders the dashboard.
window.marcarRevisado = async function (index) {
  const emails = loadEmails();
  if (!emails[index]) return;

  const id = emails[index].id;
  const accessToken = await getValidAccessToken();
  const updated = emails.filter((_, i) => i !== index);

  saveEmails(updated);
  persistEmails(updated);
  renderEmails();
  markReadSilent(id, accessToken);
};

// Opens the reply modal for important or meeting emails, loads an AI reply suggestion on demand, and sends the reply.
window.responderCorreo = async function (index) {
  const emails = loadEmails();
  if (!emails[index]) return;

  const accessToken = await getValidAccessToken();
  const mail = emails[index];

  if (mail.tag === "faltas_injustificadas" || mail.tag === "faltas_justificadas") {
    await fetch("http://localhost:3000/send-by-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mail.id, access_token: accessToken }),
    });
    await fetchClassifyAndRender(auth.currentUser);
    return;
  }

  const modal = new bootstrap.Modal(document.getElementById("emailModal_respuesta"));
  const colors = { importantes: "bg-info", reunion: "bg-warning" };

  document.getElementById("modalSubject_r").textContent = mail.subject || "Sin asunto";
  document.getElementById("modalFrom_r").textContent = mail.from || "Desconocido";
  document.getElementById("modalDate_r").textContent = mail.date ? new Date(mail.date).toLocaleString() : "";

  const tagEl = document.getElementById("modalTag_r");
  tagEl.className = "badge " + (colors[mail.tag] || "bg-secondary");
  tagEl.textContent = (mail.tag || "SIN CATEGORIA").replace("_", " ").toUpperCase();
  document.getElementById("modalBody_r").textContent = mail.text || mail.body || "Sin contenido";

  const inputText = document.getElementById("text_r");
  inputText.value = "";

  let btnSuggest = document.getElementById("btnSuggest_r");
  if (btnSuggest) {
    btnSuggest.replaceWith(btnSuggest.cloneNode(true));
    btnSuggest = document.getElementById("btnSuggest_r");
    btnSuggest.disabled = false;

    // Requests an AI-generated reply from the backend and fills the reply textarea.
    btnSuggest.addEventListener("click", async () => {
      btnSuggest.disabled = true;
      btnSuggest.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generando...';
      try {
        const res = await fetch("http://localhost:3000/suggest-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: mail.subject || "",
            text: mail.text || mail.body || "",
            from: mail.from || "",
            tag: mail.tag || "",
          }),
        });
        const data = await res.json();
        if (data.suggestion) {
          inputText.value = data.suggestion;
          btnSend.disabled = false;
        }
      } catch (err) {
        console.error("Error fetching suggestion:", err);
      } finally {
        btnSuggest.disabled = false;
        btnSuggest.innerHTML = "Sugerir respuesta";
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

  // Sends the composed reply through the backend n8n proxy.
  btnSend.addEventListener("click", async () => {
    const message = inputText.value.trim();
    if (!message) return;

    const token = await getValidAccessToken();
    await fetch("http://localhost:3000/send-by-From", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: mail.id,
        message,
        access_token: token,
        to: mail.from,
        subject: mail.subject || "",
        threadId: mail.threadId || "",
      }),
    });

    modal.hide();
    await fetchClassifyAndRender(auth.currentUser);
  });
};

// Marks all emails of a given tag as reviewed, removes them from cache, and asynchronously marks each as read.
window.revisarTodo = async function (tag) {
  const emails = loadEmails();
  const accessToken = await getValidAccessToken();
  const toReview = emails.filter(m => m.tag === tag);
  if (toReview.length === 0) return;

  const remaining = emails.filter(m => m.tag !== tag);
  saveEmails(remaining);
  persistEmails(remaining);
  renderEmails();

  (async () => {
    for (const mail of toReview) {
      await markReadSilent(mail.id, accessToken);
      await new Promise(r => setTimeout(r, 300));
    }
  })();
};

// Sends automated replies to all absence emails (justified and unjustified) in the background.
window.responderTodos = async function () {
  const emails = loadEmails();
  const accessToken = await getValidAccessToken();
  const faltas = emails.filter(m => m.tag === "faltas_justificadas" || m.tag === "faltas_injustificadas");
  if (faltas.length === 0) return;

  const remaining = emails.filter(m => m.tag !== "faltas_justificadas" && m.tag !== "faltas_injustificadas");
  saveEmails(remaining);
  persistEmails(remaining);
  renderEmails();

  (async () => {
    for (const mail of faltas) {
      try {
        await fetch("http://localhost:3000/send-by-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mail.id, access_token: accessToken }),
        });
        await new Promise(r => setTimeout(r, 800));
      } catch (err) {
        console.warn(`Error responding to ${mail.id}:`, err);
      }
    }
  })();
};
