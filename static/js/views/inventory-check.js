// ═══════════════════════════════════════════════════════════
//  MÓDULO: Chequeo de Inventario
//  Permite hacer un "pase de lista" escaneando QRs.
// ═══════════════════════════════════════════════════════════

/** Estado del chequeo activo (en memoria) */
const checkState = {
    category: null,
    items: [],          // [{id, name, stock, scanned, checked}]
    sessionScanner: null,
    running: false,
};

// ── Textos de categoría ──────────────────────────────────────
const CHECK_CATEGORY_LABELS = {
    substances:          { label: 'Reactivos y Sustancias',  icon: 'beaker',          stockField: 'stock_units' },
    chemical_materials:  { label: 'Materiales Químicos',     icon: 'droplet',         stockField: 'quantity'    },
    didactic_materials:  { label: 'Materiales Didácticos',   icon: 'graduation-cap',  stockField: 'quantity'    },
    equipos:             { label: 'Bienes y Equipos',        icon: 'monitor',         stockField: 'quantity'    },
};

// ── Renderizado principal ────────────────────────────────────
function renderInventoryCheckView(container) {
    // Si hay un chequeo activo, mostrarlo directamente
    if (checkState.running && checkState.items.length) {
        _renderCheckSession(container);
        return;
    }
    _renderCategorySelector(container);
}

// ── Pantalla 1: selección de categoría ──────────────────────
function _renderCategorySelector(container) {
    const cats = Object.entries(CHECK_CATEGORY_LABELS);
    container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <!-- Header Glassmorphism -->
        <div class="glass-card rounded-3xl p-6 shadow-xl border border-white/10 flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/25 shrink-0">
                <i data-lucide="clipboard-check" class="w-7 h-7"></i>
            </div>
            <div>
                <h2 class="text-xl font-black text-white">Chequeo de Inventario</h2>
                <p class="text-xs text-slate-300">Escanea los QRs para hacer el pase de lista físico</p>
            </div>
        </div>

        <!-- Instrucciones -->
        <div class="glass-card border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 flex gap-3">
            <i data-lucide="info" class="w-5 h-5 shrink-0 mt-0.5 text-amber-400"></i>
            <div>
                <p class="font-extrabold mb-1 text-amber-300">¿Cómo funciona?</p>
                <ul class="space-y-1 list-disc list-inside text-slate-300 font-medium">
                    <li>Selecciona la categoría a checar</li>
                    <li>Se carga la lista completa del inventario</li>
                    <li>Escanea cada QR con la cámara — se marca con ✅</li>
                    <li>Si un ítem tiene más de 1 unidad, escanea cada QR hasta completar el conteo</li>
                    <li>Si el escaneo supera el stock registrado, se te preguntará si deseas agregar la unidad extra</li>
                </ul>
            </div>
        </div>

        <!-- Tarjetas de categoría -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${cats.map(([key, cfg]) => `
            <button onclick="startInventoryCheck('${key}')"
                    class="group glass-card hover:border-teal-400/50 hover:shadow-lg rounded-2xl p-5 text-left transition-all duration-200 flex items-center gap-4 cursor-pointer">
                <div class="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center group-hover:bg-teal-500/25 transition shrink-0">
                    <i data-lucide="${cfg.icon}" class="w-6 h-6"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <p class="font-extrabold text-white group-hover:text-teal-300 transition-colors text-sm truncate">${cfg.label}</p>
                    <p class="text-3xs text-slate-400 mt-0.5 font-semibold">Iniciar pase de lista</p>
                </div>
                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400 group-hover:text-teal-300 ml-auto transition-colors"></i>
            </button>
            `).join('')}
        </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
}

