// static/js/views/loans.js
// CONTROL DE PRÉSTAMOS POR ESCANEO DE QR, USUARIO REGISTRADO, EVIDENCIA FOTOGRÁFICA Y APROBACIÓN DEL ADMIN

let loansListCache = [];
let registeredUsersCache = [];
let loanBasket = []; // Lista temporal de elementos escaneados por QR o seleccionados
let currentLoanFilter = 'all'; // 'all' | 'Pendiente Aprobación Admin' | 'Prestado' | 'Pendiente Verificación Admin' | 'Requiere Atención' | 'Devuelto'
let loanSearchQuery = '';
let activeReturnLoanId = null;
let loanLiveTimerInterval = null;

function formatWebLiveTimer(loanDateStr, status, returnDateStr = null) {
    if (status === 'Pendiente Aprobación Admin') return '⏳ En Espera de Aprobación';
    if (status === 'Rechazado') return '✕ Rechazado por Admin';
    if (status === 'Control Mayor' || status === 'Devuelto') {
        const cleanStart = (loanDateStr || '').replace('T', ' ');
        const cleanEnd = (returnDateStr || '').replace('T', ' ');
        const start = new Date(cleanStart).getTime();
        const end = cleanEnd ? new Date(cleanEnd).getTime() : NaN;
        if (!isNaN(start) && !isNaN(end) && end >= start) {
            const diffMs = end - start;
            const totalSeconds = Math.floor(diffMs / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const pad = (n) => String(n).padStart(2, '0');
            const durStr = days > 0 ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s` : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
            return `${status === 'Control Mayor' ? '🏛️ Control Mayor' : '🟢 Concluido'} (${durStr})`;
        }
        return status === 'Control Mayor' ? '🏛️ Control Mayor (Concluido)' : '🟢 Concluido';
    }
    if (status === 'Requiere Atención') return '⚠️ Requiere Atención por Observación';
    if (!loanDateStr) return '00h 00m 00s';

    try {
        const cleanDate = loanDateStr.replace('T', ' ');
        const start = new Date(cleanDate).getTime();
        if (isNaN(start)) return loanDateStr;

        const now = Date.now();
        const diffMs = Math.max(0, now - start);

        const totalSeconds = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n) => String(n).padStart(2, '0');

        if (days > 0) {
            return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
        }
        return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    } catch (e) {
        return loanDateStr;
    }
}

async function renderLoansView(container) {
    const isAdmin = state.userRole === 'admin';
    const isLoggedIn = state.isLoggedIn;

    container.innerHTML = `
        <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            
            <!-- HEADER PRINCIPAL -->
            <div class="glass-card p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <span class="bg-amber-500/20 text-amber-300 text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider border border-amber-500/40">
                            📋 Préstamos con QR & Evidencia en Estante
                        </span>
                        <span class="${isAdmin ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-sky-500/20 text-sky-300 border-sky-500/40'} text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider border">
                            ${isAdmin ? '👑 ADMIN: APROBACIÓN Y VERIFICACIÓN EN ESTANTE' : '🔑 ENCARGADO / RESPONSABLE: REGISTRO Y FOTO DE ENTREGA'}
                        </span>
                    </div>
                    <h2 class="text-2xl md:text-3xl font-black text-white tracking-tight">
                        Control de Préstamos y Devoluciones
                    </h2>
                    <p class="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
                        Escaneo de QR en lista, autenticación con usuarios registrados, evidencia fotográfica de guardado, reloj en vivo y aprobación por Administrador.
                    </p>
                </div>

                ${isLoggedIn ? `
                    <button onclick="openCreateLoanModal()" class="w-full md:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-xs sm:text-sm shrink-0 cursor-pointer">
                        <i data-lucide="qr-code" class="w-5 h-5"></i>
                        <span>+ Registrar Préstamo por QR</span>
                    </button>
                ` : ''}
            </div>

            <!-- TARJETAS DE ESTADÍSTICAS -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="glass-card p-5 flex items-center gap-4">
                    <div class="w-13 h-13 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-md">
                        <i data-lucide="handshake" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-3xs font-black text-slate-400 uppercase tracking-wider block">En Préstamo</span>
                        <h4 class="text-2xl font-black text-amber-400 tracking-tight" id="count-active-loans">0</h4>
                    </div>
                </div>

                <div class="glass-card p-5 flex items-center gap-4">
                    <div class="w-13 h-13 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-md">
                        <i data-lucide="clock" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-3xs font-black text-slate-400 uppercase tracking-wider block">Pendientes Aprobar</span>
                        <h4 class="text-2xl font-black text-orange-400 tracking-tight" id="count-pending-loans">0</h4>
                    </div>
                </div>

                <div class="glass-card p-5 flex items-center gap-4">
                    <div class="w-13 h-13 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-md">
                        <i data-lucide="check-check" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-3xs font-black text-slate-400 uppercase tracking-wider block">Devueltos Aprobados</span>
                        <h4 class="text-2xl font-black text-emerald-400 tracking-tight" id="count-returned-loans">0</h4>
                    </div>
                </div>

                <div class="glass-card p-5 flex items-center gap-4">
                    <div class="w-13 h-13 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-md">
                        <i data-lucide="alert-triangle" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-3xs font-black text-slate-400 uppercase tracking-wider block">Requiere Atención</span>
                        <h4 class="text-2xl font-black text-rose-400 tracking-tight" id="count-attention-loans">0</h4>
                    </div>
                </div>
            </div>

            <!-- ALERTA ADMINISTRADOR PARA VERIFICAR DEVOLUCIONES PENDIENTES O CON OBSERVACIÓN -->
            <div id="admin-pending-alert-container"></div>

            <!-- FILTROS Y BÚSQUEDA -->
            <div class="glass-toolbar p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="flex flex-wrap p-1 rounded-2xl w-full md:w-auto gap-1 bg-white/5 border border-white/10">
                    <button onclick="setLoansFilter('all')" id="btn-filter-all" class="px-3.5 py-2 rounded-xl font-extrabold text-xs transition bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        Todos
                    </button>
                    <button onclick="setLoansFilter('Pendiente Aprobación Admin')" id="btn-filter-req-pending" class="px-3.5 py-2 rounded-xl font-bold text-xs transition text-slate-400 hover:text-white">
                        ⏳ Solicitudes Pendientes
                    </button>
                    <button onclick="setLoansFilter('Prestado')" id="btn-filter-active" class="px-3.5 py-2 rounded-xl font-bold text-xs transition text-slate-400 hover:text-white">
                        🟡 En Préstamo
                    </button>
                    <button onclick="setLoansFilter('Pendiente Verificación Admin')" id="btn-filter-pending" class="px-3.5 py-2 rounded-xl font-bold text-xs transition text-slate-400 hover:text-white">
                        📷 Por Verificar
                    </button>
                    <button onclick="setLoansFilter('Requiere Atención')" id="btn-filter-attention" class="px-3.5 py-2 rounded-xl font-bold text-xs transition text-slate-400 hover:text-white">
                        ⚠️ Requiere Atención
                    </button>
                    <button onclick="setLoansFilter('Devuelto')" id="btn-filter-returned" class="px-3.5 py-2 rounded-xl font-bold text-xs transition text-slate-400 hover:text-white">
                        🟢 Devueltos
                    </button>
                </div>

                <div class="w-full md:w-80 relative">
                    <input 
                        type="text" 
                        id="search-loans-input" 
                        oninput="onSearchLoans(this.value)"
                        placeholder="Buscar elemento o docente/usuario..." 
                        class="glass-input w-full pl-10 pr-4 py-2.5 text-xs"
                    />
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
                </div>
            </div>

            <!-- TABLA DE CONTROL DE PRÉSTAMOS -->
            <div class="glass-table-container">
                <div class="overflow-x-auto no-scrollbar">
                    <table class="glass-table w-full text-left">
                        <thead>
                            <tr>
                                <th class="py-4 px-6">Folio / ID</th>
                                <th class="py-4 px-6">Lista de Elementos Prestados</th>
                                <th class="py-4 px-6">Usuario Registrado</th>
                                <th class="py-4 px-6">Salida & Tiempo Transcurrido</th>
                                <th class="py-4 px-6">Evidencia Foto</th>
                                <th class="py-4 px-6">Estado Verificación</th>
                                <th class="py-4 px-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="loans-table-body" class="divide-y divide-white/5 text-xs font-sans">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">
                                    <i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400"></i>
                                    <span>Cargando datos de préstamos...</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

        <!-- MODAL DE REGISTRO DE PRÉSTAMO POR QR -->
        <div id="modal-create-loan" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl max-w-xl w-full p-6 text-slate-900 space-y-5 shadow-2xl animate-fade-in border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 class="font-extrabold text-base text-slate-900 flex items-center gap-2">
                        <i data-lucide="qr-code" class="w-5 h-5 text-amber-500"></i>
                        <span>Nuevo Préstamo por QR</span>
                    </h3>
                    <button onclick="closeCreateLoanModal()" class="text-slate-400 hover:text-slate-700 font-bold text-xl">&times;</button>
                </div>

                <div class="space-y-4 text-xs font-sans">
                    
                    <!-- 1. SOLICITANTE (USUARIO REGISTRADO EN EL SISTEMA) -->
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <label class="block font-bold text-slate-800 uppercase tracking-wider">
                            👤 Usuario / Docente Registrado en el Sistema *
                        </label>
                        <select id="loan-registered-user-select" class="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500/20">
                            <option value="">Cargando usuarios registrados...</option>
                        </select>
                        <p class="text-3xs text-slate-500">La persona debe estar dada de alta previamente en el sistema para poder solicitar préstamos.</p>
                    </div>

                    <!-- 2. ESCANEO QR Y LISTA DE ELEMENTOS -->
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <label class="block font-bold text-slate-800 uppercase tracking-wider">
                                🧪 Lista de Elementos a Prestar (Escaneados por QR)
                            </label>
                            <button onclick="startLoanQrScanModal()" class="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-3xs flex items-center gap-1.5 shadow-sm">
                                <i data-lucide="camera" class="w-3.5 h-3.5 text-amber-400"></i>
                                <span>Escanear QR Ahora</span>
                            </button>
                        </div>

                        <div id="loan-qr-scanner-box" class="hidden bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
                            <div class="flex justify-between items-center text-xs text-amber-400 font-bold">
                                <span>Apunta al Código QR de la Sustancia / Material</span>
                                <button onclick="stopLoanQrScanModal()" class="text-slate-400 hover:text-white font-bold">&times; Cerrar</button>
                            </div>
                            <video id="loan-qr-video" class="w-full h-44 object-cover rounded-xl border border-slate-700"></video>
                            <p class="text-3xs text-slate-400" id="loan-qr-status-msg">Buscando código QR...</p>
                        </div>

                        <div class="flex gap-2">
                            <input type="text" id="loan-manual-search" oninput="filterManualInventory(this.value)" placeholder="Buscar elemento por nombre..." class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                            <select id="loan-manual-select" class="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold">
                                <option value="">-- Seleccionar manualmente --</option>
                            </select>
                            <button onclick="addManualItemToBasket()" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs">
                                + Agregar
                            </button>
                        </div>

                        <div class="border border-slate-200 rounded-2xl overflow-hidden">
                            <table class="w-full text-left bg-white text-xs">
                                <thead class="bg-slate-100 text-slate-700 font-bold uppercase text-3xs">
                                    <tr>
                                        <th class="py-2 px-3">Elemento</th>
                                        <th class="py-2 px-3">Envases / Cantidad</th>
                                        <th class="py-2 px-3 text-right">Quitar</th>
                                    </tr>
                                </thead>
                                <tbody id="loan-basket-tbody" class="divide-y divide-slate-100">
                                    <tr>
                                        <td colspan="3" class="py-6 text-center text-slate-400 italic">
                                            No has agregado elementos. Escanea un QR o selecciona manualmente.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 uppercase tracking-wider mb-1">Motivo de Uso / Observaciones</label>
                        <textarea id="loan-notes" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs" placeholder="ej. Práctica 4 de Química Orgánica en Mesa 2"></textarea>
                    </div>

                </div>

                <div class="flex gap-3 pt-2">
                    <button onclick="closeCreateLoanModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs">Cancelar</button>
                    <button onclick="submitNewLoan()" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-xl text-xs shadow-md">Confirmar y Registrar Préstamo</button>
                </div>
            </div>
        </div>

        <!-- MODAL DE DEVOLUCIÓN Y EVIDENCIA FOTOGRÁFICA -->
        <div id="modal-return-loan" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl max-w-md w-full p-6 text-slate-900 space-y-5 shadow-2xl animate-fade-in border border-slate-100">
                <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 class="font-extrabold text-base text-slate-900 flex items-center gap-2">
                        <i data-lucide="camera" class="w-5 h-5 text-emerald-600"></i>
                        <span>Evidencia de Devolución en Estante</span>
                    </h3>
                    <button onclick="closeReturnLoanModal()" class="text-slate-400 hover:text-slate-700 font-bold text-xl">&times;</button>
                </div>

                <div class="space-y-4 text-xs font-sans">
                    <p class="text-slate-600 leading-relaxed">
                        Como responsable de la entrega, toma o sube una fotografía del compuesto colocado en su estante/charola correspondiente para que el Administrador valide su devolución.
                    </p>

                    <div>
                        <label class="block font-bold text-slate-700 uppercase tracking-wider mb-2">Fotografía del Reactivo en Estante *</label>
                        <input type="file" id="return-photo-file" accept="image/*" class="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800" />
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 uppercase tracking-wider mb-1">Descripción / Estado de Entrega *</label>
                        <textarea id="return-notes-input" rows="2" placeholder="Ej. Envase sellado y devuelto a charola A-2 sin derrames..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium"></textarea>
                    </div>
                </div>

                <div class="flex gap-3 pt-2">
                    <button onclick="closeReturnLoanModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs">Cancelar</button>
                    <button onclick="submitReturnWithPhoto()" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-md">Subir Evidencia y Entregar</button>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    await loadLoansData();
    await loadRegisteredUsers();
    await loadManualInventoryForLoans();

    if (loanLiveTimerInterval) clearInterval(loanLiveTimerInterval);
    loanLiveTimerInterval = setInterval(() => {
        updateWebLiveTimers();
    }, 1000);
}

function updateWebLiveTimers() {
    loansListCache.forEach(loan => {
        const el = document.getElementById(`live-timer-${loan.id}`);
        if (el) {
            el.textContent = formatWebLiveTimer(loan.loan_date, loan.status, loan.return_date || loan.verified_at);
        }
    });
}

async function loadRegisteredUsers() {
    try {
        const res = await fetch('/api/loans/registered-users');
        const data = await res.json();
        if (data.status === 'success') {
            registeredUsersCache = data.data || [];
            const sel = document.getElementById('loan-registered-user-select');
            if (sel) {
                let html = '<option value="">-- Selecciona el docente o usuario registrado --</option>';
                registeredUsersCache.forEach(u => {
                    html += `<option value="${u.id}" data-name="${u.username}" data-role="${u.role}">${u.username} (${u.role.toUpperCase()})</option>`;
                });
                sel.innerHTML = html;
            }
        }
    } catch (e) {
        console.warn("Error cargando usuarios registrados:", e);
    }
}

async function loadLoansData() {
    try {
        const res = await fetch('/api/loans');
        const data = await res.json();
        if (data.status === 'success') {
            loansListCache = data.data || [];
            updateLoansStats();
            renderAdminPendingAlert();
            renderLoansTable();
        }
    } catch (e) {
        console.warn("Error cargando préstamos:", e);
    }
}
window.loadLoansData = loadLoansData;

async function loadManualInventoryForLoans() {
    try {
        const [resSub, resChem, resDid] = await Promise.all([
            fetch('/api/substances').then(r => r.json()),
            fetch('/api/chemical-materials').then(r => r.json()),
            fetch('/api/didactic-materials').then(r => r.json())
        ]);

        window.allInventoryCache = [];
        if (resSub.status === 'success') (resSub.data || []).forEach(i => window.allInventoryCache.push({ ...i, item_type: 'substance', display: `🧪 [Sustancia] ${i.name}` }));
        if (resChem.status === 'success') (resChem.data || []).forEach(i => window.allInventoryCache.push({ ...i, item_type: 'chemical_material', display: `🥽 [Mat. Químico] ${i.name}` }));
        if (resDid.status === 'success') (resDid.data || []).forEach(i => window.allInventoryCache.push({ ...i, item_type: 'didactic_material', display: `🎓 [Mat. Didáctico] ${i.name}` }));

        populateManualInventorySelect(window.allInventoryCache);
    } catch (e) {
        console.warn("Error cargando inventario manual:", e);
    }
}

function populateManualInventorySelect(list) {
    const sel = document.getElementById('loan-manual-select');
    if (!sel) return;

    let html = '<option value="">-- Seleccionar manualmente --</option>';
    list.forEach((item, index) => {
        html += `<option value="${index}">${item.display}</option>`;
    });
    sel.innerHTML = html;
}

function filterManualInventory(val) {
    const q = val.toLowerCase().trim();
    if (!q) {
        populateManualInventorySelect(window.allInventoryCache || []);
        return;
    }
    const filtered = (window.allInventoryCache || []).filter(i => i.display.toLowerCase().includes(q));
    populateManualInventorySelect(filtered);
}

function addManualItemToBasket() {
    const selIndex = document.getElementById('loan-manual-select').value;
    if (selIndex === "") return;

    const item = window.allInventoryCache[parseInt(selIndex)];
    if (!item) return;

    const existing = loanBasket.find(b => b.id === item.id && b.type === item.item_type);
    if (existing) {
        existing.quantity += 1;
    } else {
        loanBasket.push({
            id: item.id,
            type: item.item_type,
            name: item.name,
            total_stock: item.stock_units || item.quantity || 1,
            quantity: 1
        });
    }

    renderLoanBasket();
}

function renderLoanBasket() {
    const tbody = document.getElementById('loan-basket-tbody');
    if (!tbody) return;

    if (loanBasket.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="py-6 text-center text-slate-400 italic">
                    No has agregado elementos. Escanea un QR o selecciona manualmente.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    loanBasket.forEach((b, index) => {
        const canEditQty = (b.total_stock > 1);
        html += `
            <tr class="hover:bg-slate-50">
                <td class="py-2.5 px-3 font-bold text-slate-800">${b.name}</td>
                <td class="py-2.5 px-3">
                    ${canEditQty ? `
                        <input type="number" min="1" max="${b.total_stock}" value="${b.quantity}" onchange="updateBasketQty(${index}, this.value)" class="w-16 bg-slate-100 border border-slate-300 rounded px-2 py-1 text-xs font-bold" />
                        <span class="text-3xs text-slate-500 ml-1">de ${b.total_stock} envases</span>
                    ` : `
                        <span class="font-bold text-slate-700">1 Envase / Unidad</span>
                    `}
                </td>
                <td class="py-2.5 px-3 text-right">
                    <button onclick="removeBasketItem(${index})" class="text-red-500 hover:text-red-700 font-bold px-2 py-1">&times;</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function updateBasketQty(index, val) {
    const qty = parseInt(val) || 1;
    if (loanBasket[index]) loanBasket[index].quantity = qty;
}

function removeBasketItem(index) {
    loanBasket.splice(index, 1);
    renderLoanBasket();
}

let loanScannerScanner = null;

function startLoanQrScanModal() {
    const box = document.getElementById('loan-qr-scanner-box');
    if (box) box.classList.remove('hidden');

    if (typeof Html5Qrcode !== 'undefined') {
        loanScannerScanner = new Html5Qrcode("loan-qr-video");
        loanScannerScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 200, height: 200 } },
            (decodedText) => {
                onLoanQrCodeScanned(decodedText);
            },
            () => {}
        ).catch(err => {
            console.warn("Error iniciando scanner QR:", err);
        });
    }
}

function stopLoanQrScanModal() {
    if (loanScannerScanner) {
        loanScannerScanner.stop().then(() => {
            loanScannerScanner.clear();
            loanScannerScanner = null;
        }).catch(e => console.warn(e));
    }
    const box = document.getElementById('loan-qr-scanner-box');
    if (box) box.classList.add('hidden');
}

function onLoanQrCodeScanned(qrText) {
    stopLoanQrScanModal();
    const match = qrText.match(/LAB-SUB(?:STANCES)?-(\d+)/i);
    let foundId = match ? parseInt(match[1]) : null;

    let item = null;
    if (foundId) {
        item = (window.allInventoryCache || []).find(i => i.id === foundId);
    } else {
        item = (window.allInventoryCache || []).find(i => i.name.toLowerCase() === qrText.toLowerCase());
    }

    if (item) {
        const existing = loanBasket.find(b => b.id === item.id && b.type === item.item_type);
        if (existing) existing.quantity += 1;
        else {
            loanBasket.push({
                id: item.id,
                type: item.item_type,
                name: item.name,
                total_stock: item.stock_units || item.quantity || 1,
                quantity: 1
            });
        }
        renderLoanBasket();
        alert(`✅ Elemento agregado a la lista: ${item.name}`);
    } else {
        alert(`⚠️ No se encontró el compuesto o material con QR: ${qrText}`);
    }
}

function updateLoansStats() {
    const active = loansListCache.filter(l => l.status === 'Prestado').length;
    const pending = loansListCache.filter(l => l.status === 'Pendiente Verificación Admin' || l.status === 'Pendiente Aprobación Admin').length;
    const returned = loansListCache.filter(l => l.status === 'Devuelto').length;
    const attention = loansListCache.filter(l => l.status === 'Requiere Atención').length;

    const elActive = document.getElementById('count-active-loans');
    const elPending = document.getElementById('count-pending-loans');
    const elReturned = document.getElementById('count-returned-loans');
    const elAttention = document.getElementById('count-attention-loans');
    const elTotal = document.getElementById('count-total-loans');

    if (elActive) elActive.textContent = active;
    if (elPending) elPending.textContent = pending;
    if (elReturned) elReturned.textContent = returned;
    if (elAttention) elAttention.textContent = attention;
    if (elTotal) elTotal.textContent = loansListCache.length;
}

function renderAdminPendingAlert() {
    const container = document.getElementById('admin-pending-alert-container');
    if (!container) return;

    const isAdmin = state.userRole === 'admin';
    const pendingApproval = loansListCache.filter(l => l.status === 'Pendiente Aprobación Admin');
    const pendingReturn = loansListCache.filter(l => l.status === 'Pendiente Verificación Admin');
    const attentionLoans = loansListCache.filter(l => l.status === 'Requiere Atención');

    if (isAdmin && (pendingApproval.length > 0 || pendingReturn.length > 0 || attentionLoans.length > 0)) {
        let alertHtml = '';
        if (pendingApproval.length > 0) {
            alertHtml += `
                <div class="bg-amber-500/10 border-2 border-amber-500/40 p-4 rounded-3xl text-amber-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">⏳</span>
                        <div>
                            <h4 class="font-extrabold text-sm text-amber-300">Tienes ${pendingApproval.length} solicitud(es) de préstamo pendiente(s) de aprobación</h4>
                            <p class="text-xs text-amber-200/80">El responsable solicitó el préstamo. Al aprobarlo, iniciará a contar el tiempo.</p>
                        </div>
                    </div>
                    <button onclick="setLoansFilter('Pendiente Aprobación Admin')" class="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl shrink-0 shadow-sm">
                        Revisar Solicitudes
                    </button>
                </div>
            `;
        }
        if (pendingReturn.length > 0) {
            alertHtml += `
                <div class="bg-orange-500/10 border-2 border-orange-500/40 p-4 rounded-3xl text-orange-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">📷</span>
                        <div>
                            <h4 class="font-extrabold text-sm text-orange-300">Tienes ${pendingReturn.length} devolución(es) pendiente(s) de verificación en estante</h4>
                            <p class="text-xs text-orange-200/80">El responsable subió la foto y descripción de entrega. Verifica y aprueba la conclusión.</p>
                        </div>
                    </div>
                    <button onclick="setLoansFilter('Pendiente Verificación Admin')" class="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl shrink-0 shadow-sm">
                        Ver Devoluciones
                    </button>
                </div>
            `;
        }
        if (attentionLoans.length > 0) {
            alertHtml += `
                <div class="bg-rose-500/10 border-2 border-rose-500/40 p-4 rounded-3xl text-rose-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">⚠️</span>
                        <div>
                            <h4 class="font-extrabold text-sm text-rose-300">Hay ${attentionLoans.length} préstamo(s) marcados como REQUIERE ATENCIÓN</h4>
                            <p class="text-xs text-rose-200/80">Tienen observaciones pendientes que deben corregirse.</p>
                        </div>
                    </div>
                    <button onclick="setLoansFilter('Requiere Atención')" class="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl shrink-0 shadow-sm">
                        Revisar Observaciones
                    </button>
                </div>
            `;
        }
        container.innerHTML = `<div class="space-y-3">${alertHtml}</div>`;
    } else {
        container.innerHTML = '';
    }
}

function setLoansFilter(filter) {
    currentLoanFilter = filter;
    ['btn-filter-all', 'btn-filter-req-pending', 'btn-filter-active', 'btn-filter-pending', 'btn-filter-attention', 'btn-filter-returned'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.className = "px-3.5 py-2 rounded-lg font-bold text-xs transition text-slate-400 hover:text-white";
    });

    if (filter === 'all') document.getElementById('btn-filter-all').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs";
    else if (filter === 'Pendiente Aprobación Admin') document.getElementById('btn-filter-req-pending').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-amber-500 text-slate-950 font-extrabold shadow-xs";
    else if (filter === 'Prestado') document.getElementById('btn-filter-active').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-amber-600 text-white font-extrabold shadow-xs";
    else if (filter === 'Pendiente Verificación Admin') document.getElementById('btn-filter-pending').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-orange-500 text-white font-extrabold shadow-xs";
    else if (filter === 'Requiere Atención') document.getElementById('btn-filter-attention').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-rose-600 text-white font-extrabold shadow-xs";
    else if (filter === 'Devuelto') document.getElementById('btn-filter-returned').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-emerald-500 text-slate-950 font-extrabold shadow-xs";

    renderLoansTable();
}

function onSearchLoans(val) {
    loanSearchQuery = val.toLowerCase().trim();
    renderLoansTable();
}

function renderLoansTable() {
    const tbody = document.getElementById('loans-table-body');
    if (!tbody) return;

    let items = [...loansListCache];

    if (currentLoanFilter !== 'all') {
        items = items.filter(l => l.status === currentLoanFilter);
    }

    if (loanSearchQuery) {
        items = items.filter(l => 
            l.item_name.toLowerCase().includes(loanSearchQuery) ||
            l.borrower_name.toLowerCase().includes(loanSearchQuery) ||
            l.loan_date.includes(loanSearchQuery) ||
            (l.rejection_reason && l.rejection_reason.toLowerCase().includes(loanSearchQuery))
        );
    }

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-12 text-center text-slate-400 italic">
                    No hay registros de préstamos que coincidan.
                </td>
            </tr>
        `;
        return;
    }

    const isAdmin = state.userRole === 'admin';

    let html = '';
    items.forEach(loan => {
        let badgeStatus = '';
        if (loan.status === 'Pendiente Aprobación Admin') {
            badgeStatus = '<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs whitespace-nowrap leading-normal">⏳ Pendiente Aprobación</span>';
        } else if (loan.status === 'Prestado') {
            badgeStatus = '<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs whitespace-nowrap leading-normal"><span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> 🟡 En Préstamo</span>';
        } else if (loan.status === 'Pendiente Verificación Admin') {
            badgeStatus = '<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-xs whitespace-nowrap leading-normal">📷 Pendiente Verificación</span>';
        } else if (loan.status === 'Requiere Atención') {
            badgeStatus = '<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs whitespace-nowrap leading-normal">⚠️ REQUIERE ATENCIÓN</span>';
        } else if (loan.status === 'Control Mayor') {
            badgeStatus = '<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs whitespace-nowrap leading-normal">🏛️ CONTROL MAYOR</span>';
        } else if (loan.status === 'Rechazado') {
            badgeStatus = '<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-red-950/40 text-red-400 border border-red-800 shadow-xs whitespace-nowrap leading-normal">✕ Rechazado</span>';
        } else {
            badgeStatus = '<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs whitespace-nowrap leading-normal">🟢 DEVUELTO & APROBADO</span>';
        }

        const photoHtml = loan.return_photo_path ? `
            <div class="space-y-1">
                <button type="button" onclick="openImageLightbox('${loan.return_photo_path}', 'Evidencia en Estante - Préstamo #${loan.id}')" class="block w-14 h-14 rounded-2xl overflow-hidden border border-slate-700/80 hover:border-emerald-400 hover:scale-105 transition-all duration-200 shadow-md group relative bg-slate-900 shrink-0" title="Haz clic para ampliar la evidencia">
                    <img src="${loan.return_photo_path}" class="w-full h-full object-cover group-hover:scale-110 transition duration-200" />
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">🔍</div>
                </button>
                ${loan.return_notes ? `<div class="text-3xs text-slate-300 font-medium max-w-[140px] italic line-clamp-2 leading-tight">"${loan.return_notes}"</div>` : ''}
            </div>
        ` : (loan.return_notes ? `<div class="text-3xs text-slate-400 italic">"${loan.return_notes}"</div>` : '<span class="text-3xs text-slate-500 italic">Sin foto</span>');

        const rejectionHtml = loan.rejection_reason ? `
            <div class="mt-1 bg-rose-500/10 border border-rose-500/30 p-2 rounded-xl text-3xs text-rose-300 italic">
                <span class="font-bold text-rose-400 not-italic block">⚠️ Observación Admin:</span>
                "${loan.rejection_reason}"
            </div>
        ` : '';

        const controlMayorHtml = loan.control_mayor_notes ? `
            <div class="mt-1 bg-purple-500/10 border border-purple-500/30 p-2 rounded-xl text-3xs text-purple-300 italic">
                <span class="font-bold text-purple-400 not-italic block">🏛️ Resguardo Especial (Control Mayor):</span>
                "${loan.control_mayor_notes}"
            </div>
        ` : '';

        const timerLive = formatWebLiveTimer(loan.loan_date, loan.status, loan.return_date || loan.verified_at);

        const currUser = (state.username || '').trim().toLowerCase();
        const bUser = (loan.borrower_name || '').trim().toLowerCase();
        const isBorrower = Boolean(currUser && currUser === bUser);

        html += `
            <tr class="hover:bg-slate-800/60 transition border-b border-slate-800/60">
                <td class="py-4 px-6 font-mono font-extrabold text-amber-400 text-xs">#PR-${loan.id}</td>
                <td class="py-4 px-6">
                    <div class="font-extrabold text-white text-sm leading-snug">${loan.item_name}</div>
                    ${loan.notes ? `<div class="text-3xs text-slate-400 mt-0.5">Motivo: ${loan.notes}</div>` : ''}
                    ${rejectionHtml}
                    ${controlMayorHtml}
                </td>
                <td class="py-4 px-6">
                    <div class="font-extrabold text-slate-200 text-xs">${loan.borrower_name}</div>
                    <div class="text-3xs text-slate-400 uppercase font-semibold">${loan.borrower_type || 'Responsable'}</div>
                </td>
                <td class="py-4 px-6">
                    <div class="font-mono text-xs font-medium text-slate-300">${loan.loan_date}</div>
                    <div class="font-extrabold text-teal-300 font-mono text-xs mt-0.5 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-lg inline-block" id="live-timer-${loan.id}">${timerLive}</div>
                </td>
                <td class="py-4 px-6">${photoHtml}</td>
                <td class="py-4 px-6">${badgeStatus}</td>
                <td class="py-4 px-6 text-right">
                    <div class="flex items-center justify-end gap-2 flex-wrap">
                        ${isAdmin && loan.status === 'Pendiente Aprobación Admin' ? `
                            <button onclick="rejectLoanRequest(${loan.id})" class="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold px-2.5 py-1 rounded-xl text-2xs transition">
                                ✕ Rechazar
                            </button>
                            <button onclick="approveLoanRequest(${loan.id})" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-2xs transition shadow-xs">
                                👑 Aprobar Préstamo
                            </button>
                        ` : ''}

                        ${loan.status === 'Prestado' && isBorrower ? `
                            <button onclick="openReturnLoanModal(${loan.id})" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-2xs transition shadow-xs">
                                📸 Devolver con Foto
                            </button>
                        ` : ''}

                        ${loan.status === 'Requiere Atención' && isBorrower ? `
                            <button onclick="openReturnLoanModal(${loan.id})" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-2xs transition shadow-xs">
                                🛠️ Corregir Evidencia
                            </button>
                        ` : ''}

                        ${isAdmin && (loan.status === 'Prestado' || loan.status === 'Pendiente Verificación Admin' || loan.status === 'Requiere Atención' || loan.status === 'Pendiente Aprobación Admin') ? `
                            <button onclick="processControlMayorWeb(${loan.id})" class="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 font-bold px-2.5 py-1 rounded-xl text-2xs transition">
                                🏛️ Control Mayor
                            </button>
                        ` : ''}

                        ${isAdmin && loan.status === 'Pendiente Verificación Admin' ? `
                            <button onclick="rejectReturnLoan(${loan.id})" class="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold px-2.5 py-1 rounded-xl text-2xs transition">
                                ⚠️ Observar
                            </button>
                            <button onclick="approveReturnLoan(${loan.id})" class="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-2xs transition shadow-xs">
                                🟢 Aprobar Devolución
                            </button>
                        ` : ''}

                        ${isAdmin ? `
                            <button onclick="deleteLoanRecord(${loan.id})" class="text-rose-400 hover:text-rose-300 p-2 rounded-xl hover:bg-rose-500/10 transition" title="Eliminar registro">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    lucide.createIcons();
}

function openCreateLoanModal() {
    loanBasket = [];
    renderLoanBasket();
    const modal = document.getElementById('modal-create-loan');
    if (modal) modal.classList.remove('hidden');
}

function closeCreateLoanModal() {
    stopLoanQrScanModal();
    const modal = document.getElementById('modal-create-loan');
    if (modal) modal.classList.add('hidden');
}

async function submitNewLoan() {
    const selUser = document.getElementById('loan-registered-user-select');
    const borrowerUserId = selUser ? selUser.value : '';
    const borrowerOption = selUser ? selUser.options[selUser.selectedIndex] : null;
    const borrowerName = borrowerOption ? borrowerOption.getAttribute('data-name') : '';
    const borrowerType = borrowerOption ? borrowerOption.getAttribute('data-role') : 'Docente';
    const notes = document.getElementById('loan-notes').value.trim();

    if (!borrowerUserId || !borrowerName) {
        alert("Por favor selecciona a un usuario/docente registrado en el sistema.");
        return;
    }

    if (loanBasket.length === 0) {
        alert("Por favor agrega al menos una sustancia o material escaneado por QR a la lista de préstamo.");
        return;
    }

    try {
        const res = await fetch('/api/loans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                borrower_name: borrowerName,
                borrower_user_id: parseInt(borrowerUserId),
                borrower_type: borrowerType,
                items_list: loanBasket,
                notes: notes
            })
        });

        const data = await res.json();
        if (data.status === 'success') {
            closeCreateLoanModal();
            await loadLoansData();
            alert("✅ Préstamo registrado exitosamente por QR.");
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error registrando préstamo.");
    }
}

function openReturnLoanModal(loanId) {
    activeReturnLoanId = loanId;
    const modal = document.getElementById('modal-return-loan');
    if (modal) modal.classList.remove('hidden');
}

function closeReturnLoanModal() {
    activeReturnLoanId = null;
    const modal = document.getElementById('modal-return-loan');
    if (modal) modal.classList.add('hidden');
}

async function submitReturnWithPhoto() {
    if (!activeReturnLoanId) return;

    const fileInput = document.getElementById('return-photo-file');
    const notesInput = document.getElementById('return-notes-input');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Por favor sube una fotografía del compuesto colocado en su estante de almacenamiento.");
        return;
    }

    const returnNotes = (notesInput ? notesInput.value : '').trim();
    if (!returnNotes) {
        alert("Por favor describe el estado o lo realizado con la sustancia.");
        return;
    }

    const formData = new FormData();
    formData.append('photo', fileInput.files[0]);
    formData.append('notes', returnNotes);

    try {
        const res = await fetch(`/api/loans/${activeReturnLoanId}/request-return`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (data.status === 'success') {
            closeReturnLoanModal();
            await loadLoansData();
            alert("✅ Evidencia fotográfica y descripción registradas. Queda pendiente de verificación final por el Administrador.");
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error subiendo evidencia de foto.");
    }
}

async function approveLoanRequest(loanId) {
    if (!confirm(`👑 ¿Confirmas aprobar la solicitud de préstamo #PR-${loanId}? A partir de este momento comenzará a contar el tiempo.`)) return;

    try {
        const res = await fetch(`/api/loans/${loanId}/approve-loan`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
            await loadLoansData();
            alert("🟢 Solicitud de préstamo aprobada exitosamente. El tiempo de préstamo ha comenzado a correr.");
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error al aprobar la solicitud de préstamo.");
    }
}

async function rejectLoanRequest(loanId) {
    const reason = prompt(`✕ Ingresa el motivo o justificación para rechazar la solicitud #PR-${loanId}:`);
    if (!reason || !reason.trim()) return;

    try {
        const res = await fetch(`/api/loans/${loanId}/reject-loan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason.trim() })
        });
        const data = await res.json();
        if (data.status === 'success') {
            await loadLoansData();
            alert("✕ Solicitud de préstamo rechazada.");
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error al rechazar solicitud.");
    }
}

async function rejectReturnLoan(loanId) {
    const reason = prompt(`⚠️ Ingresa la observación o razón por la que la devolución del préstamo #PR-${loanId} requiere atención:`);
    if (!reason || !reason.trim()) return;

    try {
        const res = await fetch(`/api/loans/${loanId}/reject-return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason.trim() })
        });
        const data = await res.json();
        if (data.status === 'success') {
            await loadLoansData();
            alert("⚠️ Devolución marcada con la etiqueta 'Requiere Atención' y la observación registrada.");
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error al marcar observación de devolución.");
    }
}

async function approveReturnLoan(loanId) {
    if (!confirm(`👑 ¿Confirmas que verificaste físicamente en el estante la sustancia del préstamo #PR-${loanId}?`)) return;

    try {
        const res = await fetch(`/api/loans/${loanId}/approve-return`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
            await loadLoansData();
            alert("🟢 Devolución aprobada y verificada en estante por el Administrador. Registro actualizado en Historial.");
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error al aprobar la devolución.");
    }
}

async function deleteLoanRecord(loanId) {
    if (!confirm(`⚠️ ¿Estás seguro de eliminar el registro de préstamo #PR-${loanId}? Esta acción no se puede deshacer.`)) return;

    try {
        const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') {
            await loadLoansData();
            alert("🗑️ Registro de préstamo eliminado.");
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error al eliminar préstamo.");
    }
}

async function processControlMayorWeb(loanId) {
    const notes = prompt(`🏛️ Protocolo Control Mayor - Préstamo #PR-${loanId}:\nIngresa la nota explicativa o justificación por la que el material no está en el laboratorio (ej: Enviado a calibración o resguardado en otra área):`);
    if (!notes || !notes.trim()) return;

    try {
        const res = await fetch(`/api/loans/${loanId}/control-mayor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: notes.trim() })
        });
        const data = await res.json();
        if (data.status === 'success') {
            await loadLoansData();
            alert("🏛️ Registro concluido bajo la etiqueta 'Control Mayor'.");
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error procesando Control Mayor.");
    }
}

async function clearLoansHistoryWeb() {
    if (!confirm("🧹 ¿Estás seguro de limpiar de la lista activa los registros devueltos y rechazados?")) return;

    try {
        const res = await fetch('/api/loans/clear-history', { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
            await loadLoansData();
            alert("🧹 Registros del historial concluidos limpiados con éxito.");
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error al limpiar historial.");
    }
}
