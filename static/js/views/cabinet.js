// static/js/views/cabinet.js
// ALMACÉN Y ORGANIZADOR VIRTUAL 2X3 ADAPTABLE A LOS 3 ESPACIOS (QUÍMICA, OFICINA, SISTEMAS)

window.renderCabinetView = async function(container) {
    container.innerHTML = '<div class="p-12 text-center text-teal-400 font-bold animate-pulse">Cargando almacén virtual...</div>';
    
    const invId = (window.state && window.state.inventoryId) ? window.state.inventoryId : (localStorage.getItem('active_inventory_id') || 'inventario');
    
    let allItems = [];
    
    // Configuración según el espacio actual
    let spaceConfig = {
        title: 'Almacén de Reactivos y Materiales',
        subtitle: 'Distribución física en gabinete basada en clasificación SGA, compatibilidad química y seguridad.',
        icon: 'flask-conical',
        rows: 3,
        cols: ['A', 'B'],
        rowDesc: {
            1: 'REACTIVOS GENERALES & BIOLÓGICOS',
            2: 'ÁCIDOS Y BASES CORROSIVAS',
            3: 'INFLAMABLES, OXIDANTES Y TÓXICOS'
        },
        shelves: {
            '1-A': { label: '📦 REACTIVOS GENERALES & FRASCOS', border: 'border-l-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]', badgeColor: 'text-emerald-400' },
            '1-B': { label: '🌱 BIOLÓGICOS, SALES & SOLUCIONES', border: 'border-l-teal-500', glow: 'shadow-[0_0_15px_rgba(20,184,166,0.15)]', badgeColor: 'text-teal-400' },
            '2-A': { label: '🧪 ÁCIDOS CORROSIVOS & CRISTALERÍA', border: 'border-l-sky-500', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]', badgeColor: 'text-sky-400' },
            '2-B': { label: '⚗️ BASES, ALCALINOS & PROBETAS', border: 'border-l-indigo-500', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)]', badgeColor: 'text-indigo-400' },
            '3-A': { label: '🔥 LÍQUIDOS INFLAMABLES & SOLVENTES', border: 'border-l-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]', badgeColor: 'text-amber-400' },
            '3-B': { label: '🚨 TÓXICOS, OXIDANTES & PELIGRO', border: 'border-l-rose-500', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]', badgeColor: 'text-rose-400' }
        }
    };

    if (invId === 'oficina') {
        spaceConfig = {
            title: 'Almacén de Oficina - Distribución y Organización',
            subtitle: 'Visualización del resguardo y almacenamiento de insumos, papelería, mobiliario y equipos de oficina.',
            icon: 'briefcase',
            rows: 3,
            cols: ['A', 'B'],
            rowDesc: {
                1: 'PAPELERÍA & ARCHIVO GENERAL',
                2: 'EQUIPOS DE OFICINA & COMUNICACIÓN',
                3: 'MOBILIARIO & ALMACÉN DE RESERVA'
            },
            shelves: {
                '1-A': { label: '📂 ARCHIVO, CARPETAS Y EXPEDIENTES', border: 'border-l-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]', badgeColor: 'text-emerald-400' },
                '1-B': { label: '🖊️ PAPELERÍA, CONSUMIBLES E INSUMOS', border: 'border-l-teal-500', glow: 'shadow-[0_0_15px_rgba(20,184,166,0.15)]', badgeColor: 'text-teal-400' },
                '2-A': { label: '🖨️ IMPRESORAS, ESCÁNERES Y PERIFÉRICOS', border: 'border-l-sky-500', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]', badgeColor: 'text-sky-400' },
                '2-B': { label: '💻 EQUIPOS DE CÓMPUTO Y TELÉFONOS', border: 'border-l-indigo-500', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)]', badgeColor: 'text-indigo-400' },
                '3-A': { label: '🪑 MOBILIARIO, ESCRITORIOS Y SILLAS', border: 'border-l-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]', badgeColor: 'text-amber-400' },
                '3-B': { label: '📦 ALMACÉN GENERAL & PAQUETERÍA', border: 'border-l-rose-500', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]', badgeColor: 'text-rose-400' }
            }
        };
    } else if (invId === 'sistemas') {
        spaceConfig = {
            title: 'Almacén de Sistemas - Racks, Servidores y Hardware',
            subtitle: 'Control y organización de infraestructura informática, servidores, equipos de cómputo, cables y componentes.',
            icon: 'server',
            rows: 3,
            cols: ['A', 'B'],
            rowDesc: {
                1: 'INFRAESTRUCTURA DE RED & SERVIDORES',
                2: 'ESTACIONES DE TRABAJO & MONITORES',
                3: 'COMPONENTES, REFACCIONES & CABLEADO'
            },
            shelves: {
                '1-A': { label: '🖥️ RACK PRINCIPAL: SERVIDORES & UPS', border: 'border-l-indigo-500', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)]', badgeColor: 'text-indigo-400' },
                '1-B': { label: '🌐 SWITCHES, ROUTERS & PATCH PANELS', border: 'border-l-cyan-500', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]', badgeColor: 'text-cyan-400' },
                '2-A': { label: '💻 ESTACIONES DE TRABAJO & LAPTOPS', border: 'border-l-teal-500', glow: 'shadow-[0_0_15px_rgba(20,184,166,0.15)]', badgeColor: 'text-teal-400' },
                '2-B': { label: '🖥️ MONITORES, TECLADOS & PERIFÉRICOS', border: 'border-l-sky-500', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]', badgeColor: 'text-sky-400' },
                '3-A': { label: '🔌 FUENTES, TARJETAS, RAM & DISCOS', border: 'border-l-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]', badgeColor: 'text-amber-400' },
                '3-B': { label: '🛠️ CABLES, ADAPTADORES & HERRAMIENTAS', border: 'border-l-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]', badgeColor: 'text-emerald-400' }
            }
        };
    }

    try {
        const fetchHeaders = { 'X-Inventory-Id': invId };
        
        if (invId === 'inventario') {
            const [subRes, matRes] = await Promise.all([
                fetch(`/api/substances?inventory_id=${invId}`, { headers: fetchHeaders }).then(r => r.json()).catch(() => ({ data: [] })),
                fetch(`/api/chemical-materials?inventory_id=${invId}`, { headers: fetchHeaders }).then(r => r.json()).catch(() => ({ data: [] }))
            ]);
            
            const subs = (subRes.data || []).map(s => ({ ...s, _itemType: 'substance' }));
            const mats = (matRes.data || []).map(m => ({ ...m, _itemType: 'chemical_material' }));
            allItems = [...subs, ...mats];
            if (window.state) window.state.substances = subRes.data || [];
        } else {
            // Oficina o Sistemas
            const [eqRes, matRes] = await Promise.all([
                fetch(`/api/equipos?inventory_id=${invId}`, { headers: fetchHeaders }).then(r => r.json()).catch(() => ({ data: [] })),
                fetch(`/api/chemical-materials?inventory_id=${invId}`, { headers: fetchHeaders }).then(r => r.json()).catch(() => ({ data: [] }))
            ]);
            
            const eqs = (eqRes.data || []).map(e => ({ ...e, _itemType: 'equipo' }));
            const mats = (matRes.data || []).map(m => ({ ...m, _itemType: 'chemical_material' }));
            allItems = [...eqs, ...mats];
        }
    } catch (err) {
        console.error("Error cargando elementos para el almacén:", err);
    }

    // Inicializar mapa de estantes
    const shelfMap = {};
    for (let r = 1; r <= spaceConfig.rows; r++) {
        for (let c of spaceConfig.cols) {
            shelfMap[`${r}-${c}`] = [];
        }
    }

    // Distribuir elementos de forma inteligente si no tienen locación exacta R-C
    allItems.forEach((item, idx) => {
        let loc = (item.location || '').trim();
        if (!shelfMap[loc]) {
            const locLower = loc.toLowerCase();
            const nameLower = (item.name || '').toLowerCase();
            
            if (invId === 'inventario') {
                if (locLower.includes('3-b') || locLower.includes('tóxic') || nameLower.includes('ácido nítrico') || nameLower.includes('cianuro') || nameLower.includes('mercurio')) loc = '3-B';
                else if (locLower.includes('3-a') || locLower.includes('inflam') || nameLower.includes('etanol') || nameLower.includes('acetona') || nameLower.includes('alcohol') || nameLower.includes('metanol') || nameLower.includes('éter')) loc = '3-A';
                else if (locLower.includes('2-a') || locLower.includes('ácid') || nameLower.includes('ácido') || nameLower.includes('clorhídrico') || nameLower.includes('sulfúrico')) loc = '2-A';
                else if (locLower.includes('2-b') || locLower.includes('base') || nameLower.includes('hidróxido') || nameLower.includes('sosa') || nameLower.includes('amonio') || nameLower.includes('potasio')) loc = '2-B';
                else if (locLower.includes('1-b') || locLower.includes('bioló') || nameLower.includes('agar') || nameLower.includes('solución') || nameLower.includes('cloruro') || nameLower.includes('sal')) loc = '1-B';
                else if (locLower.includes('1-a')) loc = '1-A';
                else {
                    // Distribución uniforme por defecto
                    const keys = ['1-A', '1-B', '2-A', '2-B', '3-A', '3-B'];
                    loc = keys[idx % keys.length];
                }
            } else if (invId === 'oficina') {
                if (nameLower.includes('archivo') || nameLower.includes('carpeta') || nameLower.includes('expediente') || nameLower.includes('folder')) loc = '1-A';
                else if (nameLower.includes('papel') || nameLower.includes('tinta') || nameLower.includes('pluma') || nameLower.includes('engrapadora') || nameLower.includes('bolígrafo')) loc = '1-B';
                else if (nameLower.includes('impresora') || nameLower.includes('escáner') || nameLower.includes('multifuncional') || nameLower.includes('toner')) loc = '2-A';
                else if (nameLower.includes('laptop') || nameLower.includes('teléfono') || nameLower.includes('computadora') || nameLower.includes('tablet')) loc = '2-B';
                else if (nameLower.includes('silla') || nameLower.includes('escritorio') || nameLower.includes('mesa') || nameLower.includes('librero') || nameLower.includes('estante')) loc = '3-A';
                else {
                    const keys = ['1-A', '1-B', '2-A', '2-B', '3-A', '3-B'];
                    loc = keys[idx % keys.length];
                }
            } else {
                // Sistemas
                if (nameLower.includes('servidor') || nameLower.includes('server') || nameLower.includes('ups') || nameLower.includes('rack') || nameLower.includes('pdu')) loc = '1-A';
                else if (nameLower.includes('switch') || nameLower.includes('router') || nameLower.includes('access point') || nameLower.includes('patch')) loc = '1-B';
                else if (nameLower.includes('cpu') || nameLower.includes('pc') || nameLower.includes('laptop') || nameLower.includes('computadora') || nameLower.includes('workstation')) loc = '2-A';
                else if (nameLower.includes('monitor') || nameLower.includes('teclado') || nameLower.includes('mouse') || nameLower.includes('pantalla')) loc = '2-B';
                else if (nameLower.includes('fuente') || nameLower.includes('ram') || nameLower.includes('disco') || nameLower.includes('ssd') || nameLower.includes('procesador') || nameLower.includes('tarjeta')) loc = '3-A';
                else {
                    const keys = ['1-A', '1-B', '2-A', '2-B', '3-A', '3-B'];
                    loc = keys[idx % keys.length];
                }
            }
        }
        if (!shelfMap[loc]) shelfMap[loc] = [];
        shelfMap[loc].push(item);
    });

    let gridHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-5xl mx-auto pb-12">';
    for (let r = 1; r <= spaceConfig.rows; r++) {
        gridHtml += `
            <div class="col-span-1 sm:col-span-2 flex items-center justify-between text-xs font-black text-teal-400 uppercase tracking-wider mt-6 mb-2 border-b border-white/10 pb-2">
                <span class="flex items-center gap-2">
                    <i data-lucide="layers" class="w-4 h-4 text-teal-400"></i>
                    <span>NIVEL ${r} — ${spaceConfig.rowDesc[r]}</span>
                </span>
                <span class="text-3xs font-extrabold glass-pill px-3 py-1 rounded-full text-slate-300">Casilleros ${r}-A / ${r}-B</span>
            </div>
        `;
        for (let c of spaceConfig.cols) {
            const loc = `${r}-${c}`;
            const items = shelfMap[loc] || [];
            const info = spaceConfig.shelves[loc] || { label: `CASILLERO ${loc}`, border: 'border-l-teal-500', glow: '', badgeColor: 'text-teal-400' };
            
            gridHtml += `
                <div onclick="openCabinetShelfModal('${loc}')" class="cursor-pointer transition transform hover:scale-[1.015] hover:-translate-y-0.5 glass-card rounded-2xl p-5 flex flex-col justify-between h-40 border-l-4 ${info.border} ${info.glow} relative group">
                    <div class="flex justify-between items-start">
                        <div class="space-y-0.5">
                            <span class="font-black text-white text-2xl font-mono tracking-tight group-hover:text-teal-300 transition">${loc}</span>
                            <span class="block text-3xs font-extrabold ${info.badgeColor} uppercase tracking-wider">${info.label}</span>
                        </div>
                        <span class="glass-pill text-white px-3 py-1 rounded-xl text-xs font-black shadow-sm">${items.length} items</span>
                    </div>
                    <div class="text-xs font-medium text-slate-300 mt-auto line-clamp-2 leading-snug">
                        ${items.length > 0 ? items.map(i => i.name).join(', ') : '<span class="text-slate-400 italic">Estante disponible / Sin asignaciones</span>'}
                    </div>
                </div>
            `;
        }
    }
    gridHtml += '</div>';

    container.innerHTML = `
        <div class="p-6 animate-fade-in max-w-5xl mx-auto space-y-6">
            <!-- TARJETA CONTENEDORA SUPERIOR GLASSMORPHISM -->
            <div class="glass-card rounded-3xl p-6 shadow-xl border border-white/10 flex flex-col sm:flex-row gap-6 items-center text-white">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/25 shrink-0">
                    <i data-lucide="${spaceConfig.icon}" class="w-7 h-7"></i>
                </div>
                <div>
                    <h2 class="text-xl font-black text-white mb-1">${spaceConfig.title}</h2>
                    <p class="text-xs text-slate-300 leading-relaxed max-w-3xl">
                        ${spaceConfig.subtitle}
                    </p>
                </div>
            </div>
            ${gridHtml}
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Guardar mapa global para el modal
    window.cabinetShelfMap = shelfMap;
    window.cabinetSpaceConfig = spaceConfig;
};

window.openCabinetShelfModal = function(loc) {
    const items = (window.cabinetShelfMap && window.cabinetShelfMap[loc]) ? window.cabinetShelfMap[loc] : [];
    const info = (window.cabinetSpaceConfig && window.cabinetSpaceConfig.shelves && window.cabinetSpaceConfig.shelves[loc]) ? window.cabinetSpaceConfig.shelves[loc] : { label: `Estante ${loc}` };
    
    let modal = document.getElementById('cabinet-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cabinet-modal';
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in';
    
    modal.innerHTML = `
        <div class="glass-card text-white rounded-3xl border border-white/15 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div class="px-6 py-4 bg-white/5 flex justify-between items-center shrink-0 border-b border-white/10">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-mono font-black text-sm border border-teal-500/30">${loc}</span>
                    <div>
                        <h3 class="text-sm sm:text-base font-black text-white leading-tight">Contenido del Estante ${loc}</h3>
                        <p class="text-3xs text-slate-400 font-bold uppercase">${info.label}</p>
                    </div>
                </div>
                <button onclick="document.getElementById('cabinet-modal').remove()" class="w-8 h-8 rounded-xl glass-btn text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer">✕</button>
            </div>
            
            <div class="p-4 overflow-y-auto flex-1 divide-y divide-white/5 space-y-2">
                ${items.length === 0 ? '<div class="p-12 text-center text-slate-400 font-bold">Estante vacío o sin artículos asignados.</div>' : items.map(s => {
                    let linkHref = `#/substances/${s.id}`;
                    let iconName = 'flask-conical';
                    if (s._itemType === 'chemical_material') {
                        linkHref = `#/chemical-materials/${s.id}`;
                        iconName = 'box';
                    } else if (s._itemType === 'equipo') {
                        linkHref = `#/equipos/${s.id}`;
                        iconName = 'laptop';
                    }

                    return `
                    <div class="py-3 flex items-center justify-between gap-4 hover:bg-white/5 rounded-2xl px-3 transition">
                        <div class="flex items-center gap-3 min-w-0">
                            ${s.image_path ? `<img src="${s.image_path}" class="w-12 h-12 rounded-xl object-cover glass-card border border-white/10 shrink-0">` : `<div class="w-12 h-12 rounded-xl glass-card border border-white/10 flex items-center justify-center text-teal-400 shrink-0"><i data-lucide="${iconName}" class="w-5 h-5"></i></div>`}
                            <div class="min-w-0">
                                <a href="${linkHref}" onclick="document.getElementById('cabinet-modal').remove()" class="font-extrabold text-white text-xs sm:text-sm hover:text-teal-300 transition truncate block">${s.name}</a>
                                <div class="text-3xs text-slate-400 truncate mt-0.5">
                                    ${s.chemical_formula ? `${s.chemical_formula} | ` : ''}
                                    ${s.cas_number ? `CAS: ${s.cas_number} | ` : ''}
                                    ${s.inventory_number ? `INV: ${s.inventory_number}` : ''}
                                </div>
                                ${s.substance_group ? `<div class="text-3xs font-black text-amber-300 uppercase tracking-wider mt-0.5 truncate">${s.substance_group}</div>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            ${s.quantity ? `
                            <div class="text-xs font-black text-teal-300 bg-teal-500/15 border border-teal-500/30 px-3 py-1 rounded-xl text-center hidden sm:block">
                                ${s.quantity} <span class="text-3xs text-teal-400 font-normal">${s.unit || ''}</span>
                            </div>
                            ` : ''}
                            <a href="${linkHref}" onclick="document.getElementById('cabinet-modal').remove()" class="p-2 glass-btn text-teal-300 hover:text-white rounded-xl transition text-xs font-bold" title="Ver ficha">
                                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                            </a>
                        </div>
                    </div>
                `;
                }).join('')}
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
};
