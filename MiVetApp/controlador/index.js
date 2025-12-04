// controlador/index.js
import { requireLogin, initRoleUI, wireLogout } from './seguridad.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

  // 1) Sesión y UI por rol
  const usuario = requireLogin(['Administrador', 'Recepcionista', 'Veterinario']);
  if (!usuario) return;

  initRoleUI(usuario);
  wireLogout('.btn-logout'); // activa el botón de cerrar sesión

  // 2) Menú hamburguesa
  const btnMenu  = document.querySelector('.menu-toggle');
  const sidebar  = document.querySelector('.sidebar');
  const backdrop = document.getElementById('backdrop');

  const syncBackdrop = () => {
    if (!backdrop || !sidebar) return;
    const open = sidebar.classList.contains('is-open');
    backdrop.classList.toggle('show', open);
  };

  btnMenu?.addEventListener('click', () => {
    if (!sidebar) return;
    sidebar.classList.toggle('is-open');
    syncBackdrop();
  });

  backdrop?.addEventListener('click', () => {
    if (!sidebar) return;
    sidebar.classList.remove('is-open');
    syncBackdrop();
  });

  // Cerrar menú al navegar (en móvil)
  if (sidebar) {
    sidebar.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 768px)').matches) {
          sidebar.classList.remove('is-open');
          syncBackdrop();
        }
      });
    });
  }

  // 3) CRUD de servicios
  const form  = document.querySelector('form');
  const listEl = document.getElementById('list');

  async function loadList() {
    if (!listEl) return;
    try {
      const { data: rows, error } = await supabase.from('servicios').select('*').order('id', { ascending: true });
      if (error) throw error;

      if (!rows || rows.length === 0) {
        listEl.innerHTML = '<p>No hay servicios.</p>';
        return;
      }

      // Construir tabla
      let html = '<table><thead><tr>';
      Object.keys(rows[0]).forEach(k => (html += `<th>${k}</th>`));
      html += '<th>Acciones</th></tr></thead><tbody>';

      rows.forEach(r => {
        html += '<tr>';
        Object.values(r).forEach(v => (html += `<td>${v ?? ''}</td>`));
        html += `<td><button data-id="${r.id}" class="btn-del">Eliminar</button></td></tr>`;
      });

      html += '</tbody></table>';
      listEl.innerHTML = html;

      // Acciones: eliminar
      listEl.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!id) return;
          if (!confirm('¿Eliminar registro?')) return;

          const { error } = await supabase.from('servicios').delete().eq('id', id);
          if (error) {
            alert('Error al eliminar: ' + error.message);
          } else {
            await loadList();
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = `<p>Error cargando lista: ${err.message}</p>`;
    }
  }

  // Agregar servicio
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());

      try {
        const { error } = await supabase.from('servicios').insert([data]);
        if (error) throw error;

        alert('Servicio agregado correctamente.');
        form.reset();
        await loadList();
      } catch (err) {
        alert('Error al guardar: ' + err.message);
      }
    });
  }

  // Inicializar lista
  loadList();
});
