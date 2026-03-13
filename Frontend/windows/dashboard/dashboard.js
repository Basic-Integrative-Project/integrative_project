// Entry point for the dashboard page. Initializes Firebase, sets up auth, logout, and the refresh button.

// Initializes the dashboard by setting up Firebase auth, user header, logout, and refresh controls.
async function initDashboard() {
  try {
    await initFirebase();

    setupAuthListener((user) => {
      const emails = loadFromStorage();
      saveEmails(emails);
      renderEmails();
    });

    setupLogoutButton();
    setupRefreshButton();
  } catch (error) {
    console.error("Dashboard init error:", error);
  }
}

// Attaches the manual refresh button click handler to re-fetch and reclassify emails from n8n.
function setupRefreshButton() {
  const refreshBtn = document.getElementById("refreshBtn");
  if (!refreshBtn) return;

  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = "Cargando...";
    try {
      const user = auth.currentUser;
      if (!user) return;
      await fetchClassifyAndRender(user);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> RECARGAR';
    }
  });
}

document.querySelector("#codersBtn")?.addEventListener("click", () => {
  window.location.href = "../coders/index.html";
});

initDashboard();
