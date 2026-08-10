function isExpired(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

async function renderItemDetail(container, typePath, itemId) {
    container.innerHTML = `
        <div class="flex justify-center items-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>
    `;

    const apiPath = typePath === 'chemical-materials' ? 'chemical-materials' : (typePath === 'didactic-materials' ? 'didactic-materials' : (typePath === 'equipos' ? 'equipos' : 'substances'));
    const dbTable = typePath === 'chemical-materials' ? 'chemical_materials' : (typePath === 'didactic-materials' ? 'didactic_materials' : (typePath === 'equipos' ? 'equipos' : 'substances'));

    try {
        const itemRes = await fetch(`/api/${apiPath}/${itemId}`).then(r => r.json());
        if (itemRes.status === 'error') {
            container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">${itemRes.message || 'Elemento no encontrado'}</div>`;
            return;
        }

        const item = itemRes.data;
        const relatedPresentations = itemRes.related_presentations || [];

        let presentationImagesList = [];
        if (item.presentation_images) {
            try {
                presentationImagesList = typeof item.presentation_images === 'string' ? JSON.parse(item.presentation_images) : item.presentation_images;
                if (!Array.isArray(presentationImagesList)) presentationImagesList = [];
            } catch (e) {
                presentationImagesList = [];
            }
        }

        let allWebImages = [];
        let mainPhotoPath = item.image_path;
        if (!mainPhotoPath && presentationImagesList.length > 0 && presentationImagesList[0].image_path) {
            mainPhotoPath = presentationImagesList[0].image_path;
        }

        if (mainPhotoPath) {
            allWebImages.push({ src: mainPhotoPath, label: 'Fotografía Principal' });
        }

        presentationImagesList.forEach((pImg, pIdx) => {
            if (pImg.image_path && pImg.image_path !== mainPhotoPath) {
                allWebImages.push({ src: pImg.image_path, label: pImg.label || `Presentación ${pIdx + 1}` });
            }
        });

        const simRes = await fetch(`/api/${apiPath}?similar_to=${item.id}`).then(r => r.json());
        const similars = simRes.data || [];

        // Para materiales quimicos: cargar todas las unidades del mismo articulo (mismo nombre)
        let siblings = [];
        let siblingsTotal = 0;
        let siblingsStatusSummary = {};
        if (typePath === 'chemical-materials') {
            const sibRes = await fetch(`/api/chemical-materials/${itemId}/siblings`).then(r => r.json());
            if (sibRes.status === 'success') {
                siblings = sibRes.data || [];
                siblingsTotal = sibRes.total || 0;
                siblingsStatusSummary = sibRes.status_summary || {};
            }
        }

        const fromWarehouse = sessionStorage.getItem('last_navigation_source') === 'warehouse';
        const savedLevel = sessionStorage.getItem('warehouse_selected_level');

        let backPath = typePath === 'substances' ? '#/substances' : (typePath === 'chemical-materials' ? '#/chemical-materials' : (typePath === 'equipos' ? '#/equipos' : '#/didactic-materials'));
        let backText = 'Volver al listado';

        if (typePath === 'substances' && fromWarehouse) {
            backPath = '#/warehouse';
            backText = savedLevel ? `Volver al Almacén (Nivel ${savedLevel})` : 'Volver al Almacén de Reactivos';
        }

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in print-card bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative">
                <div class="no-print flex items-center justify-between gap-3 mb-2">
                    <a href="${backPath}" class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600 transition">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        <span>${backText}</span>
                    </a>
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                        <button onclick="openEditModal('${typePath}', ${item.id})" class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-md transition">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                            <span>✏️ Editar ${typePath === 'substances' ? 'Sustancia' : (typePath === 'equipos' ? 'Equipo / Bien' : 'Material')}</span>
                        </button>
                    ` : ''}
                </div>
                <div class="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div class="flex-1 space-y-4">
                        <div class="flex flex-wrap items-center gap-3">
                            <span class="px-3 py-1 rounded-xl text-xs font-bold bg-brand-100 text-brand-800 uppercase tracking-wider no-print">
                                ${typePath === 'substances' ? 'Sustancia Química' : (typePath === 'chemical-materials' ? 'Material / Equipo' : (typePath === 'equipos' ? 'Bien o Equipo de Sistemas' : 'Material Didáctico'))}
                            </span>
                            <span class="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">ID Lab: #${item.id}</span>
                            ${item.original_id ? `<span class="text-xs text-amber-800 font-extrabold bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">ID Excel DEPTO CB: #${item.original_id}</span>` : ''}
                        </div>
                        <h2 class="text-3xl font-extrabold text-slate-900 leading-tight border-b pb-2 border-slate-100">${item.name}</h2>

                        ${typePath === 'substances' ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-sm pt-2">
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Grupo Químico</span><div class="flex flex-wrap gap-1.5 mt-1">${buildGroupBadgesHtml(item.substance_group) || '<span class="px-2 py-0.5 rounded bg-brand-100 text-brand-800 text-xs font-bold inline-block border border-brand-200">General / Ninguno</span>'}</div></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Fórmula Química</span><span class="font-bold text-slate-800 text-base">${item.chemical_formula || 'Sin fórmula'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Número CAS</span><span class="font-bold text-slate-800 text-base">${item.cas_number || 'N/D'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Concentración</span><span>${item.concentration || '-'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Composición / Pureza</span><span>${item.composition || '-'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Estado Físico</span><span class="px-2 py-0.5 rounded bg-slate-100 font-bold">${item.physical_state || '-'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Advertencias de Riesgo</span><span class="text-red-600 font-semibold">${item.risks_warnings || 'Ninguno'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Fecha Caducidad</span><span class="font-semibold ${isExpired(item.expiration_date) ? 'text-red-600' : ''}">${item.expiration_date || 'N/D'}</span></div>
                            </div>
                        ` : `
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-sm pt-2">
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">ID Original Excel (DEPTO CB)</span><span class="font-bold text-amber-700 font-mono text-base">${item.original_id ? '#' + item.original_id : 'N/D'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Estado de conservación</span><span class="font-bold">${item.status || 'Buenas Condiciones'}</span></div>
                                ${item.inventory_number ? `<div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">No. Inventario</span><span class="font-bold text-amber-700 font-mono">${item.inventory_number}</span></div>` : ''}
                                ${item.serial_number ? `<div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">No. Serie</span><span class="font-bold text-blue-700 font-mono">${item.serial_number}</span></div>` : ''}
                                ${item.no_sep ? `<div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">No. SEP</span><span class="font-bold text-emerald-700 font-mono">${item.no_sep}</span></div>` : ''}
                            </div>
                        `}

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-sm pt-3 border-t border-slate-100">
                            <div>
                                <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Stock Disponible</span>
                                <div class="flex items-baseline gap-2 mt-0.5">
                                    <span class="text-xl font-bold text-brand-600">${item.stock_units || 1} envase(s)</span>
                                    <span class="text-sm font-semibold text-slate-600">(${item.quantity} ${item.unit || 'g'} c/u)</span>
                                </div>
                                ${typePath === 'substances' && item.container_content ? `
                                    <div class="text-2xs text-slate-500 font-medium mt-1">Presentación: ${item.container_content}</div>
                                ` : ''}
                            </div>
                            <div>
                                <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider mb-1">Ubicación Física</span>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-bold text-slate-800 text-sm bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">${item.location || 'Sin asignar'}</span>
                                </div>
                            </div>
                            <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Responsable Custodia</span><span>${item.responsible || '-'}</span></div>
                            <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Última Modificación</span><span class="text-xs text-slate-500">${item.updated_at}</span></div>
                        </div>

                        ${item.observations ? `
                            <div class="pt-4 border-t border-slate-100 text-sm">
                                <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Observaciones</span>
                                <p class="text-slate-600 italic bg-slate-50 p-3 rounded-xl border mt-1">${item.observations}</p>
                            </div>
                        ` : ''}

                        ${typePath === 'substances' ? `
                            <div class="pt-4 border-t border-slate-100 text-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider mb-2">Documentación (PDF)</span>
                                    ${item.pdf_path ? `
                                        <a href="${item.pdf_path}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2.5 border border-brand-200 hover:border-brand-300 bg-brand-50/50 hover:bg-brand-50 text-brand-700 font-bold rounded-xl text-xs transition shadow-sm no-print">
                                            <i data-lucide="file-text" class="w-4 h-4"></i>
                                            <span>Ver Ficha de Seguridad / PDF</span>
                                        </a>
                                        <span class="hidden print:inline font-semibold text-slate-700 text-xs">${item.pdf_path}</span>
                                    ` : `
                                        <span class="text-xs text-slate-400 italic">No hay documento PDF guardado</span>
                                    `}
                                </div>
                                <div>
                                    <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider mb-2">Enlaces de Referencia</span>
                                    ${item.external_links ? `
                                        <div class="flex flex-col gap-2">
                                            ${item.external_links.split('\n').filter(l => l.trim()).map(link => {
                                                let cleanLink = link.trim();
                                                if (!/^https?:\/\//i.test(cleanLink)) {
                                                    cleanLink = 'https://' + cleanLink;
                                                }
                                                return `
                                                    <a href="${cleanLink}" target="_blank" class="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-semibold hover:underline text-xs no-print">
                                                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                                        <span class="truncate max-w-[280px]">${link.trim()}</span>
                                                    </a>
                                                    <span class="hidden print:inline font-semibold text-slate-700 text-xs">${link.trim()}</span>
                                                `;
                                            }).join('')}
                                        </div>
                                    ` : `
                                        <span class="text-xs text-slate-400 italic">No hay enlaces registrados</span>
                                    `}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="w-full md:w-64 shrink-0 flex flex-col gap-5 items-center bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                        <div class="w-full aspect-square rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex items-center justify-center text-slate-300 relative group/dethead cursor-pointer" onclick="openImageViewer(document.getElementById('web-main-img')?.src || '${mainPhotoPath || ''}', '${(item.name || '').replace(/'/g, "\\'")}')" title="Haz clic para ver la foto completa">
                            ${allWebImages.length > 0 ? `
                                <img id="web-main-img" src="${allWebImages[0].src}" class="w-full h-full object-cover group-hover/dethead:scale-105 transition duration-300">
                                <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/dethead:opacity-100 transition flex items-center justify-center text-white text-3xs font-bold gap-1 backdrop-blur-[1px]">
                                    <i data-lucide="maximize-2" class="w-3.5 h-3.5 text-brand-400"></i>
                                    <span>Ampliar Foto</span>
                                </div>
                                <div id="web-img-label-badge" class="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-3xs rounded-lg px-2 py-1 border border-white/20 font-bold">
                                    📷 ${allWebImages[0].label}
                                </div>
                            ` : `
                                <div class="flex flex-col items-center gap-2">
                                    <i data-lucide="image" class="w-10 h-10 text-slate-300"></i>
                                    <span class="text-3xs text-slate-400">Sin foto cargada</span>
                                </div>
                            `}
                        </div>

                        ${allWebImages.length > 1 ? `
                            <div class="w-full flex items-center gap-2 overflow-x-auto pb-1">
                                ${allWebImages.map((img, iIdx) => `
                                    <button type="button" onclick="changeWebDetailPhoto('${img.src}', '${img.label.replace(/'/g, "\\'")}', this)" class="w-12 h-12 rounded-xl border-2 ${iIdx === 0 ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200 opacity-60 hover:opacity-100'} overflow-hidden shrink-0 transition web-thumb-btn">
                                        <img src="${img.src}" class="w-full h-full object-cover">
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}

                        <div class="flex flex-col items-center border border-slate-200 p-3 rounded-2xl bg-white w-full text-center">
                            <span class="text-3xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Código QR único</span>
                            ${item.qr_path ? `
                                <img src="${item.qr_path}" class="w-32 h-32 object-contain" alt="QR Code">
                                <span class="text-3xs text-slate-500 font-bold mt-2 truncate max-w-full">${item.qr_content}</span>
                                <a href="${item.qr_path}" download="qr_${item.name.replace(/ /g, '_')}.png" class="text-3xs font-bold text-brand-600 hover:underline mt-1.5 inline-block no-print">Descargar QR</a>
                            ` : `
                                <span class="text-xs text-red-500">QR no generado</span>
                            `}
                        </div>

                        <button onclick="window.print()" class="w-full no-print bg-slate-800 hover:bg-slate-900 font-bold py-2.5 rounded-xl text-xs text-white flex items-center justify-center gap-2 transition">
                            <i data-lucide="printer" class="w-4 h-4"></i>
                            <span>Imprimir Ficha / Etiqueta</span>
                        </button>

                        ${(typePath === 'substances' && state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                            <button onclick="openSubstanceLoanModal(${item.id})" class="w-full no-print bg-amber-500 hover:bg-amber-400 font-extrabold py-2.5 rounded-xl text-xs text-slate-950 flex items-center justify-center gap-2 transition shadow-md">
                                <i data-lucide="handshake" class="w-4 h-4"></i>
                                <span>Solicitar Préstamo de Sustancia</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                ${typePath === 'substances' ? `
                    <!-- GALERÍA DE PRESENTACIONES E IMÁGENES DE ENVASE -->
                    <div class="border-t border-slate-100 pt-8 no-print space-y-6">
                        <div>
                            <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
                                <h3 class="font-bold text-slate-900 flex items-center gap-2 text-base">
                                    <i data-lucide="package-open" class="text-brand-500 w-5 h-5"></i>
                                    <span>📷 Presentaciones e Imágenes del Envase / Sustancia</span>
                                </h3>
                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                    <label class="px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shadow-sm">
                                        <i data-lucide="upload" class="w-4 h-4"></i>
                                        <span>+ Agregar Foto de Presentación</span>
                                        <input type="file" accept="image/*" class="hidden" onchange="uploadPresentationImageForSubstance(${item.id}, this)">
                                    </label>
                                ` : ''}
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                <!-- Foto Principal -->
                                <div class="bg-slate-50 border-2 border-brand-300 rounded-2xl p-2.5 flex flex-col items-center justify-between relative group/presmain shadow-2xs ${item.image_path ? 'cursor-pointer' : ''}" ${item.image_path ? `onclick="openImageViewer('${item.image_path}', '${(item.name || '').replace(/'/g, "\\'")}')"` : ''}>
                                    <span class="absolute top-2 left-2 bg-brand-600 text-white text-3xs font-extrabold uppercase px-2 py-0.5 rounded-md z-10 shadow-sm">Principal</span>
                                    <div class="w-full aspect-square rounded-xl overflow-hidden bg-white mb-2 border border-slate-200/80 relative">
                                        ${item.image_path ? `
                                            <img src="${item.image_path}" class="w-full h-full object-cover group-hover/presmain:scale-105 transition duration-300">
                                            <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/presmain:opacity-100 transition flex items-center justify-center text-white text-3xs font-bold gap-1 backdrop-blur-[1px]">
                                                <i data-lucide="maximize-2" class="w-3.5 h-3.5 text-brand-400"></i>
                                                <span>Ver Foto</span>
                                            </div>
                                        ` : `
                                            <div class="w-full h-full flex items-center justify-center text-slate-300">
                                                <i data-lucide="flask-conical" class="w-8 h-8"></i>
                                            </div>
                                        `}
                                    </div>
                                    <span class="text-xs font-bold text-slate-800 text-center truncate max-w-full" title="Foto de portada">${item.container_content || 'Foto Principal'}</span>
                                </div>

                                <!-- Presentaciones adicionales -->
                                ${presentationImagesList.map((img, idx) => `
                                    <div class="bg-slate-50 border border-slate-200 hover:border-brand-300 rounded-2xl p-2.5 flex flex-col items-center justify-between relative group/presimg transition shadow-2xs cursor-pointer" onclick="openImageViewer('${img.image_path}', '${(img.label || 'Presentación ' + (idx + 1)).replace(/'/g, "\\'")}')">
                                        ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                            <button onclick="event.stopPropagation(); deletePresentationImageDirectly(${item.id}, ${idx})" class="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1 opacity-0 group-hover/presimg:opacity-100 transition shadow z-20" title="Eliminar foto de presentación">
                                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                            </button>
                                        ` : ''}
                                        <div class="w-full aspect-square rounded-xl overflow-hidden bg-white mb-2 border border-slate-200/80 relative">
                                            <img src="${img.image_path}" class="w-full h-full object-cover group-hover/presimg:scale-105 transition duration-300">
                                            <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/presimg:opacity-100 transition flex items-center justify-center text-white text-3xs font-bold gap-1 backdrop-blur-[1px]">
                                                <i data-lucide="maximize-2" class="w-3.5 h-3.5 text-brand-400"></i>
                                                <span>Ver Foto</span>
                                            </div>
                                        </div>
                                        <span class="text-xs font-bold text-slate-800 text-center truncate max-w-full" title="${img.label}">${img.label || 'Presentación ' + (idx + 1)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- OTRAS PRESENTACIONES REGISTRADAS EN INVENTARIO (MISMO PRODUCTO / CAS) -->
                        ${relatedPresentations.length > 0 ? `
                            <div class="pt-6 border-t border-slate-100">
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="font-bold text-slate-900 flex items-center gap-2 text-base">
                                        <i data-lucide="layers" class="text-amber-500 w-5 h-5"></i>
                                        <span>📦 Otros Envases / Presentaciones Registrados de esta Sustancia (${relatedPresentations.length})</span>
                                    </h3>
                                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                        <button onclick="openDuplicateSubstanceModal('substances', ${item.id})" class="text-xs text-brand-600 hover:text-brand-800 font-extrabold flex items-center gap-1 hover:underline">
                                            <i data-lucide="plus-circle" class="w-4 h-4"></i> Registrar Nueva Presentación
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${relatedPresentations.map(rp => `
                                        <div class="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4 shadow-2xs">
                                            <div class="flex items-center gap-3">
                                                <div class="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                    ${rp.image_path ? `<img src="${rp.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="flask-conical" class="w-6 h-6 text-slate-300"></i>`}
                                                </div>
                                                <div>
                                                    <h4 class="font-bold text-slate-900 text-sm">${rp.name}</h4>
                                                    <span class="text-3xs text-slate-400 font-mono font-bold block">LAB-SUB-${rp.id}</span>
                                                    <div class="text-2xs text-slate-600 mt-1 flex flex-wrap gap-2 font-medium">
                                                        <span>Contenido: <strong class="text-slate-800">${rp.container_content || rp.unit}</strong></span>
                                                        <span>Stock: <strong class="text-brand-700">${rp.quantity} ${rp.unit}</strong></span>
                                                        <span>Ubicación: <strong class="text-amber-700">${rp.location || 'N/D'}</strong></span>
                                                    </div>
                                                </div>
                                            </div>
                                            <a href="#/substances/${rp.id}" class="px-3.5 py-2 bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-200 rounded-xl text-xs font-bold text-slate-700 hover:text-brand-700 transition shrink-0 shadow-2xs">
                                                Ver Envase
                                            </a>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${typePath === 'chemical-materials' && siblings.length > 0 ? `
                    <!-- UNIDADES EN EXISTENCIA (mismo articulo, diferentes No. Inventario) -->
                    <div class="border-t border-slate-100 pt-8 no-print">
                        <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <h3 class="font-bold text-slate-900 flex items-center gap-2 text-base">
                                <i data-lucide="package-check" class="text-emerald-600 w-5 h-5"></i>
                                <span>Unidades en Existencia
                                    <span class="ml-2 px-2.5 py-0.5 rounded-full text-xs font-extrabold
                                        ${siblingsTotal > 1 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                                        ${siblingsTotal} unidad${siblingsTotal !== 1 ? 'es' : ''}
                                    </span>
                                </span>
                            </h3>
                            <div class="flex flex-wrap gap-2">
                                ${Object.entries(siblingsStatusSummary).map(([st, cnt]) => `
                                    <span class="text-2xs font-bold px-2.5 py-1 rounded-lg border
                                        ${st === 'Buenas Condiciones' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          st === 'Malas Condiciones'  ? 'bg-red-50 text-red-700 border-red-200' :
                                          'bg-amber-50 text-amber-700 border-amber-200'}">
                                        ${cnt} · ${st}
                                    </span>
                                `).join('')}
                            </div>
                        </div>

                        <div class="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                            <table class="w-full text-xs">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-200">
                                        <th class="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider">ID Lab</th>
                                        <th class="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider">No. Inventario</th>
                                        <th class="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider">No. SEP</th>
                                        <th class="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider">No. Serie</th>
                                        <th class="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider">Estado</th>
                                        <th class="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider">Ubicación</th>
                                        <th class="px-4 py-3 text-center font-extrabold text-slate-500 uppercase tracking-wider">Ver</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${siblings.map(sib => {
                                        const isCurrent = sib.id === item.id;
                                        const statusClass = (sib.status || '').includes('Buenas') ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                                            (sib.status || '').includes('Malas')  ? 'text-red-700 bg-red-50 border-red-200' :
                                                            'text-amber-700 bg-amber-50 border-amber-200';
                                        const noSep = sib.no_sep && sib.no_sep !== 'SIN NUMERO DE SEP' ? sib.no_sep : '—';
                                        const noSerie = sib.serial_number && sib.serial_number !== 'SIN NUMERO DE SERIE' ? sib.serial_number : '—';
                                        return `
                                            <tr class="transition ${
                                                isCurrent
                                                ? 'bg-brand-50 border-l-4 border-l-brand-500'
                                                : 'hover:bg-slate-50'
                                            }">
                                                <td class="px-4 py-3">
                                                    <span class="font-mono font-extrabold ${
                                                        isCurrent ? 'text-brand-700' : 'text-slate-500'
                                                    }">#${sib.id}</span>
                                                    ${isCurrent ? '<span class="ml-1.5 text-3xs bg-brand-500 text-white px-1.5 py-0.5 rounded font-bold uppercase">Este</span>' : ''}
                                                </td>
                                                <td class="px-4 py-3 font-mono font-bold text-amber-800 max-w-[200px]">
                                                    <span class="block truncate" title="${escHtml(sib.inventory_number || '')}">${
                                                        sib.inventory_number || '—'
                                                    }</span>
                                                </td>
                                                <td class="px-4 py-3 font-mono text-emerald-700 font-bold">${noSep}</td>
                                                <td class="px-4 py-3 font-mono text-blue-700">${noSerie}</td>
                                                <td class="px-4 py-3">
                                                    <span class="px-2 py-0.5 rounded-lg border text-2xs font-bold ${statusClass}">
                                                        ${sib.status || 'Sin estado'}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 text-slate-700 font-medium">${escHtml(sib.location || '—')}</td>
                                                <td class="px-4 py-3 text-center">
                                                    ${isCurrent
                                                        ? '<span class="text-brand-500 font-extrabold text-2xs">Aquí</span>'
                                                        : `<a href="#/chemical-materials/${sib.id}" class="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-lg text-2xs font-bold text-slate-600 hover:text-brand-700 transition">
                                                                <i data-lucide="external-link" class="w-3 h-3"></i> Ver
                                                            </a>`
                                                    }
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>

                        ${siblingsTotal > 10 ? `
                            <p class="text-2xs text-slate-400 italic mt-3 text-center">
                                Mostrando ${siblingsTotal} unidades registradas del mismo artículo.
                            </p>
                        ` : ''}
                    </div>
                ` : (typePath === 'chemical-materials' ? `
                    <div class="border-t border-slate-100 pt-8 no-print">
                        <p class="text-sm text-slate-400 italic flex items-center gap-2">
                            <i data-lucide="package" class="w-4 h-4"></i>
                            Este artículo tiene 1 unidad registrada en el inventario.
                        </p>
                    </div>
                ` : '')}

                <div class="border-t border-slate-100 pt-8 no-print">
                    <h3 class="font-bold text-slate-900 flex items-center gap-2 mb-4 text-base">
                        <i data-lucide="sparkles" class="text-brand-500 w-5 h-5"></i>
                        <span>Elementos Parecidos en el Inventario</span>
                    </h3>

                    ${similars.length === 0 ? `
                        <p class="text-sm text-slate-400 italic">No se encontraron reactivos o materiales similares en base a ubicación, color o estado físico.</p>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            ${similars.map(s => {
                                const detailsPath = `#/${typePath}/${s.id}`;
                                return `
                                    <a href="${detailsPath}" class="p-4 bg-slate-50 hover:bg-brand-50/50 border border-slate-200/60 rounded-2xl transition hover:border-brand-200/50 block group">
                                        <h4 class="font-bold text-sm text-slate-800 group-hover:text-brand-700 transition line-clamp-1">${s.name}</h4>
                                        <p class="text-3xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">ID: LAB-${dbTable.toUpperCase().substring(0,3)}-${s.id}</p>
                                        <div class="flex flex-wrap gap-1.5 mt-2">
                                            ${s.physical_state ? `<span class="bg-white border text-3xs px-1.5 py-0.5 rounded text-slate-600 font-medium">${s.physical_state}</span>` : ''}
                                            ${s.location ? `<span class="bg-white border text-3xs px-1.5 py-0.5 rounded text-slate-600 font-medium">${s.location}</span>` : ''}
                                        </div>
                                    </a>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Error de red: ${err.message}</div>`;
    }
}

async function uploadPresentationImageForSubstance(substanceId, fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('photo', file);

    try {
        const uploadRes = await fetch('/api/upload-photo', {
            method: 'POST',
            body: formData
        }).then(r => r.json());

        if (uploadRes.status === 'success') {
            const label = prompt("Nombre o descripción de esta presentación (ej. Frasco 500 mL, Garrafa 5 L):", "Presentación de Envase") || "Presentación de Envase";
            const addRes = await fetch(`/api/substances/${substanceId}/presentation-images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_path: uploadRes.image_path, label: label })
            }).then(r => r.json());

            if (addRes.status === 'success') {
                const container = document.getElementById('view-container') || document.querySelector('main');
                renderItemDetail(container, 'substances', substanceId);
            } else {
                alert(addRes.message);
            }
        } else {
            alert(uploadRes.message);
        }
    } catch(err) {
        alert("Error al guardar imagen de presentación: " + err.message);
    }
}

async function deletePresentationImageDirectly(substanceId, imgIdx) {
    if (!confirm("¿Deseas eliminar esta foto de presentación?")) return;
    try {
        const res = await fetch(`/api/substances/${substanceId}/presentation-images/${imgIdx}`, {
            method: 'DELETE'
        }).then(r => r.json());

        if (res.status === 'success') {
            const container = document.getElementById('view-container') || document.querySelector('main');
            renderItemDetail(container, 'substances', substanceId);
        } else {
            alert(res.message);
        }
    } catch(err) {
        alert("Error al eliminar foto de presentación: " + err.message);
    }
}

window.uploadPresentationImageForSubstance = uploadPresentationImageForSubstance;
window.deletePresentationImageDirectly = deletePresentationImageDirectly;

window.changeWebDetailPhoto = function(src, label, btn) {
    const mainImg = document.getElementById('web-main-img');
    const badge = document.getElementById('web-img-label-badge');
    if (mainImg) mainImg.src = src;
    if (badge) badge.innerHTML = `📷 ${label}`;
    document.querySelectorAll('.web-thumb-btn').forEach(b => {
        b.className = 'w-12 h-12 rounded-xl border-2 border-slate-200 opacity-60 hover:opacity-100 overflow-hidden shrink-0 transition web-thumb-btn';
    });
    if (btn) btn.className = 'w-12 h-12 rounded-xl border-2 border-brand-500 ring-2 ring-brand-200 overflow-hidden shrink-0 transition web-thumb-btn';
};