// ── Cargar datos e iniciar sesión ────────────────────────────
async function startInventoryCheck(category) {
    const mainEl = document.getElementById('main-content');
    mainEl.innerHTML = `
    <div class="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
        <div class="w-10 h-10 border-4 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
        <p class="font-semibold">Cargando inventario...</p>
    </div>`;

    try {
        const res = await fetch(`/api/inventory-check/list?category=${category}`).then(r => r.json());
        if (res.status !== 'success') throw new Error(res.message);

        const cfg = CHECK_CATEGORY_LABELS[category];
        const stockField = cfg.stockField;

        // ── Sin registros: mostrar pantalla vacía amigable ──
        if (!res.data || res.data.length === 0) {
            const warningMsg = res.warning || null;
            mainEl.innerHTML = `
            <div class="max-w-md mx-auto mt-12 text-center space-y-5 animate-fade-in">
                <div class="inline-flex bg-slate-100 text-slate-400 p-6 rounded-3xl">
                    <i data-lucide="${cfg.icon}" class="w-14 h-14"></i>
                </div>
                <div>
                    <h3 class="text-xl font-extrabold text-slate-700">Sin inventario por el momento</h3>
                    <p class="text-sm text-slate-500 mt-2">
                        La categoría <strong>${cfg.label}</strong> no tiene ningún registro cargado en este inventario.
                    </p>
                    ${warningMsg ? `<p class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">${warningMsg}</p>` : ''}
                </div>
                <button onclick="resetInventoryCheck()"
                        class="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition text-sm">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i>
                    Volver a categorías
                </button>
            </div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        checkState.category = category;
        checkState.running  = true;
        checkState.items    = res.data.map(item => ({
            id:       item.id,
            name:     item.name || `ID #${item.id}`,
            stock:    Math.max(1, parseInt(item[stockField]) || 1),
            scanned:  0,
            checked:  false,
            location: item.location || '',
            qr:       item.qr_content || '',
            inv_num:  item.inventory_number || item.serial_number || '',
            no_sep:   item.no_sep || '',
            image:    item.image_path || '',
            _raw:     item,
        }));

        _renderCheckSession(mainEl);
    } catch (err) {
        mainEl.innerHTML = `
        <div class="max-w-sm mx-auto mt-12 text-center space-y-4 animate-fade-in">
            <div class="inline-flex bg-red-50 text-red-400 p-5 rounded-3xl">
                <i data-lucide="alert-triangle" class="w-10 h-10"></i>
            </div>
            <div>
                <h3 class="text-lg font-extrabold text-red-600">Error al cargar</h3>
                <p class="text-sm text-slate-500 mt-1">${err.message}</p>
            </div>
            <button onclick="resetInventoryCheck()"
                    class="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition text-sm">
                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                Volver
            </button>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
    }
}


// ── Pantalla 2: sesión activa ────────────────────────────────
function _renderCheckSession(container) {
    const cfg   = CHECK_CATEGORY_LABELS[checkState.category];
    const items = checkState.items;

    const total         = items.reduce((s, i) => s + i.stock, 0);
    const totalChecked  = items.reduce((s, i) => s + Math.min(i.scanned, i.stock), 0);
    const pct           = total > 0 ? Math.round((totalChecked / total) * 100) : 0;
    const allDone       = totalChecked >= total;

    // Agrupar por nombre para la visualización
    const groups = _buildGroups(items);

    container.innerHTML = `
    <div class="flex flex-col h-full animate-fade-in">

        <!-- Top bar -->
        <div class="glass-card rounded-2xl p-4 mb-4 border border-white/10 flex items-center gap-4 flex-wrap">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center shrink-0">
                    <i data-lucide="${cfg.icon}" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-white font-extrabold text-sm truncate">${cfg.label}</p>
                    <p class="text-slate-400 text-xs">${totalChecked} / ${total} unidades presentes</p>
                </div>
            </div>
            <!-- Progress bar -->
            <div class="flex-1 min-w-[120px]">
                <div class="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Progreso</span><span class="font-bold text-white">${pct}%</span>
                </div>
                <div class="h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-teal-500 to-emerald-500'}"
                         style="width:${pct}%"></div>
                </div>
            </div>
            <div class="flex gap-2 shrink-0">
                <button onclick="resetInventoryCheck()"
                        class="px-3 py-2 text-xs font-bold glass-btn rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="refresh-ccw" class="w-3.5 h-3.5 text-teal-300"></i> Reiniciar
                </button>
                <button onclick="finishInventoryCheck()"
                        class="px-3 py-2 text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer">
                    <i data-lucide="flag" class="w-3.5 h-3.5"></i> Finalizar
                </button>
            </div>
        </div>

        <div class="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

            <!-- Lista de ítems -->
            <div class="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar" id="check-item-list">
                ${groups.map(g => _renderGroup(g)).join('')}
            </div>

            <!-- Panel de escáner -->
            <div class="w-full lg:w-72 shrink-0 space-y-3">
                <!-- Escáner cámara -->
                <div class="glass-card rounded-2xl p-4 shadow-sm border border-white/10">
                    <h4 class="font-bold text-sm text-white mb-3 flex items-center gap-2">
                        <i data-lucide="camera" class="w-4 h-4 text-teal-400"></i>
                        Escáner QR
                    </h4>
                    <div class="bg-slate-950/80 rounded-xl overflow-hidden aspect-square relative mb-3 border border-white/10">
                        <div id="check-reader" class="w-full h-full"></div>
                        <div id="check-scanner-overlay"
                             class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 text-xs font-semibold text-center gap-2">
                            <i data-lucide="qr-code" class="w-8 h-8 opacity-40"></i>
                            <span>Cámara inactiva</span>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button id="btn-check-start" onclick="startCheckScanner()"
                                class="flex-1 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer">
                            <i data-lucide="play" class="w-3.5 h-3.5"></i> Iniciar
                        </button>
                        <button id="btn-check-stop" onclick="stopCheckScanner()"
                                class="flex-1 py-2 glass-btn text-rose-300 hover:text-rose-200 text-xs font-bold rounded-xl items-center justify-center gap-1.5 transition hidden cursor-pointer">
                            <i data-lucide="square" class="w-3.5 h-3.5"></i> Detener
                        </button>
                    </div>
                </div>

                <!-- Input manual -->
                <div class="glass-card rounded-2xl p-4 shadow-sm border border-white/10">
                    <h4 class="font-bold text-sm text-white mb-2 flex items-center gap-2">
                        <i data-lucide="keyboard" class="w-4 h-4 text-teal-400"></i>
                        Manual
                    </h4>
                    <div class="flex gap-2">
                        <input id="check-manual-input" type="text"
                               placeholder="LAB-SUB-1..."
                               class="flex-1 glass-input rounded-xl px-3 py-2 text-xs"
                               onkeydown="if(event.key==='Enter') processCheckScan(document.getElementById('check-manual-input').value)">
                        <button onclick="processCheckScan(document.getElementById('check-manual-input').value)"
                                class="px-3 py-2 glass-btn text-white rounded-xl text-xs font-bold transition cursor-pointer">
                            OK
                        </button>
                    </div>
                </div>

                <!-- Feed de actividad -->
                <div class="glass-card rounded-2xl p-4 shadow-sm border border-white/10">
                    <h4 class="font-bold text-sm text-white mb-2 flex items-center gap-2">
                        <i data-lucide="activity" class="w-4 h-4 text-teal-400"></i>
                        Actividad reciente
                    </h4>
                    <div id="check-activity-feed" class="space-y-1.5 max-h-48 overflow-y-auto text-xs no-scrollbar">
                        <p class="text-slate-400 italic">Esperando escaneos...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    if (window.lucide) window.lucide.createIcons();
}

// ── Agrupar ítems por nombre ─────────────────────────────────
function _buildGroups(items) {
    const map = new Map();
    for (const item of items) {
        const key = item.name.trim().toUpperCase();
        if (!map.has(key)) {
            map.set(key, { name: item.name, items: [] });
        }
        map.get(key).items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ── Renderizar grupo ─────────────────────────────────────────
function _renderGroup(group) {
    const items       = group.items;
    const groupStock  = items.reduce((s, i) => s + i.stock, 0);
    const groupScanned= items.reduce((s, i) => s + Math.min(i.scanned, i.stock), 0);
    const groupDone   = groupScanned >= groupStock;
    const pct         = groupStock > 0 ? Math.round((groupScanned / groupStock) * 100) : 0;
    const isSingle    = items.length === 1 && items[0].stock === 1;

    const statusIcon  = groupDone
        ? `<span class="text-emerald-500"><i data-lucide="check-circle-2" class="w-5 h-5"></i></span>`
        : groupScanned > 0
            ? `<span class="text-amber-500"><i data-lucide="loader-circle" class="w-5 h-5 animate-spin"></i></span>`
            : `<span class="text-slate-300"><i data-lucide="circle" class="w-5 h-5"></i></span>`;

    const discriminator = items.length > 1
        ? `<div class="mt-2 ml-9 space-y-1">
            ${items.map(it => {
                const label = it.inv_num || it.no_sep || `ID #${it.id}`;
                const done  = it.scanned >= it.stock;
                return `<div class="flex items-center gap-2 text-xs ${done ? 'text-emerald-600' : 'text-slate-500'}">
                    <span>${done ? '✅' : '⬜'}</span>
                    <span class="font-mono">${label}</span>
                    ${it.stock > 1 ? `<span class="text-slate-400">(${Math.min(it.scanned,it.stock)}/${it.stock})</span>` : ''}
                </div>`;
            }).join('')}
           </div>`
        : '';

    return `
    <div id="group-${items.map(i=>i.id).join('-')}"
         class="bg-white rounded-2xl border ${groupDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'} p-3.5 transition-all duration-300">
        <div class="flex items-center gap-3">
            ${statusIcon}
            <div class="flex-1 min-w-0">
                <p class="font-bold text-slate-800 text-sm truncate">${group.name}</p>
                <div class="flex items-center gap-3 mt-1">
                    <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full ${groupDone ? 'bg-emerald-400' : 'bg-brand-500'} transition-all duration-500"
                             style="width:${pct}%"></div>
                    </div>
                    <span class="text-xs font-bold ${groupDone ? 'text-emerald-600' : 'text-slate-500'} shrink-0">
                        ${groupScanned}/${groupStock}
                    </span>
                </div>
            </div>
        </div>
        ${discriminator}
    </div>`;
}

// ── Procesar un escaneo ──────────────────────────────────────
let _checkScanCooldown = false;

async function processCheckScan(rawCode) {
    const code = (rawCode || '').trim();
    if (!code) return;
    if (_checkScanCooldown) return;
    _checkScanCooldown = true;
    setTimeout(() => { _checkScanCooldown = false; }, 1200);

    // Limpiar input manual
    const manualInput = document.getElementById('check-manual-input');
    if (manualInput) manualInput.value = '';

    // Resolver QR vía API
    let result;
    try {
        result = await fetch('/api/inventory-check/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_code: code })
        }).then(r => r.json());
    } catch (e) {
        _addActivity(`❌ Error de red: ${e.message}`, 'error');
        return;
    }

    if (result.status === 'not_found') {
        // QR completamente desconocido
        _showUnknownQrDialog(code);
        return;
    }

    if (result.status !== 'success') {
        _addActivity(`❌ ${result.message}`, 'error');
        return;
    }

    const resolvedItem = result.data;
    const resolvedTable = result.table;

    // Buscar en el estado del chequeo
    const stateItem = checkState.items.find(i => i.id === resolvedItem.id);

    if (!stateItem) {
        // El ítem existe en la BD pero no es de la categoría que se está chequeando
        _addActivity(`⚠️ "${resolvedItem.name}" no pertenece a esta categoría`, 'warn');
        return;
    }

    if (stateItem.scanned < stateItem.stock) {
        // Hay unidades pendientes — marcar una más
        stateItem.scanned++;
        if (stateItem.scanned >= stateItem.stock) {
            stateItem.checked = true;
            _addActivity(`✅ ${stateItem.name} — COMPLETO (${stateItem.scanned}/${stateItem.stock})`, 'success');
        } else {
            _addActivity(`🔄 ${stateItem.name} — ${stateItem.scanned}/${stateItem.stock}`, 'info');
        }
        _refreshCheckUI();
    } else {
        // Ya está completo — preguntar si hay una unidad extra física
        _showExtraUnitDialog(stateItem, resolvedTable);
    }
}

// ── Diálogo: QR desconocido (artículo nuevo) ─────────────────
function _showUnknownQrDialog(code) {
    _addActivity(`❓ QR desconocido: ${code}`, 'warn');
    const overlay = document.createElement('div');
    overlay.id = 'check-unknown-dialog';
    overlay.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
        <div class="flex items-center gap-3 text-amber-600">
            <div class="bg-amber-100 p-2.5 rounded-2xl"><i data-lucide="alert-triangle" class="w-6 h-6"></i></div>
            <h3 class="font-extrabold text-lg text-slate-800">QR No Reconocido</h3>
        </div>
        <p class="text-sm text-slate-600">
            El código <code class="bg-slate-100 px-2 py-0.5 rounded-lg font-mono text-xs">${code}</code>
            no existe en el inventario.
        </p>
        <p class="text-sm font-semibold text-slate-700">¿Es un artículo nuevo que se debe registrar?</p>
        <div class="flex gap-3">
            <button onclick="document.getElementById('check-unknown-dialog').remove()"
                    class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition">
                No, ignorar
            </button>
            <button onclick="_navigateToCreate(); document.getElementById('check-unknown-dialog').remove();"
                    class="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition">
                Sí, registrar nuevo
            </button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
}

// ── Diálogo: unidad extra en ítem ya completado ──────────────
function _showExtraUnitDialog(stateItem, table) {
    _addActivity(`➕ "${stateItem.name}" ya estaba completo — ¿unidad extra?`, 'warn');
    const overlay = document.createElement('div');
    overlay.id = 'check-extra-dialog';
    overlay.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
        <div class="flex items-center gap-3 text-blue-600">
            <div class="bg-blue-100 p-2.5 rounded-2xl"><i data-lucide="plus-circle" class="w-6 h-6"></i></div>
            <h3 class="font-extrabold text-lg text-slate-800">Unidad Extra Detectada</h3>
        </div>
        <p class="text-sm text-slate-600">
            <strong>${stateItem.name}</strong> ya tiene su stock de
            <strong>${stateItem.stock} unidad${stateItem.stock !== 1 ? 'es' : ''}</strong> completo.
        </p>
        <p class="text-sm font-semibold text-slate-700">
            ¿Existe una unidad física adicional no registrada y deseas agregarla al stock?
        </p>
        <div class="flex gap-3">
            <button onclick="document.getElementById('check-extra-dialog').remove()"
                    class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition">
                No, ignorar
            </button>
            <button onclick="_confirmAddExtraUnit(${stateItem.id}, '${table}'); document.getElementById('check-extra-dialog').remove();"
                    class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition">
                ✅ Sí, agregar +1 al stock
            </button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
}

// ── Confirmar agregar unidad extra ───────────────────────────
async function _confirmAddExtraUnit(itemId, table) {
    try {
        const res = await fetch('/api/inventory-check/add-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table, id: itemId, increment: 1 })
        }).then(r => r.json());

        if (res.status === 'success') {
            const stateItem = checkState.items.find(i => i.id === itemId);
            if (stateItem) {
                stateItem.stock++;
                stateItem.scanned++;
                stateItem.checked = stateItem.scanned >= stateItem.stock;
            }
            _addActivity(`✅ Stock actualizado — ahora hay ${res.data.stock_units || res.data.quantity} unidades`, 'success');
            _refreshCheckUI();
        } else {
            _addActivity(`❌ Error al actualizar: ${res.message}`, 'error');
        }
    } catch (e) {
        _addActivity(`❌ Error de red: ${e.message}`, 'error');
    }
}

// ── Navegar a crear nuevo ítem ───────────────────────────────
function _navigateToCreate() {
    const categoryRouteMap = {
        substances: '#/substances',
        chemical_materials: '#/chemical-materials',
        didactic_materials: '#/didactic-materials',
        equipos: '#/equipos',
    };
    const route = categoryRouteMap[checkState.category] || '#/substances';
    window.location.hash = route;
}

// ── Refrescar solo la lista de ítems ────────────────────────
function _refreshCheckUI() {
    const container = document.getElementById('main-content');
    if (!container) return;
    // Reconstruir toda la vista (rápido y seguro)
    _renderCheckSession(container);
    // Re-iniciar scanner si estaba activo
    if (checkState.sessionScanner) {
        setTimeout(() => startCheckScanner(), 100);
    }
}

// ── Feed de actividad ────────────────────────────────────────
function _addActivity(msg, type = 'info') {
    const feed = document.getElementById('check-activity-feed');
    if (!feed) return;

    const colors = {
        success: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        warn:    'text-amber-700 bg-amber-50 border-amber-200',
        error:   'text-red-600 bg-red-50 border-red-200',
        info:    'text-slate-600 bg-slate-50 border-slate-200',
    };

    // Limpiar placeholder si existe
    const placeholder = feed.querySelector('p.italic');
    if (placeholder) placeholder.remove();

    const div = document.createElement('div');
    div.className = `px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${colors[type] || colors.info}`;
    div.textContent = msg;
    feed.insertBefore(div, feed.firstChild);

    // Máximo 15 entradas
    while (feed.children.length > 15) feed.removeChild(feed.lastChild);
}

// ── Escáner de cámara (html5-qrcode) ────────────────────────
let _checkHtml5QrCode = null;

async function startCheckScanner() {
    const overlay = document.getElementById('check-scanner-overlay');
    if (overlay) overlay.classList.add('hidden');

    const startBtn = document.getElementById('btn-check-start');
    const stopBtn  = document.getElementById('btn-check-stop');
    if (startBtn) startBtn.classList.add('hidden');
    if (stopBtn)  stopBtn.classList.remove('hidden');

    if (_checkHtml5QrCode) {
        try { await _checkHtml5QrCode.stop(); } catch(e) {}
        _checkHtml5QrCode = null;
    }

    try {
        _checkHtml5QrCode = new Html5Qrcode('check-reader');
        await _checkHtml5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 200, height: 200 } },
            (decodedText) => { processCheckScan(decodedText); },
            () => {}
        );
        checkState.sessionScanner = _checkHtml5QrCode;
    } catch (err) {
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `<i data-lucide="camera-off" class="w-8 h-8 opacity-40"></i><span class="text-xs">Error: ${err.message}</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn)  stopBtn.classList.add('hidden');
    }
}

