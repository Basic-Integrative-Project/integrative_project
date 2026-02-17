// 🔹 CONFIGURA AQUÍ TUS DATOS DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCZlAmqADGneVmaBOEd_MUpB0JwbpZeG3Y",
    authDomain: "app-b2405.firebaseapp.com",
    projectId: "app-b2405",
    storageBucket: "app-b2405.firebasestorage.app",
    messagingSenderId: "129894344668",
    appId: "1:129894344668:web:243a95d5890c9754b8d119"
};

// 🔥 Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();
let currentUser = null;

// 🔐 LOGIN CON GOOGLE
document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
        const result = await auth.signInWithPopup(provider);
        currentUser = result.user;

        await db.collection("users").doc(currentUser.uid).set({
            email: currentUser.email,
            name: currentUser.displayName,
            createdAt: new Date()
        });

        document.getElementById("connectGmail").classList.remove("d-none");
        document.getElementById("getEmails").classList.remove("d-none");

        alert("Login exitoso ✅");
    } catch (error) {
        console.error("Error en login:", error);
        alert("Error en login: " + error.message);
    }
});

// 🔁 REDIRIGIR A N8N PARA OAUTH GMAIL
document.getElementById("connectGmail").addEventListener("click", () => {
    if (!currentUser) {
        alert("Debes iniciar sesión primero");
        return;
    }

    window.location.href =
        "https://n8n.andrescortes.dev/webhook/oauth-start?uid=" +
        encodeURIComponent(currentUser.uid) +
        "&email=" +
        encodeURIComponent(currentUser.email);
});

// 🔹 Función para clasificar correos usando Llama 3.1 de Ollama con fallback de reglas
async function classifyEmail(mail) {
    try {
        const res = await fetch("http://localhost:3000/classify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject: mail.subject, text: mail.text })
        });

        // 👀 VERIFICA ESTO
        console.log("Status:", res.status);
        console.log("OK:", res.ok);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log("Respuesta del servidor:", data); // 👀 VERIFICA ESTO
        
        return data.tag || "importantes";
        
    } catch (err) {
        console.error("Error clasificando correo:", err);
        
        // Fallback mejorado con logs
        const s = (mail.subject + " " + mail.text).toLowerCase();
        console.log("Texto a analizar:", s); // 👀 VERIFICA ESTO
        
        if (/(reunión|reunion|call|meeting)/.test(s)) {
            console.log("→ Detectado: reunion");
            return "reunion";
        }
        if (/(enfermedad|licencia|incapacidad|sick)/.test(s)) {
            console.log("→ Detectado: incapacidades");
            return "incapacidades";
        }
        
        console.log("→ Default: importantes");
        return "importantes";
    }
}
// 📥 OBTENER CORREOS DESDE N8N y clasificar
document.getElementById("getEmails").addEventListener("click", async () => {
    if (!currentUser) {
        alert("Debes iniciar sesión primero");
        return;
    }

    try {
        const res = await fetch(
            "https://n8n.andrescortes.dev/webhook/get-mails?uid=" +
            encodeURIComponent(currentUser.uid)
        );

        const data = await res.json();
        console.log("Respuesta de get-mails:", data);

        let emails = [];
        if (Array.isArray(data)) emails = data;
        else if (Array.isArray(data.emails)) emails = data.emails;
        else if (data?.json?.emails) emails = data.json.emails;

        const container = document.getElementById("emailList");
        container.innerHTML = "";

        if (emails.length === 0) {
            container.innerHTML = "<p>No hay correos no leídos.</p>";
            return;
        }

        // 🔹 Clasificar y renderizar cada correo
        for (const mail of emails) {
            const tag = await classifyEmail(mail);

            container.innerHTML += `
              <div class="card mb-3 shadow-sm">
                <div class="card-header bg-primary text-white">
                  ${mail.subject || "Sin asunto"} <span class="badge bg-warning">${tag}</span>
                </div>
                <div class="card-body">
                  <h6 class="card-subtitle mb-2 text-muted">De: ${mail.from || "Desconocido"}</h6>
                  <h6 class="card-subtitle mb-2 text-muted">Para: ${mail.to || "Desconocido"}</h6>
                  <p class="card-text" style="max-height: 120px; overflow-y: auto;">${mail.text || mail.snippet || ""}</p>
                </div>
                <div class="card-footer text-end text-muted">${mail.date ? new Date(mail.date).toLocaleString() : ""}</div>
              </div>
            `;
        }
    } catch (error) {
        console.error("Error obteniendo correos:", error);
        alert("Error obteniendo correos");
    }
});