// Orchestrates the login flow: Firebase Google auth, email fetching from n8n, batch classification, and redirect.

// Initializes Firebase and sets up the Google OAuth provider with the required Gmail and Calendar scopes.
async function initApp() {
  try {
    await initFirebase();

    window.db = firebase.firestore();
    window.provider = new firebase.auth.GoogleAuthProvider();
    window.provider.addScope("https://www.googleapis.com/auth/gmail.modify");
    window.provider.addScope("https://www.googleapis.com/auth/gmail.send");
    window.provider.addScope("https://www.googleapis.com/auth/calendar.events");

    console.log("Firebase initialized");
    setupLogin();
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}

// Attaches the click handler to the login button and runs the full auth + email sync flow on click.
function setupLogin() {
  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    try {
      Swal.fire({
        title: "Conectando...",
        html: "Iniciando sesion y sincronizando correos",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const result = await auth.signInWithPopup(provider);
      const currentUser = result.user;

      const accessToken = result.credential.accessToken;
      saveAccessToken(accessToken);

      await db.collection("users").doc(currentUser.uid).set({
        email: currentUser.email,
        name: currentUser.displayName,
        createdAt: new Date(),
      });

      const res = await fetch("https://n8n.andrescortes.dev/webhook/get-mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, uid: currentUser.uid }),
      });

      const data = await res.json();
      const emails = parseEmailsFromN8n(data);

      if (emails.length === 0) {
        Swal.fire({ icon: "success", title: "Sin correos nuevos", timer: 2000, showConfirmButton: false });
        setTimeout(() => { window.location.href = "./windows/dashboard/dashboard.html"; }, 2000);
        return;
      }

      const processed = await classifyAndEnrichEmails(emails);

      persistEmails(processed);
      Swal.close();
      window.location.href = "./windows/dashboard/dashboard.html";
    } catch (error) {
      console.error("Login error:", error);
      Swal.fire({ icon: "error", title: "Error", text: error.message });
    }
  });
}

initApp();
