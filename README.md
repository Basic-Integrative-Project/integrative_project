# INTEGRATIVE PROJECT
# AI-Powered Email Classification & Management Platform

This project is a **full-stack web application** designed to automatically classify, filter, and manage emails efficiently, helping users save time and improve productivity.

---

## Project Overview

The system combines a **Node.js backend**, a **Firebase-authenticated frontend**, and workflow automation through **n8n** to create an intelligent email classification platform.

It retrieves unread emails, processes them in batches using AI-powered classification via OpenAI, filters out non-relevant messages, and presents them in a structured and user-friendly dashboard.

---

## Key Features

### Authentication & User Management

- Google Login using **Firebase Authentication**
- Automatic user registration in **Firestore**
- Secure backend configuration with environment variables

---

### Automated Email Processing

- Fetch unread emails via **n8n webhooks**
- Batch classification through a **Node.js backend endpoint** (`/classify-emails`)
- AI-based categorization with rule-based fallback
- Hidden filtering of promotional/spam emails (`alertas`)
- Local caching using `localStorage` to reduce unnecessary requests

---

### Email Categories

- `reunion` – Meetings, calls, calendar events  
- `faltas_justificadas` – Medical leave or justified absences  
- `faltas_injustificadas` – Unjustified absences  
- `importantes` – Important general emails  
- `alertas` – Promotions, newsletters, spam (hidden automatically)  

---

## Interactive Dashboard

- Responsive UI built with **Bootstrap 5**
- Two main columns:
  - Important
  - Meetings
- Color-coded tags for quick identification

### Email Actions

- Read
- Mark as reviewed
- Respond
- Change category
- Manual refresh button for real-time updates

---

# Additional Module: Coder Management System

Beyond email classification, the system includes an academic management module for students (“Coders”).

## Features

- View a general list of coders with GPA averages
- Access detailed profiles with:
  - Module grades
  - Assigned groups
  - Session information
  - Appointment tracking and history management
- REST API endpoints for full CRUD operations

## Database

- MySQL relational structure
- Tables for:
  - Coders
  - Grades
  - Appointments
  - History tracking

---

# 🛠 Technical Stack

| Layer | Technology |
|--------|------------|
| Frontend | HTML, CSS, JavaScript |
| UI Framework | Bootstrap 5 |
| Authentication & DB | Firebase (Auth + Firestore) |
| Automation | n8n Webhooks |
| Backend | Node.js + Express |
| Database | MySQL |
| AI Classification | OpenAI API |

---

# Architecture Summary

1. User logs in with Google (Firebase Auth).
2. Emails are retrieved from n8n.
3. Emails are sent in batches to the backend.
4. The backend classifies them using OpenAI.
5. Non-relevant emails are filtered out.
6. Processed emails are cached and displayed dynamically.
7. Users can manage and interact with their inbox through a structured dashboard.

---

# Purpose

The main goal of this project is to:

- Automate email organization
- Reduce time spent sorting inbox messages
- Improve focus by filtering non-essential emails
- Provide a scalable backend-ready architecture
- Integrate AI classification into a real-world productivity system

---

## Summary

In short, this is an **AI-powered email classification and management platform** that streamlines inbox workflows while also incorporating an academic management module within the same full-stack ecosystem.

## Project Structure

```
INTEGRATIVE_PROJECT
|
|_Backend
  |_server.js
  |_.env-example
|
|_Frontend
  |_index.html
  |_script.js
  |_windows
    |_coders
      |_index.html
      |_main.js
      |_profile.js
      |_coder_profile.html
    |_dashboard
      |_dashboard.html
      |_style.css
      |_dashboard.js
  |_.gitignore
  |_README.md

```

## Project Structure ``Frontend``

### /index.html
login file to access into the patform
### /script.js
Logic to log in the platform and load the database from firebase, load and conenect to N8N and return the emails in inbox

### /windows/coders/index.html
Main view with the coders table.

### /windows/coders/main.js
Logic to consume the API and render the main table.

### /windows/coders/coder_profile.html
Detailed view of the student's profile.

