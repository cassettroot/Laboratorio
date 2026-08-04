let currentModalType = '';
let currentEditId = null;
let pendingDelete = null;

function closeModal() {
    const modal = document.getElementById('item-modal');
    const content = document.getElementById('item-modal-content');

    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
        stopWebcam();
    }, 200);
}

function openAddModal(type, prefillData = null) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para registrar nuevos elementos.");
        openAuthModal();
        return;
    }
    if (state.userRole !== 'admin' && state.userRole !== 'responsable') {
        alert("No tiene permisos para registrar nuevos elementos.");
        return;
    }
    if (state.userActive !== 1) {
        alert("Su usuario está inactivo. No tiene permisos para realizar cambios.");
        return;
    }
    currentModalType = type;
    currentEditId = null;

    const modal = document.getElementById('item-modal');
    const content = document.getElementById('item-modal-content');
    const formContainer = document.getElementById('modal-form-container');
    const title = document.getElementById('modal-title');

    if (prefillData && prefillData.name) {
        title.textContent = `📋 Nueva Presentación / Envase de "${prefillData.name}"`;
    } else {
        title.textContent = `Registrar ${type === 'substances' ? 'Reactivo o Sustancia' : (type === 'chemical_materials' ? 'Material Químico' : 'Material Didáctico')}`;
    }

    formContainer.innerHTML = buildFormHtml(type, prefillData || {});

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);

    if (window.lucide) window.lucide.createIcons();
    bindFormEvents();
}

async function openEditModal(type, id) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para editar elementos.");
        openAuthModal();
        return;
    }
    if (state.userRole !== 'admin' && state.userRole !== 'responsable') {
        alert("No tiene permisos para modificar elementos.");
        return;
    }
    if (state.userActive !== 1) {
        alert("Su usuario está inactivo. No tiene permisos para realizar cambios.");
        return;
    }
    currentModalType = type;
    currentEditId = id;

    const modal = document.getElementById('item-modal');
    const content = document.getElementById('item-modal-content');
    const formContainer = document.getElementById('modal-form-container');
    const title = document.getElementById('modal-title');

    title.textContent = `Editar ${type === 'substances' ? 'Reactivo' : (type === 'chemical_materials' ? 'Material Químico' : 'Material Didáctico')}`;
    formContainer.innerHTML = `<div class="flex justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>`;

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);

    const apiPath = type === 'chemical_materials' ? 'chemical-materials' : (type === 'didactic_materials' ? 'didactic-materials' : 'substances');

    try {
        const res = await fetch(`/api/${apiPath}/${id}`).then(r => r.json());
        if (res.status === 'success') {
            formContainer.innerHTML = buildFormHtml(type, res.data);
            bindFormEvents();
            if (window.lucide) window.lucide.createIcons();
        } else {
            formContainer.innerHTML = `<div class="text-red-500 p-4">${res.message}</div>`;
        }
    } catch (err) {
        formContainer.innerHTML = `<div class="text-red-500 p-4">Error: ${err.message}</div>`;
    }
}

