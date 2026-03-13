// Extracts meeting data from a reunion email using AI and creates a Google Calendar event via the API.

// Extracts a clean email address from strings formatted as "Name <email>" or plain "email".
function extractEmail(raw = "") {
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim().toLowerCase();
  const plain = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(plain) ? plain : null;
}

// Calls the AI extraction endpoint, shows a confirmation form, and creates the Google Calendar event.
window.agendarEnCalendar = async function (index) {
  const emails = loadEmails();
  const mail = emails[index];
  if (!mail) return;

  const accessToken = await getValidAccessToken();

  Swal.fire({
    title: "Analizando reunion...",
    html: "La IA esta extrayendo los datos del correo",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const extractRes = await fetch("http://localhost:3000/extract-meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: mail.subject || "",
        text: mail.text || mail.body || "",
        from: mail.from || "",
      }),
    });

    const meetingData = await extractRes.json();
    if (meetingData.error) throw new Error(meetingData.error);

    Swal.close();

    // Displays a pre-filled confirmation form with AI-extracted meeting details for the user to review.
    const { value: formValues } = await Swal.fire({
      title: "Confirmar reunion",
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label class="form-label fw-bold">Titulo</label>
            <input id="swal-title" class="form-control" value="${meetingData.title || mail.subject || ""}" />
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold">Fecha</label>
            <input id="swal-date" type="date" class="form-control" value="${meetingData.date || ""}" />
          </div>
          <div class="row mb-3">
            <div class="col">
              <label class="form-label fw-bold">Hora inicio</label>
              <input id="swal-start" type="time" class="form-control" value="${meetingData.startTime || "09:00"}" />
            </div>
            <div class="col">
              <label class="form-label fw-bold">Hora fin</label>
              <input id="swal-end" type="time" class="form-control" value="${meetingData.endTime || "10:00"}" />
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold">Descripcion</label>
            <textarea id="swal-desc" class="form-control" rows="2">${meetingData.description || ""}</textarea>
          </div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: "Agendar en Calendar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0d6efd",
      preConfirm: () => {
        const date = document.getElementById("swal-date").value;
        if (!date) { Swal.showValidationMessage("La fecha es obligatoria"); return false; }
        return {
          title: document.getElementById("swal-title").value,
          date,
          startTime: document.getElementById("swal-start").value,
          endTime: document.getElementById("swal-end").value,
          description: document.getElementById("swal-desc").value,
        };
      },
    });

    if (!formValues) return;

    Swal.fire({ title: "Agendando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const startDateTime = `${formValues.date}T${formValues.startTime}:00`;
    const endDateTime = `${formValues.date}T${formValues.endTime}:00`;

    const attendeesRaw = [];
    if (mail.from) attendeesRaw.push(extractEmail(mail.from));
    if (auth.currentUser?.email) attendeesRaw.push(auth.currentUser.email.trim().toLowerCase());
    if (meetingData.attendees?.length) meetingData.attendees.forEach(a => attendeesRaw.push(extractEmail(a)));

    const attendees = [...new Set(attendeesRaw.filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))]
      .map(email => ({ email }));

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
          { method: "popup", minutes: 15 },
        ],
      },
    };

    const calendarRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    const calendarData = await calendarRes.json();
    if (!calendarRes.ok) throw new Error(calendarData.error?.message || "Error al crear el evento");

    markReadSilent(mail.id, accessToken);
    const updated = loadEmails().filter((_, i) => i !== index);
    saveEmails(updated);
    persistEmails(updated);

    await Swal.fire({
      icon: "success",
      title: "Reunion agendada",
      html: `El evento <strong>${formValues.title}</strong> fue creado en Google Calendar.<br><br>
        <a href="${calendarData.htmlLink}" target="_blank" class="btn btn-sm btn-outline-primary">Ver en Calendar</a>`,
      confirmButtonText: "Cerrar",
    });

    renderEmails();
  } catch (err) {
    console.error("Error scheduling meeting:", err);
    Swal.fire({ icon: "error", title: "Error al agendar", text: err.message });
  }
};
