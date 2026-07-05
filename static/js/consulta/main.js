const SECTIONS = [
    { id: 'ghs', label: 'Pictogramas GHS', icon: 'triangle-alert', render: ghsSection },
    { id: 'nfpa', label: 'Diamante NFPA', icon: 'diamond', render: nfpaSection },
    { id: 'materiales', label: 'Material de laboratorio', icon: 'flask-conical', render: labMaterialsSection },
    { id: 'ppe', label: 'Equipo de proteccion', icon: 'shield', render: ppeSection },
    { id: 'compatibilidad', label: 'Compatibilidad quimica', icon: 'x-circle', render: compatibilitySection },
    { id: 'primeros', label: 'Primeros auxilios', icon: 'heart-pulse', render: firstAidSection },
    { id: 'senales', label: 'Senales de seguridad', icon: 'signpost', render: safetySignsSection },
    { id: 'glosario', label: 'Glosario', icon: 'book-open-text', render: glossarySection }
];

let activeConsultaSectionId = 'ghs';
let currentConsultaItems = [];
let currentConsultaEditId = null;

async function activateSection(sectionId) {
    activeConsultaSectionId = sectionId;
    
    // Cambiar estilos de las pestañas
    document.querySelectorAll('.consulta-tab').forEach(t => {
        t.classList.remove('bg-brand-500', 'text-white', 'shadow-md');
        t.classList.add('text-slate-600', 'hover:bg-slate-100');
    });
    
    const tab = document.getElementById(`consulta-tab-${sectionId}`);
    if (tab) {
        tab.classList.remove('text-slate-600', 'hover:bg-slate-100');
        tab.classList.add('bg-brand-500', 'text-white', 'shadow-md');
    }
    
    // Ocultar todos los contenedores y mostrar el activo
    document.querySelectorAll('.consulta-content').forEach(c => {
        c.classList.add('hidden');
        c.innerHTML = '';
    });
    
    const content = document.getElementById(`consulta-content-${sectionId}`);
    if (content) {
        content.classList.remove('hidden');
        // Mostrar spinner de carga
        content.innerHTML = `
            <div class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
            </div>
        `;
        
        try {
            // Cargar datos en tiempo real de la sección
            const res = await fetch(`/api/consulta/${sectionId}`).then(r => r.json());
            if (res.status === 'success') {
                currentConsultaItems = res.data;
                const sec = SECTIONS.find(s => s.id === sectionId);
                if (sec) {
                    content.innerHTML = sec.render(res.data);
                    
                    // Ocultar botones de borrar si el usuario no es admin
                    if (state.userRole !== 'admin') {
                        content.querySelectorAll('[onclick^="deleteConsultaItem"]').forEach(el => el.remove());
                    }
                }
            } else {
                content.innerHTML = `<div class="p-6 text-center text-red-500 font-bold">Error: ${res.message}</div>`;
            }
        } catch (err) {
            content.innerHTML = `<div class="p-6 text-center text-red-500 font-bold">Error de conexión: ${err.message}</div>`;
        }
        
        if (window.lucide) window.lucide.createIcons();
    }
}
window.activateSection = activateSection;

function selectNfpaLevel(quad, level, btn) {
    const data = window.CURRENT_NFPA_DATA ? window.CURRENT_NFPA_DATA.find(d => d.quad === quad) : null;
    if (!data) return;
    
    document.querySelectorAll(`[id^="nfpa-btn-${quad}-"]`).forEach(b => {
        b.classList.remove('bg-brand-500', 'text-white', 'border-brand-500');
        b.classList.add('bg-white', 'text-slate-600', 'border-slate-200', 'hover:border-brand-300');
    });
    
    if (btn) {
        btn.classList.remove('bg-white', 'text-slate-600', 'border-slate-200', 'hover:border-brand-300');
        btn.classList.add('bg-brand-500', 'text-white', 'border-brand-500');
    }
    
    const valEl = document.getElementById(`nfpa-val-${quad}`);
    if (valEl) valEl.textContent = level;
    
    const descEl = document.getElementById(`nfpa-desc-${quad}`);
    if (descEl) {
        const lvl = data.levels.find(l => String(l.level) === String(level));
        if (lvl) descEl.textContent = `Nivel ${level}: ${lvl.desc}`;
    }
}
window.selectNfpaLevel = selectNfpaLevel;

