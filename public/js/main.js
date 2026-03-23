/* VDDT – Client-side JavaScript */

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initTableSearch();
  initAutoHideAlerts();
});

/* ── Sidebar Toggle (mobile) ─────────────────────────── */
function initSidebar() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

  // Close sidebar on nav link click (mobile UX)
  sidebar.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      }
    });
  });
}

/* ── Live Table Search ────────────────────────────────── */
function initTableSearch() {
  const searchInput = document.getElementById('tableSearch');
  if (!searchInput) return;

  const table = document.querySelector('.data-table tbody');
  if (!table) return;

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase().trim();
    Array.from(table.rows).forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  });
}

/* ── Auto-hide alerts after 5s ───────────────────────── */
function initAutoHideAlerts() {
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s ease';
      alert.style.opacity    = '0';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  });
}
