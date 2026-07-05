async function renderDidacticMaterialsList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div class="relative w-full md:w-64">
                        <input id="search-didactic" type="text" placeholder="Buscar material didáctico..." class="w-full bg-white border border-slate-300 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-brand-500 outline-none transition shadow-sm">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                    </div>
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                    ${(state.isLoggedIn && state.userRole === 'admin') ? `
                    <button onclick="exportTableToExcel('didactic_materials')" class="bg-white hover:bg-slate-50 border border-slate-300 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Exportar Excel</span>
                    </button>
                    ` : ''}
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                    <button onclick="openAddModal('didactic_materials')" class="bg-brand-600 hover:bg-brand-700 font-bold px-5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg shadow-brand-600/10">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Registrar Recurso</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                                <th class="py-4 px-6">Material Didáctico</th>
                                <th class="py-4 px-6">Categoría</th>
                                <th class="py-4 px-6">Estado</th>
                                <th class="py-4 px-6">Cantidad</th>
                                <th class="py-4 px-6">Ubicación</th>
                                <th class="py-4 px-6">Responsable</th>
                                <th class="py-4 px-6 no-print text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="didactic-table-body" class="divide-y divide-slate-100 text-slate-700 font-medium">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">Cargando recursos didácticos...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const fetchAndRender = async () => {
        const search = document.getElementById('search-didactic').value;
        const body = document.getElementById('didactic-table-body');

        try {
            const url = new URL('/api/didactic-materials', window.location.origin);
            if (search) url.searchParams.append('search', search);

            const res = await fetch(url).then(r => r.json());
            state.didMaterials = res.data || [];

            if (state.didMaterials.length === 0) {
                body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">No se encontraron materiales didácticos.</td></tr>`;
                return;
            }

            const isLogged = state.isLoggedIn;

            body.innerHTML = state.didMaterials.map(d => {
                let statusColor = 'bg-slate-100 text-slate-700';
                if (d.status === 'Nuevo' || d.status === 'Completo') statusColor = 'bg-emerald-50 text-emerald-700';
                if (d.status === 'Incompleto' || d.status === 'Dañado') statusColor = 'bg-amber-50 text-amber-700';

                return `
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200/50 shrink-0">
                                    ${d.image_path ? `<img src="${d.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="graduation-cap" class="w-5 h-5"></i>`}
                                </div>
                                <div>
                                    <a href="#/didactic-materials/${d.id}" class="text-sm font-bold text-slate-900 hover:text-brand-600 transition block">${d.name}</a>
                                    <span class="text-3xs text-slate-400 uppercase tracking-wider">ID: LAB-DID-${d.id}</span>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-6 text-slate-600 font-semibold">${d.category || '-'}</td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-0.5 rounded-md text-2xs font-bold ${statusColor}">${d.status || 'N/D'}</span>
                        </td>
                        <td class="py-4 px-6">
                            <span class="text-sm font-bold text-slate-900">${d.quantity}</span>
                            <span class="text-xs text-slate-500">unidades</span>
                        </td>
                        <td class="py-4 px-6 text-slate-600">${d.location || '-'}</td>
                        <td class="py-4 px-6 text-slate-500 text-xs">${d.responsible || '-'}</td>
                        <td class="py-4 px-6 no-print text-right">
                            <div class="flex items-center justify-end gap-1.5">
                                <a href="#/didactic-materials/${d.id}" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </a>
                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                <button onclick="openEditModal('didactic_materials', ${d.id})" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition">
                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                </button>
                                <button onclick="deleteItem('didactic_materials', ${d.id})" class="p-2 hover:bg-red-50 text-red-500 rounded-lg transition">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-red-500 font-bold">Error al cargar datos.</td></tr>`;
        }
    };

    document.getElementById('search-didactic').addEventListener('input', fetchAndRender);
    fetchAndRender();
}