function showNfpaLevel(quad, level) {
    const btn = document.querySelector(`#nfpa-btn-${quad}-${level}`);
    if (btn) selectNfpaLevel(quad, level, btn);
}
window.showNfpaLevel = showNfpaLevel;

function selectGlossaryTerm(term) {
    const entry = window.CURRENT_GLOSSARY ? window.CURRENT_GLOSSARY.find(g => g.term === term) : null;
    if (!entry) return;
    
    document.querySelectorAll('.glossary-term').forEach(b => {
        b.classList.remove('bg-brand-500', 'text-white');
        b.classList.add('text-slate-600', 'hover:bg-slate-100');
    });
    
    const btn = document.querySelector(`.glossary-term[data-term="${term}"]`);
    if (btn) {
        btn.classList.remove('text-slate-600', 'hover:bg-slate-100');
        btn.classList.add('bg-brand-500', 'text-white');
    }
    
    const detail = document.getElementById('glossary-detail');
    if (detail) {
        const editBtn = state.isLoggedIn && entry.id ? `
            <div class="absolute top-4 right-4 flex gap-1 z-10 bg-white/80 p-0.5 rounded-xl border border-slate-100">
                <button onclick="openConsultaEditModal('glosario', ${entry.id})" class="p-1 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition" title="Editar">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button onclick="deleteConsultaItem('glosario', ${entry.id})" class="p-1 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition" title="Eliminar">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        ` : '';

        const imgHtml = entry.image_path ? `
            <div class="mt-4 max-w-sm rounded-xl overflow-hidden border border-slate-100 bg-slate-50 p-2">
                <img src="${entry.image_path}" class="w-full h-auto object-cover rounded-lg">
            </div>
        ` : '';

        detail.innerHTML = `
            <div class="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-100 p-6 relative min-h-[180px]">
                ${editBtn}
                <h3 class="text-xl font-bold text-slate-800 mb-2">${entry.term}</h3>
                <p class="text-sm text-slate-600 leading-relaxed">${entry.def}</p>
                ${imgHtml}
            </div>`;
            
        // Ocultar botones de borrar en glosario si el usuario no es admin
        if (state.userRole !== 'admin') {
            detail.querySelectorAll('[onclick^="deleteConsultaItem"]').forEach(el => el.remove());
        }
            
        if (window.lucide) window.lucide.createIcons();
    }
}
window.selectGlossaryTerm = selectGlossaryTerm;

function filterGlossary() {
    const q = (document.getElementById('glossary-search').value || '').toLowerCase();
    const termsContainer = document.getElementById('glossary-terms');
    const sorted = window.CURRENT_GLOSSARY || [];
    const filtered = q ? sorted.filter(g => g.term.toLowerCase().includes(q)) : sorted;
    
    termsContainer.innerHTML = filtered.map(g => `
        <button class="glossary-term w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100"
                data-term="${g.term}"
                onclick="selectGlossaryTerm('${g.term}')">
            ${g.term}
        </button>
    `).join('');
    
    if (filtered.length > 0) {
        selectGlossaryTerm(filtered[0].term);
    } else {
        const detail = document.getElementById('glossary-detail');
        if (detail) {
            detail.innerHTML = `
                <div class="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-100 p-6 text-center text-slate-400">
                    <p>Ningun termino coincide con la busqueda.</p>
                </div>`;
        }
    }
}
window.filterGlossary = filterGlossary;

// === GESTIÓN DE MODALES PARA EL CENTRO DE CONSULTA ===

function closeConsultaModal() {
    const modal = document.getElementById('consulta-modal');
    const content = document.getElementById('consulta-modal-content');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        stopWebcam();
    }, 200);
}
window.closeConsultaModal = closeConsultaModal;

function openConsultaAddModal(sectionId) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para modificar el Centro de Consulta.");
        openAuthModal();
        return;
    }
    
    currentConsultaEditId = null;
    
    const modal = document.getElementById('consulta-modal');
    const content = document.getElementById('consulta-modal-content');
    const formContainer = document.getElementById('consulta-modal-form-container');
    const title = document.getElementById('consulta-modal-title');
    
    const sectionLabels = {
        ghs: 'Nuevo Pictograma GHS',
        materiales: 'Nuevo Material de Laboratorio',
        ppe: 'Nuevo Equipo de Protección (EPP)',
        senales: 'Nueva Señal de Seguridad',
        primeros: 'Nuevo Registro de Primeros Auxilios',
        glosario: 'Nuevo Concepto del Glosario',
        compatibilidad: 'Nueva Regla de Compatibilidad Química'
    };
    
    title.textContent = sectionLabels[sectionId] || 'Agregar Registro';
    formContainer.innerHTML = buildConsultaFormHtml(sectionId, {});
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);
    
    if (window.lucide) window.lucide.createIcons();
    bindConsultaFormEvents(sectionId);
}
window.openConsultaAddModal = openConsultaAddModal;

