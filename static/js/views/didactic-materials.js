async function renderDidacticMaterialsList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in text-white">
            <!-- Barra de Herramientas Flotante (Sin Contenedor Claro Intermedio) -->
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1 max-w-3xl">
                    <div class="relative w-full md:w-80">
                        <input id="search-didactic" type="text" placeholder="🔍 Buscar material didáctico..." class="w-full bg-slate-800/80 border border-slate-700/80 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-emerald-500 outline-none transition shadow-sm font-semibold text-white placeholder:text-slate-400">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                    </div>
                    <select id="sort-didactic" class="bg-slate-800/80 border border-slate-700/80 px-3.5 py-2.5 rounded-xl text-sm outline-none transition shadow-sm focus:border-emerald-500 font-semibold text-white cursor-pointer">
                        <option value="name_asc">🔤 Orden: Nombre (A - Z)</option>
                        <option value="name_desc">🔤 Orden: Nombre (Z - A)</option>
                        <option value="quantity_desc">📦 Orden: Cantidad (Mayor a Menor)</option>
                        <option value="quantity_asc">📦 Orden: Cantidad (Menor a Mayor)</option>
                        <option value="id_desc">🆕 Orden: Registro (Recientes)</option>
                        <option value="id_asc">⌛ Orden: Registro (Antiguos)</option>
                    </select>
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                    ${(state.isLoggedIn && state.userRole === 'admin') ? `
                    <button onclick="exportTableToExcel('didactic_materials')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 font-extrabold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-200 hover:text-white shadow-sm">
                        <i data-lucide="download" class="w-4 h-4 text-emerald-400"></i>
                        <span>Exportar Excel</span>
                    </button>
                    ` : ''}
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                    <button onclick="openAddModal('didactic_materials')" class="bg-emerald-600 hover:bg-emerald-500 font-extrabold px-5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg shadow-emerald-600/20">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Registrar Recurso</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <!-- Tabla de Datos Refinada (Glassmorphism de Alta Fidelidad) -->
            <div class="glass-card-premium rounded-3xl border border-slate-700/60 shadow-xl overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-slate-900 border-b border-slate-700/80 text-slate-300 font-extrabold uppercase tracking-wider text-xs">
                                <th class="py-4 px-6">Material Didáctico</th>
                                <th class="py-4 px-6">Categoría</th>
                                <th class="py-4 px-6">Estado</th>
                                <th class="py-4 px-6">Cantidad</th>
                                <th class="py-4 px-6">Ubicación</th>
                                <th class="py-4 px-6">Responsable</th>
                                <th class="py-4 px-6 no-print text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="didactic-table-body" class="divide-y divide-slate-700/50 text-slate-200 font-medium">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400 font-bold">Cargando materiales didácticos...</td>
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
            let materialsList = res.data || [];

            const sortBy = document.getElementById('sort-didactic').value;
            materialsList.sort((a, b) => {
                if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'quantity_desc') return (b.quantity || 0) - (a.quantity || 0);
                if (sortBy === 'quantity_asc') return (a.quantity || 0) - (b.quantity || 0);
                if (sortBy === 'id_asc') return a.id - b.id;
                if (sortBy === 'id_desc') return b.id - a.id;
                return (a.name || '').localeCompare(b.name || '', 'es');
            });

            state.didMaterials = materialsList;

            if (state.didMaterials.length === 0) {
                body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">No se encontraron materiales didácticos.</td></tr>`;
                return;
            }

            const isLogged = state.isLoggedIn;

            body.innerHTML = state.didMaterials.map(d => {
                let statusBadge = `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold px-3 py-1 rounded-lg text-2xs inline-block shadow-2xs">${d.status || 'Excelente'}</span>`;
                const st = (d.status || '').toLowerCase();
                if (st.includes('excelente') || st.includes('nuevo') || st.includes('completo') || st.includes('buenas condiciones')) {
                    statusBadge = `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold px-3 py-1 rounded-lg text-2xs inline-block shadow-2xs">${d.status || 'Excelente'}</span>`;
                } else if (st.includes('dañado') || st.includes('roto') || st.includes('incompleto') || st.includes('inoperativo')) {
                    statusBadge = `<span class="bg-rose-500/20 text-rose-400 border border-rose-500/40 font-extrabold px-3 py-1 rounded-lg text-2xs inline-block shadow-2xs">${d.status || 'Incompleto'}</span>`;
                } else if (st.includes('bueno') || st.includes('regular') || st.includes('mantenimiento')) {
                    statusBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold px-3 py-1 rounded-lg text-2xs inline-block shadow-2xs">${d.status || 'Bueno'}</span>`;
                }

                return `
                    <tr class="hover:bg-slate-800/60 transition border-b border-slate-800/60">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-700 shrink-0">
                                    ${d.image_path ? `<img src="${d.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="graduation-cap" class="w-5 h-5 text-emerald-400"></i>`}
                                </div>
                                <div>
                                    <a href="#/didactic-materials/${d.id}" class="text-sm font-extrabold text-white hover:text-emerald-400 transition block leading-snug">${d.name}</a>
                                    <span class="text-3xs text-emerald-400 font-extrabold uppercase tracking-wider">ID: LAB-DID-${d.id}</span>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-6 text-white font-extrabold text-xs">${d.category || d.subject || '-'}</td>
                        <td class="py-4 px-6">
                            ${statusBadge}
                        </td>
                        <td class="py-4 px-6">
                            <span class="text-sm font-extrabold text-white">${d.quantity || d.stock || 1}</span>
                            <span class="text-xs font-semibold text-slate-300">unidades</span>
                        </td>
                        <td class="py-4 px-6 text-slate-200 font-bold text-xs max-w-[180px] truncate" title="${d.location || ''}">${d.location || '-'}</td>
                        <td class="py-4 px-6 text-slate-300 font-semibold text-xs">${d.responsible || '-'}</td>
                        <td class="py-4 px-6 no-print text-right">
                            <div class="flex items-center justify-end gap-1.5">
                                <a href="#/didactic-materials/${d.id}" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition shadow-2xs" title="Ver Ficha Detallada">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </a>
                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                <button onclick="openEditModal('didactic_materials', ${d.id})" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition shadow-2xs" title="Editar Material">
                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                </button>
                                <button onclick="deleteItem('didactic_materials', ${d.id})" class="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl transition shadow-2xs" title="Eliminar Material">
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
    document.getElementById('sort-didactic').addEventListener('change', fetchAndRender);
    fetchAndRender();
}