async function stopCheckScanner() {
    if (_checkHtml5QrCode) {
        try { await _checkHtml5QrCode.stop(); } catch(e) {}
        _checkHtml5QrCode = null;
        checkState.sessionScanner = null;
    }
    const overlay = document.getElementById('check-scanner-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.innerHTML = `<i data-lucide="qr-code" class="w-8 h-8 opacity-40"></i><span>Cámara inactiva</span>`;
        if (window.lucide) window.lucide.createIcons();
    }
    const startBtn = document.getElementById('btn-check-start');
    const stopBtn  = document.getElementById('btn-check-stop');
    if (startBtn) startBtn.classList.remove('hidden');
    if (stopBtn)  stopBtn.classList.add('hidden');
}

// ── Finalizar chequeo ────────────────────────────────────────
async function finishInventoryCheck() {
    await stopCheckScanner();

    const items     = checkState.items;
    const total     = items.reduce((s, i) => s + i.stock, 0);
    const checked   = items.reduce((s, i) => s + Math.min(i.scanned, i.stock), 0);
    const missing   = items.filter(i => i.scanned < i.stock);

    // Guardar sesión en historial (si hay sesión activa)
    try {
        await fetch('/api/inventory-check/save-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category:    checkState.category,
                total,
                checked,
                missing_ids: missing.map(i => i.id)
            })
        });
    } catch(e) { /* silencioso si no hay sesión */ }

    _renderFinishedReport(checked, total, missing);
}

