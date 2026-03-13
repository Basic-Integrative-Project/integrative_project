// Sends emails to the backend for batch classification and maps results to color classes.

const COLOR_MAP = {
  alertas: "secondary",
  reunion: "warning",
  faltas_justificadas: "success",
  faltas_injustificadas: "danger",
  importantes: "info",
};

// Sends an array of emails to the backend batch classification endpoint and returns enriched email objects.
async function classifyAndEnrichEmails(emails) {
  const batchRes = await fetch("http://localhost:3000/classify-emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emails: emails.map(m => ({
        subject: m.subject || "",
        text: (m.text || "").substring(0, 500),
      })),
    }),
  });

  if (!batchRes.ok) throw new Error(`Backend error: ${batchRes.status}`);

  const batchData = await batchRes.json();

  return emails
    .map((mail, index) => {
      const tag = batchData[index]?.tag || "importantes";
      return {
        ...mail,
        tag,
        colorClass: COLOR_MAP[tag] || "info",
        revisado: false,
      };
    })
    .filter(mail => mail.tag !== "alertas");
}

window.classifyAndEnrichEmails = classifyAndEnrichEmails;
window.COLOR_MAP = COLOR_MAP;
