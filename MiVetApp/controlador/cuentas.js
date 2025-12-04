// controlador/cuentas.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { requireLogin, initRoleUI, puedeVerCuentas } from './seguridad.js';


// =========================
// 🔐 VALIDAR ACCESO
// =========================
document.addEventListener('DOMContentLoaded', () => {
  const usuario = requireLogin(['Administrador']);
  if (!usuario || !puedeVerCuentas(usuario)) {
    alert('No tienes permisos para ver las cuentas.');
    window.location.href = 'index.html';
    return;
  }

  initRoleUI(usuario);
  iniciar();
});

// =========================
// 🔗 SUPABASE
// =========================
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// =========================
// 📌 SELECTORES
// =========================
const $ = (s) => document.querySelector(s);

const tbody = () => $('#tablaCuentas tbody'); // evita DOM vacío
const qRol = () => $('#buscarrol');
const btnMenu = () => document.querySelector('.menu-toggle');

// =========================
// 🧩 RENDER DE TABLA
// =========================
function render(rows, usersById, rolesById) {
  const tb = tbody();
  if (!tb) return;

  tb.innerHTML = '';

  if (!rows?.length) {
    tb.innerHTML = '<tr><td colspan="5">No hay cuentas registradas.</td></tr>';
    return;
  }

  for (const cta of rows) {
    const u = usersById.get(String(cta.usuario_id));
    const rol = rolesById.get(String(u?.rol_id));

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rol?.nombre ?? '(sin rol)'}</td>
      <td>${u?.nombre ?? ''}</td>
      <td>${u?.telefono ?? ''}</td>
      <td>${u?.correo ?? ''}</td>
      <td>
        <button class="btn-editar" data-id="${cta.id}">
          <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
        <button class="btn-eliminar" data-id="${cta.id}">
          <i class="fa-solid fa-trash"></i> Eliminar
        </button>
      </td>
    `;
    tb.appendChild(tr);
  }
}

// =========================
// 📥 CONSULTAS
// =========================
async function fetchAll() {
  const [rCtas, rUsers, rRoles] = await Promise.all([
    sb.from('cuenta').select('id,usuario_id').order('id'),
    sb.from('usuarios').select('id,nombre,telefono,correo,rol_id'),
    sb.from('roles').select('id,nombre')
  ]);

  if (rCtas.error || rUsers.error || rRoles.error) {
    console.error(rCtas.error, rUsers.error, rRoles.error);
    alert('No se pudieron cargar las cuentas.');
    return { cuentas: [], usersById: new Map(), rolesById: new Map() };
  }

  const usersById = new Map((rUsers.data ?? []).map(u => [String(u.id), u]));
  const rolesById = new Map((rRoles.data ?? []).map(r => [String(r.id), r]));

  return { cuentas: rCtas.data ?? [], usersById, rolesById };
}

let _cache = { cuentas: [], usersById: new Map(), rolesById: new Map() };

async function cargar() {
  _cache = await fetchAll();
  render(_cache.cuentas, _cache.usersById, _cache.rolesById);
}

// =========================
// 🔍 FILTRO POR ROL
// =========================
function filtrarPorRol(txt) {
  const t = (txt || '').trim().toLowerCase();

  if (!t) {
    render(_cache.cuentas, _cache.usersById, _cache.rolesById);
    return;
  }

  const filtradas = _cache.cuentas.filter(cta => {
    const u = _cache.usersById.get(String(cta.usuario_id));
    const rol = _cache.rolesById.get(String(u?.rol_id));
    return (rol?.nombre || '').toLowerCase().includes(t);
  });

  render(filtradas, _cache.usersById, _cache.rolesById);
}

// =========================
// 🗑️ / ✏️ ACCIONES
// =========================
function initListeners() {
  const tb = tbody();
  if (!tb) return;

  tb.addEventListener('click', async (e) => {
    const edit = e.target.closest('.btn-editar');
    const del = e.target.closest('.btn-eliminar');

    if (edit) {
      location.href = `add_cuenta.html?id=${edit.dataset.id}`;
      return;
    }

    if (del) {
      const id = Number(del.dataset.id);
      if (!confirm('¿Eliminar esta cuenta?')) return;

      // Obtener usuario ligado
      const { data: cta, error: e0 } = await sb
        .from('cuenta')
        .select('usuario_id')
        .eq('id', id)
        .single();

      if (e0) {
        alert('No se pudo leer la cuenta: ' + e0.message);
        return;
      }

      // Eliminar cuenta
      const { error: eDelC } = await sb.from('cuenta').delete().eq('id', id);
      if (eDelC) {
        alert('No se pudo eliminar la cuenta: ' + eDelC.message);
        return;
      }

      // Eliminar usuario asociado
      if (cta?.usuario_id) {
        await sb.from('usuarios').delete().eq('id', cta.usuario_id);
      }

      await cargar();
    }
  });

  qRol()?.addEventListener('input', () => filtrarPorRol(qRol().value));

  btnMenu()?.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    sidebar.style.display =
      getComputedStyle(sidebar).display !== 'none' ? 'none' : 'flex';
  });
}

// =========================
// 🚀 INICIAR
// =========================
async function iniciar() {
  await cargar();
  initListeners();
}