function buildFormHtml(type, data = {}) {
    const photoPreview = data.image_path ? `
        <div class="relative w-full aspect-square rounded-2xl overflow-hidden border">
            <img src="${data.image_path}" class="w-full h-full object-cover">
            <input type="hidden" id="form-image-path" value="${data.image_path}">
            <button type="button" onclick="removeFormPhoto()" class="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1.5 hover:bg-red-700 transition">
                <i data-lucide="trash" class="w-4 h-4"></i>
            </button>
        </div>
    ` : `
        <div class="w-full aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 text-slate-400">
            <i data-lucide="image" class="w-8 h-8"></i>
            <span class="text-xs text-center font-semibold">Sube o toma una foto</span>
            <span class="text-3xs text-center text-slate-400">o presiona <kbd class="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-3xs font-mono font-bold">Ctrl + V</kbd> para pegar</span>
            <input type="hidden" id="form-image-path" value="">
        </div>
    `;

    if (type === 'substances') {
        let parsedPresImgs = [];
        if (data && data.presentation_images) {
            try {
                parsedPresImgs = typeof data.presentation_images === 'string' ? JSON.parse(data.presentation_images) : data.presentation_images;
                if (!Array.isArray(parsedPresImgs)) parsedPresImgs = [];
            } catch (e) {
                parsedPresImgs = [];
            }
        }
        window._currentFormPresImgs = parsedPresImgs;

        return `
            <form id="modal-form" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="md:col-span-1 flex flex-col gap-5">
                    <div id="form-photo-container">${photoPreview}</div>
                    <div class="flex gap-2">
                        <button type="button" onclick="startWebcamCapture()" class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                            <i data-lucide="camera" class="w-4 h-4"></i>
                            <span>Tomar Foto</span>
                        </button>
                        <label class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center">
                            <i data-lucide="upload" class="w-4 h-4"></i>
                            <span>Subir Archivo</span>
                            <input type="file" id="form-photo-file" accept="image/*" class="hidden">
                        </label>
                    </div>
                    <div class="border-t border-slate-100 pt-4">
                        <div class="flex items-center justify-between mb-2">
                            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">📦 Fotos por Presentaciones</label>
                            <label class="text-3xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-2 py-1 rounded-lg font-bold cursor-pointer border border-brand-200 transition flex items-center gap-1">
                                <i data-lucide="plus" class="w-3 h-3"></i>
                                <span>+ Foto Envase</span>
                                <input type="file" id="form-pres-photo-file" accept="image/*" class="hidden">
                            </label>
                        </div>
                        <div id="form-presentation-images-list" class="space-y-1.5 max-h-40 overflow-y-auto pr-1"></div>
                    </div>
                    <div class="border-t border-slate-100 pt-4">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">QR Personalizado (Opcional)</label>
                        <input type="text" id="form-qr-content" placeholder="Link web o código propio" value="${data.qr_content || ''}" class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-brand-500 outline-none transition font-medium">
                        <span class="text-3xs text-slate-400 block mt-1 leading-relaxed">Vacío para que el sistema genere el código de inventario local.</span>
                    </div>
                </div>
                <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre de la sustancia *</label>
                        <input type="text" id="form-name" value="${data.name || ''}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Grupo(s) Químico(s)</label>
                        <div id="form-substance-groups-container" class="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                            ${(() => {
                                const allGroups = [
                                    'Inflamables', 'Tóxicos', 'Corrosivos', 'Explosivos', 'Comburentes', 'Irritantes', 'Inertes',
                                    'Aldehídos', 'Alcoholes', 'Ácidos', 'Bases', 'Solventes', 'Hidrocarburos', 'Indicadores',
                                    'Metales', 'Óxidos', 'Sales', 'Colorantes', 'Cetonas', 'Ésteres', 'Halogenuros', 'Sulfóxidos',
                                    'Carbono / Adsorbentes', 'Otros'
                                ];
                                const selected = data.substance_group ? data.substance_group.split(/[,/;|]/).map(g => g.trim()) : [];
                                return allGroups.map(g => `
                                    <label class="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                                        <input type="checkbox" name="substance_group_check" value="${g}" ${selected.includes(g) ? 'checked' : ''} class="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500">
                                        <span>${g}</span>
                                    </label>
                                `).join('');
                            })()}
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fórmula Química</label>
                        <input type="text" id="form-chemical-formula" value="${data.chemical_formula || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Número CAS</label>
                        <input type="text" id="form-cas-number" value="${data.cas_number || ''}" placeholder="Ej. 64-17-5" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pureza o Composición</label>
                        <input type="text" id="form-composition" value="${data.composition || ''}" placeholder="Ej. Mezcla acuosa" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Concentración</label>
                        <input type="text" id="form-concentration" value="${data.concentration || ''}" placeholder="Ej. 98%, 0.1 M" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado Físico</label>
                        <select id="form-physical-state" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                            <option value="Sólido" ${data.physical_state === 'Sólido' ? 'selected' : ''}>Sólido</option>
                            <option value="Líquido" ${data.physical_state === 'Líquido' ? 'selected' : ''}>Líquido</option>
                            <option value="Gaseoso" ${data.physical_state === 'Gaseoso' ? 'selected' : ''}>Gaseoso</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Riesgos SGA / Advertencias</label>
                        <input type="text" id="form-risks-warnings" value="${data.risks_warnings || ''}" placeholder="Ej. Inflamable, Corrosivo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cantidad Total en Inventario *</label>
                        <input type="number" step="any" id="form-quantity" value="${data.quantity || '0'}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contenido por Envase (ej. 500 ml)</label>
                        <input type="text" id="form-container-content" value="${data.container_content || ''}" placeholder="Ej. 500 ml, 1 kg" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    <div>
                        <div class="flex items-center justify-between mb-1.5">
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Ubicación Física</label>
                            <button type="button" onclick="openShelfSelectorModal('form-location')" class="text-3xs font-extrabold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 transition">
                                <i data-lucide="map-pin" class="w-3 h-3"></i> 🗺️ Seleccionar en Estante
                            </button>
                        </div>
                        <input type="text" id="form-location" value="${data.location || ''}" placeholder="Ej. Estante A - Nivel 2 (Corrosivos)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Entrada</label>
                        <input type="date" id="form-entry-date" value="${data.entry_date || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1.5">
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha de Caducidad</label>
                            ${(() => {
                                const isNoExp = data.expiration_date === 'Sin caducidad' || data.expiration_date === 'No aplica';
                                return `
                                    <button type="button" id="btn-toggle-no-exp" onclick="toggleNoExpiration()" class="text-3xs font-bold px-2 py-0.5 rounded-lg border transition ${isNoExp ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}">
                                        ${isNoExp ? '✓ Sin Caducidad' : '+ Marcar Sin Caducidad'}
                                    </button>
                                `;
                            })()}
                        </div>
                        <input type="date" id="form-expiration-date" value="${(data.expiration_date && data.expiration_date !== 'Sin caducidad' && data.expiration_date !== 'No aplica') ? data.expiration_date : ''}" ${(data.expiration_date === 'Sin caducidad' || data.expiration_date === 'No aplica') ? 'disabled' : ''} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold disabled:bg-slate-200 disabled:text-slate-500">
                        <input type="hidden" id="form-is-no-exp" value="${(data.expiration_date === 'Sin caducidad' || data.expiration_date === 'No aplica') ? 'true' : 'false'}">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Responsable Custodia</label>
                        <input type="text" id="form-responsible" value="${data.responsible || getActiveUser()}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observaciones</label>
                        <textarea id="form-observations" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.observations || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Enlaces Externos (Uno por línea)</label>
                        <textarea id="form-external-links" rows="2" placeholder="Ej. https://wikipedia.org/wiki/Etanol" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.external_links || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Documentación PDF</label>
                        <div class="flex items-center gap-3">
                            <label class="py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center select-none bg-white">
                                <i data-lucide="file-text" class="w-4 h-4 text-slate-500"></i>
                                <span id="btn-pdf-upload-text">Subir PDF</span>
                                <input type="file" id="form-pdf-file" accept="application/pdf" class="hidden">
                            </label>
                            <div id="form-pdf-preview" class="text-xs text-slate-500 truncate max-w-[400px] font-semibold">
                                ${data.pdf_path ? `
                                    <div class="flex items-center gap-1">
                                        <a href="${data.pdf_path}" target="_blank" class="text-brand-600 hover:underline font-semibold">Ver PDF actual</a>
                                        <button type="button" onclick="removeFormPdf()" class="text-red-500 hover:text-red-700 p-0.5" title="Eliminar PDF">
                                            <i data-lucide="x" class="w-3.5 h-3.5 inline"></i>
                                        </button>
                                    </div>
                                ` : 'Ningún archivo seleccionado'}
                            </div>
                            <input type="hidden" id="form-pdf-path" value="${data.pdf_path || ''}">
                        </div>
                    </div>
                </div>
            </form>
        `;
    }
    else if (type === 'chemical_materials' || type === 'didactic_materials') {
        const isDidactic = type === 'didactic_materials';
        return `
            <form id="modal-form" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="md:col-span-1 flex flex-col gap-5">
                    <div id="form-photo-container">${photoPreview}</div>
                    <div class="flex gap-2">
                        <button type="button" onclick="startWebcamCapture()" class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                            <i data-lucide="camera" class="w-4 h-4"></i>
                            <span>Tomar Foto</span>
                        </button>
                        <label class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center">
                            <i data-lucide="upload" class="w-4 h-4"></i>
                            <span>Subir Archivo</span>
                            <input type="file" id="form-photo-file" accept="image/*" class="hidden">
                        </label>
                    </div>
                    <div class="border-t border-slate-100 pt-4">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">QR Personalizado (Opcional)</label>
                        <input type="text" id="form-qr-content" placeholder="Link web o código propio" value="${data.qr_content || ''}" class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-brand-500 outline-none transition font-medium">
                        <span class="text-3xs text-slate-400 block mt-1 leading-relaxed">Vacío para que el sistema genere el código de inventario local.</span>
                    </div>
                </div>
                <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Material *</label>
                        <input type="text" id="form-name" value="${data.name || ''}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Categoría / Tipo</label>
                        <input type="text" id="form-category" value="${data.category || ''}" placeholder="${isDidactic ? 'Ej. Modelos, Carteles' : 'Ej. Vidriería, Soporte'}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado de Conservación</label>
                        <select id="form-status" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                            <option value="Nuevo" ${data.status === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                            <option value="Excelente" ${data.status === 'Excelente' ? 'selected' : ''}>Excelente</option>
                            <option value="Bueno" ${data.status === 'Bueno' ? 'selected' : ''}>Bueno</option>
                            <option value="Dañado" ${data.status === 'Dañado' ? 'selected' : ''}>Dañado</option>
                            <option value="Roto" ${data.status === 'Roto' ? 'selected' : ''}>Roto / Incompleto</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cantidad *</label>
                        <input type="number" id="form-quantity" value="${data.quantity || '0'}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    ${isDidactic ? '' : `
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Unidad *</label>
                            <input type="text" id="form-unit" value="${data.unit || 'piezas'}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                        </div>
                    `}
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ubicación Física</label>
                        <input type="text" id="form-location" value="${data.location || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Responsable Custodia</label>
                        <input type="text" id="form-responsible" value="${data.responsible || getActiveUser()}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observaciones</label>
                        <textarea id="form-observations" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.observations || ''}</textarea>
                    </div>
                </div>
            </form>
        `;
    }
}

