// modelo/add_mascotas.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { requireLogin, initRoleUI, isVet } from '../controlador/seguridad.js';

// --- Seguridad / sesión ---
const usuario = requireLogin(['Administrador', 'Recepcionista', 'Veterinario']);
initRoleUI(usuario);

// Solo el veterinario será solo lectura.
// Recepcionista y Administrador pueden editar todo.
const esSoloLectura = isVet(usuario);

// --- Supabase ---
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// --- Helpers DOM ---
const $ = (s) => document.querySelector(s);

// Elementos del formulario (IDs según TU HTML)
const form        = $('#frmMascota');
const btnGuardar  = form?.querySelector('button[type="submit"]');

const inpId          = $('#id');
const inpNombre      = $('#nombre');
const inpEdadAnios   = $('#edad_anios');
const inpEdadMeses   = $('#edad_meses');
const selEspecie     = $('#especie');
const selRaza        = $('#raza');
const inpPesoKg      = $('#peso_kg');
const inpColor       = $('#color');
const inpDuenioTel   = $('#duenio_tel');     // cli_tel
const txtDiagnostico = $('#observaciones');  // diagnostico
const txtTratamiento = $('#tratamiento');

// FOTO
const inpFoto     = $('#foto');
const imgPrevFoto = $('#prevFoto');  // <img id="prevFoto">

// Para manejar razas en memoria
let todasLasRazas = [];

// Obtener id de la mascota desde la URL (modo editar)
const params      = new URLSearchParams(window.location.search);
const idMascotaQS = params.get('id');

// ================== FOTO: FUNCION PARA SUBIR A SUPABASE ==================
async function subirFoto(file) {
  if (!file) return null;

  const fileName = `${Date.now()}-${file.name}`;

  const { data, error } = await sb.storage
    .from("mascotas") // ⚠️ tu bucket en Storage
    .upload(fileName, file);

  if (error) {
    console.error("Error subiendo foto:", error);
    return null;
  }

  const publicUrl = sb.storage
    .from("mascotas")
    .getPublicUrl(data.path).data.publicUrl;

  return publicUrl;
}

// ================== SOLO LECTURA VETERINARIO ==================
function aplicarSoloLectura() {
  if (!esSoloLectura || !form) return;

  const campos = form.querySelectorAll('input, select, textarea');
  campos.forEach(c => {
    if (c.id === 'id') return;
    c.disabled = true;
  });

  if (btnGuardar) btnGuardar.style.display = 'none';
}

// ================== RAZAS / ESPECIES ==================
function poblarEspecies() {
  if (!selEspecie) return;

  selEspecie.innerHTML = '<option value="">-- Selecciona especie --</option>';

  const especiesUnicas = [...new Set(todasLasRazas.map(r => r.especie))];

  for (const esp of especiesUnicas) {
    const opt = document.createElement('option');
    opt.value = esp;
    opt.textContent = esp;
    selEspecie.appendChild(opt);
  }
}

function poblarRazasPorEspecie(especieSeleccionada) {
  if (!selRaza) return;

  selRaza.innerHTML = '<option value="">Selecciona raza</option>';

  if (!especieSeleccionada) {
    selRaza.disabled = true;
    return;
  }

  const razasFiltradas = todasLasRazas.filter(r => r.especie === especieSeleccionada);

  for (const r of razasFiltradas) {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.nombre || `Raza #${r.id}`;
    selRaza.appendChild(opt);
  }
  selRaza.disabled = false;
}

async function cargarRazas() {
  try {
    let res = await sb
      .from('razas')
      .select('id, especie, nombre')
      .order('especie', { ascending: true })
      .order('nombre', { ascending: true });

    if (res.error) throw res.error;

    todasLasRazas = res.data || [];
    poblarEspecies();
  } catch (err) {
    console.error('Error cargando razas:', err);
    alert('No se pudieron cargar las razas.');
  }
}