function openConsultaEditModal(sectionId, itemId) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para modificar el Centro de Consulta.");
        openAuthModal();
        return;
    }
    
    currentConsultaEditId = itemId;
    
    const modal = document.getElementById('consulta-modal');
    const content = document.getElementById('consulta-modal-content');
    const formContainer = document.getElementById('consulta-modal-form-container');
    const title = document.getElementById('consulta-modal-title');
    
    const sectionLabels = {
        ghs: 'Editar Pictograma GHS',
        materiales: 'Editar Material de Laboratorio',
        ppe: 'Editar Equipo de Protección (EPP)',
        senales: 'Editar Señal de Seguridad',
        primeros: 'Editar Registro de Primeros Auxilios',
        glosario: 'Editar Concepto del Glosario',
        compatibilidad: 'Editar Regla de Compatibilidad Química',
        nfpa: 'Editar Nivel NFPA'
    };
    
    title.textContent = sectionLabels[sectionId] || 'Editar Registro';
    
    // Obtener el elemento correspondiente de la lista cargada
    let item = null;
    if (sectionId === 'nfpa') {
        const [quad, level] = itemId.split(':');
        const quadGroup = window.CURRENT_NFPA_DATA.find(q => q.quad === quad);
        if (quadGroup) {
            const lvlObj = quadGroup.levels.find(l => String(l.level) === String(level));
            if (lvlObj) {
                item = { quad, level, label: lvlObj.label, desc: lvlObj.desc };
            }
        }
    } else {
        item = currentConsultaItems.find(x => String(x.id) === String(itemId));
    }
    
    if (!item) {
        alert("No se encontró el elemento a editar.");
        return;
    }
    
    formContainer.innerHTML = buildConsultaFormHtml(sectionId, item);
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);
    
    if (window.lucide) window.lucide.createIcons();
    bindConsultaFormEvents(sectionId);
}
window.openConsultaEditModal = openConsultaEditModal;