function renderFormPresImgsList() {
    const container = document.getElementById('form-presentation-images-list');
    if (!container) return;
    const imgs = window._currentFormPresImgs || [];

    if (imgs.length === 0) {
        container.innerHTML = `<div class="text-3xs text-slate-400 italic py-1">Sin fotos de presentaciones asociadas.</div>`;
        return;
    }

    container.innerHTML = imgs.map((img, idx) => `
        <div class="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div class="flex items-center gap-2 overflow-hidden">
                <img src="${img.image_path}" class="w-8 h-8 rounded-lg object-cover border shrink-0">
                <div class="truncate">
                    <span class="text-xs font-bold text-slate-700 block truncate" title="${img.label}">${img.label || 'Presentación ' + (idx + 1)}</span>
                </div>
            </div>
            <button type="button" onclick="removeFormPresImg(${idx})" class="p-1 text-red-500 hover:bg-red-50 rounded-lg shrink-0" title="Eliminar foto de presentación">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

function removeFormPresImg(idx) {
    if (!window._currentFormPresImgs) return;
    window._currentFormPresImgs.splice(idx, 1);
    renderFormPresImgsList();
}
window.removeFormPresImg = removeFormPresImg;

function bindFormEvents() {
    renderFormPresImgsList();

    const presFileInput = document.getElementById('form-pres-photo-file');
    if (presFileInput) {
        presFileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('photo', file);

                try {
                    const res = await fetch('/api/upload-photo', {
                        method: 'POST',
                        body: formData
                    }).then(r => r.json());

                    if (res.status === 'success') {
                        const count = (window._currentFormPresImgs || []).length + 1;
                        const defaultLabel = `Presentación ${count}`;
                        const label = prompt("Nombre o descripción de esta presentación (ej. Frasco 500 mL, Garrafa 5 L):", defaultLabel) || defaultLabel;
                        if (!window._currentFormPresImgs) window._currentFormPresImgs = [];
                        window._currentFormPresImgs.push({
                            id: Date.now(),
                            image_path: res.image_path,
                            label: label,
                            created_at: new Date().toISOString()
                        });
                        renderFormPresImgsList();
                    } else {
                        alert(res.message);
                    }
                } catch (err) {
                    alert(`Error al subir foto de presentación: ${err.message}`);
                }
                e.target.value = '';
            }
        });
    }

    const fileInput = document.getElementById('form-photo-file');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('photo', file);

                try {
                    const res = await fetch('/api/upload-photo', {
                        method: 'POST',
                        body: formData
                    }).then(r => r.json());

                    if (res.status === 'success') {
                        setFormPhoto(res.image_path);
                    } else {
                        alert(res.message);
                    }
                } catch (err) {
                    alert(`Error al subir foto: ${err.message}`);
                }
            }
        });
    }

    const pdfInput = document.getElementById('form-pdf-file');
    if (pdfInput) {
        pdfInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('pdf', file);

                const uploadText = document.getElementById('btn-pdf-upload-text');
                if (uploadText) uploadText.textContent = 'Subiendo...';

                try {
                    const res = await fetch('/api/upload-pdf', {
                        method: 'POST',
                        body: formData
                    }).then(r => r.json());

                    if (res.status === 'success') {
                        const pathInput = document.getElementById('form-pdf-path');
                        if (pathInput) pathInput.value = res.pdf_path;

                        const preview = document.getElementById('form-pdf-preview');
                        if (preview) {
                            preview.innerHTML = `
                                <div class="flex items-center gap-1">
                                    <a href="${res.pdf_path}" target="_blank" class="text-brand-600 hover:underline font-semibold">Ver PDF subido</a>
                                    <button type="button" onclick="removeFormPdf()" class="text-red-500 hover:text-red-700 p-0.5" title="Eliminar PDF">
                                        <i data-lucide="x" class="w-3.5 h-3.5 inline"></i>
                                    </button>
                                </div>
                            `;
                            if (window.lucide) window.lucide.createIcons();
                        }
                    } else {
                        alert(res.message);
                    }
                } catch (err) {
                    alert(`Error al subir PDF: ${err.message}`);
                } finally {
                    if (uploadText) uploadText.textContent = 'Subir PDF';
                }
            }
        });
    }

    const saveBtn = document.getElementById('btn-save-modal');
    saveBtn.onclick = handleFormSubmit;
}

function removeFormPhoto() {
    const container = document.getElementById('form-photo-container');
    container.innerHTML = `
        <div class="w-full aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 text-slate-400">
            <i data-lucide="image" class="w-8 h-8"></i>
            <span class="text-xs text-center font-semibold">Sube o toma una foto</span>
            <span class="text-3xs text-center text-slate-400">o presiona <kbd class="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-3xs font-mono font-bold">Ctrl + V</kbd> para pegar</span>
            <input type="hidden" id="form-image-path" value="">
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

// Soporte para comando Pegar (Ctrl + V) de imágenes desde el portapapeles
document.addEventListener('paste', async (e) => {
    const container = document.getElementById('form-photo-container') || document.getElementById('consulta-form-photo-container');
    if (!container) return;

    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;

    let imageFile = null;
    for (let item of items) {
        if (item.type && item.type.indexOf('image') === 0) {
            imageFile = item.getAsFile();
            break;
        }
    }

    if (!imageFile) return;

    e.preventDefault();

    const formData = new FormData();
    formData.append('photo', imageFile, 'pasted_image.png');

    try {
        const res = await fetch('/api/upload-photo', {
            method: 'POST',
            body: formData
        }).then(r => r.json());

        if (res.status === 'success') {
            setFormPhoto(res.image_path);
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert(`Error al pegar imagen: ${err.message}`);
    }
});

function removeFormPdf() {
    const preview = document.getElementById('form-pdf-preview');
    const pathInput = document.getElementById('form-pdf-path');
    if (preview && pathInput) {
        preview.textContent = 'Ningún archivo seleccionado';
        pathInput.value = '';
    }
    if (window.lucide) window.lucide.createIcons();
}

function setFormPhoto(path) {
    const consultaContainer = document.getElementById('consulta-form-photo-container');
    if (consultaContainer) {
        consultaContainer.innerHTML = `
            <div class="relative w-full aspect-video rounded-2xl overflow-hidden border">
                <img src="${path}" class="w-full h-full object-cover">
                <input type="hidden" id="consulta-form-image-path" value="${path}">
                <button type="button" onclick="removeConsultaFormPhoto()" class="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1.5 hover:bg-red-700 transition">
                    <i data-lucide="trash" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const container = document.getElementById('form-photo-container');
    if (container) {
        container.innerHTML = `
            <div class="relative w-full aspect-square rounded-2xl overflow-hidden border">
                <img src="${path}" class="w-full h-full object-cover">
                <input type="hidden" id="form-image-path" value="${path}">
                <button type="button" onclick="removeFormPhoto()" class="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1.5 hover:bg-red-700 transition">
                    <i data-lucide="trash" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }
}

function toggleNoExpiration() {
    const input = document.getElementById('form-expiration-date');
    const btn = document.getElementById('btn-toggle-no-exp');
    const isNoExpInput = document.getElementById('form-is-no-exp');

    if (!input || !btn || !isNoExpInput) return;

    const currentNoExp = isNoExpInput.value === 'true';
    if (!currentNoExp) {
        isNoExpInput.value = 'true';
        input.value = '';
        input.disabled = true;
        btn.textContent = '✓ Sin Caducidad';
        btn.className = 'text-3xs font-bold px-2 py-0.5 rounded-lg border transition bg-amber-100 text-amber-800 border-amber-300';
    } else {
        isNoExpInput.value = 'false';
        input.disabled = false;
        btn.textContent = '+ Marcar Sin Caducidad';
        btn.className = 'text-3xs font-bold px-2 py-0.5 rounded-lg border transition bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
    }
}

async function handleFormSubmit() {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para registrar o modificar elementos.");
        openAuthModal();
        return;
    }
    const form = document.getElementById('modal-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const payload = {};
    const imgEl = document.getElementById('form-image-path');
    if (imgEl) payload.image_path = imgEl.value;

    const qrEl = document.getElementById('form-qr-content');
    if (qrEl) payload.qr_content = qrEl.value.trim();

    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id && el.id.startsWith('form-') && el.id !== 'form-photo-file' && el.id !== 'form-image-path' && el.id !== 'form-qr-content' && el.id !== 'form-is-no-exp') {
            const key = el.id.replace('form-', '').replace(/-/g, '_');
            payload[key] = el.value;
        }
    });

    const isNoExpInput = document.getElementById('form-is-no-exp');
    if (isNoExpInput && isNoExpInput.value === 'true') {
        payload.expiration_date = 'Sin caducidad';
    }

    if (currentModalType === 'substances') {
        payload.presentation_images = window._currentFormPresImgs || [];
        const checkedGroups = [];
        document.querySelectorAll('input[name="substance_group_check"]:checked').forEach(cb => {
            checkedGroups.push(cb.value);
        });
        payload.substance_group = checkedGroups.join(', ');

        const containerContent = (document.getElementById('form-container-content') ? document.getElementById('form-container-content').value : '') || '';
        const match = containerContent.trim().match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ°%]+$/);
        payload.unit = match ? match[0] : 'g';
    }

    const isRequestEdit = (state.editingRequestId !== undefined && state.editingRequestId !== null);
    let url, method;

    if (isRequestEdit) {
        url = `/api/change-requests/${state.editingRequestId}`;
        method = 'PUT';
    } else {
        const isEdit = currentEditId !== null;
        const apiPath = currentModalType === 'chemical_materials' ? 'chemical-materials' : (currentModalType === 'didactic_materials' ? 'didactic-materials' : 'substances');
        url = isEdit ? `/api/${apiPath}/${currentEditId}` : `/api/${apiPath}`;
        method = isEdit ? 'PUT' : 'POST';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-User-Responsible': getActiveUser()
            },
            body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.status === 'success') {
            closeModal();
            if (isRequestEdit) {
                state.editingRequestId = null;
                // Si la vista activa es notificaciones, forzar recarga
                if (state.activeRoute === '#/notifications' && typeof renderNotificationsView === 'function') {
                    const mainEl = document.getElementById('main-content');
                    renderNotificationsView(mainEl);
                } else {
                    router();
                }
            } else {
                router();
            }
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert(err.message);
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    const content = document.getElementById('delete-modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        pendingDelete = null;
    }, 200);
}

