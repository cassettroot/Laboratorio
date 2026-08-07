async function renderNotificationsView(container) {
    if (!state.isLoggedIn) {
        container.innerHTML = `
            <div class="glass-card-premium border border-slate-700/60 rounded-3xl p-12 text-center text-slate-300 max-w-xl mx-auto space-y-4 bg-slate-900/90 text-white">
                <i data-lucide="lock" class="w-12 h-12 text-amber-400 mx-auto mb-2 animate-bounce"></i>
                <h3 class="text-xl font-extrabold text-white">Iniciar Sesión Requerido</h3>
                <p class="text-xs text-slate-300 font-medium">Por favor inicie sesión para ver las notificaciones y bandeja de solicitudes.</p>
                <button onclick="openAuthModal()" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition text-xs shadow-md">
                    Iniciar Sesión
                </button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    container.innerHTML = `
        <div class="space-y-6 animate-fade-in max-w-5xl mx-auto text-white">
            <div class="glass-card-premium rounded-3xl p-6 border border-slate-700/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-2xl shadow-inner">
                        🔔
                    </div>
                    <div>
                        <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                            Bandeja de Solicitudes y Notificaciones
                        </h2>
                        <p class="text-xs text-slate-300 mt-0.5 font-medium">
                            ${state.userRole === 'admin' 
                                ? 'Revisa, aprueba o pide correcciones en las solicitudes de modificación enviadas por los responsables.'
                                : 'Observa el estado de tus solicitudes enviadas y realiza correcciones en caso de ser requerido por el administrador.'
                            }
                        </p>
                    </div>
                </div>
            </div>

            <div class="glass-card-premium rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden bg-slate-900/90">
                <div class="p-5 border-b border-slate-700/60 flex justify-between items-center bg-slate-950/60">
                    <span class="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Historial de Solicitudes</span>
                    <button onclick="fetchAndRenderNotifications()" class="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white border border-slate-700 transition" title="Refrescar">
                        <i data-lucide="refresh-cw" class="w-4 h-4 text-emerald-400"></i>
                    </button>
                </div>
                <div class="divide-y divide-slate-800/70" id="notifications-list-container">
                    <div class="py-12 text-center text-slate-400 font-semibold">Cargando solicitudes...</div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    await fetchAndRenderNotifications();
}

async function fetchAndRenderNotifications() {
    const listContainer = document.getElementById('notifications-list-container');
    if (!listContainer) return;

    try {
        const res = await fetch('/api/change-requests').then(r => r.json());
        if (res.status === 'error') {
            listContainer.innerHTML = `<div class="py-12 text-center text-rose-400 font-bold">${res.message}</div>`;
            return;
        }

        const requests = res.data || [];
        if (requests.length === 0) {
            listContainer.innerHTML = `
                <div class="py-16 text-center text-slate-400">
                    <i data-lucide="inbox" class="w-12 h-12 text-slate-500 mx-auto mb-3"></i>
                    <p class="font-extrabold text-white text-base">Sin Solicitudes</p>
                    <p class="text-xs text-slate-300 mt-1">No hay notificaciones ni solicitudes pendientes de revisión.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        listContainer.innerHTML = requests.map(req => {
            const dateStr = new Date(req.created_at + 'Z').toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
            
            // Colores por estado
            let statusColor = 'bg-slate-950 text-slate-300 border-slate-700';
            let statusLabel = req.status;
            if (req.status === 'PENDIENTE') {
                statusColor = 'bg-slate-950 text-amber-300 border-amber-400';
                statusLabel = 'Pendiente Aprobación';
            } else if (req.status === 'APROBADO') {
                statusColor = 'bg-slate-950 text-emerald-300 border-emerald-400';
                statusLabel = 'Aprobado';
            } else if (req.status === 'CORRECCION') {
                statusColor = 'bg-slate-950 text-rose-300 border-rose-400';
                statusLabel = 'Requiere Corrección';
            }

            // Mapeo tipo
            let typeLabel = req.type;
            if (req.type === 'substances') typeLabel = 'Sustancia / Reactivo';
            else if (req.type === 'chemical_materials') typeLabel = 'Material Químico';
            else if (req.type === 'didactic_materials') typeLabel = 'Material Didáctico';
            else if (req.type.startsWith('consulta_')) {
                typeLabel = `Consulta: ${req.type.replace('consulta_', '').toUpperCase()}`;
            }

            // Botones de acción del administrador
            const adminActionsHtml = (state.userRole === 'admin' && req.status === 'PENDIENTE') ? `
                <div class="flex flex-wrap gap-2.5 pt-4 border-t border-slate-800 mt-4">
                    <button onclick="approveRequest(${req.id})" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-md">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        <span>Aprobar y Aplicar</span>
                    </button>
                    <button onclick="showRejectInput(${req.id})" class="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5">
                        <i data-lucide="x" class="w-4 h-4"></i>
                        <span>Solicitar Corrección</span>
                    </button>
                </div>
                <div id="reject-box-${req.id}" class="hidden pt-4 border-t border-slate-800 mt-4 space-y-3">
                    <label class="block text-2xs font-extrabold text-slate-300 uppercase tracking-wider">Instrucciones de corrección para el responsable</label>
                    <textarea id="reject-feedback-${req.id}" rows="2" placeholder="Ej. Favor de corregir la concentración y agregar foto..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 font-medium transition"></textarea>
                    <div class="flex justify-end gap-2">
                        <button onclick="hideRejectInput(${req.id})" class="px-3 py-1.5 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800">Cancelar</button>
                        <button onclick="submitRejectRequest(${req.id})" class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold shadow-md">Enviar</button>
                    </div>
                </div>
            ` : '';

            // Botones de acción del responsable
            const responsableActionsHtml = (state.userRole === 'responsable' && req.status === 'CORRECCION') ? `
                <div class="flex gap-2.5 pt-4 border-t border-slate-800 mt-4">
                    <button onclick='openRequestCorrectionModal(${JSON.stringify(req).replace(/'/g, "&#39;")})' class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-md">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                        <span>Corregir y Re-enviar</span>
                    </button>
                </div>
            ` : '';

            // Feedback del administrador
            const feedbackHtml = req.feedback ? `
                <div class="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-4 mt-3 text-white flex gap-3">
                    <i data-lucide="message-square-warning" class="w-5 h-5 text-rose-400 shrink-0 mt-0.5"></i>
                    <div>
                        <span class="text-2xs font-extrabold uppercase tracking-wider text-rose-300 block">Retroalimentación del Administrador</span>
                        <p class="text-xs mt-1 text-slate-100 font-medium leading-relaxed">${req.feedback}</p>
                    </div>
                </div>
            ` : '';

            // JSON data fields preview como acordeón oscuro de alto contraste
            let dataFieldsHtml = '';
            try {
                const payload = JSON.parse(req.data);
                dataFieldsHtml = `
                    <div class="mt-4 bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-inner">
                        <button onclick="toggleDetails(${req.id})" class="w-full text-left flex justify-between items-center text-xs font-extrabold uppercase tracking-wider text-slate-300 hover:text-white outline-none cursor-pointer">
                            <span class="flex items-center gap-2">
                                <i data-lucide="list" class="w-4 h-4 text-emerald-400"></i>
                                <span>Campos Propuestos</span>
                            </span>
                            <span class="flex items-center gap-1 text-emerald-400 font-bold" id="details-arrow-text-${req.id}">
                                <span>Mostrar</span>
                                <i data-lucide="chevron-down" class="w-4 h-4"></i>
                            </span>
                        </button>
                        <div id="details-container-${req.id}" class="hidden mt-3 text-xs space-y-2 border-t border-slate-800 pt-3 max-h-60 overflow-y-auto">
                            ${Object.entries(payload).map(([k, v]) => {
                                const friendlyKey = k.replace(/_/g, ' ').toUpperCase();
                                return `
                                    <div class="flex justify-between items-start gap-4 p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
                                        <span class="font-extrabold text-slate-300 shrink-0">${friendlyKey}:</span>
                                        <span class="font-bold text-white break-all text-right">${v === null ? '-' : (typeof v === 'object' ? JSON.stringify(v) : v)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            } catch {}

            return `
                <div class="p-6 flex flex-col gap-2 hover:bg-slate-800/40 transition relative overflow-hidden text-white">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-2.5">
                            <span class="px-3 py-1.5 rounded-xl border text-xs font-extrabold uppercase tracking-wider ${statusColor} shadow-2xs">
                                ${statusLabel}
                            </span>
                            <span class="text-xs text-slate-300 font-medium">${dateStr}</span>
                        </div>
                        <span class="text-xs text-amber-400 font-mono font-extrabold uppercase">#REQ-${req.id}</span>
                    </div>

                    <div class="mt-2">
                        <h4 class="font-extrabold text-white text-base">
                            ${req.action} de ${typeLabel}
                        </h4>
                        <p class="text-xs text-slate-300 font-medium mt-1">
                            Elemento: <strong class="text-white font-extrabold">${req.target_name || `ID ${req.target_id || '-'}`}</strong>
                            ${state.userRole === 'admin' ? ` | Solicitado por: <strong class="text-emerald-300 font-extrabold">${req.requester_username}</strong>` : ''}
                        </p>
                    </div>

                    ${dataFieldsHtml}
                    ${feedbackHtml}
                    ${adminActionsHtml}
                    ${responsableActionsHtml}
                </div>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        listContainer.innerHTML = `<div class="py-12 text-center text-rose-400 font-bold">Error de conexión al cargar solicitudes.</div>`;
    }
}

function toggleDetails(reqId) {
    const details = document.getElementById(`details-container-${reqId}`);
    const arrowText = document.getElementById(`details-arrow-text-${reqId}`);
    if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        arrowText.innerHTML = `<span>Ocultar</span><i data-lucide="chevron-up" class="w-4 h-4"></i>`;
    } else {
        details.classList.add('hidden');
        arrowText.innerHTML = `<span>Mostrar</span><i data-lucide="chevron-down" class="w-4 h-4"></i>`;
    }
    if (window.lucide) window.lucide.createIcons();
}

async function approveRequest(reqId) {
    if (!confirm("¿Está seguro de aprobar esta solicitud y aplicar los cambios directamente en la base de datos?")) return;
    try {
        const res = await fetch(`/api/change-requests/${reqId}/approve`, { method: 'POST' }).then(r => r.json());
        if (res.status === 'success') {
            alert("Solicitud aprobada e integrada con éxito.");
            await fetchAndRenderNotifications();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error al aprobar solicitud: " + err.message);
    }
}

function showRejectInput(reqId) {
    const box = document.getElementById(`reject-box-${reqId}`);
    if (box) box.classList.remove('hidden');
}

function hideRejectInput(reqId) {
    const box = document.getElementById(`reject-box-${reqId}`);
    if (box) box.classList.add('hidden');
}

async function submitRejectRequest(reqId) {
    const feedbackEl = document.getElementById(`reject-feedback-${reqId}`);
    const feedback = feedbackEl ? feedbackEl.value.trim() : '';

    if (!feedback) {
        alert("Por favor ingrese las observaciones para la corrección.");
        return;
    }

    try {
        const res = await fetch(`/api/change-requests/${reqId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback })
        }).then(r => r.json());

        if (res.status === 'success') {
            alert("Solicitud devuelta al responsable para su corrección.");
            await fetchAndRenderNotifications();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error al procesar devolución: " + err.message);
    }
}

function openRequestCorrectionModal(req) {
    let payload = {};
    try { payload = JSON.parse(req.data); } catch (e) {}
    openAddModal(req.type, payload, req.id);
}
