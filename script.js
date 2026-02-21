// 🔹 CONFIGURA AQUÍ TUS DATOS DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCZlAmqADGneVmaBOEd_MUpB0JwbpZeG3Y",
  authDomain: "app-b2405.firebaseapp.com",
  projectId: "app-b2405",
  storageBucket: "app-b2405.firebasestorage.app",
  messagingSenderId: "129894344668",
  appId: "1:129894344668:web:243a95d5890c9754b8d119",
};

// 🔥 Inicializar Firebase (CORREGIDO)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();
let currentUser = null;

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

// 🔐 LOGIN CON GOOGLE + CONEXIÓN AUTOMÁTICA A N8N + OBTENER CORREOS
document.getElementById("loginBtn")?.addEventListener("click", async () => {
  try {
    const result = await auth.signInWithPopup(provider);
    currentUser = result.user;

    await db.collection("users").doc(currentUser.uid).set({
      email: currentUser.email,
      name: currentUser.displayName,
      createdAt: new Date(),
    });

    alert("Login exitoso ✅\nConectando a Gmail...");

    const n8nUrl = "https://n8n.andrescortes.dev/webhook/get-mails?uid=" + encodeURIComponent(currentUser.uid);
    const res = await fetch(n8nUrl);
    const data = await res.json();

    let emails = [];
    if (Array.isArray(data)) emails = data;
    else if (Array.isArray(data.emails)) emails = data.emails;
    else if (data?.json?.emails) emails = data.json.emails;

    if (emails.length === 0) {
      alert("No hay correos no leídos 🎉");
      return;
    }

    const processedEmails = [];
    for (const mail of emails) {
      const tag = await classifyEmail(mail);

      let colorClass = "primary";
      if (tag === "alertas") colorClass = "secondary";
      if (tag === "reunion") colorClass = "warning";
      if (tag === "faltas_justificadas") colorClass = "success";
      if (tag === "faltas_injustificadas") colorClass = "danger";
      if (tag === "importantes") colorClass = "info";

      processedEmails.push({
        ...mail,
        tag,
        colorClass,
      });
    }

    localStorage.setItem("dashboardEmails", JSON.stringify(processedEmails));

    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Error en login o al obtener correos:", error);
    alert("Error: " + error.message);
  }
});