function deleteItem(type, id) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para eliminar elementos del inventario.");
        openAuthModal();
        return;
    }
    if (state.userRole !== 'admin' && state.userRole !== 'responsable') {
        alert("No tiene permisos para eliminar elementos.");
        return;
    }
    if (state.userActive !== 1) {
        alert("Su usuario está inactivo. No tiene permisos para realizar cambios.");
        return;
    }
    const isSub = type === 'substances';
    const label = isSub ? 'la sustancia' : 'el material';

    const message = document.getElementById('delete-modal-message');
    const iconContainer = document.querySelector('#delete-modal-content .bg-red-50');
    message.textContent = `¿Está seguro de eliminar permanentemente ${label}?`;

    const labels = {
        substances: 'Sustancia Química',
        chemical_materials: 'Material Químico',
        didactic_materials: 'Material Didáctico'
    };
    if (iconContainer) {
        iconContainer.innerHTML = `<i data-lucide="trash-2" class="w-6 h-6"></i>`;
        if (window.lucide) window.lucide.createIcons();
    }

    const modal = document.getElementById('delete-modal');
    const content = document.getElementById('delete-modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);

    pendingDelete = { type, id, label, apiPath: type === 'chemical_materials' ? 'chemical-materials' : (type === 'didactic_materials' ? 'didactic-materials' : 'substances') };

    const btnConfirm = document.getElementById('btn-confirm-delete');
    btnConfirm.onclick = executeDelete;
}

