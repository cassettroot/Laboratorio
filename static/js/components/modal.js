let currentModalType = '';
let currentEditId = null;
let pendingDelete = null;

function getApiPathForType(t) {
    if (!t) return 'substances';
    const typeLower = String(t).toLowerCase();
    if (typeLower === 'chemical_materials' || typeLower === 'chemical-materials' || typeLower === 'chem-materials') {
        return 'chemical-materials';
    }
    if (typeLower === 'didactic_materials' || typeLower === 'didactic-materials' || typeLower === 'did-materials') {
        return 'didactic-materials';
    }
    if (typeLower === 'equipos' || typeLower === 'equipo') {
        return 'equipos';
    }
    return 'substances';
}

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
    if (state.userRole !== 'admin' && state.userRole !== 'jefe' && state.userRole !== 'responsable') {
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
        title.textContent = `Registrar ${type === 'substances' ? 'Reactivo o Sustancia' : (type === 'chemical_materials' ? 'Material o Equipo' : (type === 'equipos' ? 'Bien o Equipo' : 'Material Didáctico'))}`;
    }

    window._currentModalData = prefillData || {};
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
    if (state.userRole !== 'admin' && state.userRole !== 'jefe' && state.userRole !== 'responsable') {
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

    title.textContent = `Editar ${type === 'substances' ? 'Reactivo' : ((type === 'chemical_materials' || type === 'chemical-materials') ? 'Material / Equipo' : (type === 'equipos' ? 'Bien o Equipo' : 'Material Didáctico'))}`;
    formContainer.innerHTML = `<div class="flex justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>`;

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);

    const apiPath = getApiPathForType(type);

    try {
        const res = await fetch(`/api/${apiPath}/${id}`).then(r => r.json());
        if (res.status === 'success') {
            window._currentModalData = res.data;
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
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Número de Envases / Frascos en Stock *</label>
                        <input type="number" min="1" id="form-stock-units" value="${data.stock_units || '1'}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Capacidad / Cantidad por Envase *</label>
                        <div class="flex gap-2">
                            <input type="number" step="any" id="form-quantity" value="${data.quantity || '1.0'}" required class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                            <select id="form-unit" class="w-24 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                                <option value="g" ${(!data.unit || data.unit === 'g') ? 'selected' : ''}>g</option>
                                <option value="mL" ${data.unit === 'mL' ? 'selected' : ''}>mL</option>
                                <option value="L" ${data.unit === 'L' ? 'selected' : ''}>L</option>
                                <option value="kg" ${data.unit === 'kg' ? 'selected' : ''}>kg</option>
                                <option value="mg" ${data.unit === 'mg' ? 'selected' : ''}>mg</option>
                                <option value="piezas" ${data.unit === 'piezas' ? 'selected' : ''}>piezas</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción de Envase / Presentación</label>
                        <input type="text" id="form-container-content" value="${data.container_content || ''}" placeholder="Ej. Frasco de 500 mL" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
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
    else if (type === 'chemical_materials' || type === 'chemical-materials' || type === 'didactic_materials' || type === 'didactic-materials') {
        const isDidactic = (type === 'didactic_materials' || type === 'didactic-materials');
        return `
            <form id="modal-form" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- COLUMNA 1 (IZQUIERDA 1/3): FOTO Y QR -->
                <div class="md:col-span-1 flex flex-col gap-5">
                    <div id="form-photo-container">${photoPreview}</div>
                    <div class="flex gap-2">
                        <button type="button" onclick="startWebcamCapture()" class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition text-slate-700">
                            <i data-lucide="camera" class="w-4 h-4 text-teal-600"></i>
                            <span>Tomar Foto</span>
                        </button>
                        <label class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center text-slate-700">
                            <i data-lucide="upload" class="w-4 h-4 text-teal-600"></i>
                            <span>Subir Archivo</span>
                            <input type="file" id="form-photo-file" accept="image/*" class="hidden">
                        </label>
                    </div>
                    <div class="border-t border-slate-100 pt-4">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">QR Personalizado (Opcional)</label>
                        <input type="text" id="form-qr-content" placeholder="Link web o código propio" value="${data.qr_content || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-teal-500 outline-none transition font-medium text-slate-800">
                        <span class="text-3xs text-slate-400 block mt-1 leading-relaxed">Vacío para que el sistema genere el código de inventario local.</span>
                    </div>
                </div>

                <!-- COLUMNA 2 (DERECHA 2/3): INFORMACIÓN PRINCIPAL Y SECCIONES -->
                <div class="md:col-span-2 space-y-5">
                    ${(currentEditId || data.id) ? `
                    <div class="bg-emerald-50/80 border border-emerald-200/90 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                        <div>
                            <span class="block text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                                <i data-lucide="copy" class="w-4 h-4 text-emerald-700"></i>
                                <span>📋 ¿Deseas registrar otra unidad física de este producto?</span>
                            </span>
                            <span class="text-3xs text-emerald-700/90">Mantiene la descripción, categoría e imagen para que solo agregues el nuevo No. SEP.</span>
                        </div>
                        <button type="button" onclick="openDuplicateMaterialModal(${currentEditId || data.id});" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0">
                            <i data-lucide="plus-circle" class="w-4 h-4"></i>
                            <span>➕ Registrar Otra Unidad (Nuevo SEP)</span>
                        </button>
                    </div>
                    ` : ''}

                    ${(type === 'chemical_materials' && (state.chemMaterialTemplates || []).length > 0) ? `
                    <div class="bg-sky-50/70 border border-sky-200/90 p-3.5 rounded-2xl shadow-2xs">
                        <label class="block text-3xs font-extrabold text-sky-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-500"></i>
                            <span>⚡ Autocompletar con Producto Existente (Mismo Modelo / Nuevo No. SEP)</span>
                        </label>
                        <select onchange="handleModalTemplateAutofill(this.value)" class="w-full bg-white border border-slate-300 text-slate-800 font-semibold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-sky-500 cursor-pointer">
                            <option value="">-- Selecciona un Producto Registrado o Completa el Formulario Abajo --</option>
                            ${(state.chemMaterialTemplates || []).map(t => `<option value="${t.id}">${t.name} (${t.unit_count} unidad(es) regist.)</option>`).join('')}
                        </select>
                    </div>
                    ` : ''}

                    <!-- SECCIÓN A: FOTO E INFORMACIÓN PRINCIPAL DEL LOTE / MATERIAL -->
                    <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span class="text-xs font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                                <i data-lucide="package" class="w-4 h-4 text-teal-600"></i>
                                <span>SECCIÓN A: Información Principal del Lote / Objeto</span>
                            </span>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre / Descripción del Lote o Material *</label>
                            <input type="text" id="form-name" value="${data.name || ''}" required placeholder="ej. Caja de Experimentación Escolar / Microscopio Binocular / Matraz Erlenmeyer" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold">
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Categoría</label>
                                <div class="flex flex-wrap gap-1.5 mb-2">
                                    <button type="button" onclick="selectCategoryChip('🔬 Equipo / Instrumento', this)" class="category-chip-btn px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/90 rounded-lg text-3xs font-extrabold transition">🔬 Equipo</button>
                                    <button type="button" onclick="selectCategoryChip('💻 Cómputo / Electrónica', this)" class="category-chip-btn px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/90 rounded-lg text-3xs font-extrabold transition">💻 Cómputo</button>
                                    <button type="button" onclick="selectCategoryChip('🧪 Cristalería / Vidrio', this)" class="category-chip-btn px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/90 rounded-lg text-3xs font-extrabold transition">🧪 Cristalería</button>
                                    <button type="button" onclick="selectCategoryChip('📦 Lote / Kit', this)" class="category-chip-btn px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/90 rounded-lg text-3xs font-extrabold transition">📦 Lote / Kit</button>
                                    <button type="button" onclick="selectCategoryChip('🧰 Herramientas', this)" class="category-chip-btn px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-3xs font-extrabold transition">🧰 Herramientas</button>
                                    <button type="button" onclick="selectCategoryChip('⚖️ Balanza / Medición', this)" class="category-chip-btn px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-3xs font-extrabold transition">⚖️ Medición</button>
                                    <button type="button" onclick="selectCategoryChip('🔥 Calentamiento / Termo', this)" class="category-chip-btn px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-3xs font-extrabold transition">🔥 Calentamiento</button>
                                    <button type="button" onclick="selectCategoryChip('🛡️ Seguridad / EPP', this)" class="category-chip-btn px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-3xs font-extrabold transition">🛡️ Seguridad</button>
                                    <button type="button" onclick="selectCategoryChip('🧬 Modelo / Didáctico', this)" class="category-chip-btn px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-lg text-3xs font-extrabold transition">🧬 Didáctico</button>
                                    <button type="button" onclick="selectCategoryChip('🧴 Consumibles / Reactivos', this)" class="category-chip-btn px-2.5 py-1 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200 rounded-lg text-3xs font-extrabold transition">🧴 Consumibles</button>
                                </div>
                                <input type="text" id="form-category" value="${data.category || data.subject || ''}" placeholder="Ej. Cristalería, Lote / Kit, Equipo" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-4 py-2 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cantidad de Lotes / Stock *</label>
                                <input type="number" id="form-quantity" value="${data.quantity !== undefined && data.quantity !== null ? data.quantity : (data.stock !== undefined && data.stock !== null ? data.stock : 1)}" required min="1" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold">
                            </div>
                        </div>
                    </div>

                    <!-- SECCIÓN B: DETALLES TÉCNICOS CONDICIONALES (TOGGLE SWITCH TEAL) -->
                    <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span class="text-xs font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                                <i data-lucide="sliders" class="w-4 h-4 text-teal-600"></i>
                                <span>SECCIÓN B: Detalles Técnicos Condicionales</span>
                            </span>

                            <!-- TOGGLE SWITCH TEAL -->
                            <label class="inline-flex items-center cursor-pointer select-none gap-2">
                                <span class="text-xs font-extrabold text-slate-600">¿Utilizar datos técnicos?</span>
                                <input type="checkbox" id="toggle-tech-details" onchange="toggleTechnicalDetailsSection(this.checked)" class="sr-only peer" ${data.capacity ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 relative"></div>
                            </label>
                        </div>

                        <div id="section-b-technical-details" class="${data.capacity ? '' : 'hidden'} space-y-4 animate-fade-in">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Capacidad</label>
                                    <div class="flex items-center gap-2">
                                        <input type="text" id="tech-capacity-val" placeholder="ej. 250" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold">
                                        <select id="tech-capacity-unit" onchange="syncTechCapacityField()" class="bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs rounded-xl px-3 py-2 outline-none cursor-pointer shrink-0">
                                            <option value="mL">mL</option>
                                            <option value="L">L</option>
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="piezas">piezas</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Volumen</label>
                                    <div class="flex items-center gap-2">
                                        <input type="text" id="tech-volume-val" placeholder="ej. 500" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold">
                                        <select id="tech-volume-unit" onchange="syncTechCapacityField()" class="bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs rounded-xl px-3 py-2 outline-none cursor-pointer shrink-0">
                                            <option value="mL">mL</option>
                                            <option value="L">L</option>
                                            <option value="cm³">cm³</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Especificación Técnica</label>
                                <input type="text" id="form-capacity" value="${data.capacity || ''}" placeholder="ej. 250 mL / Vidrio Borosilicato 3.3 / Lente Acromático" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-4 py-2 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold">
                            </div>
                        </div>
                    </div>

                    <!-- SECCIÓN C: CONTENIDO DEL LOTE / OBJETOS INDIVIDUALES (KITS) -->
                    <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div>
                                <span class="text-xs font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <i data-lucide="layers" class="w-4 h-4 text-teal-600"></i>
                                    <span>SECCIÓN C: Contenido del Lote (Objetos Individuales)</span>
                                </span>
                                <span class="text-3xs text-slate-500 block">Sub-objetos incluidos dentro de esta caja o kit</span>
                            </div>

                            <button type="button" onclick="addKitSubItem()" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-extrabold text-xs rounded-xl transition shadow-2xs flex items-center gap-1">
                                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                <span>➕ Añadir Objeto Individual</span>
                            </button>
                        </div>

                        <!-- LISTA DINÁMICA DE OBJETOS DEL KIT -->
                        <div id="kit-subitems-container" class="space-y-2.5 max-h-56 overflow-y-auto pr-1"></div>
                    </div>

                    <!-- SECCIÓN D: CONTROL Y UBICACIÓN -->
                    <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span class="text-xs font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                                <i data-lucide="map-pin" class="w-4 h-4 text-teal-600"></i>
                                <span>SECCIÓN D: Control y Ubicación Física</span>
                            </span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ubicación Física</label>
                                <div class="flex flex-wrap gap-1.5 mb-2">
                                    <button type="button" onclick="document.getElementById('form-location').value='Estante A-1'" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-3xs font-semibold">Estante A-1</button>
                                    <button type="button" onclick="document.getElementById('form-location').value='Estante B-2'" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-3xs font-semibold">Estante B-2</button>
                                    <button type="button" onclick="document.getElementById('form-location').value='Mesa Central'" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-3xs font-semibold">Mesa Central</button>
                                    <button type="button" onclick="document.getElementById('form-location').value='Laboratorio de Química'" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-3xs font-semibold">Lab. Química</button>
                                </div>
                                <input type="text" id="form-location" value="${data.location || ''}" placeholder="Ej. Estante B-4 / LABORATORIO DE CIENCIAS BÁSICAS" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-4 py-2 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold">
                            </div>

                            <div>
                                <label class="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">ID Original Excel (DEPTO CB)</label>
                                <input type="text" id="form-original-id" value="${data.original_id || ''}" placeholder="Ej. 154" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold font-mono">
                            </div>
                            <div>
                                <label class="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">No. Inventario</label>
                                <input type="text" id="form-inventory-number" value="${data.inventory_number || ''}" placeholder="Ej. 115130001I51101000941309EUKVJ" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold font-mono">
                            </div>
                            <div>
                                <label class="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">No. Serie</label>
                                <input type="text" id="form-serial-number" value="${data.serial_number || ''}" placeholder="Ej. 1P1822369599" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold font-mono">
                            </div>
                            <div>
                                <label class="block text-3xs font-bold text-emerald-800 uppercase tracking-wider mb-1">No. SEP (Etiqueta Oficial)</label>
                                <input type="text" id="form-no-sep" value="${data.no_sep || ''}" placeholder="Ej. 12900397" class="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl px-3.5 py-2 text-xs text-emerald-900 focus:bg-white focus:border-emerald-500 outline-none transition font-semibold font-mono">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Estado / Condición Físico</label>
                                <select id="form-status" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-4 py-2 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold cursor-pointer">
                                    <option value="Buenas Condiciones" ${data.status === 'Buenas Condiciones' || data.status === 'Bueno' ? 'selected' : ''}>Buenas Condiciones</option>
                                    <option value="Nuevo" ${data.status === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                                    <option value="Excelente" ${data.status === 'Excelente' ? 'selected' : ''}>Excelente</option>
                                    <option value="Bueno" ${data.status === 'Bueno' ? 'selected' : ''}>Bueno</option>
                                    <option value="Regular" ${data.status === 'Regular' ? 'selected' : ''}>Regular</option>
                                    <option value="Dañado" ${data.status === 'Dañado' ? 'selected' : ''}>⚠️ Dañado (Requiere Reparación)</option>
                                    <option value="Roto / Incompleto" ${data.status === 'Roto' || data.status === 'Roto / Incompleto' || data.status === 'Incompleto' ? 'selected' : ''}>🚫 Roto / Incompleto</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Responsable Custodia</label>
                                <input type="text" id="form-responsible" value="${data.responsible || getActiveUser()}" class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-4 py-2 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold">
                            </div>

                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Observaciones Adicionales</label>
                                <textarea id="form-observations" rows="2" placeholder="Detalles de ID original u observaciones de entrega..." class="w-full bg-slate-50/70 border border-slate-300/80 rounded-xl px-4 py-2 text-sm text-slate-800 focus:bg-white focus:border-teal-500 outline-none transition font-semibold">${data.observations || data.notes || ''}</textarea>
                            </div>
                        </div>
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

    if (currentModalType === 'chemical_materials' || currentModalType === 'chemical-materials') {
        const subContainer = document.getElementById('kit-subitems-container');
        if (subContainer && subContainer.children.length === 0) {
            let initialContents = [];
            if (window._currentModalData && window._currentModalData.contents) {
                try {
                    initialContents = typeof window._currentModalData.contents === 'string'
                        ? JSON.parse(window._currentModalData.contents)
                        : window._currentModalData.contents;
                } catch(e) {
                    initialContents = [];
                }
            }
            if (Array.isArray(initialContents) && initialContents.length > 0) {
                initialContents.forEach(it => {
                    addKitSubItem(it.name || '', it.quantity || 1, it.image_path || '');
                });
            } else {
                addKitSubItem('Tubos de Ensayo', 5, '');
                addKitSubItem('Vaso de Precipitados', 2, '');
            }
        }
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

        const unitEl = document.getElementById('form-unit');
        if (unitEl && unitEl.value) {
            payload.unit = unitEl.value.trim();
        }
        const stockUnitsEl = document.getElementById('form-stock-units');
        if (stockUnitsEl) {
            payload.stock_units = parseInt(stockUnitsEl.value, 10) || 1;
        }
    } else if (currentModalType === 'chemical_materials' || currentModalType === 'chemical-materials') {
        const subItems = [];
        document.querySelectorAll('.kit-subitem-row').forEach(row => {
            const nameInput = row.querySelector('.subitem-name');
            const qtyInput = row.querySelector('.subitem-qty');
            const imgInput = row.querySelector('.subitem-image-path');
            const name = nameInput ? nameInput.value.trim() : '';
            const quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
            const image_path = imgInput ? imgInput.value : '';
            if (name) {
                subItems.push({ name, quantity, image_path });
            }
        });
        if (subItems.length > 0) {
            payload.contents = JSON.stringify(subItems);
        }
    } else if (currentModalType === 'didactic_materials' || currentModalType === 'didactic-materials') {
        if (payload.quantity) {
            payload.quantity = parseInt(payload.quantity, 10) || 1;
        } else {
            payload.quantity = 1;
        }
        if (payload.category) {
            payload.subject = payload.category;
        }
    }

    const isRequestEdit = (state.editingRequestId !== undefined && state.editingRequestId !== null);
    let url, method;

    if (isRequestEdit) {
        url = `/api/change-requests/${state.editingRequestId}`;
        method = 'PUT';
    } else {
        const isEdit = currentEditId !== null;
        const apiPath = getApiPathForType(currentModalType);
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

    pendingDelete = { type, id, label, apiPath: getApiPathForType(type) };

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

window.selectCategoryChip = function(val, btnEl) {
    const input = document.getElementById('form-category');
    if (input) {
        input.value = val;
    }
    if (btnEl && btnEl.parentElement) {
        btnEl.parentElement.querySelectorAll('.category-chip-btn').forEach(b => {
            b.classList.remove('ring-2', 'ring-teal-500', 'bg-teal-100', 'text-teal-900', 'font-black');
            b.classList.add('bg-slate-50', 'text-slate-700');
        });
        btnEl.classList.remove('bg-slate-50', 'text-slate-700');
        btnEl.classList.add('ring-2', 'ring-teal-500', 'bg-teal-100', 'text-teal-900', 'font-black');
    }
};

window.addKitSubItem = function(initialName = '', initialQty = 1, initialImg = '') {
    const container = document.getElementById('kit-subitems-container');
    if (!container) return;
    const itemId = 'subitem_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const itemEl = document.createElement('div');
    itemEl.id = itemId;
    itemEl.className = 'kit-subitem-row flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/90 p-3 rounded-2xl shadow-2xs transition';
    itemEl.innerHTML = `
        <div class="flex items-center gap-3 flex-1">
            <!-- FOTO DEL SUB-OBJETO -->
            <div class="relative w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden group">
                <img id="img-preview-${itemId}" src="${initialImg || ''}" class="${initialImg ? '' : 'hidden'} w-full h-full object-cover">
                <div id="placeholder-${itemId}" class="${initialImg ? 'hidden' : ''} flex flex-col items-center justify-center text-slate-400 cursor-pointer" onclick="document.getElementById('file-${itemId}').click()">
                    <i data-lucide="camera" class="w-4 h-4 text-teal-600"></i>
                    <span class="text-[9px] font-bold text-slate-500">Foto</span>
                </div>
                <input type="file" id="file-${itemId}" accept="image/*" class="hidden" onchange="uploadSubItemPhoto('${itemId}', this)">
                <input type="hidden" class="subitem-image-path" value="${initialImg || ''}">
                <button type="button" onclick="document.getElementById('file-${itemId}').click()" class="absolute inset-0 bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs font-bold" title="Cambiar Foto">
                    📷
                </button>
            </div>

            <!-- NOMBRE DEL SUB-OBJETO -->
            <input type="text" class="subitem-name bg-white border border-slate-300 text-slate-800 font-semibold text-xs rounded-xl px-3.5 py-2 w-full outline-none focus:border-teal-500 shadow-2xs" placeholder="Nombre del sub-objeto (ej. Tubo de Ensayo, Lente, Pinzas)" value="${initialName}">
        </div>

        <!-- CANTIDAD DE UNIDADES Y BOTÓN ELIMINAR -->
        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <div class="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <button type="button" onclick="changeKitSubItemQty('${itemId}', -1)" class="px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-extrabold text-xs transition">-</button>
                <input type="number" class="subitem-qty w-12 text-center bg-transparent text-slate-800 font-extrabold text-xs outline-none" value="${initialQty}" min="1">
                <button type="button" onclick="changeKitSubItemQty('${itemId}', 1)" class="px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-extrabold text-xs transition">+</button>
            </div>
            <button type="button" onclick="document.getElementById('${itemId}').remove()" class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-200" title="Eliminar Objeto">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>
    `;
    container.appendChild(itemEl);
    if (window.lucide) window.lucide.createIcons();
};

window.uploadSubItemPhoto = async function(itemId, inputEl) {
    if (inputEl.files && inputEl.files[0]) {
        const file = inputEl.files[0];
        const formData = new FormData();
        formData.append('photo', file);

        try {
            const res = await fetch('/api/upload-photo', {
                method: 'POST',
                body: formData
            }).then(r => r.json());

            if (res.status === 'success') {
                const imgEl = document.getElementById(`img-preview-${itemId}`);
                const placeholderEl = document.getElementById(`placeholder-${itemId}`);
                const hiddenInput = inputEl.parentElement.querySelector('.subitem-image-path');
                
                if (imgEl && placeholderEl && hiddenInput) {
                    imgEl.src = res.image_path;
                    imgEl.classList.remove('hidden');
                    placeholderEl.classList.add('hidden');
                    hiddenInput.value = res.image_path;
                }
            } else {
                alert(`Error al subir foto: ${res.message}`);
            }
        } catch (err) {
            alert(`Error en carga de foto: ${err.message}`);
        }
    }
};

window.changeKitSubItemQty = function(itemId, delta) {
    const el = document.querySelector(`#${itemId} .subitem-qty`);
    if (el) {
        let val = parseInt(el.value, 10) || 1;
        val = Math.max(1, val + delta);
        el.value = val;
    }
};

window.toggleTechnicalDetailsSection = function(enabled) {
    const secB = document.getElementById('section-b-technical-details');
    if (!secB) return;
    if (enabled) {
        secB.classList.remove('hidden');
    } else {
        secB.classList.add('hidden');
    }
};

window.syncTechCapacityField = function() {
    const capVal = document.getElementById('tech-capacity-val')?.value || '';
    const capUnit = document.getElementById('tech-capacity-unit')?.value || '';
    const capInput = document.getElementById('form-capacity');
    if (capInput && capVal) {
        capInput.value = `${capVal} ${capUnit}`.trim();
    }
};
