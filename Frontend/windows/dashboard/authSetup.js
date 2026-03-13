// Sets up Firebase auth state listener, populates the user header, and handles logout.

// Listens for auth state changes, redirects to login if unauthenticated, and renders the user header.
function setupAuthListener(onAuthenticated) {
  auth.onAuthStateChanged((user) => {
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

    if (typeof onAuthenticated === "function") onAuthenticated(user);
  });
}

// Attaches the logout click handler, clears stored email data and tokens, and redirects to the login page.
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    clearStoredEmails();
    clearAccessToken();
    auth.signOut()
      .then(() => { window.location.href = "../../index.html"; })
      .catch(err => console.error("Logout error:", err));
  });
}

window.setupAuthListener = setupAuthListener;
window.setupLogoutButton = setupLogoutButton;
