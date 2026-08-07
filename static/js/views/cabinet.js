// static/js/views/cabinet.js
// ORGANIZADOR DE REACTIVOS 2X3 (GABINETE DE 6 SECCIONES - DARK MODE UI)

window.renderCabinetView = async function(container) {
    container.innerHTML = '<div class="p-12 text-center text-slate-400 font-bold animate-pulse">Cargando organizador 2x3...</div>';
    
    let allSubstances = [];
    try {
        const invId = window.state ? (window.state.inventoryId || 'inventario') : 'inventario';
        const res = await fetch(`/api/substances?inventory_id=${invId}`).then(r => r.json());
        allSubstances = res.data || [];
        if (window.state) window.state.substances = allSubstances;
    } catch(err) {
        console.error("Error al cargar sustancias para el gabinete: ", err);
        container.innerHTML = '<div class="p-12 text-center text-rose-500 font-bold">Error al cargar datos del organizador.</div>';
        return;
    }
    
    // Agrupar sustancias por locación en cuadrícula 2x3
    const shelfMap = {};
    const rows = 3;
    const cols = ['A', 'B'];
    
    for (let r = 1; r <= rows; r++) {
        for (let c of cols) {
            shelfMap[`${r}-${c}`] = [];
        }
    }
    
    allSubstances.forEach(s => {
        let loc = (s.location || '').trim();
        // Si no coincide con formato R-C (1-A, 1-B, 2-A, 2-B, 3-A, 3-B), mapear inteligentemente
        if (!shelfMap[loc]) {
            const locLower = loc.toLowerCase();
            if (locLower.includes('3-b') || locLower.includes('tóxic') || locLower.includes('reactiv')) loc = '3-B';
            else if (locLower.includes('3-a') || locLower.includes('inflam')) loc = '3-A';
            else if (locLower.includes('2-a') || locLower.includes('ácid')) loc = '2-A';
            else if (locLower.includes('2-b') || locLower.includes('base')) loc = '2-B';
            else if (locLower.includes('1-b') || locLower.includes('bioló')) loc = '1-B';
            else loc = '1-A';
        }
        if (!shelfMap[loc]) shelfMap[loc] = [];
        shelfMap[loc].push(s);
    });

    const rowDesc = {
        1: 'REACTIVOS GENERALES & BIOLÓGICOS',
        2: 'ÁCIDOS Y BASES CORROSIVAS',
        3: 'INFLAMABLES, OXIDANTES Y TÓXICOS'
    };

    const getShelfBorderAndGlow = (r, c) => {
        if (r === 3 && c === 'B') return { border: 'border-l-rose-500', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.12)]', badgeColor: 'text-rose-400', label: '🚨 TÓXICOS Y REACTIVOS' };
        if (r === 3 && c === 'A') return { border: 'border-l-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.12)]', badgeColor: 'text-amber-400', label: '🔥 LÍQUIDOS INFLAMABLES' };
        if (r === 2 && c === 'A') return { border: 'border-l-sky-500', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.12)]', badgeColor: 'text-sky-400', label: '🧪 ÁCIDOS CORROSIVOS' };
        if (r === 2 && c === 'B') return { border: 'border-l-indigo-500', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.12)]', badgeColor: 'text-indigo-400', label: '⚗️ BASES Y ALCALINOS' };
        if (r === 1 && c === 'B') return { border: 'border-l-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.12)]', badgeColor: 'text-emerald-400', label: '🌱 BIOLÓGICOS Y SALES' };
        return { border: 'border-l-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.12)]', badgeColor: 'text-emerald-400', label: '📦 REACTIVOS GENERALES' };
    };

    let gridHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-5xl mx-auto pb-12">';
    for (let r = 1; r <= rows; r++) {
        gridHtml += `
            <div class="col-span-1 sm:col-span-2 flex items-center justify-between text-xs font-black text-cyan-400 uppercase tracking-wider mt-6 mb-2 border-b border-slate-800 pb-2">
                <span class="flex items-center gap-2">
                    <i data-lucide="layers" class="w-4 h-4 text-cyan-400"></i>
                    <span>NIVEL ${r} - ${rowDesc[r]}</span>
                </span>
                <span class="text-3xs font-extrabold bg-slate-900 text-slate-400 px-3 py-1 rounded-full border border-slate-800">Casilleros ${r}-A / ${r}-B</span>
            </div>
        `;
        for (let c of cols) {
            const loc = `${r}-${c}`;
            const items = shelfMap[loc] || [];
            const info = getShelfBorderAndGlow(r, c);
            
            gridHtml += `
                <div onclick="openCabinetShelfModal('${loc}')" class="cursor-pointer transition transform hover:scale-[1.02] hover:-translate-y-0.5 border border-slate-800 bg-slate-900/90 rounded-2xl p-5 flex flex-col justify-between h-36 border-l-4 ${info.border} ${info.glow} relative group">
                    <div class="flex justify-between items-start">
                        <div class="space-y-0.5">
                            <span class="font-black text-white text-2xl font-mono tracking-tight group-hover:text-cyan-300 transition">${loc}</span>
                            <span class="block text-3xs font-extrabold ${info.badgeColor} uppercase tracking-wider">${info.label}</span>
                        </div>
                        <span class="bg-slate-800/90 text-slate-200 border border-slate-700/80 px-3 py-1 rounded-xl text-xs font-extrabold shadow-sm">${items.length} items</span>
                    </div>
                    <div class="text-xs font-medium text-slate-300 mt-auto line-clamp-2 leading-snug">
                        ${items.length > 0 ? items.map(i => i.name).join(', ') : '<span class="text-slate-500 italic">Estante disponible / Vacío</span>'}
                    </div>
                </div>
            `;
        }
    }
    gridHtml += '</div>';

    container.innerHTML = `
        <div class="p-6 animate-fade-in max-w-5xl mx-auto">
            <!-- TARJETA CONTENEDORA SUPERIOR -->
            <div class="bg-slate-900/90 rounded-3xl p-6 shadow-xl border border-slate-800 mb-6 flex flex-col sm:flex-row gap-6 items-center text-white">
                <div class="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm border border-cyan-500/30">
                    <i data-lucide="grid-3x3" class="w-7 h-7"></i>
                </div>
                <div>
                    <h2 class="text-xl font-black text-white mb-1">Almacén</h2>
                    <p class="text-xs text-slate-400 leading-relaxed max-w-3xl">
                        Visualización de la distribución segura de sustancias químicas en el almacén basada en clasificación SGA, compatibilidad química y grado de peligrosidad.
                    </p>
                </div>
            </div>
            ${gridHtml}
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Guardar mapa para uso en el modal
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

    modal.className = 'fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in';
    
    modal.innerHTML = `
        <div class="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div class="px-6 py-4 bg-slate-950 flex justify-between items-center shrink-0 border-b border-slate-800">
                <h3 class="text-lg font-black text-white flex items-center gap-2">
                    <i data-lucide="box" class="w-5 h-5 text-cyan-400"></i>
                    <span>Contenido del Estante ${loc}</span>
                </h3>
                <button onclick="document.getElementById('cabinet-modal').remove()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700">✕</button>
            </div>
            
            <div class="p-4 overflow-y-auto flex-1 divide-y divide-slate-800">
                ${items.length === 0 ? '<div class="p-8 text-center text-slate-500 font-bold">Estante vacío</div>' : items.map(s => `
                    <div class="py-3 flex items-center justify-between gap-4 hover:bg-slate-800/80 rounded-2xl px-3 transition">
                        <div class="flex items-center gap-3 min-w-0">
                            ${s.image_path ? `<img src="${s.image_path}" class="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0">` : '<div class="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 text-xs shrink-0 font-bold">🧪</div>'}
                            <div class="min-w-0">
                                <a href="#/substances/${s.id}" onclick="document.getElementById('cabinet-modal').remove()" class="font-extrabold text-white text-sm hover:text-cyan-300 transition truncate block">${s.name}</a>
                                <div class="text-xs text-slate-400 truncate">${s.chemical_formula || ''} ${s.cas_number ? `| CAS: ${s.cas_number}` : ''}</div>
                                ${s.substance_group ? `<div class="text-3xs font-black text-amber-400 uppercase tracking-wider mt-0.5 truncate">${s.substance_group}</div>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <div class="text-xs font-black text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-xl text-center hidden sm:block">
                                ${s.quantity} <span class="text-3xs text-cyan-400">${s.unit}</span>
                            </div>
                            <select onchange="moveSubstanceToCabinet(${s.id}, this.value, '${loc}')" class="text-xs font-bold border border-slate-700 rounded-xl py-1.5 px-2 bg-slate-950 text-white outline-none focus:border-cyan-400 cursor-pointer hover:bg-slate-800 shadow-sm" title="Mover a otra sección">
                                <option value="" disabled selected>Mover...</option>
                                <option value="1-A">1-A</option>
                                <option value="1-B">1-B</option>
                                <option value="2-A">2-A</option>
                                <option value="2-B">2-B</option>
                                <option value="3-A">3-A</option>
                                <option value="3-B">3-B</option>
                            </select>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
};

window.moveSubstanceToCabinet = async function(id, newLoc, oldLoc) {
    if (!newLoc || newLoc === oldLoc) return;
    try {
        const res = await fetch(`/api/substances/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: newLoc })
        }).then(r => r.json());
        
        if (res.status === 'success') {
            const substance = (window.state && window.state.substances) ? window.state.substances.find(s => s.id === id) : null;
            if (substance) substance.location = newLoc;
            
            const mainEl = document.getElementById('main-content');
            renderCabinetView(mainEl);
            
            const modal = document.getElementById('cabinet-modal');
            if (modal) modal.remove();
            openCabinetShelfModal(oldLoc);
        } else {
            alert('Error al mover reactivo: ' + (res.message || 'Error desconocido'));
        }
    } catch(err) {
        console.error(err);
        alert('Error de conexión al intentar mover el reactivo.');
    }
};