// ── Pantalla 3: reporte final ────────────────────────────────
function _renderFinishedReport(checked, total, missing) {
    const pct      = total > 0 ? Math.round((checked / total) * 100) : 0;
    const cfg      = CHECK_CATEGORY_LABELS[checkState.category];
    const allGood  = missing.length === 0;

    const mainEl = document.getElementById('main-content');
    mainEl.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <!-- Resumen -->
        <div class="rounded-3xl p-6 text-white shadow-xl
                    ${allGood ? 'bg-gradient-to-br from-emerald-700 to-emerald-600' : 'bg-gradient-to-br from-slate-900 to-slate-800'}
                    border ${allGood ? 'border-emerald-500/30' : 'border-slate-700/50'}">
            <div class="flex items-center gap-4 mb-4">
                <div class="text-4xl">${allGood ? '🎉' : '📋'}</div>
                <div>
                    <h2 class="text-2xl font-extrabold">Chequeo Completado</h2>
                    <p class="opacity-80 text-sm">${cfg.label}</p>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4 text-center">
                <div class="bg-white/10 rounded-2xl p-3">
                    <p class="text-3xl font-black">${checked}</p>
                    <p class="text-xs opacity-80">Presentes</p>
                </div>
                <div class="bg-white/10 rounded-2xl p-3">
                    <p class="text-3xl font-black">${total - checked}</p>
                    <p class="text-xs opacity-80">Faltantes</p>
                </div>
                <div class="bg-white/10 rounded-2xl p-3">
                    <p class="text-3xl font-black">${pct}%</p>
                    <p class="text-xs opacity-80">Completado</p>
                </div>
            </div>
        </div>

        <!-- Faltantes -->
        ${missing.length > 0 ? `
        <div class="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
            <div class="bg-red-50 px-5 py-3 border-b border-red-100 flex items-center gap-2">
                <i data-lucide="alert-circle" class="w-4 h-4 text-red-500"></i>
                <h3 class="font-bold text-sm text-red-700">${missing.length} ítem(s) no encontrados</h3>
            </div>
            <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                ${missing.map(item => `
                <div class="px-5 py-3 flex items-center gap-3">
                    <span class="text-lg">⬜</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-slate-800 truncate">${item.name}</p>
                        <p class="text-xs text-slate-500">${item.scanned}/${item.stock} escaneados
                            ${item.inv_num ? '· ' + item.inv_num : ''}
                        </p>
                    </div>
                </div>`).join('')}
            </div>
        </div>` : `
        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center text-emerald-700 font-bold">
            ✅ ¡Todos los ítems fueron encontrados!
        </div>`}

        <!-- Acciones -->
        <div class="flex gap-3">
            <button onclick="resetInventoryCheck()"
                    class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm">
                <i data-lucide="refresh-ccw" class="w-4 h-4"></i> Nuevo Chequeo
            </button>
            <button onclick="_exportCheckReport()"
                    class="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm">
                <i data-lucide="download" class="w-4 h-4"></i> Exportar Reporte
            </button>
        </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
}

