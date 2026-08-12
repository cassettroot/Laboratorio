async function renderHistoryView(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in no-print">
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select id="filter-hist-table" class="bg-white border px-3 py-2.5 rounded-xl text-sm shadow-sm outline-none transition focus:border-brand-500">
                        <option value="">-- Todos los módulos --</option>
                        <option value="substances">Sustancias Químicas</option>
                        <option value="chemical_materials">Materiales Químicos</option>
                        <option value="didactic_materials">Materiales Didácticos</option>
                    </select>
                    <select id="filter-hist-action" class="bg-white border px-3 py-2.5 rounded-xl text-sm shadow-sm outline-none transition focus:border-brand-500">
                        <option value="">-- Todas las acciones --</option>
                        <option value="CREACION">CREACIÓN</option>
                        <option value="EDICION">EDICIÓN</option>
                        <option value="ELIMINACION">ELIMINACIÓN</option>
                    </select>
                    <input id="search-hist-user" type="text" placeholder="Filtrar por responsable..." class="bg-white border px-3 py-2.5 rounded-xl text-sm shadow-sm outline-none transition focus:border-brand-500">
                </div>
                <button onclick="exportHistoryExcel()" class="bg-white hover:bg-slate-50 border font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span>Exportar Historial</span>
                </button>
            </div>

            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                <th class="py-3 px-4 whitespace-nowrap w-1">Fecha y Hora</th>
                                <th class="py-3 px-4 whitespace-nowrap w-1">Responsable</th>
                                <th class="py-3 px-4 whitespace-nowrap w-1">Acción</th>
                                <th class="py-3 px-4 whitespace-nowrap w-1">Módulo / ID</th>
                                <th class="py-3 px-4 whitespace-nowrap w-1">Campo Modificado</th>
                                <th class="py-3 px-4 w-1/2 min-w-[200px]">Valor Anterior</th>
                                <th class="py-3 px-4 w-1/2 min-w-[200px]">Valor Nuevo</th>
                            </tr>
                        </thead>
                        <tbody id="history-table-body" class="divide-y divide-slate-100 text-slate-700 font-medium">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">Cargando historial de auditoría...</td>
                            </tr>
                        </tbody>
                    </table>
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

            if (state.history.length === 0) {
                body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">No se encontraron eventos en la bitácora.</td></tr>`;
                return;
            }

            body.innerHTML = state.history.map(h => {
                let actionBadgeColor = 'bg-blue-50 text-blue-600 border-blue-150';
                if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-150';
                if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-red-50 text-red-600 border-red-150';
                if (h.action === 'DEVOLUCION_PRESTAMO') actionBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';

                const labelTable = h.table_name === 'substances' ? 'Sustancias' : (h.table_name === 'chemical_materials' ? 'Mat. Químico' : (h.table_name === 'loans' ? 'Préstamos' : h.table_name));

                const formatJsonValue = (val) => {
                    if (val === '-' || val === undefined || val === null) return '-';
                    let obj = val;
                    if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
                        try { obj = JSON.parse(val); } catch (e) { return val; }
                    }
                    
                    if (typeof obj === 'object' && obj !== null) {
                        if (Array.isArray(obj)) {
                            if (obj.length === 0) return '<span class="text-slate-400 italic text-xs">Vacío</span>';
                            return '<ul class="space-y-1.5 mt-1 min-w-[200px]">' + obj.map(item => {
                                if (typeof item === 'object' && item !== null) {
                                    let mainName = '';
                                    let details = [];
                                    let imgHtml = '';
                                    for (const [k, v] of Object.entries(item)) {
                                        const isImageUrl = typeof v === 'string' && (v.match(/\.(jpeg|jpg|png|gif|webp)$/i) || v.startsWith('/static/uploads/'));
                                        if (isImageUrl) {
                                            imgHtml += `<a href="${v}" target="_blank" title="Ver imagen: ${k}"><img src="${v}" class="w-10 h-10 rounded-md object-cover border border-slate-300 shadow-sm hover:scale-105 transition shrink-0 ml-2"></a>`;
                                        } else if (k === 'name' || k === 'nombre') {
                                            mainName = `<span class="font-bold text-slate-800 block text-sm mb-1">${v}</span>`;
                                        } else {
                                            // Format key nicely (e.g. image_path -> Image Path)
                                            const niceKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                            details.push(`<span class="text-slate-500 text-[11px] shrink-0">${niceKey}:</span> <span class="font-medium text-slate-800 text-[11px] mr-2 break-all">${v}</span>`);
                                        }
                                    }
                                    return `<li class="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
                                                <div class="flex-1 min-w-0">
                                                    ${mainName}
                                                    <div class="flex flex-wrap items-center mt-1">${details.join('')}</div>
                                                </div>
                                                <div class="flex shrink-0">${imgHtml}</div>
                                            </li>`;
                                } else {
                                    return `<li class="bg-slate-50 p-2 rounded-lg border border-slate-200/60 shadow-sm text-xs font-medium text-slate-700">${item}</li>`;
                                }
                            }).join('') + '</ul>';
                        } else {
                            if (Object.keys(obj).length === 0) return '<span class="text-slate-400 italic text-xs">Vacío</span>';
                            let details = [];
                            for (const [k, v] of Object.entries(obj)) {
                                details.push(`<div class="flex justify-between items-center py-0.5 border-b border-slate-100 last:border-0 gap-2"><span class="text-slate-500 capitalize text-[10px] shrink-0">${k}:</span> <span class="font-medium text-slate-800 text-[10px] text-right break-all">${v}</span></div>`);
                            }
                            return `<div class="bg-slate-50 p-2 rounded-lg border border-slate-200/60 shadow-sm min-w-[180px] break-words">${details.join('')}</div>`;
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
                            return { oldVal: oldDiff.length ? oldDiff : '-', newVal: newDiff.length ? newDiff : '-' };
                        } else {
                            const oldDiff = {};
                            const newDiff = {};
                            for (const key of new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])) {
                                if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
                                    if (oldObj[key] !== undefined) oldDiff[key] = oldObj[key];
                                    if (newObj[key] !== undefined) newDiff[key] = newObj[key];
                                }
                            }
                            return { oldVal: Object.keys(oldDiff).length ? oldDiff : '-', newVal: Object.keys(newDiff).length ? newDiff : '-' };
                        }
                    }
                    return { oldVal: oldStr, newVal: newStr };
                };

                const { oldVal: diffOld, newVal: diffNew } = h.action === 'EDICION' ? diffJson(h.old_value, h.new_value) : { oldVal: h.old_value, newVal: h.new_value };

                let valHtml = diffNew === '-' ? '-' : diffNew;
                if (h.new_value && typeof h.new_value === 'string' && h.new_value.startsWith('/static/uploads/photos/')) {
                    valHtml = `
                        <div class="flex items-center gap-2">
                            <a href="${h.new_value}" target="_blank" class="block w-10 h-10 rounded-lg overflow-hidden border border-slate-300 hover:opacity-80 transition shrink-0" title="Ver Evidencia de Devolución">
                                <img src="${h.new_value}" class="w-full h-full object-cover" />
                            </a>
                            <span class="text-3xs text-emerald-700 font-bold">📸 Evidencia de Entrega</span>
                        </div>
                    `;
                } else {
                    valHtml = formatJsonValue(diffNew);
                }

                let oldValHtml = formatJsonValue(diffOld);

                return `
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-3 px-4 text-slate-500 font-semibold text-[11px] whitespace-nowrap">${h.timestamp}</td>
                        <td class="py-3 px-4 font-bold text-slate-900 text-[11px] whitespace-nowrap">${h.user_responsible}</td>
                        <td class="py-3 px-4 whitespace-nowrap">
                            <span class="px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${actionBadgeColor}">
                                ${h.action}
                            </span>
                        </td>
                        <td class="py-3 px-4 whitespace-nowrap">
                            <div class="font-bold text-slate-800 text-[11px]">${labelTable}</div>
                            <div class="text-[9px] text-slate-400 font-bold uppercase">Folio: #PR-${h.record_id}</div>
                        </td>
                        <td class="py-3 px-4 text-brand-700 font-bold text-[11px] truncate max-w-[120px]" title="${h.field_name || ''}">${h.field_name || '-'}</td>
                        <td class="py-3 px-4 text-slate-600 font-medium align-top">${oldValHtml}</td>
                        <td class="py-3 px-4 text-slate-950 font-semibold align-top">${valHtml}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-red-500 font-bold">Error de red al cargar el historial.</td></tr>`;
        }
    };

    document.getElementById('filter-hist-table').addEventListener('change', fetchAndRender);
    document.getElementById('filter-hist-action').addEventListener('change', fetchAndRender);
    document.getElementById('search-hist-user').addEventListener('input', fetchAndRender);

    fetchAndRender();
}
