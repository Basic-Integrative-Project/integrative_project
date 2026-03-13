// Handles fetching emails from the n8n webhook, classifying them, and updating the cache and UI.

// Marks a single email as read in Gmail by forwarding the request to the backend n8n proxy silently.
async function markReadSilent(id, accessToken) {
  try {
    await fetch("http://localhost:3000/read-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, access_token: accessToken }),
    });
  } catch (err) {
    console.warn(`Could not mark email as read: ${id}`, err);
  }
}

// Fetches emails from the n8n webhook, runs batch classification, and updates storage and cache.
async function fetchClassifyAndRender(user) {
  const leftList = document.getElementById("emailList");
  const centerList = document.getElementById("emailList2");
  if (leftList) leftList.innerHTML = '<p class="text-muted text-center py-3"><span class="spinner-border spinner-border-sm me-2"></span>Sincronizando...</p>';
  if (centerList) centerList.innerHTML = '<p class="text-muted text-center py-3">Cargando correos...</p>';

  const accessToken = await getValidAccessToken();

  const res = await fetch("https://n8n.andrescortes.dev/webhook/get-mails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, uid: user.uid }),
  });

  const data = await res.json();
  const emails = parseEmailsFromN8n(data);

  const processed = await classifyAndEnrichEmails(emails);

  persistEmails(processed);
  saveEmails(processed);
  renderEmails();
}

window.markReadSilent = markReadSilent;
window.fetchClassifyAndRender = fetchClassifyAndRender;
