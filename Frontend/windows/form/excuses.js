// excuses.js - Nivel Principiante

// Variable global para almacenar la lista de causas traídas de la DB
let listaCausas = [];

/**
 * 1. CARGA INICIAL DE DATOS
 * Se ejecuta apenas el navegador termina de cargar el HTML.
 */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Peticion al servidor para obtener las causas
        const respuesta = await fetch("http://localhost:3000/api/causes");
        
        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar las causas");
        }

        listaCausas = await respuesta.json();

        // Referencia al elemento <select> del HTML
        const select = document.getElementById("cause_id");
        
        // Limpiar el mensaje de "Cargando..."
        select.innerHTML = '<option value="" disabled selected>Seleccione la causa...</option>';

        // Llenar el select con los datos de la base de datos
        listaCausas.forEach(causa => {
            const opcion = document.createElement("option");
            opcion.value = causa.id; // El ID que se guardara en la tabla excuses
            opcion.textContent = causa.name; // El nombre que vera el usuario
            select.appendChild(opcion);
        });

    } catch (error) {
        console.error("Error cargando causas:", error);
        alert("Error al conectar con el servidor para obtener las causas.");
    }
});

/**
 * 2. MOSTRAR DESCRIPCIÓN DINÁMICA
 * Detecta cuando el usuario cambia la opcion en el select.
 */
document.getElementById("cause_id").addEventListener("change", (e) => {
    // Busca en nuestro arreglo local la causa que coincida con el ID seleccionado
    const causaSeleccionada = listaCausas.find(c => c.id == e.target.value);
    
    // Si la encuentra, pone la descripcion en el textarea
    const textarea = document.getElementById("cause_description");
    if (causaSeleccionada) {
        textarea.value = causaSeleccionada.description;
    } else {
        textarea.value = "";
    }
});

/**
 * 3. ENVÍO DEL FORMULARIO (POST)
 */
document.getElementById("excuseForm").addEventListener("submit", async (e) => {
    // Evita que la pagina se recargue al dar click en enviar
    e.preventDefault();

    // Referencias a los elementos del boton para el efecto de carga
    const submitBtn = document.getElementById("submitBtn");
    const btnText = document.getElementById("btnText");
    const btnSpinner = document.getElementById("btnSpinner");

    // Activar estado de "Enviando..."
    submitBtn.disabled = true; // Bloquea el boton para evitar doble click
    btnText.textContent = "ENVIANDO...";
    btnSpinner.classList.remove("d-none"); // Muestra el circulo de carga

    // Captura todos los datos del formulario incluyendo la imagen
    const formData = new FormData(e.target);

    try {
        // Envio de datos al servidor de Node.js
        const response = await fetch("http://localhost:3000/api/excuses", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // Si todo salio bien, usamos SweetAlert2 para avisar
            Swal.fire({
                title: "¡Éxito!",
                text: "Tu justificación ha sido registrada correctamente.",
                icon: "success",
                confirmButtonColor: "#6c63ff"
            });
            
            // Limpiamos el formulario para un nuevo envio
            e.target.reset();
            document.getElementById("cause_description").value = "";
        } else {
            // Si el servidor responde con error (ej: el coder no existe)
            Swal.fire({
                title: "Atención",
                text: data.message || "No se pudo registrar la excusa.",
                icon: "warning",
                confirmButtonColor: "#2b3a67"
            });
        }

    } catch (error) {
        // Si hay un error de conexion (servidor apagado)
        Swal.fire({
            title: "Error de Conexión",
            text: "No se pudo establecer contacto con el servidor.",
            icon: "error"
        });
    } finally {
        // Restaurar el boton a su estado original pase lo que pase
        submitBtn.disabled = false;
        btnText.textContent = "ENVIAR JUSTIFICACIÓN";
        btnSpinner.classList.add("d-none"); // Oculta el circulo de carga
    }
});