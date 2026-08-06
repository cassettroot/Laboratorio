async function renderEquiposList(container) {
    container.innerHTML = `
        <div class="flex flex-col gap-6 h-full">
            <div class="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 shrink-0">
                <div class="flex-1 flex gap-4 items-center">
                    <div class="relative w-96">
                        <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                        <input type="text" id="search-input" placeholder="Buscar bien o equipo..." class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white font-medium text-slate-700">
                    </div>
                </div>
                ${state.userRole !== 'estudiante' ? `
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
                                <th class="p-4 font-bold rounded-tl-3xl">ID / Nombre</th>
                                <th class="p-4 font-bold">No. Inventario</th>
                                <th class="p-4 font-bold">Marca / Modelo</th>
                                <th class="p-4 font-bold">Serie</th>
                                <th class="p-4 font-bold">Valor</th>
                                <th class="p-4 font-bold text-center rounded-tr-3xl">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="equipos-table-body" class="divide-y divide-slate-50">
                            <tr>
                                <td colspan="6" class="p-8 text-center text-slate-500">
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
    
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        filterEquiposTable(e.target.value);
    });
}

async function loadEquiposData() {
    try {
        const res = await fetch('/api/equipos');
        const data = await res.json();
        if (data.status === 'success') {
            state.equipos = data.data;
            renderEquiposTable(state.equipos);
        } else {
            document.getElementById('equipos-table-body').innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500 font-bold">Error al cargar datos.</td></tr>`;
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('equipos-table-body').innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500 font-bold">Error de conexión.</td></tr>`;
    }
}

function renderEquiposTable(items) {
    const tbody = document.getElementById('equipos-table-body');
    const countEl = document.getElementById('equipos-count');
    
    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-medium">No se encontraron bienes o equipos registrados.</td></tr>`;
        countEl.textContent = 'Mostrando 0 bienes';
        return;
    }

    countEl.textContent = `Mostrando ${items.length} bienes`;

    tbody.innerHTML = items.map(item => `
        <tr class="hover:bg-slate-50/80 transition group">
            <td class="p-4 align-top">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        ${item.image_path 
                            ? `<img src="${item.image_path}" class="w-full h-full object-cover">`
                            : `<i data-lucide="monitor" class="w-5 h-5 text-slate-400"></i>`
                        }
                    </div>
                    <div>
                        <div class="font-bold text-slate-800 text-sm mb-0.5">${item.nombre}</div>
                        <div class="text-xs text-slate-500 line-clamp-1 max-w-[200px]" title="${item.caracteristicas_bien || 'Sin características'}">${item.caracteristicas_bien || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td class="p-4 align-top">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 font-mono">
                    ${item.no_inventario || 'N/A'}
                </span>
            </td>
            <td class="p-4 align-top">
                <div class="text-sm font-semibold text-slate-700">${item.marca || 'N/A'}</div>
                <div class="text-xs text-slate-400">${item.modelo || 'N/A'}</div>
            </td>
            <td class="p-4 align-top">
                <div class="text-sm text-slate-600 font-mono">${item.serie || 'N/A'}</div>
            </td>
            <td class="p-4 align-top">
                <div class="text-sm font-bold text-emerald-600">${item.valor ? '$' + item.valor : 'N/A'}</div>
            </td>
            <td class="p-4 align-top text-center">
                <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <a href="#/equipos/${item.id}" class="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition" title="Ver Detalles">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </a>
                    ${state.userRole !== 'estudiante' ? `
                        <button onclick="openEquipoModal(${item.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        ${state.userRole === 'admin' ? `
                            <button onclick="confirmDelete(${item.id}, 'equipos')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

function filterEquiposTable(query) {
    const term = query.toLowerCase().trim();
    if (!term) {
        renderEquiposTable(state.equipos || []);
        return;
    }
    const filtered = (state.equipos || []).filter(item => 
        item.nombre?.toLowerCase().includes(term) ||
        item.no_inventario?.toLowerCase().includes(term) ||
        item.marca?.toLowerCase().includes(term) ||
        item.modelo?.toLowerCase().includes(term) ||
        item.serie?.toLowerCase().includes(term) ||
        item.caracteristicas_bien?.toLowerCase().includes(term)
    );
    renderEquiposTable(filtered);
}

function openEquipoModal(id = null) {
    const isEdit = id !== null;
    let item = null;
    if (isEdit) {
        item = (state.equipos || []).find(e => e.id === id);
    }
    
    const formHtml = `
        <form id="equipo-form" class="space-y-6">
            <input type="hidden" id="equipo-id" value="${item ? item.id : ''}">
            
            <div class="grid grid-cols-2 gap-6">
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre del Bien *</label>
                    <input type="text" id="eq-nombre" required value="${item ? item.nombre : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white font-medium text-slate-800">
                </div>
                
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Características</label>
                    <textarea id="eq-caracteristicas" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white font-medium text-slate-800">${item ? (item.caracteristicas_bien || '') : ''}</textarea>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">No. Inventario</label>
                    <input type="text" id="eq-no-inventario" value="${item ? (item.no_inventario || '') : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white font-medium text-slate-800">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor ($)</label>
                    <input type="number" step="0.01" id="eq-valor" value="${item ? (item.valor || '') : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white font-medium text-slate-800">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Marca</label>
                    <input type="text" id="eq-marca" value="${item ? (item.marca || '') : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white font-medium text-slate-800">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Modelo</label>
                    <input type="text" id="eq-modelo" value="${item ? (item.modelo || '') : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white font-medium text-slate-800">
                </div>
                
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Número de Serie</label>
                    <input type="text" id="eq-serie" value="${item ? (item.serie || '') : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white font-medium text-slate-800">
                </div>
            </div>
        </form>
    `;
    
    openModal(
        isEdit ? 'Editar Bien/Equipo' : 'Registrar Bien/Equipo',
        formHtml,
        async () => {
            const form = document.getElementById('equipo-form');
            if (!form.reportValidity()) return false;
            
            const payload = {
                nombre: document.getElementById('eq-nombre').value,
                caracteristicas_bien: document.getElementById('eq-caracteristicas').value,
                no_inventario: document.getElementById('eq-no-inventario').value,
                valor: document.getElementById('eq-valor').value,
                marca: document.getElementById('eq-marca').value,
                modelo: document.getElementById('eq-modelo').value,
                serie: document.getElementById('eq-serie').value,
            };
            
            try {
                const url = isEdit ? `/api/equipos/${id}` : '/api/equipos';
                const method = isEdit ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if (data.status === 'success') {
                    closeModal();
                    await loadEquiposData();
                    return true;
                } else {
                    alert('Error: ' + data.message);
                    return false;
                }
            } catch (err) {
                alert('Error de conexión');
                return false;
            }
        }
    );
}
