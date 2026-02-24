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

    console.log("✅ Firebase inicializado");

    setupLogin();

  } catch (error) {
    console.error("Error inicializando Firebase:", error);
  }
}

initApp();

// 🔹 Clasificación IA + fallback local con 5 categorías
async function classifyEmail(mail) {
  try {
    const res = await fetch("http://localhost:3000/classify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: mail.subject || "",
        text: mail.text || "",
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.tag || "importantes";
  } catch (err) {
    console.error("Error conectando a Ollama, usando fallback local:", err);

    const text = ((mail.subject || "") + " " + (mail.text || "")).toLowerCase();

    if (/(notificación|notification|alerta|promoción|oferta|descuento|newsletter|no-reply|facebook|instagram|twitter|linkedin|github|actualización|marketing)/.test(text)) {
      return "alertas";
    }

    if (/(reunión|reunion|meeting|zoom|teams|meet|call|agendar|calendario|cita|llamada)/.test(text)) {
      return "reunion";
    }

    if (/(baja médica|certificado médico|incapacidad|accidente|enfermedad|médico|hospital|urgencia|duelo|matrimonio|nacimiento|paternidad|maternidad|judicial|citación|calamidad)/.test(text)) {
      return "faltas_justificadas";
    }

    if (/(no vine|no fui|no asistí|falte sin avisar|no avisé|sin permiso|me quedé en casa|me quede en casa|me dormí|me dormi|olvidé|olvide|llegué tarde|llegue tarde|no tenía ganas|no tenia ganas)/.test(text)) {
      return "faltas_injustificadas";
    }

    return "importantes";
  }
}

let currentUser = null;

// 🔐 LOGIN CON GOOGLE + CONEXIÓN AUTOMÁTICA A N8N
function setupLogin() {
  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    try {

      // 🔥 Loader bonito
      Swal.fire({
        title: "Conectando...",
        html: "Iniciando sesión y sincronizando correos 📩",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 🔐 LOGIN GOOGLE
      const result = await auth.signInWithPopup(provider);
      currentUser = result.user;

      await db.collection("users").doc(currentUser.uid).set({
        email: currentUser.email,
        name: currentUser.displayName,
        createdAt: new Date(),
      });

      // 🔗 CONECTAR A N8N
      const n8nUrl =
        "https://n8n.andrescortes.dev/webhook/get-mails?uid=" +
        encodeURIComponent(currentUser.uid);

      const res = await fetch(n8nUrl);
      const data = await res.json();

      let emails = [];
      if (Array.isArray(data)) emails = data;
      else if (Array.isArray(data.emails)) emails = data.emails;
      else if (data?.json?.emails) emails = data.json.emails;

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

      // ⚡ Clasificación en paralelo
      const processedEmails = await Promise.all(
        emails.map(async (mail) => {
          const tag = await classifyEmail(mail);

          let colorClass = "primary";
          if (tag === "alertas") colorClass = "secondary";
          if (tag === "reunion") colorClass = "warning";
          if (tag === "faltas_justificadas") colorClass = "success";
          if (tag === "faltas_injustificadas") colorClass = "danger";
          if (tag === "importantes") colorClass = "info";

          return { ...mail, tag, colorClass };
        })
      );

      localStorage.setItem("dashboardEmails", JSON.stringify(processedEmails));

      // ✅ Cerrar loader
      Swal.close();

      // 🚀 Redirigir
      window.location.href = "./windows/dashboard/dashboard.html";

    } catch (error) {

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message
      });

      console.error("Error en login:", error);
    }
  });
}