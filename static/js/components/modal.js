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

function openAddModal(type) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para registrar nuevos elementos.");
        openAuthModal();
        return;
    }
    currentModalType = type;
    currentEditId = null;

    const modal = document.getElementById('item-modal');
    const content = document.getElementById('item-modal-content');
    const formContainer = document.getElementById('modal-form-container');
    const title = document.getElementById('modal-title');

    title.textContent = `Registrar ${type === 'substances' ? 'Reactivo o Sustancia' : (type === 'chemical_materials' ? 'Material Químico' : 'Material Didáctico')}`;

    formContainer.innerHTML = buildFormHtml(type, {});

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
        <div class="w-full aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 text-slate-400">
            <i data-lucide="image" class="w-8 h-8"></i>
            <span class="text-xs text-center font-semibold">Sube o toma una foto</span>
            <input type="hidden" id="form-image-path" value="">
        </div>
    `;

    if (type === 'substances') {
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
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre de la sustancia *</label>
                        <input type="text" id="form-name" value="${data.name || ''}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Grupo Químico</label>
                        <select id="form-substance-group" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                            <option value="" ${!data.substance_group ? 'selected' : ''}>-- Seleccionar Grupo --</option>
                            <option value="Inflamables" ${data.substance_group === 'Inflamables' ? 'selected' : ''}>Inflamables</option>
                            <option value="Tóxicos" ${data.substance_group === 'Tóxicos' ? 'selected' : ''}>Tóxicos</option>
                            <option value="Corrosivos" ${data.substance_group === 'Corrosivos' ? 'selected' : ''}>Corrosivos</option>
                            <option value="Explosivos" ${data.substance_group === 'Explosivos' ? 'selected' : ''}>Explosivos</option>
                            <option value="Comburentes" ${data.substance_group === 'Comburentes' ? 'selected' : ''}>Comburentes</option>
                            <option value="Irritantes" ${data.substance_group === 'Irritantes' ? 'selected' : ''}>Irritantes</option>
                            <option value="Otros" ${data.substance_group === 'Otros' ? 'selected' : ''}>Otros</option>
                        </select>
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
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Unidad de Medida *</label>
                        <input type="text" id="form-unit" value="${data.unit || 'g'}" required placeholder="Ej. g, ml, frascos" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Stock Unidades (Envases)</label>
                        <input type="number" id="form-stock-units" value="${data.stock_units || '1'}" min="1" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contenido por Envase (ej. 500 ml)</label>
                        <input type="text" id="form-container-content" value="${data.container_content || ''}" placeholder="Ej. 500 ml, 1 kg" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ubicación Física</label>
                        <input type="text" id="form-location" value="${data.location || ''}" placeholder="Ej. Estante 1, Fila B" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Entrada</label>
                        <input type="date" id="form-entry-date" value="${data.entry_date || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Caducidad</label>
                        <input type="date" id="form-expiration-date" value="${data.expiration_date || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
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

function bindFormEvents() {
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
        <div class="w-full aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 text-slate-400">
            <i data-lucide="image" class="w-8 h-8"></i>
            <span class="text-xs text-center font-semibold">Sube o toma una foto</span>
            <input type="hidden" id="form-image-path" value="">
        </div>
    `;
}

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
    const container = document.getElementById('form-photo-container');
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
        if (el.id && el.id.startsWith('form-') && el.id !== 'form-photo-file' && el.id !== 'form-image-path' && el.id !== 'form-qr-content') {
            const key = el.id.replace('form-', '').replace(/-/g, '_');
            payload[key] = el.value;
        }
    });

    const isEdit = currentEditId !== null;
    const apiPath = currentModalType === 'chemical_materials' ? 'chemical-materials' : (currentModalType === 'didactic_materials' ? 'didactic-materials' : 'substances');
    const url = isEdit ? `/api/${apiPath}/${currentEditId}` : `/api/${apiPath}`;
    const method = isEdit ? 'PUT' : 'POST';

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
            router();
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