// ================== CARGAR MASCOTA (EDITAR) ==================
async function cargarMascota(id) {
  const idNum = Number(id);
  const filtro = Number.isFinite(idNum) ? idNum : id;

  try {
    const { data, error } = await sb
      .from('mascotas')
      .select(`
        id,
        nombre,
        edad_anios,
        edad_meses,
        peso_kg,
        color,
        cli_tel,
        raza_id,
        diagnostico,
        tratamiento,
        foto_url
      `)
      .eq('id', filtro)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      alert('No se encontró la mascota.');
      return;
    }

    inpId.value          = data.id ?? '';
    inpNombre.value      = data.nombre ?? '';
    inpEdadAnios.value   = data.edad_anios ?? '';
    inpEdadMeses.value   = data.edad_meses ?? '';
    inpPesoKg.value      = data.peso_kg ?? '';
    inpColor.value       = data.color ?? '';
    inpDuenioTel.value   = data.cli_tel ?? '';
    txtDiagnostico.value = data.diagnostico ?? '';
    txtTratamiento.value = data.tratamiento ?? '';

    if (data.foto_url && imgPrevFoto) {
      imgPrevFoto.src = data.foto_url;
      imgPrevFoto.style.display = "block";
    }

    if (data.raza_id && todasLasRazas.length > 0) {
      const raza = todasLasRazas.find(r => Number(r.id) === Number(data.raza_id));
      if (raza) {
        selEspecie.value = raza.especie;
        poblarRazasPorEspecie(raza.especie);
        selRaza.value = data.raza_id;
      }
    }

  } catch (err) {
    console.error('Error cargando mascota:', err);
    alert('Error al cargar la mascota.');
  }
}

// ================== GUARDAR (INSERT / UPDATE) ==================
async function guardarMascota(evt) {
  evt.preventDefault();

  if (esSoloLectura) {
    alert('No tienes permisos para editar.');
    return;
  }

  const payload = {
    nombre:       inpNombre.value.trim() || null,
    raza_id:      selRaza.value ? Number(selRaza.value) : null,
    edad_anios:   inpEdadAnios.value ? Number(inpEdadAnios.value) : null,
    edad_meses:   inpEdadMeses.value ? Number(inpEdadMeses.value) : null,
    peso_kg:      inpPesoKg.value ? Number(inpPesoKg.value) : null,
    color:        inpColor.value.trim() || null,
    cli_tel:      inpDuenioTel.value.trim() || null,
    diagnostico:  txtDiagnostico.value.trim() || null,
    tratamiento:  txtTratamiento.value.trim() || null
  };

  // 📌 SUBIR FOTO SI EL USUARIO SELECCIONÓ UNA
  let nuevaFotoUrl = null;

  if (inpFoto && inpFoto.files.length > 0) {
    nuevaFotoUrl = await subirFoto(inpFoto.files[0]);
    payload.foto_url = nuevaFotoUrl;
  }

  try {
    let error;

    if (idMascotaQS) {
      // UPDATE
      const idNum = Number(idMascotaQS);
      const filtro = Number.isFinite(idNum) ? idNum : idMascotaQS;

      const { error: errUpdate } = await sb
        .from("mascotas")
        .update(payload)
        .eq("id", filtro);

      error = errUpdate;
    } else {
      // INSERT
      const { error: errInsert } = await sb
        .from("mascotas")
        .insert(payload);

      error = errInsert;
    }

    if (error) {
      console.error("Error guardando mascota:", error);
      alert("Ocurrió un error al guardar.");
      return;
    }

    alert("Mascota guardada correctamente.");
    window.location.href = "mascotas.html";

  } catch (err) {
    console.error("Error inesperado:", err);
    alert("Error guardando la mascota.");
  }
}

// ================== PREVIEW DE FOTO ==================
if (inpFoto && imgPrevFoto) {
  inpFoto.addEventListener("change", () => {
    const file = inpFoto.files?.[0];

    if (!file) {
      imgPrevFoto.style.display = "none";
      imgPrevFoto.src = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      imgPrevFoto.src = e.target.result;
      imgPrevFoto.style.display = "block";
    };
    reader.readAsDataURL(file);
  });
}

// ================== EVENTOS ==================
if (form) form.addEventListener("submit", guardarMascota);
if (selEspecie) selEspecie.addEventListener("change", () => poblarRazasPorEspecie(selEspecie.value));

// ================== INIT ==================
(async function init() {
  try {
    await cargarRazas();
    if (idMascotaQS) await cargarMascota(idMascotaQS);
  } finally {
    aplicarSoloLectura();
  }
})();
