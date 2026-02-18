# Proyecto Integrador - Sistema de Gestión de Coders

Este proyecto es una aplicación web diseñada para gestionar y visualizar la información académica de los estudiantes (Coders). [cite_start]Permite ver un listado general con promedios y acceder a un perfil detallado con las notas de cada módulo, clan y jornada asignada[cite: 30, 41, 131, 140].

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
* **Node.js** (Versión 16 o superior)
* **MySQL** (Servidor de base de datos activo)
* **Git** (Para control de versiones)

## Instalación y Configuración

Sigue estos pasos para configurar el proyecto en tu máquina local:

### 1. Clonar el repositorio

git clone [https://github.com/Basic-Integrative-Project/integrative_project.git](https://github.com/Basic-Integrative-Project/integrative_project.git)
cd integrative_project
git checkout Santiago

### 2. Instalar las dependencias

Ejecuta el siguiente comando para instalar Express, MySQL2 y Dotenv:

npm install

### 3. Configurar variables de entorno

Crea un archivo llamado .env en la raíz del proyecto (este archivo está ignorado por Git por seguridad). Copia y completa los siguientes datos:

DB_HOST=157.180.40.190
DB_USER=root
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=db_santiago_diaz
PORT=3000

### 4. Ejecución

Para iniciar el servidor, utiliza el comando:

node server.js

Una vez iniciado, podrás acceder a la aplicación en: http://localhost:3000

## Estructura del Proyecto

### server.js
Punto de entrada del servidor Node.js. Contiene las rutas de la API y la conexión al Pool de MySQL.
+1


### /public
Contiene los archivos del cliente (Frontend).


### index.html
Vista principal con la tabla de coders.


### main.js
Lógica para consumir la API y renderizar la tabla general.

### coder_profile.html
Vista detallada del perfil del estudiante.

### profile.js
Lógica para cargar y mostrar los detalles de un coder específico.

### .env
Archivo de configuración sensible (No incluido en el repositorio).

## Endpoints de la API

### GET	/api/coders	
Retorna la lista de todos los coders con sus promedios.

### GET	/api/coders/:id	
Retorna la información detallada de un solo coder por su ID.