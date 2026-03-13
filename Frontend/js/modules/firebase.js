// Fetches Firebase config from the backend and initializes the Firebase app and auth instance.

// Retrieves Firebase configuration values from the backend environment at runtime.
async function loadFirebaseConfig() {
  const response = await fetch("http://localhost:3000/firebase-config");
  if (!response.ok) throw new Error("Could not load Firebase config from backend");
  return await response.json();
}

// Initializes the Firebase app with backend-provided config and exposes auth on the window object.
async function initFirebase() {
  const firebaseConfig = await loadFirebaseConfig();
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.auth = firebase.auth();
  return window.auth;
}

window.initFirebase = initFirebase;
