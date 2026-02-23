# INTEGRATIVE PROJECT

# Integrated Project - Coder Management System

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

Run the following command to install Express, MySQL2, and Dotenv:

1. npm init -y
2. npm install
3. npm install express mysql2 dotenv cors node-fetch axios

into package.json, something like this:
```
"dependencies": {
    "axios": "^1.13.5",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "mysql2": "^3.17.4",
    "node-fetch": "^3.3.2"
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
```
### 4. Execution

To start the server, use the command into `Backend` folder:

node server.js

Once started, you can access the application at: http://localhost:3000

```c
Servidor en http://localhost:3000
📋 Categorías: reunion, faltas_justificadas, faltas_injustificadas, importantes, alertas
⚡ Node: v22.21.0
```


## Coder Management System `Frontend/windows/coders`

It was designed to manage and display students' (Coders') academic information. It allows users to view a general list with averages and access a detailed profile with grades for each module, group, and assigned session[cite: 30, 41, 131, 140].



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


## API Endpoints

### GET /api/coders 
Returns a list of all coders with their GPAs.

### GET /api/coders/:id 
Returns detailed information for a single coder by their ID.

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

