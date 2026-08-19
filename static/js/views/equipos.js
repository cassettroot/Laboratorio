async function renderEquiposList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in text-white">
            <!-- Barra de Filtros en Cristal Esmerilado -->
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between no-print glass-toolbar p-4 rounded-2xl">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1 max-w-3xl">
                    <div class="relative w-full md:w-80">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                        <input type="text" id="search-input" placeholder="🔍 Buscar por ID, Nombre, Inventario, Serie..." class="w-full glass-input pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold">
                    </div>
                    <select id="sort-equipos" class="glass-input px-3.5 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer">
                        <option value="id_asc">🆔 Orden: ID (Menor a Mayor)</option>
                        <option value="id_desc">🆔 Orden: ID (Mayor a Menor)</option>
                        <option value="name_asc">🔤 Orden: Nombre (A - Z)</option>
                        <option value="name_desc">🔤 Orden: Nombre (Z - A)</option>
                        <option value="inventory_asc">🏷️ Orden: No. Inventario</option>
                        <option value="serial_asc">🔢 Orden: No. Serie</option>
                    </select>
                </div>
                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
                    <button onclick="openEquipoModal()" class="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-violet-500/25 shrink-0">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>+ Registrar Bien/Equipo</span>
                    </button>
                ` : ''}
            </div>

            <!-- Tabla de Datos Glassmorphism -->
            <div class="glass-table-container">
                <div class="overflow-x-auto">
                    <table class="glass-table w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr>
                                <th class="py-4 px-3 text-center w-20">ID / FOLIO</th>
                                <th class="py-4 px-3 text-center w-24">ID EXCEL</th>
                                <th class="py-4 px-5">DESCRIPCIÓN DEL BIEN</th>
                                <th class="py-4 px-4">NO. INVENTARIO</th>
                                <th class="py-4 px-4">MARCA / CATEGORÍA</th>
                                <th class="py-4 px-4">SERIE</th>
                                <th class="py-4 px-4">OBSERVACIONES</th>
                                <th class="py-4 px-4 no-print text-center w-24">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody id="equipos-table-body" class="divide-y divide-white/5 text-slate-200 font-medium">
                            <tr>
                                <td colspan="8" class="p-12 text-center text-slate-400 font-bold">
                                    Cargando inventario de bienes y equipos...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="p-4 glass-toolbar flex items-center justify-between text-xs text-slate-300 font-semibold shrink-0 rounded-none border-t border-white/5">
                    <span id="equipos-count">Mostrando 0 bienes</span>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    await loadEquiposData();
    
    document.getElementById('search-input')?.addEventListener('input', applyEquiposFilters);
    document.getElementById('sort-equipos')?.addEventListener('change', applyEquiposFilters);
}

async function loadEquiposData() {
    try {
        const res = await fetch('/api/chemical-materials');
        const data = await res.json();
        if (data.status === 'success') {
            state.equipos = data.data;
            applyEquiposFilters();
        } else {
            document.getElementById('equipos-table-body').innerHTML = `<tr><td colspan="8" class="p-12 text-center text-rose-400 font-bold">Error al cargar datos.</td></tr>`;
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('equipos-table-body').innerHTML = `<tr><td colspan="8" class="p-12 text-center text-rose-400 font-bold">Error de conexión.</td></tr>`;
    }
}

function renderEquiposTable(items) {
    const tbody = document.getElementById('equipos-table-body');
    const countEl = document.getElementById('equipos-count');
    
    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-12 text-center text-slate-400 font-bold">No se encontraron bienes o equipos registrados.</td></tr>`;
        if (countEl) countEl.textContent = 'Mostrando 0 bienes';
        return;
    }

    if (countEl) countEl.textContent = `Mostrando ${items.length} bienes / equipos`;

    tbody.innerHTML = items.map(item => `
        <tr class="transition">
            <td class="py-4 px-3 text-center align-middle">
                <span class="font-mono font-black text-violet-400 text-xs px-2.5 py-1 rounded-lg glass-pill inline-block shadow-2xs">#${item.id}</span>
            </td>
            <td class="py-4 px-3 text-center align-middle font-mono font-bold text-amber-300 text-xs">
                ${item.original_id ? `<span class="bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md inline-block">#${item.original_id}</span>` : '—'}
            </td>
            <td class="py-4 px-5">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl glass-card flex items-center justify-center text-slate-400 overflow-hidden shrink-0 border border-white/10 shadow-sm">
                        ${item.image_path 
                            ? `<img src="${item.image_path}" class="w-full h-full object-cover">`
                            : `<i data-lucide="monitor" class="w-4 h-4 text-violet-400"></i>`
                        }
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="font-bold text-white text-sm mb-0.5 truncate">${item.name || item.nombre || 'Sin nombre'}</div>
                        <div class="text-3xs text-slate-400 line-clamp-1 max-w-[220px]" title="${item.location || item.caracteristicas_bien || ''}">📍 ${item.location || item.caracteristicas_bien || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td class="py-4 px-4 font-mono font-bold text-slate-200">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    ${item.inventory_number || item.no_inventario || '—'}
                </span>
            </td>
            <td class="py-4 px-4">
                <div class="text-xs font-semibold text-slate-200">${item.category || item.marca || 'Sistemas'}</div>
                <div class="text-3xs text-slate-400">${item.status || item.modelo || 'Buenas Condiciones'}</div>
            </td>
            <td class="py-4 px-4 font-mono font-bold text-sky-300 text-3xs">
                ${item.serial_number || item.serie ? (item.serial_number || item.serie) : '—'}
            </td>
            <td class="py-4 px-4 text-3xs font-medium text-slate-300 max-w-[180px] truncate" title="${item.observations || item.valor || ''}">
                ${item.observations || item.valor || '—'}
            </td>
            <td class="py-4 px-4 no-print text-center align-middle">
                <div class="flex items-center justify-center gap-1.5">
                    <a href="#/chemical-materials/${item.id}" class="p-2 glass-btn text-slate-200 hover:text-white rounded-xl transition hover:border-violet-400/50" title="Ver Detalles">
                        <i data-lucide="eye" class="w-3.5 h-3.5 text-violet-300"></i>
                    </a>
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
                        <button onclick="openEquipoModal(${item.id})" class="p-2 glass-btn text-slate-200 hover:text-white rounded-xl transition hover:border-indigo-400/50" title="Editar">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5 text-indigo-300"></i>
                        </button>
                        <button onclick="deleteItem('chemical_materials', ${item.id})" class="p-2 glass-btn bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border-rose-500/30 rounded-xl transition" title="Eliminar">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

function applyEquiposFilters() {
    const searchEl = document.getElementById('search-input');
    const sortEl = document.getElementById('sort-equipos');
    
    const query = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const sortBy = sortEl ? sortEl.value : 'id_asc';
    
    let items = [...(state.equipos || [])];
    
    if (query) {
        items = items.filter(item => {
            const name = (item.name || item.nombre || '').toLowerCase();
            const inv = (item.inventory_number || item.no_inventario || '').toLowerCase();
            const serial = (item.serial_number || item.serie || '').toLowerCase();
            const sep = (item.no_sep || '').toLowerCase();
            const idStr = String(item.id);
            const obs = (item.observations || item.caracteristicas_bien || '').toLowerCase();
            return name.includes(query) || inv.includes(query) || serial.includes(query) || sep.includes(query) || idStr.includes(query) || obs.includes(query);
        });
    }

    items.sort((a, b) => {
        if (sortBy === 'id_asc') return a.id - b.id;
        if (sortBy === 'id_desc') return b.id - a.id;
        if (sortBy === 'name_asc') return (a.name || a.nombre || '').localeCompare(b.name || b.nombre || '', 'es');
        if (sortBy === 'name_desc') return (b.name || b.nombre || '').localeCompare(a.name || a.nombre || '', 'es');
        if (sortBy === 'inventory_asc') return (a.inventory_number || a.no_inventario || '').localeCompare(b.inventory_number || b.no_inventario || '', 'es');
        if (sortBy === 'serial_asc') return (a.serial_number || a.serie || '').localeCompare(b.serial_number || b.serie || '', 'es');
        return a.id - b.id;
    });

    renderEquiposTable(items);
}

function openEquipoModal(id = null) {
    if (id !== null) {
        openEditModal('chemical_materials', id);
    } else {
        openAddModal('chemical_materials');
    }
}
