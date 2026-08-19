async function renderDidacticMaterialsList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in text-white">
            <!-- Barra de Herramientas Flotante en Cristal Esmerilado -->
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between no-print glass-toolbar p-4 rounded-2xl">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1 max-w-3xl">
                    <div class="relative w-full md:w-80">
                        <input id="search-didactic" type="text" placeholder="🔍 Buscar material didáctico..." class="w-full glass-input pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                    </div>
                    <select id="sort-didactic" class="glass-input px-3.5 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer">
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
                    <button onclick="openQRBatchModal('didactic_materials')" class="glass-btn bg-indigo-600/80 hover:bg-indigo-600 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-white flex items-center gap-2 transition shrink-0" title="Imprimir/Descargar Códigos QR">
                        <i data-lucide="qr-code" class="w-4 h-4 text-amber-300"></i>
                        <span>QR Masivo</span>
                    </button>
                    <button onclick="exportTableToExcel('didactic_materials')" class="glass-btn hover:border-teal-400/50 font-extrabold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition text-white shrink-0">
                        <i data-lucide="download" class="w-4 h-4 text-teal-400"></i>
                        <span>Excel</span>
                    </button>
                    ` : ''}
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                    <button onclick="openAddModal('didactic_materials')" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm text-slate-950 flex items-center gap-2 transition shadow-lg shrink-0">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>+ Registrar Recurso</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <!-- Tabla de Datos Refinada (Glassmorphism de Alta Fidelidad) -->
            <div class="glass-table-container">
                <div class="overflow-x-auto">
                    <table class="glass-table w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr>
                                <th class="py-4 px-3 text-center w-20">ID / FOLIO</th>
                                <th class="py-4 px-5">DESCRIPCIÓN DEL MATERIAL</th>
                                <th class="py-4 px-4">CATEGORÍA</th>
                                <th class="py-4 px-4">ESTADO</th>
                                <th class="py-4 px-4">CANTIDAD</th>
                                <th class="py-4 px-4">UBICACIÓN</th>
                                <th class="py-4 px-4 no-print text-center w-24">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody id="didactic-table-body" class="divide-y divide-white/5 text-slate-200 font-medium">
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
                body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400 font-bold">No se encontraron materiales didácticos.</td></tr>`;
                return;
            }

            const isLogged = state.isLoggedIn;

            body.innerHTML = state.didMaterials.map(d => {
                let statusBadge = `<span class="status-badge-good"><span class="status-dot-good"></span>Buenas Condiciones</span>`;
                const st = (d.status || '').toLowerCase();
                if (st.includes('excelente') || st.includes('nuevo') || st.includes('completo') || st.includes('buenas condiciones')) {
                    statusBadge = `<span class="status-badge-good"><span class="status-dot-good"></span>${d.status || 'Buenas Condiciones'}</span>`;
                } else if (st.includes('dañado') || st.includes('roto') || st.includes('incompleto') || st.includes('inoperativo')) {
                    statusBadge = `<span class="status-badge-danger"><span class="status-dot-danger"></span>${d.status || 'Incompleto'}</span>`;
                } else if (st.includes('bueno') || st.includes('regular') || st.includes('mantenimiento')) {
                    statusBadge = `<span class="status-badge-warn"><span class="status-dot-warn"></span>${d.status || 'Bueno'}</span>`;
                }

                return `
                    <tr class="transition">
                        <td class="py-4 px-3 text-center align-middle">
                            <span class="font-mono font-black text-teal-400 text-xs px-2.5 py-1 rounded-lg glass-pill inline-block shadow-2xs">#${d.id}</span>
                        </td>
                        <td class="py-4 px-5">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl glass-card flex items-center justify-center text-slate-400 overflow-hidden shrink-0 border border-white/10 shadow-sm">
                                    ${d.image_path ? `<img src="${d.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="graduation-cap" class="w-4 h-4 text-teal-400"></i>`}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <a href="#/didactic-materials/${d.id}" class="text-xs sm:text-sm font-black text-white hover:text-teal-300 transition block truncate leading-tight">${d.name}</a>
                                    ${d.observations ? `<p class="text-3xs text-slate-400 truncate mt-0.5">${d.observations}</p>` : ''}
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-4 font-semibold text-slate-300">${d.category || 'General'}</td>
                        <td class="py-4 px-4">${statusBadge}</td>
                        <td class="py-4 px-4 font-mono font-bold text-teal-300">${d.quantity || 0} pzs</td>
                        <td class="py-4 px-4 font-medium text-slate-300">📍 ${d.location || 'Sin asignar'}</td>
                        <td class="py-4 px-4 no-print text-center align-middle">
                            <div class="flex items-center justify-center gap-1.5">
                                <a href="#/didactic-materials/${d.id}" class="p-2 glass-btn text-slate-200 hover:text-white rounded-xl transition hover:border-teal-400/50" title="Ver ficha">
                                    <i data-lucide="eye" class="w-3.5 h-3.5 text-teal-300"></i>
                                </a>
                                ${(isLogged && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                <button onclick="openEditModal('didactic_materials', ${d.id})" class="p-2 glass-btn text-slate-200 hover:text-white rounded-xl transition hover:border-indigo-400/50" title="Editar">
                                    <i data-lucide="edit-3" class="w-3.5 h-3.5 text-indigo-300"></i>
                                </button>
                                <button onclick="deleteItem('didactic_materials', ${d.id})" class="p-2 glass-btn bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border-rose-500/30 rounded-xl transition" title="Eliminar">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error("Error al cargar materiales didácticos:", err);
            body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-rose-400 font-bold">Error de conexión al cargar datos.</td></tr>`;
        }
    };

    document.getElementById('search-didactic').addEventListener('input', fetchAndRender);
    document.getElementById('sort-didactic').addEventListener('change', fetchAndRender);
    fetchAndRender();
}
