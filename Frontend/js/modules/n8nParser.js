// Normalizes the varying response shapes returned by the n8n webhook into a flat array of email objects.

// Inspects the raw n8n response and extracts a consistent array of email objects regardless of shape.
function parseEmailsFromN8n(data) {
  if (Array.isArray(data) && data.length > 0 && data[0]?.id) return data;
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.emails)) return data[0].emails;
  if (Array.isArray(data?.emails)) return data.emails;
  if (Array.isArray(data?.json?.emails)) return data.json.emails;
  if (Array.isArray(data) && data[0]?.json?.id) return data.map(d => d.json);
  return [];
}

window.parseEmailsFromN8n = parseEmailsFromN8n;
