/**
 * static/js/utils.js
 * ─────────────────────────────────────────────────────
 * Utilidades compartidas del frontend. Importar antes
 * que cualquier view script en index.html.
 */

'use strict';

// ── Sanitización HTML ────────────────────────────────────────────────────────

/**
 * Escapa caracteres HTML especiales para inserción segura con innerHTML.
 * Usar SIEMPRE que se inserte contenido proveniente del servidor o usuario.
 *
 * @param {*} value - Valor a escapar (se convierte a string)
 * @returns {string} String con HTML escapado
 */
window.escHtml = function escHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

// ── Formateo de fechas ───────────────────────────────────────────────────────

/**
 * Formatea una fecha ISO o string a formato legible en español.
 * @param {string|null} dateStr - Fecha en formato ISO u otro parseable
 * @param {boolean} [includeTime=false] - Si se incluye la hora
 * @returns {string} Fecha formateada o 'N/D' si es inválida
 */
window.formatDate = function formatDate(dateStr, includeTime = false) {
    if (!dateStr) return 'N/D';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (includeTime) {
        opts.hour = '2-digit';
        opts.minute = '2-digit';
    }
    return d.toLocaleDateString('es-MX', opts);
};

// ── Fetch con manejo de errores ───────────────────────────────────────────────

/**
 * Wrapper de fetch que maneja errores de red y respuestas no-OK.
 * Siempre devuelve un objeto JSON. Si hay error de red, devuelve
 * { status: 'error', message: '...' }.
 *
 * @param {string} url - URL a solicitar
 * @param {RequestInit} [options={}] - Opciones de fetch
 * @returns {Promise<object>} - Respuesta JSON parseada
 */
window.apiFetch = async function apiFetch(url, options = {}) {
    const defaults = {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    };
    try {
        const res = await fetch(url, { ...defaults, ...options });
        const json = await res.json().catch(() => ({
            status: 'error',
            message: `Respuesta no válida del servidor (HTTP ${res.status})`,
        }));
        return json;
    } catch (err) {
        console.error('[apiFetch] Error de red:', err);
        return { status: 'error', message: 'No se pudo conectar con el servidor.' };
    }
};

// ── Toast / notificaciones ────────────────────────────────────────────────────

/**
 * Muestra un mensaje toast temporal en pantalla.
 * @param {string} message - Mensaje a mostrar
 * @param {'success'|'error'|'info'|'warning'} [type='info'] - Tipo de toast
 * @param {number} [duration=3500] - Duración en ms
 */
window.showToast = function showToast(message, type = 'info', duration = 3500) {
    const colors = {
        success: 'bg-emerald-600',
        error:   'bg-red-600',
        warning: 'bg-amber-500',
        info:    'bg-slate-700',
    };
    const color = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl
        transition-all duration-300 translate-y-4 opacity-0 ${color}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => toast.remove(), 350);
    }, duration);
};

// ── Debounce para inputs y búsquedas fluidas en hardware modesto ─────────────
window.debounce = function debounce(func, wait = 150) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
