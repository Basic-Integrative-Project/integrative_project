// Manages the Google OAuth access token lifecycle: storage, retrieval, and renewal when near expiry.

const TOKEN_KEY = "gmail_access_token";
const TOKEN_TIME_KEY = "gmail_token_time";
const TOKEN_TTL_MS = 3000000; // 50 minutes

// Saves the access token and its creation timestamp to localStorage.
function saveAccessToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_TIME_KEY, Date.now().toString());
}

// Returns the stored access token, renewing it via re-authentication if it is close to expiring.
async function getValidAccessToken() {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    const tokenAge = localStorage.getItem(TOKEN_TIME_KEY);
    const now = Date.now();

    if (tokenAge && now - parseInt(tokenAge) > TOKEN_TTL_MS) {
      console.log("Token near expiry, renewing...");
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/gmail.modify");
      provider.addScope("https://www.googleapis.com/auth/gmail.send");
      provider.addScope("https://www.googleapis.com/auth/calendar.events");
      const reauth = await auth.currentUser.reauthenticateWithPopup(provider);
      const newToken = reauth.credential.accessToken;
      saveAccessToken(newToken);
      return newToken;
    }

    return stored;
  } catch (err) {
    console.warn("Could not renew token, using existing one:", err);
    return localStorage.getItem(TOKEN_KEY);
  }
}

// Clears all stored token data from localStorage.
function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_TIME_KEY);
}

window.saveAccessToken = saveAccessToken;
window.getValidAccessToken = getValidAccessToken;
window.clearAccessToken = clearAccessToken;
