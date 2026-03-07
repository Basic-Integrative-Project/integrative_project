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
    window.provider.addScope('https://www.googleapis.com/auth/gmail.modify');
    window.provider.addScope('https://www.googleapis.com/auth/gmail.send');

    console.log("✅ Firebase inicializado");

    setupLogin();

  } catch (error) {
    console.error("Error inicializando Firebase:", error);
  }
}

initApp();

let currentUser = null;

// ✅ HELPER: parsea la respuesta de n8n sin importar la estructura que devuelva
function parseEmailsFromN8n(data) {
  console.log("📬 Respuesta raw de n8n:", JSON.stringify(data, null, 2));

  // Caso 1: array plano de correos  →  [ {id, subject, ...}, ... ]
  if (Array.isArray(data) && data.length > 0 && data[0]?.id) return data;

  // Caso 2: nodo Aggregate          →  [ { emails: [...] } ]
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.emails)) return data[0].emails;

  // Caso 3: objeto con emails        →  { emails: [...] }
  if (Array.isArray(data?.emails)) return data.emails;

  // Caso 4: legado                   →  { json: { emails: [...] } }
  if (Array.isArray(data?.json?.emails)) return data.json.emails;

  // Caso 5: array de wrappers n8n    →  [ { json: { id, subject, ... } }, ... ]
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

      // Capturar y guardar el access_token de Gmail
      const accessToken = result.credential.accessToken;
      localStorage.setItem("gmail_access_token", accessToken);

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

      // ✅ PARSEO ROBUSTO — cubre todos los formatos posibles de n8n
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

      // 🔥 PROCESAR Y FILTRAR ALERTAS
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

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message
      });
    }
  });
}