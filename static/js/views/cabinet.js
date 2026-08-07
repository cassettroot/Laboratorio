window.renderCabinetView = function(container) {
    const allSubstances = state.substances || [];
    
    // Agrupar por locación
    const shelfMap = {};
    const rows = 6;
    const cols = ['A', 'B'];
    
    for (let r = 1; r <= rows; r++) {
        for (let c of cols) {
            shelfMap[`${r}-${c}`] = [];
        }
    }
    
    allSubstances.forEach(s => {
        let loc = s.location || '1-A'; // Default si no tiene
        if (!shelfMap[loc]) shelfMap[loc] = [];
        shelfMap[loc].push(s);
    });

    const colTitles = {
        'A': 'Columna Izquierda',
        'B': 'Columna Derecha'
    };

    const rowDesc = {
        1: 'Reactivos Generales / Sales Inertes',
        2: 'Colorantes / Sales',
        3: 'Bases y Ácidos Orgánicos',
        4: 'Ácidos Fuertes y Tóxicos',
        5: 'Oxidantes e Inflamables Sólidos',
        6: 'Inflamables Líquidos (Solventes)'
    };

    const getShelfColor = (r, c) => {
        // Colores para identificar zonas de riesgo
        if (r === 6) return 'bg-red-100 border-red-300';
        if (r === 5 && c === 'B') return 'bg-red-50 border-red-200';
        if (r === 5 && c === 'A') return 'bg-yellow-100 border-yellow-300';
        if (r === 4 && c === 'B') return 'bg-purple-100 border-purple-300';
        if (r === 4 && c === 'A') return 'bg-orange-100 border-orange-300';
        if (r === 3) return 'bg-blue-50 border-blue-200';
        return 'bg-slate-50 border-slate-200';
    };

    let gridHtml = '<div class="grid grid-cols-2 gap-4 max-w-4xl mx-auto pb-12">';
    for (let r = 1; r <= rows; r++) {
        gridHtml += `<div class="col-span-2 text-center text-xs font-bold text-slate-400 mt-4 mb-1 uppercase tracking-widest border-b border-slate-200 pb-1">Nivel ${r} - ${rowDesc[r]}</div>`;
        for (let c of cols) {
            const loc = `${r}-${c}`;
            const items = shelfMap[loc] || [];
            const colorClass = getShelfColor(r, c);
            
            gridHtml += `
                <div onclick="openCabinetShelfModal('${loc}')" class="cursor-pointer transition transform hover:scale-105 hover:shadow-lg border-2 rounded-xl p-4 flex flex-col justify-between h-32 ${colorClass}">
                    <div class="flex justify-between items-start">
                        <span class="font-extrabold text-slate-800 text-xl">${loc}</span>
                        <span class="bg-white/90 px-2 py-1 rounded-md text-xs font-bold text-slate-700 shadow-sm">${items.length} ítems</span>
                    </div>
                    <div class="text-xs font-semibold text-slate-700 mt-auto line-clamp-2 leading-tight">
                        ${items.slice(0, 3).map(i => i.name).join(', ')}${items.length > 3 ? '...' : ''}
                    </div>
                </div>
            `;
        }
    }
    gridHtml += '</div>';

    container.innerHTML = `
        <div class="p-6 animate-fade-in max-w-5xl mx-auto">
            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-6 items-center">
                <div class="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-indigo-200">
                    <i data-lucide="grid-3x3" class="w-8 h-8"></i>
                </div>
                <div>
                    <h2 class="text-xl font-extrabold text-slate-900 mb-1">Organizador de Reactivos 2x6</h2>
                    <p class="text-sm text-slate-500">Visualización de la distribución segura de sustancias químicas en el estante de 12 espacios basada en compatibilidad y peligrosidad.</p>
                </div>
            </div>
            ${gridHtml}
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Guardar para uso en modal
    window.cabinetShelfMap = shelfMap;
};

window.openCabinetShelfModal = function(loc) {
    const items = window.cabinetShelfMap[loc] || [];
    let modal = document.getElementById('cabinet-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cabinet-modal';
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div class="px-6 py-4 bg-slate-800 flex justify-between items-center shrink-0">
                <h3 class="text-lg font-extrabold text-white flex items-center gap-2">
                    <i data-lucide="box" class="w-5 h-5 text-indigo-400"></i>
                    Contenido del Casillero ${loc}
                </h3>
                <button onclick="document.getElementById('cabinet-modal').remove()" class="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition">✕</button>
            </div>
            
            <div class="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
                ${items.length === 0 ? '<div class="p-8 text-center text-slate-400 font-medium">Casillero vacío</div>' : items.map(s => `
                    <div class="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 rounded-xl px-2 transition">
                        <div class="flex items-center gap-3 min-w-0">
                            ${s.image_path ? `<img src="${s.image_path}" class="w-12 h-12 rounded-lg object-cover bg-white border border-slate-200 shrink-0">` : '<div class="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs shrink-0">QR</div>'}
                            <div class="min-w-0">
                                <a href="#/substances/${s.id}" onclick="document.getElementById('cabinet-modal').remove()" class="font-bold text-slate-800 text-sm hover:text-indigo-600 transition truncate block">${s.name}</a>
                                <div class="text-xs text-slate-500 truncate">${s.chemical_formula || ''} ${s.cas_number ? `| CAS: ${s.cas_number}` : ''}</div>
                                ${s.substance_group ? `<div class="text-3xs font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">${s.substance_group}</div>` : ''}
                            </div>
                        </div>
                        <div class="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg shrink-0 text-center">
                            ${s.quantity} <span class="text-3xs text-indigo-500">${s.unit}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
};