async function executeDelete() {
    if (!pendingDelete) return;
    const { type, id, apiPath } = pendingDelete;

    closeDeleteModal();

    try {
        const res = await fetch(`/api/${apiPath}/${id}`, {
            method: 'DELETE',
            headers: {
                'X-User-Responsible': getActiveUser()
            }
        }).then(r => r.json());

        if (res.status === 'success') {
            router();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert(err.message);
    }
}

// MODAL DE SELECCIÓN INTERACTIVA DE UBICACIÓN EN ESTANTE METÁLICO NEGRO
function openShelfSelectorModal(targetInputId, isDirectSubstanceUpdate = false, substanceId = null) {
    let modalEl = document.getElementById('modal-shelf-location-picker');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'modal-shelf-location-picker';
        modalEl.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] hidden flex items-center justify-center p-4';
        document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 text-white space-y-5 shadow-2xl animate-fade-in relative">
            <div class="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                    <span class="bg-amber-500/20 text-amber-400 text-3xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/30">
                        🗺️ Asignación de Ubicación
                    </span>
                    <h3 class="text-lg font-extrabold text-white mt-1">Seleccionar Espacio en Estante Metálico Negro</h3>
                </div>
                <button onclick="closeShelfSelectorModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- FOTOGRAFÍA DE REFERENCIA Y ESTRUCTURA -->
            <div class="flex items-center gap-4 bg-slate-950/90 p-3 rounded-2xl border border-slate-800">
                <img src="/img/estante_negro_real.jpg" alt="Estante Real" class="w-20 h-24 object-cover rounded-xl border border-slate-700 shrink-0" />
                <div class="text-2xs text-slate-300 space-y-1">
                    <span class="text-amber-400 font-bold block">🏢 Representación Real del Estante de Almacén</span>
                    <p class="text-slate-400">Haz clic en cualquiera de los niveles (Estante Izquierdo A / Estante Derecho B) para asignar el espacio exacto donde se guardará la sustancia.</p>
                </div>
            </div>

            <!-- SELECCIÓN DE NIVELES EN GRILLA -->
            <div class="space-y-3 font-mono">
                <!-- ALTILLO -->
                <button type="button" onclick="selectShelfLevel('Altillo - Cajas Horizontales', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/50 p-2.5 rounded-xl text-left transition flex items-center justify-between text-xs text-amber-200 font-bold">
                    <span>📦 ALTILLO SUPERIOR (Cajas largas inerte)</span>
                    <span class="text-3xs bg-amber-900/80 px-2 py-0.5 rounded border border-amber-500/40">Altillo</span>
                </button>

                <!-- DOBLE COLUMNA A Y B -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <!-- COLUMNA A -->
                    <div class="space-y-2">
                        <div class="text-center text-3xs font-extrabold uppercase text-amber-400 bg-slate-800/90 py-1 rounded-lg border border-slate-700">Estante Izquierdo (Columna A - Reactivos)</div>
                        
                        <button type="button" onclick="selectShelfLevel('Estante A - Nivel 5 (Sólidos Inertes Grupo 9)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-slate-800/80 hover:bg-brand-900/40 border border-slate-700 hover:border-brand-500 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-slate-200">
                            <span>A5: Sólidos Inertes (Grupo 9)</span>
                            <span class="text-blue-400 font-bold">G9</span>
                        </button>
                        <button type="button" onclick="selectShelfLevel('Estante A - Nivel 4 (Peróxidos/Tóxicos Grupos 5/6)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-slate-800/80 hover:bg-amber-900/40 border border-slate-700 hover:border-amber-500 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-slate-200">
                            <span>A4: Comburentes y Tóxicos (G5/G6)</span>
                            <span class="text-yellow-400 font-bold">G5/6</span>
                        </button>
                        <button type="button" onclick="selectShelfLevel('Estante A - Nivel 3 (Líquidos Inflamables Grupo 3)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-slate-800/80 hover:bg-amber-900/40 border border-slate-700 hover:border-amber-500 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-slate-200">
                            <span>A3: Inflamables (Grupo 3 - Charola)</span>
                            <span class="text-amber-400 font-bold">G3</span>
                        </button>
                        <button type="button" onclick="selectShelfLevel('Estante A - Nivel 2 (Corrosivos Ácidos/Bases Grupo 8)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-amber-950/50 hover:bg-amber-900/80 border border-amber-500/50 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-amber-200 font-bold">
                            <span>A2: Corrosivos (Grupo 8 - Cintura)</span>
                            <span class="text-red-400 font-bold">G8</span>
                        </button>
                        <button type="button" onclick="selectShelfLevel('Estante A - Nivel 1 (Piso Estante / Cajas 2WAJ)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-slate-300">
                            <span>A1: Cajas 2WAJ + Kit Derrames</span>
                            <span class="text-slate-400">Base</span>
                        </button>
                    </div>

                    <!-- COLUMNA B -->
                    <div class="space-y-2">
                        <div class="text-center text-3xs font-extrabold uppercase text-purple-400 bg-slate-800/90 py-1 rounded-lg border border-slate-700">Estante Derecho (Columna B - Reactivos)</div>
                        
                        <button type="button" onclick="selectShelfLevel('Estante B - Nivel 5 (Indicadores y Colorantes)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-slate-800/80 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-slate-200">
                            <span>B5: Indicadores y Colorantes (Fenolftaleína, Azul de Metileno)</span>
                            <span class="text-purple-400 font-bold">Indic</span>
                        </button>
                        <button type="button" onclick="selectShelfLevel('Estante B - Nivel 4 (Metales y Sólidos Reactivos Grupo 4)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-slate-800/80 hover:bg-orange-900/40 border border-slate-700 hover:border-orange-500 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-slate-200">
                            <span>B4: Metales y Sólidos Reactivos (Magnesio, Carburo)</span>
                            <span class="text-orange-400 font-bold">G4</span>
                        </button>
                        <button type="button" onclick="selectShelfLevel('Estante B - Nivel 3 (Ácidos Orgánicos y Carbohidratos)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-slate-800/80 hover:bg-emerald-900/40 border border-slate-700 hover:border-emerald-500 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-slate-200">
                            <span>B3: Ácidos Orgánicos y Carbohidratos (Cítrico, Sacarosa)</span>
                            <span class="text-emerald-400 font-bold">Org</span>
                        </button>
                        <button type="button" onclick="selectShelfLevel('Estante B - Nivel 2 (Sales Inorgánicas N-Z Grupo 9)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-slate-800/80 hover:bg-blue-900/40 border border-slate-700 hover:border-blue-500 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-slate-200">
                            <span>B2: Sales Inorgánicas N-Z (Ferrocianuro, Sulfatos)</span>
                            <span class="text-blue-400 font-bold">G9</span>
                        </button>
                        <button type="button" onclick="selectShelfLevel('Estante B - Nivel 1 (Soluciones Acuosas Gran Volumen)', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-purple-950/50 hover:bg-purple-900/80 border border-purple-500/50 p-2 rounded-lg text-left transition text-3xs flex justify-between items-center text-purple-200 font-bold">
                            <span>B1: Soluciones Acuosas (Agua Destilada, Jabón, Cobre)</span>
                            <span class="text-purple-300">Acuosas</span>
                        </button>
                    </div>
                </div>

                <!-- PISO DE ALMACÉN -->
                <button type="button" onclick="selectShelfLevel('Piso del Almacén - Área Libre', '${targetInputId}', ${isDirectSubstanceUpdate}, ${substanceId})" class="w-full bg-slate-950/90 hover:bg-slate-800 border border-slate-700 p-2 rounded-xl text-left transition flex items-center justify-between text-3xs text-slate-400">
                    <span>🚨 PISO DEL ALMACÉN (Área libre de pasillo)</span>
                    <span class="text-emerald-400 font-bold">Libre</span>
                </button>
            </div>
        </div>
    `;

    modalEl.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

function closeShelfSelectorModal() {
    const modalEl = document.getElementById('modal-shelf-location-picker');
    if (modalEl) modalEl.classList.add('hidden');
}

async function selectShelfLevel(locationStr, targetInputId, isDirectSubstanceUpdate, substanceId) {
    if (targetInputId) {
        const inputEl = document.getElementById(targetInputId);
        if (inputEl) inputEl.value = locationStr;
    }

    if (isDirectSubstanceUpdate && substanceId) {
        try {
            const res = await fetch(`/api/substances/${substanceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: locationStr })
            }).then(r => r.json());

            if (res.status === 'success') {
                alert(`✅ Ubicación asignada a: "${locationStr}"`);
                window.location.reload();
            } else {
                alert(`Error: ${res.message}`);
            }
        } catch (e) {
            alert(`Error guardando ubicación: ${e.message}`);
        }
    }

    closeShelfSelectorModal();
}

