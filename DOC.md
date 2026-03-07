# INTEGRATIVE PROJECT
# InboxIQ
<img width="1024" height="1024" alt="logo inboxqa2" src="https://github.com/user-attachments/assets/02661001-0a9c-49e6-95cc-16fd7670f27c" />

## Authors
- Santiago Diaz (Developer)
- Jeronimo Torres (Developer)
- Sebastian Torres (Scrum Master)
- Ismael Vasco (Transversal process developer & Leader)
---

### Overview

This project implements a modern full-stack dashboard that:
- Ingests and classifies incoming emails using both rules and OpenAI (GPT-4o).
- Provides a professional dashboard for handling and replying to categorized emails.
- Manages "coders" (students), their appointments, and their academic/professional data.
- Integrates with Google OAuth, Gmail API, Google Calendar API, and n8n for automation.
- Uses a Node.js backend server (Express), MySQL database, and a JavaScript-based frontend (vanilla + Firebase Auth).

---

## System Architecture

### Logical Architecture

```
[User/browser]
     |
[Frontend: JS/HTML (dashboard, coders)]
     |
[Node.js Backend: Express.js]
     |
--------------------------------------------
|           |                |              |
[OpenAI API]  [MySQL Server] [n8n Service] [Google APIs]
```

- **Frontend**: Serves dashboard (emails) and coders management (students) panels. Auth via Google (Firebase Auth).
- **Backend**: REST API for email classification (AI/rule-based), coders CRUD, Google API proxy, and n8n webhooks.
- **AI**: OpenAI GPT-4o model for email semantic classification and suggestion, as well as for extracting meeting data.
- **DB**: Coders, grades, appointments, and history are stored in MySQL.
- **Automation**: n8n is used for email actions (fetching, sending, mark as read) and external workflows.
- **Cloud**: Google APIs (Gmail/Calendar) are accessed via OAuth2 (client-side for Gmail actions, server for calendar).

---

## Component Diagram

```
[User]  
  |  
  v  
[Frontend (JS/HTML)]
  | (REST/HTTP, OAuth)
  v  
[Express.js Backend]---[OpenAI API]  
      |           |  
      v           v  
    [MySQL]      [n8n]  
      |  
      v  
[Google OAuth / Gmail / Calendar (API)]
```

- Connectors:
  - Frontend <-> Backend: RESTful APIs
  - Backend <-> OpenAI: For semantic classification and reply suggestions
  - Backend <-> MySQL: For persistent coder and appointment data
  - Backend <-> n8n: For mailbox automation
  - Frontend <-> Google: OAuth2 auth, Gmail/Calendar direct API requests (access tokens managed client-side)

---

## Module Explanations

### 1. Frontend

#### `Frontend/windows/dashboard/dashboard.js`:
- Handles Google login (via Firebase Auth).
- Fetches emails via n8n webhooks, forwards to backend for AI classification.
- Renders emails grouped by importance, meeting, justified/unjustified absences.
- Implements "Respond", "Mark as Reviewed", and "Schedule Meeting" actions, using AI features from backend APIs.
- Handles access tokens and synchronizes state with localStorage.

#### `Frontend/windows/coders/main.js`:
- Lists coders from backend API, including grades and main info.
- Allows searching by document ID.
  
#### `Frontend/windows/coders/profile.js`:
- Shows individual coder’s profile, grades (with color logic), and module scores.
- Manages appointments (citas) and history (historia clínica) with forms and modals.
- Integrates with backend endpoints for fetching and posting data.

### 2. Backend (`Backend/server.js`):

#### API and Router Layer:
- Serves GET/POST endpoints for:
  - Firebase config (for frontend).
  - Email classification (single/bulk) using OpenAI or rule fallback.
  - Coordinator API for coder data, grades, appointment, and history.
  - Email + Meeting AI features: suggest reply, extract meeting info.
  - Webhook proxies to n8n for email reading, sending.
- Manages authentication, error handling, and request payload limits.

#### AI/Rules Engine:
- Uses OpenAI GPT-4o for semantic email classification.
- Falls back to custom regex-based rules if LLM classification is inconclusive.
- Uses OpenAI to generate automatic email replies and extract meeting information for scheduling.

#### Database Layer:
- All coder, grades, appointments, and history data are persisted in MySQL via parameterized queries.

#### External Integrations:
- n8n (webhooks for email automation): Receives and sends email command payloads.
- Google APIs via OAuth2 (tokens shared from frontend for granted user session).

---

## Data Flow

1. **User Authenticates**:
   - Frontend uses Firebase Auth (Google provider) for session management.
2. **Email Ingestion**:
   - n8n fetches user mailbox using Gmail API and provides a normalized emails array.
   - Frontend fetches and uploads emails to backend for classification.
3. **Classification**:
   - Backend classifies each email using OpenAI or fallback rules, tags each with a semantic label (meeting, important, absence, alerts).
4. **Dashboard Actions**:
   - User browses classified emails, can reply with AI-generated suggestions, or schedule meetings (auto-extract via AI to Google Calendar).
   - Newly reviewed/responded emails are removed from the dashboard via localStorage.
5. **Coders Management**:
   - User switches to coders management. Backend retrieves coder info, grades, and appointment history.
   - Appointment and clinical history subsystems create, update and retrieve entries via REST API into MySQL.
6. **Automation & Integration**:
   - Some dashboard actions (send/read email) trigger backend-proxied calls to n8n or Google API endpoints.

---

