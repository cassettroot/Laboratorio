async function renderEquiposList(container) {
    container.innerHTML = `
        <div class="flex flex-col gap-6 h-full">
            <div class="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 shrink-0 gap-4">
                <div class="flex-1 flex flex-wrap gap-3 items-center min-w-[280px]">
                    <div class="relative flex-1 min-w-[240px]">
                        <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                        <input type="text" id="search-input" placeholder="🔍 Buscar por ID, Nombre, Inventario, Serie..." class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white font-medium text-slate-700">
                    </div>
                    <select id="sort-equipos" class="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm outline-none transition focus:border-brand-500 font-semibold text-slate-700">
                        <option value="id_asc">🆔 Orden: ID (Menor a Mayor)</option>
                        <option value="id_desc">🆔 Orden: ID (Mayor a Menor)</option>
                        <option value="name_asc">🔤 Orden: Nombre (A - Z)</option>
                        <option value="name_desc">🔤 Orden: Nombre (Z - A)</option>
                        <option value="inventory_asc">🏷️ Orden: No. Inventario</option>
                        <option value="serial_asc">🔢 Orden: No. Serie</option>
                    </select>
                </div>
                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
                    <button onclick="openEquipoModal()" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-brand-500/30">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                        <span>Registrar Bien/Equipo</span>
                    </button>
                ` : ''}
            </div>

            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div class="overflow-x-auto flex-1">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider bg-slate-50/50">
                                <th class="p-4 font-bold rounded-tl-3xl text-center">ID Lab</th>
                                <th class="p-4 font-bold text-center">ID Excel</th>
                                <th class="p-4 font-bold">Nombre / Ubicación</th>
                                <th class="p-4 font-bold">No. Inventario</th>
                                <th class="p-4 font-bold">Marca / Categoría</th>
                                <th class="p-4 font-bold">Serie</th>
                                <th class="p-4 font-bold">Observaciones</th>
                                <th class="p-4 font-bold text-center rounded-tr-3xl">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="equipos-table-body" class="divide-y divide-slate-50">
                            <tr>
                                <td colspan="8" class="p-8 text-center text-slate-500">
                                    <div class="flex justify-center mb-2"><div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>
                                    Cargando inventario...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500 shrink-0 rounded-b-3xl">
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
            document.getElementById('equipos-table-body').innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500 font-bold">Error al cargar datos.</td></tr>`;
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('equipos-table-body').innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500 font-bold">Error de conexión.</td></tr>`;
    }
}

function renderEquiposTable(items) {
    const tbody = document.getElementById('equipos-table-body');
    const countEl = document.getElementById('equipos-count');
    
    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 font-medium">No se encontraron bienes o equipos registrados.</td></tr>`;
        if (countEl) countEl.textContent = 'Mostrando 0 bienes';
        return;
    }

    if (countEl) countEl.textContent = `Mostrando ${items.length} bienes / equipos`;

    tbody.innerHTML = items.map(item => `
        <tr class="hover:bg-slate-50/80 transition group">
            <td class="p-4 align-top text-center font-mono font-bold text-slate-500 text-xs">${item.id}</td>
            <td class="p-4 align-top text-center font-mono font-extrabold text-amber-700 text-xs">${item.original_id ? '#' + item.original_id : '-'}</td>
            <td class="p-4 align-top">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        ${item.image_path 
                            ? `<img src="${item.image_path}" class="w-full h-full object-cover">`
                            : `<i data-lucide="monitor" class="w-5 h-5 text-slate-400"></i>`
                        }
                    </div>
                    <div>
                        <div class="font-bold text-slate-800 text-sm mb-0.5">${item.name || item.nombre || 'Sin nombre'}</div>
                        <div class="text-xs text-slate-500 line-clamp-1 max-w-[200px]" title="${item.location || item.caracteristicas_bien || ''}">${item.location || item.caracteristicas_bien || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td class="p-4 align-top">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                    ${item.inventory_number || item.no_inventario || '-'}
                </span>
            </td>
            <td class="p-4 align-top">
                <div class="text-sm font-semibold text-slate-700">${item.category || item.marca || 'Sistemas'}</div>
                <div class="text-xs text-slate-400">${item.status || item.modelo || 'Buenas Condiciones'}</div>
            </td>
            <td class="p-4 align-top">
                <div class="text-sm text-blue-800 font-mono font-semibold">${item.serial_number || item.serie || '-'}</div>
            </td>
            <td class="p-4 align-top">
                <div class="text-xs font-semibold text-slate-600">${item.observations || item.valor || '-'}</div>
            </td>
            <td class="p-4 align-top text-center">
                <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <a href="#/chemical-materials/${item.id}" class="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition" title="Ver Detalles">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </a>
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
                        <button onclick="openEquipoModal(${item.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteItem('chemical_materials', ${item.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
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
