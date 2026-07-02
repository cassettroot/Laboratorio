function isExpired(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

async function renderItemDetail(container, typePath, itemId) {
    container.innerHTML = `
        <div class="flex justify-center items-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>
    `;

    const apiPath = typePath === 'chemical-materials' ? 'chemical-materials' : (typePath === 'didactic-materials' ? 'didactic-materials' : 'substances');
    const dbTable = typePath === 'chemical-materials' ? 'chemical_materials' : (typePath === 'didactic-materials' ? 'didactic_materials' : 'substances');

    try {
        const itemRes = await fetch(`/api/${apiPath}/${itemId}`).then(r => r.json());
        if (itemRes.status === 'error') {
            container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">${itemRes.message}</div>`;
            return;
        }

        const item = itemRes.data;

        const simRes = await fetch(`/api/${apiPath}?similar_to=${item.id}`).then(r => r.json());
        const similars = simRes.data || [];

        const backPath = typePath === 'substances' ? '#/substances' : (typePath === 'chemical-materials' ? '#/chemical-materials' : '#/didactic-materials');

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in print-card bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative">
                <div class="no-print flex items-center gap-3 mb-2">
                    <a href="${backPath}" class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600 transition">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        <span>Volver al listado</span>
                    </a>
                </div>
                <div class="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div class="flex-1 space-y-4">
                        <div class="flex flex-wrap items-center gap-3">
                            <span class="px-3 py-1 rounded-xl text-xs font-bold bg-brand-100 text-brand-800 uppercase tracking-wider no-print">
                                ${typePath === 'substances' ? 'Sustancia Química' : (typePath === 'chemical-materials' ? 'Material Químico' : 'Material Didáctico')}
                            </span>
                            <span class="text-xs text-slate-400 font-bold">Código de Inventario: LAB-${dbTable.toUpperCase().substring(0,3)}-${item.id}</span>
                        </div>
                        <h2 class="text-3xl font-extrabold text-slate-900 leading-tight border-b pb-2 border-slate-100">${item.name}</h2>

                        ${typePath === 'substances' ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-sm pt-2">
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Grupo Químico</span><span class="px-2 py-0.5 rounded bg-brand-100 text-brand-800 text-xs font-bold inline-block border border-brand-200">${item.substance_group || 'General / Ninguno'}</span></div>
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
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Categoría</span><span class="font-bold text-slate-800 text-base">${item.category || 'General'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Estado de conservación</span><span class="font-bold">${item.status || 'N/D'}</span></div>
                            </div>
                        `}

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-sm pt-3 border-t border-slate-100">
                            <div>
                                <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Stock Disponible</span>
                                <span class="text-xl font-bold text-brand-600">${item.quantity} ${item.unit || 'uds'}</span>
                                ${typePath === 'substances' ? `
                                    <div class="text-2xs text-slate-400 font-bold mt-0.5">Envases: ${item.stock_units || 1} uds x ${item.container_content || 'N/D'}</div>
                                ` : ''}
                            </div>
                            <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Ubicación Física</span><span class="font-semibold text-slate-700">${item.location || '-'}</span></div>
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

                    <div class="w-full md:w-56 shrink-0 flex flex-col gap-5 items-center bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                        <div class="w-full aspect-square rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex items-center justify-center text-slate-300 relative">
                            ${item.image_path ? `
                                <img src="${item.image_path}" class="w-full h-full object-cover">
                            ` : `
                                <div class="flex flex-col items-center gap-2">
                                    <i data-lucide="image" class="w-10 h-10 text-slate-300"></i>
                                    <span class="text-3xs text-slate-400">Sin foto cargada</span>
                                </div>
                            `}

                            ${typePath === 'substances' ? `
                            <div class="absolute bottom-2 left-2 right-2 bg-slate-900/60 backdrop-blur-md text-white text-3xs rounded-xl p-2.5 flex justify-between items-center shadow border border-white/10">
                                <span class="font-bold flex items-center gap-1">
                                    <i data-lucide="package" class="w-3.5 h-3.5 text-brand-400"></i>
                                    <span>${item.stock_units || 1} uds</span>
                                </span>
                                <span class="font-bold flex items-center gap-1">
                                    <i data-lucide="scale" class="w-3.5 h-3.5 text-brand-400"></i>
                                    <span>${item.container_content || item.unit || ''}</span>
                                </span>
                            </div>
                            ` : ''}
                        </div>

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
                    </div>
                </div>

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