function removeConsultaFormPhoto() {
    const container = document.getElementById('consulta-form-photo-container');
    if (container) {
        container.innerHTML = `
            <div class="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 text-slate-400">
                <i data-lucide="image" class="w-8 h-8"></i>
                <span class="text-xs text-center font-semibold">Sube o toma una foto de referencia</span>
                <input type="hidden" id="consulta-form-image-path" value="">
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }
}
window.removeConsultaFormPhoto = removeConsultaFormPhoto;

function bindConsultaFormEvents(sectionId) {
    const fileInput = document.getElementById('consulta-form-photo-file');
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
    
    const saveBtn = document.getElementById('btn-save-consulta-modal');
    saveBtn.onclick = () => saveConsultaItem(sectionId);
}

async function saveConsultaItem(sectionId) {
    const form = document.getElementById('consulta-modal-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const payload = {};
    const imgEl = document.getElementById('consulta-form-image-path');
    if (imgEl) payload.image_path = imgEl.value;
    
    // Obtener campos dinámicamente
    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id && el.id.startsWith('c-') && el.id !== 'consulta-form-photo-file') {
            const key = el.id.substring(2); // quitar el prefijo 'c-'
            
            // Si el campo es multilínea y requiere ser un array (como examples, recommendations, steps)
            if (['examples', 'recommendations', 'steps'].includes(key)) {
                payload[key] = el.value.split('\n').map(x => x.trim()).filter(x => x !== '');
            } else {
                payload[key] = el.value.trim();
            }
        }
    });
    
    const isEdit = currentConsultaEditId !== null;
    const url = isEdit ? `/api/consulta/${sectionId}/${currentConsultaEditId}` : `/api/consulta/${sectionId}`;
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(r => r.json());
        
        if (res.status === 'success') {
            closeConsultaModal();
            activateSection(sectionId);
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error de red: " + err.message);
    }
}

async function deleteConsultaItem(sectionId, itemId) {
    const confirmDel = confirm("¿Está seguro de eliminar permanentemente este elemento de la consulta?");
    if (!confirmDel) return;
    
    try {
        const res = await fetch(`/api/consulta/${sectionId}/${itemId}`, {
            method: 'DELETE'
        }).then(r => r.json());
        
        if (res.status === 'success') {
            activateSection(sectionId);
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}
window.deleteConsultaItem = deleteConsultaItem;

// RENDERIZADO INICIAL DEL CONTENEDOR DE LA VISTA
async function renderConsultaView(container) {
    container.innerHTML = `
        <div class="mt-6">
            <div class="flex flex-wrap gap-2">
                ${SECTIONS.map(s => `
                    <button id="consulta-tab-${s.id}" class="consulta-tab flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${s.id === activeConsultaSectionId ? 'bg-brand-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}"
                            onclick="activateSection('${s.id}')">
                        <i data-lucide="${s.icon}" class="w-4 h-4"></i>
                        <span>${s.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="mt-6">
            ${SECTIONS.map(s => `
                <div id="consulta-content-${s.id}" class="consulta-content ${s.id === activeConsultaSectionId ? '' : 'hidden'}">
                    <!-- Se llena dinámicamente al activar la pestaña -->
                </div>
            `).join('')}
        </div>
    `;

    // Activar pestaña actual para gatillar el fetch y render
    activateSection(activeConsultaSectionId);
}

function buildConsultaFormHtml(sectionId, data = {}) {
    const photoPath = data.image_path || '';
    const photoPreview = photoPath ? `
        <div class="relative w-full aspect-video rounded-2xl overflow-hidden border">
            <img src="${photoPath}" class="w-full h-full object-cover">
            <input type="hidden" id="consulta-form-image-path" value="${photoPath}">
            <button type="button" onclick="removeConsultaFormPhoto()" class="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1.5 hover:bg-red-700 transition">
                <i data-lucide="trash" class="w-4 h-4"></i>
            </button>
        </div>
    ` : `
        <div class="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 text-slate-400">
            <i data-lucide="image" class="w-8 h-8"></i>
            <span class="text-xs text-center font-semibold">Sube o toma una foto de referencia</span>
            <input type="hidden" id="consulta-form-image-path" value="">
        </div>
    `;

    const hasImage = ['ghs', 'materiales', 'ppe', 'senales', 'primeros', 'glosario'].includes(sectionId);
    const photoControls = hasImage ? `
        <div class="space-y-3">
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Imagen de Referencia</label>
            <div id="consulta-form-photo-container">${photoPreview}</div>
            <div class="flex gap-2">
                <button type="button" onclick="startWebcamCapture()" class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-white">
                    <i data-lucide="camera" class="w-4 h-4 text-slate-500"></i>
                    <span>Cámara</span>
                </button>
                <label class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center bg-white">
                    <i data-lucide="upload" class="w-4 h-4 text-slate-500"></i>
                    <span>Subir Archivo</span>
                    <input type="file" id="consulta-form-photo-file" accept="image/*" class="hidden">
                </label>
            </div>
        </div>
    ` : '';

    let fieldsHtml = '';

    if (sectionId === 'ghs') {
        const isEdit = data.id !== undefined;
        fieldsHtml = `
            ${isEdit ? '' : `
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">ID del Pictograma (clave única) *</label>
                <input type="text" id="c-id" value="${data.id || ''}" required placeholder="Ej: toxic, corrosive, flammable" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            `}
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Título del Peligro *</label>
                <input type="text" id="c-title" value="${data.title || ''}" required placeholder="Ej: Toxicidad aguda" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Significado / Descripción *</label>
                <textarea id="c-meaning" rows="2" required placeholder="Describe el tipo de riesgo del pictograma..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.meaning || ''}</textarea>
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ejemplos de sustancias (Uno por línea) *</label>
                <textarea id="c-examples" rows="2" required placeholder="Ej: Metanol&#10;Ácido sulfúrico" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${(data.examples || []).join('\n')}</textarea>
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recomendaciones de seguridad (Una por línea) *</label>
                <textarea id="c-recommendations" rows="2" required placeholder="Ej: Usar guantes de nitrilo&#10;Trabajar bajo campana" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${(data.recommendations || []).join('\n')}</textarea>
            </div>
        `;
    }
    else if (sectionId === 'materiales') {
        fieldsHtml = `
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Instrumento *</label>
                <input type="text" id="c-name" value="${data.name || ''}" required placeholder="Ej: Vaso de precipitados" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción y Usos *</label>
                <textarea id="c-desc" rows="3" required placeholder="Describe el material de laboratorio, usos y limitaciones..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.desc || ''}</textarea>
            </div>
        `;
    }
    else if (sectionId === 'ppe') {
        fieldsHtml = `
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del EPP / Equipo *</label>
                <input type="text" id="c-title" value="${data.title || ''}" required placeholder="Ej: Guantes de nitrilo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Propósito y Protección *</label>
                <input type="text" id="c-purpose" value="${data.purpose || ''}" required placeholder="Ej: Protege contra salpicaduras..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">¿Cuándo usarlo? *</label>
                <input type="text" id="c-when_use" value="${data.when_use || ''}" required placeholder="Ej: Siempre que exista contacto directo..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Limitaciones del EPP *</label>
                <input type="text" id="c-limits" value="${data.limits || ''}" required placeholder="Ej: No protege frente a todos los solventes..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
        `;
    }
    else if (sectionId === 'senales') {
        fieldsHtml = `
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Etiqueta de la Señal *</label>
                <input type="text" id="c-label" value="${data.label || ''}" required placeholder="Ej: Prohibido fumar" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción de la Señal *</label>
                <input type="text" id="c-desc" value="${data.desc || ''}" required placeholder="Ej: No introducir llamas abiertas..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
        `;
    }
    else if (sectionId === 'primeros') {
        fieldsHtml = `
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Situación de Emergencia / Título *</label>
                <input type="text" id="c-title" value="${data.title || ''}" required placeholder="Ej: Contacto con la piel" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pasos de Primeros Auxilios (Uno por línea) *</label>
                <textarea id="c-steps" rows="4" required placeholder="Ej: Retirar inmediatamente la ropa contaminada&#10;Lavar con abundante agua durante 15 minutos" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${(data.steps || []).join('\n')}</textarea>
            </div>
        `;
    }
    else if (sectionId === 'glosario') {
        fieldsHtml = `
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Término / Concepto *</label>
                <input type="text" id="c-term" value="${data.term || ''}" required placeholder="Ej: Molaridad" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Definición del Término *</label>
                <textarea id="c-def" rows="3" required placeholder="Escribe la definición del concepto..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.def || ''}</textarea>
            </div>
        `;
    }
    else if (sectionId === 'compatibilidad') {
        fieldsHtml = `
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Grupo Químico 1 *</label>
                <input type="text" id="c-group1" value="${data.group1 || ''}" required placeholder="Ej: Ácidos" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Grupo Químico 2 (Incompatible) *</label>
                <input type="text" id="c-group2" value="${data.group2 || ''}" required placeholder="Ej: Bases" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Riesgo / Reacción Química *</label>
                <input type="text" id="c-risk" value="${data.risk || ''}" required placeholder="Ej: Reacción violenta con liberación de calor" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Severidad del Riesgo *</label>
                <select id="c-severity" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    <option value="media" ${data.severity === 'media' ? 'selected' : ''}>Media</option>
                    <option value="alta" ${data.severity === 'alta' ? 'selected' : ''}>Alta</option>
                    <option value="critica" ${data.severity === 'critica' || data.severity === 'crítica' ? 'selected' : ''}>Crítica</option>
                </select>
            </div>
        `;
    }
    else if (sectionId === 'nfpa') {
        const labelsMap = { blue: 'Azul (Salud)', red: 'Rojo (Inflamabilidad)', yellow: 'Amarillo (Reactividad)', white: 'Blanco (Especial)' };
        fieldsHtml = `
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cuadrante NFPA</label>
                <div class="text-sm font-bold text-slate-800 bg-slate-100 p-2 rounded-xl border border-slate-200 select-none">${labelsMap[data.quad] || data.quad}</div>
                <input type="hidden" id="c-quad" value="${data.quad}">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nivel</label>
                <div class="text-sm font-bold text-slate-800 bg-slate-100 p-2 rounded-xl border border-slate-200 select-none">${data.level}</div>
                <input type="hidden" id="c-level" value="${data.level}">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Etiqueta Nivel / Peligro</label>
                <input type="text" id="c-label" value="${data.label || ''}" placeholder="Ej: Estable, Reacciona con agua..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Significado / Descripción *</label>
                <textarea id="c-desc" rows="3" required placeholder="Describe el riesgo correspondiente a este nivel..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.desc || ''}</textarea>
            </div>
        `;
    }

    return `
        <form id="consulta-modal-form" class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-1">
                ${photoControls}
            </div>
            <div class="md:col-span-2 space-y-4">
                ${fieldsHtml}
            </div>
        </form>
    `;
}
