// Manages in-memory and localStorage caching for processed emails across the dashboard session.

const STORAGE_KEY = "dashboardEmails";
let emailsCache = [];

// Saves the given email array to the in-memory cache.
function saveEmails(emails) {
  emailsCache = emails;
}

// Returns the current in-memory email cache.
function loadEmails() {
  return emailsCache;
}

// Reads and parses the email array stored in localStorage, returning an empty array on failure.
function loadFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Persists the given email array to localStorage.
function persistEmails(emails) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
}

// Removes the email data from localStorage.
function clearStoredEmails() {
  localStorage.removeItem(STORAGE_KEY);
}

window.addEventListener("beforeunload", () => {
  emailsCache = [];
});

window.saveEmails = saveEmails;
window.loadEmails = loadEmails;
window.loadFromStorage = loadFromStorage;
window.persistEmails = persistEmails;
window.clearStoredEmails = clearStoredEmails;
