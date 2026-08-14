async function renderChemicalMaterialsList(container) {
    let currentPage = 1;
    const pageSize = 24;
    let searchTimeout = null;
    let currentViewMode = 'table'; // 'table' | 'grid'

    container.innerHTML = `
        <div class="space-y-6 animate-fade-in text-white">
            <!-- Encabezado con Título y Tarjetas de Métricas de Alto Impacto -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/80 p-5 rounded-3xl shadow-xl backdrop-blur-md">
                <div class="flex items-center gap-3.5">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 shrink-0">
                        <i data-lucide="flask-conical" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-black tracking-tight text-white">Materiales Químicos</h1>
                            <span class="text-3xs font-black uppercase tracking-widest bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2.5 py-0.5 rounded-full">Laboratorio de Química</span>
                        </div>
                        <p class="text-xs text-slate-400 font-medium mt-0.5">Control de utensilios, recipientes, cristalería y materiales de laboratorio</p>
                    </div>
                </div>

                <!-- Tarjetas Métricas Rápidas -->
                <div class="grid grid-cols-3 gap-2.5 w-full lg:w-auto">
                    <div class="bg-slate-950/70 border border-slate-800 px-3.5 py-2.5 rounded-2xl text-center flex-1">
                        <span class="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Total Items</span>
                        <span id="stat-total-chem" class="text-base sm:text-lg font-black text-teal-400">...</span>
                    </div>
                    <div class="bg-slate-950/70 border border-slate-800 px-3.5 py-2.5 rounded-2xl text-center flex-1">
                        <span class="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Óptimo Estado</span>
                        <span id="stat-good-chem" class="text-base sm:text-lg font-black text-emerald-400">...</span>
                    </div>
                    <div class="bg-slate-950/70 border border-slate-800 px-3.5 py-2.5 rounded-2xl text-center flex-1">
                        <span class="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Mantenimiento</span>
                        <span id="stat-bad-chem" class="text-base sm:text-lg font-black text-rose-400">...</span>
                    </div>
                </div>
            </div>

            <!-- Barra de Filtros, Búsqueda y Selector de Vista (Fila Compacta) -->
            <div class="sticky -top-4 z-20 py-2 space-y-3 no-print flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800/80">
                <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
                    <div class="relative w-full md:w-80">
                        <input id="search-materials" type="text" placeholder="🔍 Buscar por ID, Barras, Nombre, Inventario, Serie, SEP..." class="w-full bg-slate-900 border border-slate-700/80 pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm focus:border-teal-500 outline-none transition shadow-sm font-medium text-white placeholder:text-slate-400">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5"></i>
                    </div>
                    <select id="filter-status" class="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-xl text-xs sm:text-sm outline-none transition shadow-sm focus:border-teal-500 font-semibold text-slate-200 cursor-pointer">
                        <option value="">🛡️ -- Estado --</option>
                        <option value="Buenas Condiciones">Buenas Condiciones</option>
                        <option value="Nuevo">Nuevo</option>
                        <option value="Excelente">Excelente</option>
                        <option value="Bueno">Bueno</option>
                        <option value="Dañado">Dañado</option>
                        <option value="Roto">Roto / Incompleto</option>
                    </select>
                    <select id="sort-materials" class="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-xl text-xs sm:text-sm outline-none transition shadow-sm focus:border-teal-500 font-semibold text-slate-200 cursor-pointer">
                        <option value="id_desc" selected>🆔 Más Recientes Primero</option>
                        <option value="id_asc">🆔 ID (Menor a Mayor)</option>
                        <option value="name_asc">🔤 Nombre (A - Z)</option>
                        <option value="name_desc">🔤 Nombre (Z - A)</option>
                        <option value="inventory_asc">🏷️ No. Inventario</option>
                        <option value="serial_asc">🔢 No. Serie</option>
                        <option value="sep_asc">🏛️ No. SEP</option>
                    </select>
                </div>

                <div class="flex items-center gap-2 w-full md:w-auto justify-end">
                    <!-- Alternador de Vista (Tabla vs Tarjetas Grid) -->
                    <div class="flex items-center bg-slate-900 border border-slate-700/80 p-1 rounded-xl shrink-0">
                        <button id="view-btn-table" class="p-1.5 rounded-lg bg-teal-600 text-white transition shadow-sm" title="Vista de Tabla">
                            <i data-lucide="list" class="w-4 h-4"></i>
                        </button>
                        <button id="view-btn-grid" class="p-1.5 rounded-lg text-slate-400 hover:text-white transition" title="Vista de Tarjetas (Grid)">
                            <i data-lucide="layout-grid" class="w-4 h-4"></i>
                        </button>
                    </div>

                    ${(state.isLoggedIn && state.userRole === 'admin') ? `
                    <button onclick="openQRBatchModal('chemical_materials')" class="bg-indigo-600 hover:bg-indigo-700 font-bold px-3 py-2 rounded-xl text-xs text-white flex items-center gap-1.5 transition shadow-md shrink-0" title="Imprimir/Descargar Códigos QR">
                        <i data-lucide="qr-code" class="w-3.5 h-3.5 text-amber-300"></i>
                        <span class="hidden sm:inline">🖨️ QR</span>
                    </button>
                    <button onclick="exportTableToExcel('chemical_materials')" class="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition text-white shadow-sm shrink-0">
                        <i data-lucide="download" class="w-3.5 h-3.5 text-teal-400"></i>
                        <span class="hidden sm:inline">Excel</span>
                    </button>
                    ` : ''}
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
                    <button onclick="openAddModal('chemical_materials')" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 font-extrabold px-3.5 py-2 rounded-xl text-xs text-white flex items-center gap-1.5 transition shadow-lg shrink-0">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>+ Registrar</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <!-- Vista 1: Tabla Compacta con Contraste AAA -->
            <div id="materials-container-table" class="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div class="w-full overflow-x-auto">
                    <table class="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr class="bg-slate-950 border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-3xs sm:text-2xs">
                                <th class="py-3.5 px-3 text-center w-24">ID / Folio</th>
                                <th class="py-3.5 px-4">Descripción del Material</th>
                                <th class="py-3.5 px-3">Números de Control (Inv / SEP / Serie)</th>
                                <th class="py-3.5 px-3">Ubicación y Estado</th>
                                <th class="py-3.5 px-3 no-print text-center w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="materials-table-body" class="divide-y divide-slate-800/80 text-slate-200 font-medium">
                            <tr>
                                <td colspan="5" class="py-12 text-center text-slate-400 font-bold">Cargando materiales químicos...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Vista 2: Grid de Tarjetas Visuales (Oculto por defecto) -->
            <div id="materials-container-grid" class="hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <!-- Se llena dinámicamente -->
            </div>

            <!-- Barra de Paginación Fluida y Compacta -->
            <div id="materials-pagination-bar" class="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-semibold no-print shadow-lg">
                <div id="materials-pagination-info">Mostrando 0 registros</div>
                <div class="flex items-center gap-2">
                    <button id="btn-prev-page" class="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition">
                        ◀ Anterior
                    </button>
                    <span id="materials-page-indicator" class="text-white font-extrabold px-2">Página 1</span>
                    <button id="btn-next-page" class="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition">
                        Siguiente ▶
                    </button>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Toggle entre vista de tabla y grid
    const tableBtn = document.getElementById('view-btn-table');
    const gridBtn = document.getElementById('view-btn-grid');
    const tableContainer = document.getElementById('materials-container-table');
    const gridContainer = document.getElementById('materials-container-grid');

    const setViewMode = (mode) => {
        currentViewMode = mode;
        if (mode === 'table') {
            tableBtn.className = 'p-1.5 rounded-lg bg-teal-600 text-white transition shadow-sm';
            gridBtn.className = 'p-1.5 rounded-lg text-slate-400 hover:text-white transition';
            tableContainer.classList.remove('hidden');
            gridContainer.classList.add('hidden');
        } else {
            gridBtn.className = 'p-1.5 rounded-lg bg-teal-600 text-white transition shadow-sm';
            tableBtn.className = 'p-1.5 rounded-lg text-slate-400 hover:text-white transition';
            gridContainer.classList.remove('hidden');
            tableContainer.classList.add('hidden');
        }
        fetchAndRender();
    };

    tableBtn.addEventListener('click', () => setViewMode('table'));
    gridBtn.addEventListener('click', () => setViewMode('grid'));

    const fetchAndRender = async () => {
        const body = document.getElementById('materials-table-body');
        const gridBody = document.getElementById('materials-container-grid');
        if (!body) return;

        try {
            const search = document.getElementById('search-materials').value;
            const status = document.getElementById('filter-status').value;

            const url = new URL('/api/chemical-materials', window.location.origin);
            if (search) url.searchParams.append('search', search);
            if (status) url.searchParams.append('status', status);

            const res = await fetch(url).then(r => r.json());
            let materialsList = res.data || [];

            // Calcular Métricas
            const totalCount = materialsList.length;
            const goodCount = materialsList.filter(m => {
                const st = (m.status || '').toLowerCase();
                return st.includes('buena') || st.includes('excelente') || st.includes('nuevo') || st.includes('bueno');
            }).length;
            const badCount = totalCount - goodCount;

            document.getElementById('stat-total-chem').textContent = totalCount;
            document.getElementById('stat-good-chem').textContent = goodCount;
            document.getElementById('stat-bad-chem').textContent = badCount;

            const sortBy = document.getElementById('sort-materials').value;
            materialsList.sort((a, b) => {
                if (sortBy === 'id_desc') return b.id - a.id;
                if (sortBy === 'id_asc') return a.id - b.id;
                if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'inventory_asc') return (a.inventory_number || '').localeCompare(b.inventory_number || '', 'es');
                if (sortBy === 'serial_asc') return (a.serial_number || '').localeCompare(b.serial_number || '', 'es');
                if (sortBy === 'sep_asc') return (a.no_sep || '').localeCompare(b.no_sep || '', 'es');
                return b.id - a.id;
            });

            state.chemMaterials = materialsList;
            const totalItems = state.chemMaterials.length;

            if (totalItems === 0) {
                body.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-400 font-bold">No se encontraron materiales con los filtros aplicados.</td></tr>`;
                gridBody.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 font-bold bg-slate-900/80 rounded-2xl border border-slate-800">No se encontraron materiales con los filtros aplicados.</div>`;
                document.getElementById('materials-pagination-info').textContent = 'Mostrando 0 de 0 registros';
                document.getElementById('materials-page-indicator').textContent = 'Página 0 de 0';
                document.getElementById('btn-prev-page').disabled = true;
                document.getElementById('btn-next-page').disabled = true;
                return;
            }

            const totalPages = Math.ceil(totalItems / pageSize);
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalItems);
            const pageSlice = state.chemMaterials.slice(startIndex, endIndex);

            document.getElementById('materials-pagination-info').textContent = `Mostrando ${startIndex + 1}–${endIndex} de ${totalItems} materiales`;
            document.getElementById('materials-page-indicator').textContent = `Página ${currentPage} de ${totalPages}`;
            document.getElementById('btn-prev-page').disabled = currentPage === 1;
            document.getElementById('btn-next-page').disabled = currentPage === totalPages;

            // Renderizado Vista de Tabla (Con colores de texto corregidos y alta legibilidad)
            body.innerHTML = pageSlice.map(m => {
                let statusBadge = `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black px-2 py-0.5 rounded-md text-3xs inline-block shadow-2xs">Buenas Condiciones</span>`;
                const st = (m.status || '').toLowerCase();
                if (st.includes('excelente') || st.includes('nuevo')) {
                    statusBadge = `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black px-2 py-0.5 rounded-md text-3xs inline-block shadow-2xs">${m.status}</span>`;
                } else if (st.includes('dañado') || st.includes('roto') || st.includes('inoperativo')) {
                    statusBadge = `<span class="bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black px-2 py-0.5 rounded-md text-3xs inline-block shadow-2xs">${m.status}</span>`;
                } else if (st.includes('bueno') || st.includes('regular') || st.includes('mantenimiento')) {
                    statusBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black px-2 py-0.5 rounded-md text-3xs inline-block shadow-2xs">${m.status}</span>`;
                }

                const noSep = m.no_sep && m.no_sep !== 'SIN NUMERO DE SEP' ? m.no_sep : null;
                const noSerie = m.serial_number && m.serial_number !== 'SIN NUMERO DE SERIE' ? m.serial_number : null;

                return `
                    <tr class="hover:bg-slate-800/80 transition border-b border-slate-800/80">
                        <td class="py-3.5 px-3 text-center align-middle">
                            <span class="font-mono font-black text-teal-400 text-xs block">#${m.id}</span>
                            ${m.original_id ? `<span class="text-3xs font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded inline-block mt-0.5" title="ID Excel DEPTO CB">Excel #${m.original_id}</span>` : ''}
                        </td>
                        <td class="py-3.5 px-4">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-700 shrink-0 shadow-inner">
                                    ${m.image_path ? `<img src="${m.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="flask-conical" class="w-4 h-4 text-teal-400"></i>`}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <a href="#/chemical-materials/${m.id}" class="text-xs sm:text-sm font-black text-white hover:text-teal-300 transition block truncate leading-tight">${m.name}</a>
                                    <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                                        ${m.capacity ? `<span class="text-3xs font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.2 rounded font-bold">${m.capacity}</span>` : ''}
                                        ${m.barcode ? `<span class="text-3xs font-mono bg-teal-500/20 text-teal-300 border border-teal-500/40 px-1.5 py-0.2 rounded font-bold">📊 ${m.barcode}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="py-3.5 px-3">
                            <div class="flex flex-col gap-0.5">
                                <span class="text-3xs font-mono font-black text-slate-200 truncate" title="No. Inventario">${m.inventory_number ? 'INV: ' + m.inventory_number : 'INV: —'}</span>
                                ${noSep ? `<span class="text-3xs font-mono font-bold text-emerald-400 truncate" title="No. SEP">SEP: ${noSep}</span>` : ''}
                                ${noSerie ? `<span class="text-3xs font-mono font-bold text-sky-400 truncate" title="No. Serie">SERIE: ${noSerie}</span>` : ''}
                            </div>
                        </td>
                        <td class="py-3.5 px-3">
                            <span class="block text-xs font-extrabold text-slate-300 truncate max-w-[160px]" title="${m.location || 'Sin asignar'}">📍 ${m.location || 'Sin asignar'}</span>
                            <div class="mt-1">${statusBadge}</div>
                        </td>
                        <td class="py-3.5 px-3 no-print text-center align-middle">
                            <div class="flex items-center justify-center gap-1.5">
                                <a href="#/chemical-materials/${m.id}" class="p-1.5 bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition shadow-sm" title="Ver ficha detallada">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </a>
                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
                                <button onclick="openEditModal('chemical_materials', ${m.id})" class="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition shadow-sm" title="Editar">
                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                </button>
                                <button onclick="deleteItem('chemical_materials', ${m.id})" class="p-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl transition shadow-sm" title="Eliminar">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Renderizado Vista de Grid (Tarjetas Visuales Premium)
            gridBody.innerHTML = pageSlice.map(m => {
                let statusBadge = `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black px-2 py-0.5 rounded-lg text-3xs">Buenas Condiciones</span>`;
                const st = (m.status || '').toLowerCase();
                if (st.includes('excelente') || st.includes('nuevo')) {
                    statusBadge = `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black px-2 py-0.5 rounded-lg text-3xs">${m.status}</span>`;
                } else if (st.includes('dañado') || st.includes('roto') || st.includes('inoperativo')) {
                    statusBadge = `<span class="bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black px-2 py-0.5 rounded-lg text-3xs">${m.status}</span>`;
                } else if (st.includes('bueno') || st.includes('regular') || st.includes('mantenimiento')) {
                    statusBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black px-2 py-0.5 rounded-lg text-3xs">${m.status}</span>`;
                }

                return `
                    <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-teal-500/50 hover:shadow-2xl transition group relative overflow-hidden">
                        <div>
                            <!-- Header de la tarjeta -->
                            <div class="flex items-start justify-between gap-2 mb-3">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-mono font-black text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-lg">#${m.id}</span>
                                    ${m.original_id ? `<span class="text-3xs font-mono text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-lg">Excel #${m.original_id}</span>` : ''}
                                </div>
                                ${statusBadge}
                            </div>

                            <!-- Imagen y Título -->
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-700/80 overflow-hidden flex items-center justify-center text-slate-400 shrink-0 group-hover:scale-105 transition">
                                    ${m.image_path ? `<img src="${m.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="flask-conical" class="w-6 h-6 text-teal-400"></i>`}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <a href="#/chemical-materials/${m.id}" class="text-sm font-black text-white hover:text-teal-300 transition line-clamp-2 leading-snug">${m.name}</a>
                                    <p class="text-xs font-bold text-slate-400 mt-0.5 truncate">📍 ${m.location || 'Sin ubicación'}</p>
                                </div>
                            </div>

                            <!-- Badges e Identificadores -->
                            <div class="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 space-y-1 text-3xs font-mono">
                                <div class="flex justify-between text-slate-300">
                                    <span class="text-slate-500 font-sans">No. Inventario:</span>
                                    <span class="font-black">${m.inventory_number || '—'}</span>
                                </div>
                                ${m.capacity ? `
                                <div class="flex justify-between text-sky-300">
                                    <span class="text-slate-500 font-sans">Capacidad:</span>
                                    <span class="font-black">${m.capacity}</span>
                                </div>
                                ` : ''}
                                ${m.barcode ? `
                                <div class="flex justify-between text-teal-300">
                                    <span class="text-slate-500 font-sans">Código Barras:</span>
                                    <span class="font-black">📊 ${m.barcode}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Botones de Acción -->
                        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <a href="#/chemical-materials/${m.id}" class="flex-1 bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white text-xs font-bold py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                <span>Ver Ficha</span>
                            </a>
                            ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
                            <button onclick="openEditModal('chemical_materials', ${m.id})" class="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl transition border border-slate-700" title="Editar">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="deleteItem('chemical_materials', ${m.id})" class="p-2 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl transition border border-rose-500/40" title="Eliminar">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            body.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-rose-400 font-bold">Error al cargar datos.</td></tr>`;
        }
    };

    // Eventos de paginación
    document.getElementById('btn-prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchAndRender();
        }
    });
    document.getElementById('btn-next-page').addEventListener('click', () => {
        currentPage++;
        fetchAndRender();
    });

    // Debounce de búsqueda para no sobrecargar CPU/Red al escribir
    document.getElementById('search-materials').addEventListener('input', () => {
        currentPage = 1;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchAndRender, 300);
    });

    document.getElementById('sort-materials').addEventListener('change', () => {
        currentPage = 1;
        fetchAndRender();
    });

    document.getElementById('filter-status').addEventListener('change', () => {
        currentPage = 1;
        fetchAndRender();
    });

    fetchAndRender();
}
