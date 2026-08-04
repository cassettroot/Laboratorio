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
                            <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                                <th class="py-4 px-6">Fecha y Hora</th>
                                <th class="py-4 px-6">Responsable</th>
                                <th class="py-4 px-6">Acción</th>
                                <th class="py-4 px-6">Módulo / ID</th>
                                <th class="py-4 px-6">Campo Modificado</th>
                                <th class="py-4 px-6">Valor Anterior</th>
                                <th class="py-4 px-6">Valor Nuevo</th>
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

                let valHtml = h.new_value || '-';
                if (h.new_value && h.new_value.startsWith('/static/uploads/photos/')) {
                    valHtml = `
                        <div class="flex items-center gap-2">
                            <a href="${h.new_value}" target="_blank" class="block w-10 h-10 rounded-lg overflow-hidden border border-slate-300 hover:opacity-80 transition shrink-0" title="Ver Evidencia de Devolución">
                                <img src="${h.new_value}" class="w-full h-full object-cover" />
                            </a>
                            <span class="text-3xs text-emerald-700 font-bold">📸 Evidencia de Entrega</span>
                        </div>
                    `;
                }

                return `
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-3.5 px-6 text-slate-500 font-semibold text-xs whitespace-nowrap">${h.timestamp}</td>
                        <td class="py-3.5 px-6 font-bold text-slate-900">${h.user_responsible}</td>
                        <td class="py-3.5 px-6">
                            <span class="px-2 py-0.5 text-2xs font-bold border rounded-md uppercase tracking-wider ${actionBadgeColor}">
                                ${h.action}
                            </span>
                        </td>
                        <td class="py-3.5 px-6">
                            <div class="font-bold text-slate-800">${labelTable}</div>
                            <div class="text-3xs text-slate-400 font-bold uppercase">Folio: #PR-${h.record_id}</div>
                        </td>
                        <td class="py-3.5 px-6 text-brand-700 font-bold">${h.field_name || '-'}</td>
                        <td class="py-3.5 px-6 text-slate-600 font-medium max-w-[200px]" title="${h.old_value || ''}">${h.old_value || '-'}</td>
                        <td class="py-3.5 px-6 text-slate-950 font-semibold">${valHtml}</td>
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