### /windows/coders/profile.js
Logic to load and display the details of a specific coder.

---

## Login `Frontend/index.html` & `Frontend/index.html`
This project provides a web-based login interface using Firebase Authentication (Google) and integrates with n8n workflows and a Node.js backend for automatic email classification.

### Features

- **Google Login** with Firebase Authentication.
- **User registration** in Firestore upon first login.
- **Fetch unread emails** from n8n webhook.
- **Batch email classification** using Node.js backend (/classify-emails).
- **Filter alerts** and store processed emails in localStorage.
- **Responsive and animated UI** with Bootstrap, CSS glass cards, and animated background ribbons.


### Technologies Used
| Technology            | Purpose                                   |
| --------------------- | ----------------------------------------- |
| HTML / CSS / JS       | Frontend UI and interaction               |
| Bootstrap 5           | Responsive design and styling             |
| Firebase v10 (compat) | Authentication & Firestore database       |
| SweetAlert2           | User-friendly modal notifications         |
| n8n Webhooks          | Fetch emails from automation workflows    |
| Node.js backend       | Batch classification of emails via OpenAI |

### Setup Instructions

1. Include Firebase config dynamically from backend:
```js
async function loadFirebaseConfig() {
  const response = await fetch("http://localhost:3000/firebase-config");
  if (!response.ok) throw new Error("Failed to load Firebase config");
  return await response.json();
}
```
2. Initialize Firebase:
```js
async function initApp() {
  const firebaseConfig = await loadFirebaseConfig();
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.provider = new firebase.auth.GoogleAuthProvider();
  setupLogin();
}
initApp();
```

3. Handle Google login:

- Sign in with popup
- Save user to Firestore
- Fetch emails from n8n webhook
- Batch classify emails via Node.js backend
- Filter alertas and save to localStorage
- Redirect to dashboard


---

## Coder Management System `Frontend/windows/coders`

It was designed to manage and display students' (Coders') academic information. It allows users to view a general list with averages and access a detailed profile with grades for each module, group, and assigned session[cite: 30, 41, 131, 140].
## API Endpoints

### GET /api/coders 
Returns a list of all coders with their GPAs.

### GET /api/coders/:id 
Returns detailed information for a single coder by their ID.

---

## dashboard Management System `Frontend/windows/dashboard`
This script handles the email dashboard for InboxIQ, including Firebase authentication, email caching, n8n integration, batch classification, and dynamic UI rendering.

### Features

- Firebase Authentication listener (onAuthStateChanged) with redirect to login if not authenticated.
- Local email cache to reduce unnecessary fetches.
- Load emails from localStorage and refresh from n8n webhook.
- Batch classify emails via backend (/classify-emails) with color-coded tags.
- UI rendering with responsive columns for “Important” and “Meetings”.
- Dynamic email actions: read, mark as reviewed, respond, or change category.
- Optional refresh button to manually update emails.
- Modal popups with Bootstrap for reading/responding emails.
- Navigation to other pages (e.g., coders page).

### Firebase Setup & Initialization
```js
async function loadFirebaseConfig() {
  const response = await fetch("http://localhost:3000/firebase-config");
  if (!response.ok) throw new Error("Unable to load Firebase config");
  return response.json();
}

async function initApp() {
  const firebaseConfig = await loadFirebaseConfig();
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  window.auth = firebase.auth();
  setupAuthListener();
  setupLogoutButton();
  setupRefreshButton();
}
```
- *Loads Firebase config from the backend.*
- *Initializes Firebase app and sets up auth listener, logout, refresh.*

### Email Cache & Storage
```js
let emailsCache = [];

function saveEmails(emails) { emailsCache = emails; }
function loadEmails() { return emailsCache; }

function loadFromStorage() {
  const stored = localStorage.getItem("dashboardEmails");
  try { return stored ? JSON.parse(stored) : []; } catch { return []; }
}

window.addEventListener("beforeunload", () => { emailsCache = []; });
```
- *In-memory cache (emailsCache) for quick access.*
- *LocalStorage fallback to persist emails across reloads.*