function openShelfSelectorModalForSubstance(substanceId, currentLocation) {
    openShelfSelectorModal(null, true, substanceId);
}

async function openDuplicateSubstanceModal(type, id) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para registrar una nueva presentación.");
        openAuthModal();
        return;
    }
    if (state.userRole !== 'admin' && state.userRole !== 'responsable') {
        alert("No tiene permisos para registrar presentaciones.");
        return;
    }

    const apiPath = type === 'chemical_materials' ? 'chemical-materials' : (type === 'didactic_materials' ? 'didactic-materials' : 'substances');
    try {
        const res = await fetch(`/api/${apiPath}/${id}`).then(r => r.json());
        if (res.status === 'success') {
            const original = res.data;
            const replicaData = {
                ...original,
                id: null,
                image_path: '', // Se limpia para tomar/subir la foto del nuevo envase
                quantity: 1.0,
                container_content: original.container_content ? `Presentación 2 (${original.container_content})` : 'Nueva Presentación / Envase',
                observations: original.observations ? `[Nueva Presentación del producto LAB-${original.id}] ${original.observations}` : `Nueva presentación del producto LAB-${original.id}`
            };
            openAddModal(type, replicaData);
        } else {
            alert(`Error al obtener datos: ${res.message}`);
        }
    } catch (err) {
        alert(`Error al duplicar sustancia: ${err.message}`);
    }
}

