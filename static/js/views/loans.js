// static/js/views/loans.js
// CONTROL DE PRÉSTAMOS POR ESCANEO DE QR, USUARIO REGISTRADO, EVIDENCIA FOTOGRÁFICA Y APROBACIÓN DEL ADMIN

let loansListCache = [];
let registeredUsersCache = [];
let loanBasket = []; // Lista temporal de elementos escaneados por QR o seleccionados
let currentLoanFilter = 'all'; // 'all' | 'Prestado' | 'Pendiente' | 'Devuelto'
let loanSearchQuery = '';
let activeReturnLoanId = null;

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
                        Escaneo de QR en lista, autenticación con usuarios registrados, evidencia fotográfica de guardado y aprobación por Administrador.
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
                    <div class="w-13 h-13 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-md">
                        <i data-lucide="list-ordered" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-3xs font-black text-slate-400 uppercase tracking-wider block">Total Registros</span>
                        <h4 class="text-2xl font-black text-white tracking-tight" id="count-total-loans">0</h4>
                    </div>
                </div>
            </div>

            <!-- ALERTA ADMINISTRADOR PARA VERIFICAR DEVOLUCIONES PENDIENTES -->
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
                        📷 Pendientes Verificación
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

                        <!-- LECTOR DE CÁMARA QR DENTRO DEL MODAL (SI SE ACTIVA) -->
                        <div id="loan-qr-scanner-box" class="hidden bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
                            <div class="flex justify-between items-center text-xs text-amber-400 font-bold">
                                <span>Apunta al Código QR de la Sustancia / Material</span>
                                <button onclick="stopLoanQrScanModal()" class="text-slate-400 hover:text-white font-bold">&times; Cerrar</button>
                            </div>
                            <video id="loan-qr-video" class="w-full h-44 object-cover rounded-xl border border-slate-700"></video>
                            <p class="text-3xs text-slate-400" id="loan-qr-status-msg">Buscando código QR...</p>
                        </div>

                        <!-- SELECTOR MANUAL SECUNDARIO DE INVENTARIO -->
                        <div class="flex gap-2">
                            <input type="text" id="loan-manual-search" oninput="filterManualInventory(this.value)" placeholder="Buscar elemento por nombre..." class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                            <select id="loan-manual-select" class="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold">
                                <option value="">-- Seleccionar manualmente --</option>
                            </select>
                            <button onclick="addManualItemToBasket()" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs">
                                + Agregar
                            </button>
                        </div>

                        <!-- TABLA / CARRO DE ELEMENTOS A PRESTAR -->
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

        <!-- MODAL DE DEVOLUCIÓN Y EVIDENCIA FOTOGRÁFICA DE GUARDADO EN ESTANTE -->
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
    const pending = loansListCache.filter(l => l.status === 'Pendiente Verificación Admin').length;
    const returned = loansListCache.filter(l => l.status === 'Devuelto').length;

    const elActive = document.getElementById('count-active-loans');
    const elPending = document.getElementById('count-pending-loans');
    const elReturned = document.getElementById('count-returned-loans');
    const elTotal = document.getElementById('count-total-loans');

    if (elActive) elActive.textContent = active;
    if (elPending) elPending.textContent = pending;
    if (elReturned) elReturned.textContent = returned;
    if (elTotal) elTotal.textContent = loansListCache.length;
}