## API Documentation

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /test                | Health check, returns supported categories |
| GET    | /firebase-config     | Get Firebase config for frontend |
| POST   | /classify-email      | Classify one email (`{subject, text}`) |
| POST   | /classify-emails     | Classify array of emails (`{emails: [{subject, text}]}`) |
| POST   | /suggest-reply       | Suggest a reply using AI (`{subject, text, from, tag}`) |
| POST   | /extract-meeting     | Extract meeting info via AI (`{subject, text, from}`) |
| GET    | /api/coders          | List all coders or query by document |
| GET    | /api/coders/:id      | Get coder by ID (with grades/history) |
| GET    | /appointment/:id_coder  | Appointments by coder id |
| POST   | /appointment         | Schedule appointment for a coder |
| POST   | /history_coder       | Save clinical history for appointment |
| GET    | /history_coder/:id_app | Get clinical history by appointment id |
| POST   | /send-by-id          | Proxy: Send email by id, via n8n |
| POST   | /read-email          | Proxy: Mark email as read, via n8n |
| POST   | /send-by-From        | Proxy: Send email by from address, via n8n |

#### Example: Classify Multiple Emails

```http
POST /classify-emails
Content-Type: application/json

{
  "emails": [
    { "subject": "Reunión de equipo", "text": "Nos vemos mañana a las 10am" },
    { "subject": "Falta", "text": "No pude asistir por incapacidad médica" }
  ]
}
```
- Response: Array with `{tag, hidden, source}`

#### Example: Suggest AI Reply

```http
POST /suggest-reply
{
  "subject": "Permiso",
  "text": "Necesito faltar mañana...",
  "from": "user@company.com",
  "tag": "faltas_justificadas"
}
```
- Response: `{suggestion: "Lamento que no puedas asistir..."}`

#### Example: Extract Meeting

```http
POST /extract-meeting
{
  "subject": "Agendar reunión",
  "text": "Propongo reunirnos el viernes...",
  "from": "boss@company.com"
}
```
- Response: Meeting data for Google Calendar event
  ```json
  {
    "title": "Reunión",
    "date": "2024-06-07",
    "startTime": "10:00",
    "endTime": "11:00",
    "description": "...",
    "attendees": ["boss@company.com"]
  }
  ```

---

## MCPs (External Components) Used

### 1. **OpenAI API (GPT-4o)**
   - NLP-based classification, reply suggestion, meeting info extraction.
   - Example:
     ```js
     openai.chat.completions.create({
       model: "gpt-4o-mini",
       messages: [...]
     })
     ```

### 2. **n8n Automation Platform**
   - Orchestrates reading/sending emails and related automation via webhooks.
   - Backend proxies requests (email marking, sending) to n8n webhooks.

### 3. **Google APIs (OAuth2, Gmail, Calendar)**
   - Authentication: Firebase Auth (Google provider).
   - Gmail for reading/marking emails (via n8n and directly from frontend).
   - Calendar API for scheduling meetings from extracted AI data.
   - Access tokens managed client-side and supplied to backend/n8n as needed.

---

## Example Code Snippets

- **Classify Email with Fallback**
```javascript Backend/server.js
async function classifySingleEmail(subject = "", text = "") {
  // ...OpenAI call...
  let tag = response.choices[0].message.content.toLowerCase().trim();
  if (!VALID_TAGS.includes(tag)) {
    tag = ruleBasedFallback(subject, text); // Regex rules
  }
  return tag;
}
```

- **Coders API (Backend, MySQL)**
```javascript Backend/server.js
app.get("/api/coders", (req, res) => {
  const sql = "...";
  pool.query(sql, [...], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result);
  });
});
```

- **Frontend Email Card Rendering**
```javascript Frontend/windows/dashboard/dashboard.js
function renderEmails() {
  emails.forEach((mail, index) => {
    // Render card with badge color by tag, buttons for actions.
  });
}
```

---

## Getting Started — Installation & Run Commands

### 1. Clone and Prepare

```bash
# Clone this repository
$ git clone <your_repo_url>
$ cd <your_repo_folder>

# Install backend dependencies
$ cd Backend
$ npm install

# (Optional) Frontend is static: you can serve /Frontend via any HTTP server or open index.html in browser
```

### 2. Configure Environment Variables

- Copy `.env-example` to `.env` and fill in:
  - OpenAI API key
  - MySQL credentials
  - Firebase/Google credentials (matching project console)

### 3. Start Backend

```bash
# In /Backend
$ node server.js
```

### 4. Launch Frontend

- Option 1: Open `Frontend/index.html` in browser (ensure CORS/localhost backend running)
- Option 2: Serve with Python/Node static server:
  ```bash
  $ cd Frontend
  $ python -m http.server 8080
  # or
  $ npx serve .
  ```

### 5. n8n Configuration
  - Ensure n8n is accessible at the URL expected by the backend (default: https://n8n.andrescortes.dev/)
  - Webhooks must be available for `/webhook/send-by-id`, `/webhook/get-mails`, etc.

### 6. Google/Firebase Setup
  - Google Cloud console: Enable Gmail and Calendar API for your project.
  - Configure OAuth consent and redirect as required for Firebase Auth.

### 7. Log In & Use
  - Go to frontend, click Google login, authorize, and start managing emails/coders!

---

## Conclusion

This project offers a maintainable architecture for AI-driven email management and coder/student professional tracking, using robust NLP, RESTful APIs, modern JS, and integration automation platforms.

---