// ── Exportar reporte como texto ──────────────────────────────
function _exportCheckReport() {
    const items    = checkState.items;
    const cfg      = CHECK_CATEGORY_LABELS[checkState.category];
    const total    = items.reduce((s, i) => s + i.stock, 0);
    const checked  = items.reduce((s, i) => s + Math.min(i.scanned, i.stock), 0);
    const now      = new Date().toLocaleString('es-MX');

    let txt = `REPORTE DE CHEQUEO DE INVENTARIO\n`;
    txt += `Categoría: ${cfg.label}\n`;
    txt += `Fecha: ${now}\n`;
    txt += `Resultado: ${checked}/${total} presentes\n`;
    txt += `${'═'.repeat(50)}\n\n`;

    txt += `PRESENTES:\n`;
    items.filter(i => i.scanned >= i.stock).forEach(i => {
        txt += `  ✅ ${i.name}${i.inv_num ? ' [' + i.inv_num + ']' : ''}\n`;
    });

    txt += `\nFALTANTES:\n`;
    items.filter(i => i.scanned < i.stock).forEach(i => {
        txt += `  ⬜ ${i.name}${i.inv_num ? ' [' + i.inv_num + ']' : ''} (${i.scanned}/${i.stock})\n`;
    });

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `chequeo_${checkState.category}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Reiniciar chequeo ────────────────────────────────────────
function resetInventoryCheck() {
    stopCheckScanner().catch(() => {});
    checkState.category = null;
    checkState.items    = [];
    checkState.running  = false;
    checkState.sessionScanner = null;
    _checkHtml5QrCode   = null;
    const mainEl = document.getElementById('main-content');
    if (mainEl) _renderCategorySelector(mainEl);
}