### Auth Listener
```js
function setupAuthListener() {
  auth.onAuthStateChanged((user) => {
    if (!user) window.location.href = "../../index.html";

    document.getElementById("userName").textContent = user.displayName || "User";
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userAvatar").textContent = (user.displayName?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase();

    const emails = loadFromStorage();
    saveEmails(emails);
    renderEmails();
  });
}
```
- *Displays user name, email, and avatar.*
- *Loads emails from localStorage and renders them.*

### Logout Button
```js
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("dashboardEmails");
    auth.signOut().then(() => window.location.href = "../../index.html");
  });
}
```
- *Clears local storage and redirects to login page.*

### Refresh Button (Manual Email Update)
```js
function setupRefreshButton() {
  const refreshBtn = document.getElementById("refreshBtn");
  refreshBtn?.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = "Loading...";
    await fetchAndProcessEmails();
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> REFRESH';
  });
}
```
- *Fetches new emails from n8n webhook.*
- *Classifies them using backend /classify-emails endpoint.*
- *Updates UI and local storage.*

### Email Processing Logic
```js
async function fetchAndProcessEmails() {
  const user = auth.currentUser;
  if (!user) return;

  const res = await fetch(`https://n8n.andrescortes.dev/webhook/get-mails?uid=${encodeURIComponent(user.uid)}`);
  const data = await res.json();
  const emails = Array.isArray(data) ? data : data.emails || [];

  const batchRes = await fetch("http://localhost:3000/classify-emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: emails.map(m => ({ subject: m.subject || "", text: m.text || "" })) })
  });
  const batchData = await batchRes.json();

  const colorMap = { alertas: "secondary", reunion: "warning", faltas_justificadas: "success", faltas_injustificadas: "danger", importantes: "info" };
  const processed = emails.map((mail, i) => ({
    ...mail,
    tag: batchData[i]?.tag || "importantes",
    colorClass: colorMap[batchData[i]?.tag] || "info",
    revisado: false
  })).filter(m => m.tag !== "alertas");

  localStorage.setItem("dashboardEmails", JSON.stringify(processed));
  saveEmails(processed);
  renderEmails();
}
```
- *Maps tags to Bootstrap color classes.*
- *Filters alertas emails.*
- *Updates local storage and cache.*

### Rendering Emails (Responsive)

- Two main columns: Important and Meetings.
- Each email card shows:
  - Tag badge
  - Sender
  - Subject
  - Category selector
  - Buttons: Read, Mark Reviewed, Respond
  - Date footer
- Dynamic update on category change.


# Coder Management System ``Backend``

This project is a web application designed to manage and display students' (Coders') academic information. [cite_start]It allows users to view a general list with averages and access a detailed profile with grades for each module, group, and assigned session[cite: 30, 41, 131, 140].

## Prerequisites
## Project Structure ``Backend``

### server.js
Entry point of the Node.js server. Contains the API paths and the connection to the MySQL pool.

### .env-example
To handle environment variables

## Prerequisites
**This prerequisites at `Backend` folder**

Before starting, make sure you have the following installed:
* **Node.js** (Version 16 or higher)
* **MySQL** (Active database server)
* **Git** (For version control)

## Installation and Configuration

Follow these steps to set up the project on your local machine:

### 1. Clone the repository

git clone [https://github.com/Basic-Integrative-Project/integrative_project.git](https://github.com/Basic-Integrative-Project/integrative_project.git)

cd integrative_project

### 2. Install dependencies 

Open de folder `Backend` and run the following command to install Express, MySQL2, and Dotenv:

1. npm init -y
2. npm install
3. npm install express mysql2 dotenv cors node-fetch axios openai

into package.json, something like this:
```
"dependencies": {
    "axios": "^1.13.5",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "mysql2": "^3.17.4",
    "node-fetch": "^3.3.2",
    "openai": "^6.25.0"
  }
