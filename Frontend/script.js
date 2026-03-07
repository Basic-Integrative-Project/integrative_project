// 🔹 OBTENER CONFIGURACIÓN DESDE EL BACKEND
async function loadFirebaseConfig() {
  const response = await fetch("http://localhost:3000/firebase-config");
  if (!response.ok) {
    throw new Error("No se pudo obtener la configuración de Firebase");
  }
  return await response.json();
}

// 🔥 INICIALIZAR APP
async function initApp() {
  try {
    const firebaseConfig = await loadFirebaseConfig();

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.provider = new firebase.auth.GoogleAuthProvider();

    // Gmail scopes
    window.provider.addScope('https://www.googleapis.com/auth/gmail.modify');
    window.provider.addScope('https://www.googleapis.com/auth/gmail.send');

    // ✅ NUEVO — Google Calendar scope
    window.provider.addScope('https://www.googleapis.com/auth/calendar.events');

    console.log("✅ Firebase inicializado");
    setupLogin();

  } catch (error) {
    console.error("Error inicializando Firebase:", error);
  }
}

initApp();

let currentUser = null;

// ✅ FIX 3 — Guardar token con timestamp y renovar si está por vencer
async function getValidAccessToken() {
  try {
    const stored = localStorage.getItem("gmail_access_token");
    const tokenAge = localStorage.getItem("gmail_token_time");
    const now = Date.now();

    // Token dura 1 hora, renovar si tiene más de 50 minutos
    if (tokenAge && (now - parseInt(tokenAge)) > 3000000) {
      console.log("🔄 Token próximo a vencer, renovando...");
      const reauth = await auth.currentUser.reauthenticateWithPopup(window.provider);
      const newToken = reauth.credential.accessToken;
      localStorage.setItem("gmail_access_token", newToken);
      localStorage.setItem("gmail_token_time", now.toString());
      return newToken;
    }

    return stored;
  } catch (err) {
    console.warn("⚠️ No se pudo renovar token, usando el existente:", err);
    return localStorage.getItem("gmail_access_token");
  }
}

// ✅ HELPER: parsea la respuesta de n8n sin importar la estructura que devuelva
function parseEmailsFromN8n(data) {
  console.log("📬 Respuesta raw de n8n:", JSON.stringify(data, null, 2));
  if (Array.isArray(data) && data.length > 0 && data[0]?.id) return data;
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.emails)) return data[0].emails;
  if (Array.isArray(data?.emails)) return data.emails;
  if (Array.isArray(data?.json?.emails)) return data.json.emails;
  if (Array.isArray(data) && data[0]?.json?.id) return data.map(d => d.json);
  return [];
}

// 🔐 LOGIN CON GOOGLE + CLASIFICACIÓN COMPLETA
function setupLogin() {
  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    try {

      Swal.fire({
        title: "Conectando...",
        html: "Iniciando sesión y sincronizando correos 📩",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // 🔐 LOGIN GOOGLE
      const result = await auth.signInWithPopup(provider);
      currentUser = result.user;

      // Guardar token + timestamp
      const accessToken = result.credential.accessToken;
      localStorage.setItem("gmail_access_token", accessToken);
      localStorage.setItem("gmail_token_time", Date.now().toString());

      await db.collection("users").doc(currentUser.uid).set({
        email: currentUser.email,
        name: currentUser.displayName,
        createdAt: new Date(),
      });

      // 🔗 OBTENER CORREOS DESDE N8N
      const res = await fetch("https://n8n.andrescortes.dev/webhook/get-mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          uid: currentUser.uid
        })
      });

      const data = await res.json();
      const emails = parseEmailsFromN8n(data);

      if (emails.length === 0) {
        Swal.fire({
          icon: "success",
          title: "Sin correos nuevos 🎉",
          timer: 2000,
          showConfirmButton: false
        });

        setTimeout(() => {
          window.location.href = "./windows/dashboard/dashboard.html";
        }, 2000);

        return;
      }

      // 🔥 CLASIFICACIÓN EN LOTE
      const batchRes = await fetch("http://localhost:3000/classify-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emails.map(m => ({
            subject: m.subject || "",
            text: (m.text || "").substring(0, 500)
          }))
        }),
      });

      if (!batchRes.ok) {
        throw new Error(`Error backend: ${batchRes.status}`);
      }

      const batchData = await batchRes.json();

      const colorMap = {
        alertas: "secondary",
        reunion: "warning",
        faltas_justificadas: "success",
        faltas_injustificadas: "danger",
        importantes: "info",
      };

      const processedEmails = emails
        .map((mail, index) => {
          const tag = batchData[index]?.tag || "importantes";
          return {
            ...mail,
            tag,
            colorClass: colorMap[tag] || "info",
            revisado: false,
          };
        })
        .filter(mail => mail.tag !== "alertas");

      localStorage.setItem("dashboardEmails", JSON.stringify(processedEmails));

      Swal.close();
      window.location.href = "./windows/dashboard/dashboard.html";

    } catch (error) {
      console.error("Error en login:", error);
      Swal.fire({ icon: "error", title: "Error", text: error.message });
    }
  });
}