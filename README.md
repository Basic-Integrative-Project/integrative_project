# INTEGRATIVE PROJECT

# Integrated Project - Coder Management System

This project is a web application designed to manage and display students' (Coders') academic information. [cite_start]It allows users to view a general list with averages and access a detailed profile with grades for each module, group, and assigned session[cite: 30, 41, 131, 140].

## Prerequisites

Before starting, make sure you have the following installed:
* **Node.js** (Version 16 or higher)
* **MySQL** (Active database server)
* **Git** (For version control)

## Installation and Configuration

Follow these steps to set up the project on your local machine:

### 1. Clone the repository

git clone [https://github.com/Basic-Integrative-Project/integrative_project.git](https://github.com/Basic-Integrative-Project/integrative_project.git)
cd integrative_project
git checkout Santiago

### 2. Install dependencies

Run the following command to install Express, MySQL2, and Dotenv:

npm install

### 3. Configure environment variables

Create a file called .env in the project root (this file is ignored by Git). (Security). Copy and complete the following data:

DB_HOST=157.180.40.190
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=db_santiago_diaz
PORT=3000

### 4. Execution

To start the server, use the command:

node server.js

Once started, you can access the application at: http://localhost:3000

## Project Structure

### server.js
Entry point of the Node.js server. Contains the API paths and the connection to the MySQL pool.

+1

### /public
Contains the client files (Frontend).

### index.html
Main view with the coders table.

### main.js
Logic to consume the API and render the main table.

### coder_profile.html
Detailed view of the student's profile.

### profile.js
Logic to load and display the details of a specific coder.

### .env
Responsive configuration file (Not included in the repository).

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
  |_...
|
|_Frontend
  |_index.html
  |_script.js
  |_style.css
  |_windows
    |_coders
      |_index.html
      |_style.css
      |_script.js
    |_landing
      |_index.html
      |_style.css
      |_script.js
  |_.gitignore

```