```

### 3. Configure environment variables

Create a file called ``.env`` in the project root `Backend` folder **(this file is ignored by Git)**. (Security). Copy and complete the following data:

```js
  apiKey=YOUR_API_KEY
  authDomain=FIREBASE_DOMAIN
  projectId=PROJECT_NAME
  storageBucket=FIREBASE_STORAGE
  messagingSenderId=MESSAGE_ID
  appId=1:MESSAGEID:web:WEB

  DB_HOST=YOUR_HOST
  DB_USER=YOUR_ROOT
  DB_PASSWORD=YOUR_DB_PASSWORD
  DB_NAME=YOUR_DB_NAME
  PORT=YOUR_PORT

  OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### 4. Execution

To start the server, use the command into `Backend` folder:
```c
node server.js
```
Once started, you can access the application at: http://localhost:3000

```c
Servidor en http://localhost:3000
📋 Categorías: reunion, faltas_justificadas, faltas_injustificadas, importantes, alertas
⚡ Node: v22.21.0
```
### Email Categories
| Category                | Hidden? | Description                       |
| ----------------------- | ------- | --------------------------------- |
| `reunion`               | ❌       | Meetings, calls, calendar events  |
| `faltas_justificadas`   | ❌       | Medical leave, justified absences |
| `faltas_injustificadas` | ❌       | Unjustified absences              |
| `importantes`           | ❌       | Important general emails          |
| `alertas`               | ✅       | Promotions, newsletters, spam     |


### Email Endpoints
| Method | Route              | Description                            | Body / Query Example                   |
| ------ | ------------------ | -------------------------------------- | -------------------------------------- |
| GET    | `/`                | Check if the server is running         | -                                      |
| GET    | `/test`            | Info about categories and Node version | -                                      |
| POST   | `/classify-email`  | Classify a single email                | `{ "subject": "...", "text": "..." }`  |
| POST   | `/classify-emails` | Batch email classification             | `{ "emails": [{subject, text}, ...] }` |
ficación masiva           | `{ "emails": [{subject, text}, ...] }` |


### Coder Endpoints
| Method | Route                    | Description                                | Body / Query Example                                                        |
| ------ | ------------------------ | ------------------------------------------ | --------------------------------------------------------------------------- |
| GET    | `/api/coders`            | List coders (optional `document` filter)   | `/api/coders?document=12345`                                                |
| GET    | `/api/coders/:id`        | Get full coder profile                     | `/api/coders/1`                                                             |
| GET    | `/appointment/:id_coder` | Get all appointments for a coder           | `/appointment/1`                                                            |
| POST   | `/appointment`           | Create a new appointment                   | `{ "id_coder":1, "subject":"...", "professional":"...", "date":"..." }`     |
| POST   | `/history_coder`         | Save history and mark appointment complete | `{ "id_appointment":1, "objetive":"...", "tracking":"...", "goals":"..." }` |
| GET    | `/history_coder/:id_app` | Get history of a specific appointment      | `/history_coder/1`                                                          |


### n8n Integration Endpoints
| Method | Route           | Description                         | Body Example       |
| ------ | --------------- | ----------------------------------- | ------------------ |
| POST   | `/send-by-id`   | Send info to n8n by ID              | `{ "id":123 }`     |
| POST   | `/read-email`   | Send email data to n8n for reading  | `{ "from":"..." }` |
| POST   | `/send-by-From` | Send info to n8n filtered by sender | `{ "from":"..." }` |

--- 
### MySQL Database

- ``coders``, ``clan``, ``shift``, ``grades`` → Coder info and module grades
- ``appointment``, ``history_coder`` → Appointments and history tracking
--- 

### Notes

- alertas is marked as hidden: true.
- Rule-based fallback applied if OpenAI returns an invalid tag.
- Compatible with Node.js ≥ 24 and MySQL ≥ 8.
- OpenAI limit: 1000 characters per email.

## ``.gitignore``
```
# Ignore the node_modules folder inside Backend
Backend/node_modules/

# Ignore package-lock.json inside Backend
Backend/package-lock.json

# Ignore package.json inside Backend
Backend/package.json

# Ignore the .env file inside Backend (file, not folder)
Backend/.env

# Ignore the .vscode folder inside Backend
.vscode
```
