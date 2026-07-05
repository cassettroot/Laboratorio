async function renderNotificationsView(container) {
    if (!state.isLoggedIn) {
        container.innerHTML = `
            <div class="bg-white border rounded-3xl p-12 text-center text-slate-400">
                <i data-lucide="lock" class="w-12 h-12 text-slate-300 mx-auto mb-4 animate-bounce"></i>
                <h3 class="text-lg font-bold text-slate-800">Iniciar Sesión Requerido</h3>
                <p class="text-sm mt-1">Por favor inicie sesión para ver las notificaciones.</p>
                <button onclick="openAuthModal()" class="mt-4 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition text-sm">
                    Iniciar Sesión
                </button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    container.innerHTML = `
        <div class="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div>
                <h3 class="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <i data-lucide="bell" class="w-6 h-6 text-brand-500"></i>
                    <span>Bandeja de Solicitudes y Notificaciones</span>
                </h3>
                <p class="text-xs text-slate-400 mt-1">
                    ${state.userRole === 'admin' 
                        ? 'Revisa, aprueba o pide correcciones en las solicitudes de modificación enviadas por los responsables.'
                        : 'Observa el estado de tus solicitudes enviadas y realiza correcciones en caso de ser requerido por el administrador.'
                    }
                </p>
            </div>

            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial de Solicitudes</span>
                    <button onclick="fetchAndRenderNotifications()" class="p-2 hover:bg-slate-200/50 rounded-xl text-slate-500 transition" title="Refrescar">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                    </button>
                </div>
                <div class="divide-y divide-slate-100" id="notifications-list-container">
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
            listContainer.innerHTML = `<div class="py-12 text-center text-red-500 font-bold">${res.message}</div>`;
            return;
        }

        const requests = res.data || [];
        if (requests.length === 0) {
            listContainer.innerHTML = `
                <div class="py-16 text-center text-slate-400">
                    <i data-lucide="inbox" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
                    <p class="font-bold text-slate-700">Sin Solicitudes</p>
                    <p class="text-xs mt-1">No hay notificaciones ni solicitudes pendientes de revisión.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        listContainer.innerHTML = requests.map(req => {
            const dateStr = new Date(req.created_at + 'Z').toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
            
            // Colores por estado
            let statusColor = 'bg-slate-50 text-slate-500 border-slate-200';
            let statusLabel = req.status;
            if (req.status === 'PENDIENTE') {
                statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                statusLabel = 'Pendiente Aprobación';
            } else if (req.status === 'APROBADO') {
                statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                statusLabel = 'Aprobado';
            } else if (req.status === 'CORRECCION') {
                statusColor = 'bg-rose-50 text-rose-700 border-rose-200';
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
                <div class="flex flex-wrap gap-2 pt-3 border-t border-slate-50 mt-3">
                    <button onclick="approveRequest(${req.id})" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm">
                        <i data-lucide="check" class="w-3.5 h-3.5"></i>
                        <span>Aprobar y Aplicar</span>
                    </button>
                    <button onclick="showRejectInput(${req.id})" class="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-100 transition flex items-center gap-1">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                        <span>Solicitar Corrección</span>
                    </button>
                </div>
                <div id="reject-box-${req.id}" class="hidden pt-3 border-t border-slate-50 mt-3 space-y-2">
                    <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider">Instrucciones de corrección para el responsable</label>
                    <textarea id="reject-feedback-${req.id}" rows="2" placeholder="Ej. Favor de corregir la concentración y agregar foto..." class="w-full bg-slate-50 border rounded-xl p-2.5 text-xs outline-none focus:bg-white focus:border-brand-500 font-semibold transition"></textarea>
                    <div class="flex justify-end gap-1.5">
                        <button onclick="hideRejectInput(${req.id})" class="px-2.5 py-1 border rounded-lg text-3xs font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                        <button onclick="submitRejectRequest(${req.id})" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-3xs font-bold">Enviar</button>
                    </div>
                </div>
            ` : '';

            // Botones de acción del responsable
            const responsableActionsHtml = (state.userRole === 'responsable' && req.status === 'CORRECCION') ? `
                <div class="flex gap-2 pt-3 border-t border-slate-50 mt-3">
                    <button onclick='openRequestCorrectionModal(${JSON.stringify(req).replace(/'/g, "&#39;")})' class="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        <span>Corregir y Re-enviar</span>
                    </button>
                </div>
            ` : '';

            // Feedback del administrador
            const feedbackHtml = req.feedback ? `
                <div class="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 mt-3 text-rose-950 flex gap-2.5">
                    <i data-lucide="message-square-warning" class="w-4 h-4 text-rose-500 shrink-0 mt-0.5"></i>
                    <div>
                        <span class="text-3xs font-bold uppercase tracking-wider text-rose-800 block">Retroalimentación del Administrador</span>
                        <p class="text-xs mt-1 text-rose-700 font-medium">${req.feedback}</p>
                    </div>
                </div>
            ` : '';

            // JSON data fields preview
            let dataFieldsHtml = '';
            try {
                const payload = JSON.parse(req.data);
                dataFieldsHtml = `
                    <div class="mt-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        <button onclick="toggleDetails(${req.id})" class="w-full text-left flex justify-between items-center text-3xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 outline-none">
                            <span>Campos Propuestos</span>
                            <span class="flex items-center gap-0.5" id="details-arrow-text-${req.id}">
                                <span>Mostrar</span>
                                <i data-lucide="chevron-down" class="w-3 h-3"></i>
                            </span>
                        </button>
                        <div id="details-container-${req.id}" class="hidden mt-3 text-xs space-y-2 border-t border-slate-200/50 pt-2.5 max-h-60 overflow-y-auto">
                            ${Object.entries(payload).map(([k, v]) => {
                                const friendlyKey = k.replace(/_/g, ' ').toUpperCase();
                                return `
                                    <div class="flex justify-between items-start gap-4">
                                        <span class="font-bold text-slate-400 shrink-0">${friendlyKey}:</span>
                                        <span class="font-semibold text-slate-700 break-all text-right">${v === null ? '-' : (typeof v === 'object' ? JSON.stringify(v) : v)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            } catch {}

            return `
                <div class="p-6 flex flex-col gap-1.5 hover:bg-slate-50/20 transition relative overflow-hidden">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-lg border text-3xs font-extrabold uppercase tracking-wider ${statusColor}">
                                ${statusLabel}
                            </span>
                            <span class="text-3xs text-slate-400 font-semibold">${dateStr}</span>
                        </div>
                        <span class="text-3xs text-slate-400 font-bold uppercase tracking-wider">ID de Solicitud: #${req.id}</span>
                    </div>

                    <div class="mt-1">
                        <h4 class="font-bold text-slate-900 text-sm">
                            ${req.action} de ${typeLabel}
                        </h4>
                        <p class="text-xs text-slate-500 font-semibold mt-0.5">
                            Elemento: <strong class="text-slate-800">${req.target_name || `ID ${req.target_id || '-'}`}</strong>
                            ${state.userRole === 'admin' ? ` | Solicitado por: <strong class="text-slate-800">${req.requester_username}</strong>` : ''}
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
        listContainer.innerHTML = `<div class="py-12 text-center text-red-500 font-bold">Error de conexión al cargar solicitudes.</div>`;
    }
}

function toggleDetails(reqId) {
    const details = document.getElementById(`details-container-${reqId}`);
    const arrowText = document.getElementById(`details-arrow-text-${reqId}`);
    if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        arrowText.innerHTML = `<span>Ocultar</span><i data-lucide="chevron-up" class="w-3 h-3"></i>`;
    } else {
        details.classList.add('hidden');
        arrowText.innerHTML = `<span>Mostrar</span><i data-lucide="chevron-down" class="w-3 h-3"></i>`;
    }
    if (window.lucide) window.lucide.createIcons();
}

async function approveRequest(reqId) {
    if (!confirm("¿Está seguro de aprobar y aplicar estos cambios a la base de datos global?")) {
        return;
    }

    try {
        const res = await fetch(`/api/change-requests/${reqId}/approve`, {
            method: 'POST'
        }).then(r => r.json());

        if (res.status === 'success') {
            alert("Solicitud aprobada y cambios aplicados.");
            await fetchAndRenderNotifications();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}

function showRejectInput(reqId) {
    document.getElementById(`reject-box-${reqId}`).classList.remove('hidden');
}

function hideRejectInput(reqId) {
    document.getElementById(`reject-box-${reqId}`).classList.add('hidden');
}

async function submitRejectRequest(reqId) {
    const feedback = document.getElementById(`reject-feedback-${reqId}`).value.trim();
    if (!feedback) {
        alert("Por favor ingrese retroalimentación explicando qué corregir.");
        return;
    }

    try {
        const res = await fetch(`/api/change-requests/${reqId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback })
        }).then(r => r.json());

        if (res.status === 'success') {
            alert("Solicitud enviada para corrección.");
            await fetchAndRenderNotifications();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}

function openRequestCorrectionModal(req) {
    // Definimos variables de estado global de modal.js
    currentModalType = req.type;
    currentEditId = req.target_id ? parseInt(req.target_id) : null;
    state.editingRequestId = req.id; // Permite a handleFormSubmit saber que edita una PR

    const modal = document.getElementById('item-modal');
    const content = document.getElementById('item-modal-content');
    const formContainer = document.getElementById('modal-form-container');
    const title = document.getElementById('modal-title');

    title.textContent = `Corregir Solicitud: ${req.action === 'CREACION' ? 'Registro' : 'Edición'}`;

    try {
        const payload = JSON.parse(req.data);
        formContainer.innerHTML = buildFormHtml(req.type, payload);
        bindFormEvents();
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 50);

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        alert("Error al cargar datos de la solicitud: " + err.message);
    }
}
