async function renderHistoryView(container) {
    let currentPage = 1;
    const pageSize = 20;
    let searchTimeout = null;

    container.innerHTML = `
        <div class="space-y-6 animate-fade-in no-print">
            <div class="glass-toolbar p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
                    <select id="filter-hist-table" class="glass-input px-3.5 py-2 text-xs sm:text-sm font-semibold">
                        <option value="">-- Todos los módulos --</option>
                        <option value="substances">Sustancias Químicas</option>
                        <option value="chemical_materials">Materiales Químicos</option>
                        <option value="didactic_materials">Materiales Didácticos</option>
                    </select>
                    <select id="filter-hist-action" class="glass-input px-3.5 py-2 text-xs sm:text-sm font-semibold">
                        <option value="">-- Todas las acciones --</option>
                        <option value="CREACION">CREACIÓN</option>
                        <option value="EDICION">EDICIÓN</option>
                        <option value="ELIMINACION">ELIMINACIÓN</option>
                    </select>
                    <input id="search-hist-user" type="text" placeholder="🔍 Buscar responsable..." class="glass-input px-3.5 py-2 text-xs sm:text-sm font-semibold w-full sm:w-60">
                </div>
                <button onclick="exportHistoryExcel()" class="glass-btn px-4 py-2 text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer">
                    <i data-lucide="download" class="w-4 h-4 text-teal-400"></i>
                    <span>Exportar Historial</span>
                </button>
            </div>

            <!-- Tabla de Historial Glassmorphism -->
            <div class="glass-table-container">
                <div class="w-full overflow-x-auto no-scrollbar">
                    <table class="glass-table w-full text-left text-xs sm:text-sm">
                        <thead>
                            <tr>
                                <th class="py-3.5 px-4 w-40">Fecha y Responsable</th>
                                <th class="py-3.5 px-4 w-36">Acción y Módulo</th>
                                <th class="py-3.5 px-4 w-40">Campo Modificado</th>
                                <th class="py-3.5 px-4">Detalles del Cambio (Antes ➔ Después)</th>
                            </tr>
                        </thead>
                        <tbody id="history-table-body" class="divide-y divide-white/5 font-medium">
                            <tr>
                                <td colspan="4" class="py-12 text-center text-slate-400 font-bold">Cargando historial de auditoría...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Paginación -->
                <div id="history-pagination-bar" class="p-3.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-semibold no-print">
                    <div id="history-pagination-info">Mostrando 0 eventos</div>
                    <div class="flex items-center gap-2">
                        <button id="btn-hist-prev" class="glass-btn px-3 py-1.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer">
                            ◀ Anterior
                        </button>
                        <span id="history-page-indicator" class="text-white font-black px-2">Página 1</span>
                        <button id="btn-hist-next" class="glass-btn px-3 py-1.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer">
                            Siguiente ▶
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const fetchAndRender = async () => {
        const table = document.getElementById('filter-hist-table').value;
        const action = document.getElementById('filter-hist-action').value;
        const user = document.getElementById('search-hist-user').value.trim();
        const body = document.getElementById('history-table-body');

        try {
            const url = new URL('/api/history', window.location.origin);
            if (table) url.searchParams.append('table_name', table);
            if (action) url.searchParams.append('action', action);
            if (user) url.searchParams.append('user_responsible', user);

            const res = await fetch(url).then(r => r.json());
            state.history = res.data || [];
            const totalItems = state.history.length;

            if (totalItems === 0) {
                body.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-400 font-bold">No se encontraron eventos en la bitácora.</td></tr>`;
                document.getElementById('history-pagination-info').textContent = 'Mostrando 0 de 0 eventos';
                document.getElementById('history-page-indicator').textContent = 'Página 0 de 0';
                document.getElementById('btn-hist-prev').disabled = true;
                document.getElementById('btn-hist-next').disabled = true;
                return;
            }

            const totalPages = Math.ceil(totalItems / pageSize);
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalItems);
            const pageSlice = state.history.slice(startIndex, endIndex);

            document.getElementById('history-pagination-info').textContent = `Mostrando ${startIndex + 1}–${endIndex} de ${totalItems} eventos`;
            document.getElementById('history-page-indicator').textContent = `Página ${currentPage} de ${totalPages}`;
            document.getElementById('btn-hist-prev').disabled = currentPage === 1;
            document.getElementById('btn-hist-next').disabled = currentPage === totalPages;

            body.innerHTML = pageSlice.map(h => {
                let actionBadgeColor = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
                if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                if (h.action === 'DEVOLUCION_PRESTAMO') actionBadgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';

                const labelTable = h.table_name === 'substances' ? 'Sustancias' : (h.table_name === 'chemical_materials' ? 'Mat. Químico' : (h.table_name === 'loans' ? 'Préstamos' : h.table_name));

                const formatJsonValue = (val) => {
                    if (val === '-' || val === undefined || val === null) return '—';
                    let obj = val;
                    if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
                        try { obj = JSON.parse(val); } catch (e) { return val; }
                    }
                    
                    if (typeof obj === 'object' && obj !== null) {
                        if (Array.isArray(obj)) {
                            if (obj.length === 0) return '<span class="text-slate-400 italic text-2xs">Vacío</span>';
                            return '<ul class="space-y-1 mt-1">' + obj.map(item => {
                                if (typeof item === 'object' && item !== null) {
                                    let mainName = '';
                                    let details = [];
                                    let imgHtml = '';
                                    for (const [k, v] of Object.entries(item)) {
                                        const isImageUrl = typeof v === 'string' && (v.match(/\.(jpeg|jpg|png|gif|webp)$/i) || v.startsWith('/static/uploads/'));
                                        if (isImageUrl) {
                                            imgHtml += `<a href="${v}" target="_blank" title="Ver imagen: ${k}"><img src="${v}" class="w-8 h-8 rounded-lg object-cover border border-white/10 shadow-sm hover:scale-105 transition shrink-0 ml-1"></a>`;
                                        } else if (k === 'name' || k === 'nombre') {
                                            mainName = `<span class="font-black block text-xs">${v}</span>`;
                                        } else {
                                            const niceKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                            details.push(`<span class="opacity-70 text-3xs">${niceKey}:</span> <span class="font-semibold text-3xs break-all">${v}</span>`);
                                        }
                                    }
                                    return `<li class="glass-pill p-2 rounded-xl border border-white/10 flex items-center justify-between gap-2">
                                                <div class="flex-1 min-w-0">
                                                    ${mainName}
                                                    <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">${details.join('')}</div>
                                                </div>
                                                <div class="flex shrink-0">${imgHtml}</div>
                                            </li>`;
                                } else {
                                    return `<li class="glass-pill p-1.5 rounded-lg border border-white/10 text-xs font-semibold">${item}</li>`;
                                }
                            }).join('') + '</ul>';
                        } else {
                            if (Object.keys(obj).length === 0) return '<span class="text-slate-400 italic text-2xs">Vacío</span>';
                            let details = [];
                            for (const [k, v] of Object.entries(obj)) {
                                details.push(`<div class="flex justify-between items-center py-0.5 border-b border-white/5 last:border-0 gap-2"><span class="opacity-70 capitalize text-3xs shrink-0">${k}:</span> <span class="font-semibold text-3xs text-right break-all">${v}</span></div>`);
                            }
                            return `<div class="glass-pill p-2 rounded-xl border border-white/10 break-words">${details.join('')}</div>`;
                        }
                    }
                    return val;
                };

                const diffJson = (oldStr, newStr) => {
                    let oldObj = oldStr, newObj = newStr;
                    try { if (typeof oldStr === 'string' && (oldStr.trim().startsWith('[') || oldStr.trim().startsWith('{'))) oldObj = JSON.parse(oldStr); } catch(e) {}
                    try { if (typeof newStr === 'string' && (newStr.trim().startsWith('[') || newStr.trim().startsWith('{'))) newObj = JSON.parse(newStr); } catch(e) {}
                    
                    if (typeof oldObj === 'object' && typeof newObj === 'object' && oldObj !== null && newObj !== null) {
                        if (Array.isArray(oldObj) && Array.isArray(newObj)) {
                            const oldDiff = [];
                            const newDiff = [];
                            const newMap = new Set(newObj.map(o => JSON.stringify(o)));
                            const oldMap = new Set(oldObj.map(o => JSON.stringify(o)));
                            oldObj.forEach(o => { if (!newMap.has(JSON.stringify(o))) oldDiff.push(o); });
                            newObj.forEach(o => { if (!oldMap.has(JSON.stringify(o))) newDiff.push(o); });
                            return { oldVal: oldDiff.length ? oldDiff : '—', newVal: newDiff.length ? newDiff : '—' };
                        } else {
                            const oldDiff = {};
                            const newDiff = {};
                            for (const key of new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])) {
                                if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
                                    if (oldObj[key] !== undefined) oldDiff[key] = oldObj[key];
                                    if (newObj[key] !== undefined) newDiff[key] = newObj[key];
                                }
                            }
                            return { oldVal: Object.keys(oldDiff).length ? oldDiff : '—', newVal: Object.keys(newDiff).length ? newDiff : '—' };
                        }
                    }
                    return { oldVal: oldStr || '—', newVal: newStr || '—' };
                };

                const { oldVal: diffOld, newVal: diffNew } = h.action === 'EDICION' ? diffJson(h.old_value, h.new_value) : { oldVal: h.old_value, newVal: h.new_value };

                let valHtml = diffNew === '—' ? '—' : diffNew;
                if (h.new_value && typeof h.new_value === 'string' && h.new_value.startsWith('/static/uploads/photos/')) {
                    valHtml = `
                        <div class="flex items-center gap-2">
                            <a href="${h.new_value}" target="_blank" class="block w-9 h-9 rounded-xl overflow-hidden border border-white/10 hover:opacity-80 transition shrink-0 shadow-sm" title="Ver Evidencia">
                                <img src="${h.new_value}" class="w-full h-full object-cover" />
                            </a>
                            <span class="text-3xs text-emerald-400 font-black">📸 Evidencia de Entrega</span>
                        </div>
                    `;
                } else {
                    valHtml = formatJsonValue(diffNew);
                }

                let oldValHtml = formatJsonValue(diffOld);

                return `
                    <tr class="hover:bg-white/5 transition border-b border-white/5">
                        <td class="py-3 px-3 align-top">
                            <span class="text-3xs text-slate-400 font-semibold block whitespace-nowrap">${h.timestamp}</span>
                            <span class="font-black text-xs block mt-0.5 truncate max-w-[140px]" title="${h.user_responsible}">${h.user_responsible}</span>
                        </td>
                        <td class="py-3 px-3 align-top">
                            <span class="px-2 py-0.5 text-3xs font-black border rounded-lg uppercase tracking-wider inline-block ${actionBadgeColor}">
                                ${h.action}
                            </span>
                            <div class="font-black text-2xs mt-1 opacity-90">${labelTable}</div>
                            <span class="text-3xs text-amber-400 font-mono font-black uppercase block">#PR-${h.record_id}</span>
                        </td>
                        <td class="py-3 px-3 align-top">
                            <span class="text-teal-400 font-black text-xs block truncate max-w-[130px]" title="${h.field_name || ''}">${h.field_name || '—'}</span>
                        </td>
                        <td class="py-3 px-4 align-top">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-2xs">
                                <div class="bg-rose-500/10 p-2.5 rounded-2xl border border-rose-500/20 min-w-0">
                                    <span class="text-3xs uppercase font-black text-rose-400 tracking-wider block mb-1">Anterior:</span>
                                    <div class="font-medium break-words max-h-32 overflow-y-auto no-scrollbar">${oldValHtml}</div>
                                </div>
                                <div class="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20 min-w-0">
                                    <span class="text-3xs uppercase font-black text-emerald-400 tracking-wider block mb-1">Nuevo:</span>
                                    <div class="font-semibold break-words max-h-32 overflow-y-auto no-scrollbar">${valHtml}</div>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            body.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-500 font-bold">Error de red al cargar el historial.</td></tr>`;
        }
    };

    // Eventos de paginación
    document.getElementById('btn-hist-prev').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchAndRender();
        }
    });
    document.getElementById('btn-hist-next').addEventListener('click', () => {
        currentPage++;
        fetchAndRender();
    });

    document.getElementById('filter-hist-table').addEventListener('change', () => {
        currentPage = 1;
        fetchAndRender();
    });

    document.getElementById('filter-hist-action').addEventListener('change', () => {
        currentPage = 1;
        fetchAndRender();
    });

    document.getElementById('search-hist-user').addEventListener('input', () => {
        currentPage = 1;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchAndRender, 300);
    });

    fetchAndRender();
}