window.openShelfSelectorModal = openShelfSelectorModal;
window.closeShelfSelectorModal = closeShelfSelectorModal;
window.selectShelfLevel = selectShelfLevel;
window.openShelfSelectorModalForSubstance = openShelfSelectorModalForSubstance;
window.openDuplicateSubstanceModal = openDuplicateSubstanceModal;

function openImageViewer(src, title = 'Fotografía de la Sustancia') {
    if (!src) return;

    let viewerModal = document.getElementById('image-viewer-modal');
    if (!viewerModal) {
        viewerModal = document.createElement('div');
        viewerModal.id = 'image-viewer-modal';
        viewerModal.className = 'fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-between p-4 sm:p-8 animate-fade-in no-print';
        document.body.appendChild(viewerModal);
    }

    const cleanTitle = (title || 'Fotografía de la Sustancia').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    viewerModal.innerHTML = `
        <div class="w-full max-w-5xl flex items-center justify-between text-white pb-3 border-b border-slate-800/80 shrink-0">
            <div class="flex items-center gap-2.5">
                <i data-lucide="image" class="w-5 h-5 text-brand-400"></i>
                <h3 class="font-extrabold text-sm sm:text-base text-white truncate max-w-md">${cleanTitle}</h3>
            </div>
            <div class="flex items-center gap-2">
                <a href="${src}" download target="_blank" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition text-xs font-bold flex items-center gap-1.5 shadow" title="Descargar foto">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span class="hidden sm:inline">Descargar Foto</span>
                </a>
                <button onclick="closeImageViewer()" class="p-2 bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white rounded-xl transition shadow" title="Cerrar (Esc)">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
        </div>

        <div class="flex-1 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden" onclick="closeImageViewer()">
            <img src="${src}" alt="${cleanTitle}" class="max-h-[80vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl border border-white/10 transition-transform duration-300 hover:scale-[1.02] bg-slate-900/50" onclick="event.stopPropagation()" />
        </div>

        <div class="text-3xs text-slate-400 text-center shrink-0 pt-2 font-medium">
            <span>Haz clic fuera de la foto o presiona <kbd class="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded font-mono font-bold">Esc</kbd> para salir</span>
        </div>
    `;

    viewerModal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();

    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            closeImageViewer();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
}

function closeImageViewer() {
    const viewerModal = document.getElementById('image-viewer-modal');
    if (viewerModal) {
        viewerModal.classList.add('hidden');
    }
}

window.openImageViewer = openImageViewer;
window.closeImageViewer = closeImageViewer;