function renderAdminPendingAlert() {
    const container = document.getElementById('admin-pending-alert-container');
    if (!container) return;

    const isAdmin = state.userRole === 'admin';
    const pendingApproval = loansListCache.filter(l => l.status === 'Pendiente Aprobación Admin');
    const pendingReturn = loansListCache.filter(l => l.status === 'Pendiente Verificación Admin');

    if (isAdmin && (pendingApproval.length > 0 || pendingReturn.length > 0)) {
        let alertHtml = '';
        if (pendingApproval.length > 0) {
            alertHtml += `
                <div class="bg-amber-500/10 border-2 border-amber-500/40 p-4 rounded-3xl text-amber-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">⏳</span>
                        <div>
                            <h4 class="font-extrabold text-sm text-amber-900">Tienes ${pendingApproval.length} solicitud(es) de préstamo pendiente(s) de aprobación</h4>
                            <p class="text-xs text-amber-800">El responsable solicitó el préstamo. Al aprobarlo, iniciará a contar el tiempo.</p>
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
                            <h4 class="font-extrabold text-sm text-orange-900">Tienes ${pendingReturn.length} devolución(es) pendiente(s) de verificación en estante</h4>
                            <p class="text-xs text-orange-800">El responsable subió la foto y descripción de entrega. Verifica y aprueba la conclusión.</p>
                        </div>
                    </div>
                    <button onclick="setLoansFilter('Pendiente Verificación Admin')" class="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl shrink-0 shadow-sm">
                        Ver Devoluciones
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
    ['btn-filter-all', 'btn-filter-req-pending', 'btn-filter-active', 'btn-filter-pending', 'btn-filter-returned'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.className = "px-3.5 py-2 rounded-lg font-bold text-xs transition text-slate-500 hover:text-slate-900";
    });

    if (filter === 'all') document.getElementById('btn-filter-all').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-white text-slate-900 shadow-xs";
    else if (filter === 'Pendiente Aprobación Admin') document.getElementById('btn-filter-req-pending').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-amber-500 text-slate-950 font-extrabold shadow-xs";
    else if (filter === 'Prestado') document.getElementById('btn-filter-active').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-amber-600 text-white font-extrabold shadow-xs";
    else if (filter === 'Pendiente Verificación Admin') document.getElementById('btn-filter-pending').className = "px-3.5 py-2 rounded-lg font-bold text-xs transition bg-orange-500 text-white font-extrabold shadow-xs";
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
            l.loan_date.includes(loanSearchQuery)
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

        html += `
            <tr class="hover:bg-slate-800/60 transition border-b border-slate-800/60">
                <td class="py-4 px-6 font-mono font-extrabold text-amber-400 text-xs">#PR-${loan.id}</td>
                <td class="py-4 px-6">
                    <div class="font-extrabold text-white text-sm leading-snug">${loan.item_name}</div>
                    ${loan.notes ? `<div class="text-3xs text-slate-400 mt-0.5">Motivo: ${loan.notes}</div>` : ''}
                </td>
                <td class="py-4 px-6">
                    <div class="font-extrabold text-slate-200 text-xs">${loan.borrower_name}</div>
                    <div class="text-3xs text-slate-400 uppercase font-semibold">${loan.borrower_type || 'Responsable'}</div>
                </td>
                <td class="py-4 px-6">
                    <div class="font-mono text-xs font-medium text-slate-300">${loan.loan_date}</div>
                    <div class="font-extrabold text-amber-400 text-3xs mt-0.5">${loan.elapsed_time}</div>
                </td>
                <td class="py-4 px-6">${photoHtml}</td>
                <td class="py-4 px-6">${badgeStatus}</td>
                <td class="py-4 px-6 text-right">
                    <div class="flex items-center justify-end gap-2">
                        ${isAdmin && loan.status === 'Pendiente Aprobación Admin' ? `
                            <button onclick="approveLoanRequest(${loan.id})" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-2xs transition shadow-xs">
                                👑 Aprobar Préstamo
                            </button>
                        ` : ''}

                        ${loan.status === 'Prestado' ? `
                            <button onclick="openReturnLoanModal(${loan.id})" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-2xs transition shadow-xs">
                                📸 Devolver con Foto
                            </button>
                        ` : ''}

                        ${isAdmin && loan.status === 'Pendiente Verificación Admin' ? `
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
        const res = await fetch(`/api/loans/${loanId}/approve-loan`, { method: 'PUT' });
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

async function approveReturnLoan(loanId) {
    if (!confirm(`👑 ¿Confirmas que verificaste físicamente en el estante la sustancia del préstamo #PR-${loanId}?`)) return;

    try {
        const res = await fetch(`/api/loans/${loanId}/approve-return`, { method: 'PUT' });
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

window.deleteLoan = async function(loanId) {
    if (!confirm('¿Estás seguro de eliminar este registro de préstamo?')) return;
    try {
        const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') {
            await loadLoansData();
            alert('Registro de préstamo eliminado.');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (e) {
        alert('Error al eliminar préstamo: ' + e.message);
    }
};

window.openImageLightbox = function(src, title = 'Visualización de Evidencia') {
    let modal = document.getElementById('lightbox-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'lightbox-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in no-print';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="relative bg-[#0d1527] border border-slate-800 rounded-3xl p-5 max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <h4 class="font-extrabold text-sm text-white flex items-center gap-2">
                    <i data-lucide="camera" class="w-4 h-4 text-teal-400"></i>
                    <span>${title}</span>
                </h4>
                <button onclick="closeImageLightbox()" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm">✕</button>
            </div>
            <div class="flex-1 overflow-hidden flex items-center justify-center rounded-2xl bg-black/60 p-2">
                <img src="${src}" class="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg" />
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    modal.classList.remove('hidden');
};

window.closeImageLightbox = function() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.remove();
};

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
