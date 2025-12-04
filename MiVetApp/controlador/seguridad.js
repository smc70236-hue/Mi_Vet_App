// ============================================
// seguridad.js (versión SIN Supabase Auth)
// ============================================

// ---- Sesión local ----

export function getUsuarioActual() {
  try {
    const raw = localStorage.getItem('veterinaryUser');
    console.log('Usuario actual en localStorage:', raw);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error leyendo usuario de localStorage', e);
    return null;
  }
}

// Normaliza el rol para evitar errores con mayúsculas/minúsculas
function normalizarRol(rol) {
  return (rol || '').toString().trim().toLowerCase();
}

// Obtiene el rol del usuario
function getRolUsuario(user) {
  return normalizarRol(user?.rolNombre || user?.rol);
}

// ---- Protección de páginas ----
export function requireLogin(rolesPermitidos = null) {
  const user = getUsuarioActual();

  if (!user) {
    window.location.href = 'login.html';
    return null;
  }

  const rolUser = getRolUsuario(user);

  if (rolesPermitidos && rolesPermitidos.length > 0) {
    const permitidos = rolesPermitidos.map(normalizarRol);

    if (!permitidos.includes(rolUser)) {
      alert('Acceso restringido.');
      window.location.href = 'login.html';
      return null;
    }
  }

  return user;
}

// ---- Helpers de rol ----
export function isAdmin(user) {
  return getRolUsuario(user) === 'administrador';
}
export function isVet(user) {
  return getRolUsuario(user) === 'veterinario';
}
export function isRecep(user) {
  return getRolUsuario(user) === 'recepcionista';
}

// ---- Permisos ----
export function puedeVerCuentas(user) {
  return isAdmin(user);
}
export function puedeEditarCuentas(user) {
  return isAdmin(user);
}
export function puedeProgramarCitas(user) {
  const rol = getRolUsuario(user);
  return rol === 'administrador' || rol === 'recepcionista';
}
export function puedeVerMisCitas(user) {
  return isVet(user);
}

// ---- LOGOUT (solo borra sesión local) ----
export function logout() {
  console.log('Cerrando sesión...');
  localStorage.removeItem('veterinaryUser');
  window.location.href = 'login.html';
}

// ---- Botón logout ----
export function wireLogout(selector = '.btn-logout') {
  // Ejecutar inmediatamente para cualquier página
  const btns = document.querySelectorAll(selector);
  console.log('Botones logout encontrados:', btns);

  btns.forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Click en logout');
      logout();
    });
  });
}

// ---- UI por rol ----
export function initRoleUI(userParam = null) {
  const user = userParam || getUsuarioActual();
  if (!user) return;

  const rolOriginal = user.rolNombre || user.rol || 'Sin rol';
  const rolLower = getRolUsuario(user);
  const correo = user.user || user.correo || '';

  // Ejecutar después de que el DOM esté listo
  document.addEventListener('DOMContentLoaded', () => {
    const indicator = document.querySelector('[data-user-indicator]');
    if (indicator) {
      indicator.textContent = `${rolOriginal} | ${correo}`;
    }

    document.querySelectorAll('[data-roles]').forEach(link => {
      const rolesStr = link.getAttribute('data-roles') || '';
      const roles = rolesStr
        .split(',')
        .map(normalizarRol)
        .filter(Boolean);

      if (roles.length && !roles.includes(rolLower)) {
        link.style.display = 'none';
      } else {
        link.style.display = '';
      }
    });

    const linkMascotas = document.querySelector('#linkMascotas');
    if (linkMascotas) {
      if (isVet(user)) {
        linkMascotas.href = 'mis_mascotas.html';
        linkMascotas.innerHTML = `
          <i class="fa-solid fa-dog"></i>
          <span class="nav-text">Mis mascotas</span>
        `;
      } else {
        linkMascotas.href = 'mascotas.html';
        linkMascotas.innerHTML = `
          <i class="fa-solid fa-dog"></i>
          <span class="nav-text">Mascotas</span>
        `;
      }
    }
  });
}
