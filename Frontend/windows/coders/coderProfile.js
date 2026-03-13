// Handles the coder profile page: loading profile data, grades chart, appointments table, and clinical history modals.

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("perfil-container");
  const tablaCitas = document.getElementById("citas-coder");
  const urlParams = new URLSearchParams(window.location.search);
  const coderId = urlParams.get("id");
  let infoCoder = {};

  // Loads the coder profile and appointments table on page load if a valid ID is present.
  async function cargarInicial() {
    if (coderId) {
      await getPerfil();
      await getCitas();
    }
  }

  // Fetches the coder's full profile from the backend and renders it with color-coded grade badge and a grades chart.
  async function getPerfil() {
    const resp = await fetch(`http://localhost:3000/api/coders/${coderId}`);
    infoCoder = await resp.json();

    if (!container) return;

    const nota = parseFloat(infoCoder.grade) || 0;
    let colorBadge = "bg-success";
    if (nota < 50) colorBadge = "bg-danger";
    else if (nota >= 50 && nota <= 70) colorBadge = "bg-warning";

    container.innerHTML = `
      <div class="card shadow">
        <div class="card-header fw-bold text-center"><h2>Perfil del Estudiante</h2></div>
        <div class="card-body p-3">
          <div class="row">
            <div class="col-md-5 d-flex flex-column align-items-center">
              <p><strong>Nombre:</strong> ${infoCoder.name} ${infoCoder.lastname}</p>
              <p><strong>Documento:</strong> ${infoCoder.document}</p>
              <p><strong>Correo:</strong> ${infoCoder.email}</p>
              <p><strong>Telefono:</strong> ${infoCoder.cel}</p>
              <p><strong>Clan:</strong> ${infoCoder.clan}</p>
              <p><strong>Jornada:</strong> ${infoCoder.shift}</p>
              <p><strong>Promedio:</strong> <span class="badge ${colorBadge}">${nota}</span></p>
            </div>
            <div class="col-md-7 d-flex justify-content-center">
              <canvas id="graficaNotas"></canvas>
            </div>
          </div>
        </div>
        <div class="card-footer d-flex justify-content-center">
          <button class="btn btn-purple w-75" data-bs-toggle="modal" data-bs-target="#modalCita">Asignar Cita</button>
        </div>
      </div>`;

    buildGradesChart(infoCoder);
  }

  // Fetches all appointments for the current coder and renders them in the appointments table.
  async function getCitas() {
    const resp = await fetch(`http://localhost:3000/appointment/${coderId}`);
    const citas = await resp.json();

    if (!tablaCitas) return;
    tablaCitas.innerHTML = "";

    citas.forEach(c => {
      const atendido = c.state === 1;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${c.id}</td>
        <td>${c.subject}</td>
        <td>${c.professional}</td>
        <td>${new Date(c.date).toLocaleDateString()}</td>
        <td><span class="badge ${atendido ? "bg-success" : "bg-danger"}">${atendido ? "Atendido" : "Pendiente"}</span></td>
        <td class="text-center">
          ${atendido
            ? `<button class="btn btn-purple btn-sm" onclick="verHistoria(${c.id}, '${c.subject}', '${c.professional}')"><i class="bi bi-search"></i></button>`
            : `<button class="btn btn-danger btn-sm"><i class="bi bi-trash"></i></button>`}
        </td>
        <td class="text-center">
          <button class="btn btn-dark btn-sm" ${atendido ? "disabled" : `onclick="abrirHistoria(${c.id}, '${c.subject}', '${c.professional}')"`}>
            <i class="bi bi-file-earmark-text"></i>
          </button>
        </td>`;
      tablaCitas.appendChild(row);
    });
  }

  // Handles the appointment creation form submission, preventing page reload and refreshing the table.
  const formCita = document.getElementById("form-cita");
  if (formCita) {
    formCita.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        id_coder: coderId,
        subject: document.getElementById("cita-motivo").value,
        professional: document.getElementById("cita-profesional").value,
        date: document.getElementById("cita-fecha").value,
      };

      try {
        const resp = await fetch("http://localhost:3000/appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (resp.ok) {
          const modalElement = document.getElementById("modalCita");
          const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
          modalInstance.hide();
          formCita.reset();
          await getCitas();
        }
      } catch (err) {
        console.error("Error saving appointment:", err);
      }
    });
  }

  // Opens the clinical history modal in write mode, pre-filling coder and appointment info.
  window.abrirHistoria = (id, mot, prof) => {
    document.getElementById("h-id-cita").innerText = id;
    document.getElementById("h-nombre").innerText = `${infoCoder.name} ${infoCoder.lastname}`;
    document.getElementById("h-motivo").innerText = mot;
    document.getElementById("h-profesional").innerText = prof;

    const formH = document.getElementById("form-historia");
    formH.reset();

    document.getElementById("h-objetivo").readOnly = false;
    document.getElementById("h-desarrollo").readOnly = false;
    document.getElementById("h-compromisos").readOnly = false;
    document.getElementById("btn-finalizar").style.display = "block";

    new bootstrap.Modal(document.getElementById("modalHistoria")).show();
  };

  // Handles the clinical history form submission, saves the record, and marks the appointment as attended.
  const formHistoria = document.getElementById("form-historia");
  if (formHistoria) {
    formHistoria.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        id_appointment: document.getElementById("h-id-cita").innerText,
        objetive: document.getElementById("h-objetivo").value,
        tracking: document.getElementById("h-desarrollo").value,
        goals: document.getElementById("h-compromisos").value,
      };

      const resp = await fetch("http://localhost:3000/history_coder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (resp.ok) {
        bootstrap.Modal.getInstance(document.getElementById("modalHistoria")).hide();
        await getCitas();
      }
    });
  }

  // Fetches an existing clinical history record and opens the modal in read-only mode.
  window.verHistoria = async (id, mot, prof) => {
    const resp = await fetch(`http://localhost:3000/history_coder/${id}`);
    const h = await resp.json();

    window.abrirHistoria(id, mot, prof);

    document.getElementById("h-objetivo").value = h.objetive;
    document.getElementById("h-desarrollo").value = h.tracking;
    document.getElementById("h-compromisos").value = h.goals;

    document.getElementById("h-objetivo").readOnly = true;
    document.getElementById("h-desarrollo").readOnly = true;
    document.getElementById("h-compromisos").readOnly = true;
    document.getElementById("btn-finalizar").style.display = "none";
  };

  // Renders a Chart.js line chart displaying the coder's module grades.
  function buildGradesChart(coder) {
    const ctx = document.getElementById("graficaNotas");
    if (!ctx) return;
    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["M1", "M2", "M3", "M4"],
        datasets: [{
          label: "Notas de Modulos",
          data: [coder.module_1, coder.module_2, coder.module_3, coder.module_4],
          borderColor: "#0d6efd",
        }],
      },
    });
  }

  document.querySelector(".inbox")?.addEventListener("click", () => {
    window.location.href = "../dashboard/dashboard.html";
  });

  cargarInicial();
});
