async function renderDashboard(container) {
    container.innerHTML = `
        <div class="flex justify-center items-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>
    `;

    const currentInventory = localStorage.getItem('inventory_id') || 'inventario';
    const isLab = currentInventory === 'inventario';
    const isOffice = currentInventory === 'oficina';
    const isSystems = currentInventory === 'sistemas';

    try {
        if (isLab) {
            const [subRes, chemRes, didRes, histRes] = await Promise.all([
                fetch('/api/substances').then(r => r.json()),
                fetch('/api/chemical-materials').then(r => r.json()),
                fetch('/api/didactic-materials').then(r => r.json()),
                fetch('/api/history').then(r => r.json())
            ]);

            const substances = subRes.data || [];
            const chemMaterials = chemRes.data || [];
            const didMaterials = didRes.data || [];
            const history = histRes.data || [];

            const today = new Date();
            const expirationAlerts = substances.filter(s => {
                if (!s.expiration_date) return false;
                const exp = new Date(s.expiration_date);
                const diffTime = exp - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 30;
            });

            container.innerHTML = `
                <div class="space-y-8 animate-fade-in">
                    <div class="bg-gradient-to-r from-slate-900 via-teal-900 to-teal-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-950/10">
                        <div class="absolute -right-16 -top-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
                        <div class="relative z-10 max-w-2xl">
                            <span class="text-teal-400 text-sm font-bold uppercase tracking-wider">Laboratorio de Química</span>
                            <h2 class="text-3xl font-extrabold mt-2">Bienvenido a LabKeep Química</h2>
                            <p class="text-slate-300 mt-2">
                                Gestión de reactivos, sustancias químicas, cristalería, modelos didácticos y control de caducidades con bitácora de auditoría.
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                            <div class="bg-teal-50 text-teal-600 p-4 rounded-2xl">
                                <i data-lucide="beaker" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Sustancias</span>
                                <h3 class="text-2xl font-bold mt-1 text-slate-800">${substances.length}</h3>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                            <div class="bg-blue-50 text-blue-600 p-4 rounded-2xl">
                                <i data-lucide="droplet" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Material Químico</span>
                                <h3 class="text-2xl font-bold mt-1 text-slate-800">${chemMaterials.length}</h3>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                            <div class="bg-indigo-50 text-indigo-600 p-4 rounded-2xl">
                                <i data-lucide="graduation-cap" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Didácticos</span>
                                <h3 class="text-2xl font-bold mt-1 text-slate-800">${didMaterials.length}</h3>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                            <div class="p-4 rounded-2xl ${expirationAlerts.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}">
                                <i data-lucide="bell" class="w-8 h-8 ${expirationAlerts.length > 0 ? 'animate-bounce' : ''}"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Alertas Caducidad</span>
                                <h3 class="text-2xl font-bold mt-1 ${expirationAlerts.length > 0 ? 'text-red-600 font-extrabold' : 'text-slate-800'}">${expirationAlerts.length}</h3>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div class="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm lg:col-span-2 flex flex-col min-h-[400px]">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                <h3 class="font-bold text-slate-900 flex items-center gap-2">
                                    <i data-lucide="activity" class="text-teal-500 w-5 h-5"></i>
                                    <span>Actividad Reciente en Química</span>
                                </h3>
                                <a href="#/history" class="text-xs font-bold text-teal-600 hover:text-teal-700">Ver todo</a>
                            </div>
                            <div class="flex-1 overflow-y-auto max-h-[350px] space-y-4 pr-1">
                                ${history.length === 0 ? `
                                    <div class="text-center text-slate-400 py-12 text-sm">No hay registros de actividad aún.</div>
                                ` : history.slice(0, 5).map(h => {
                                    let actionBadgeColor = 'bg-blue-50 text-blue-600 border-blue-200';
                                    if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                                    if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-red-50 text-red-600 border-red-200';
                                    const labelTable = h.table_name === 'substances' ? 'Sustancias' : (h.table_name === 'chemical_materials' ? 'Mat. Químico' : 'Mat. Didáctico');

                                    return `
                                        <div class="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition">
                                            <span class="px-2.5 py-1 text-2xs font-bold border rounded-lg ${actionBadgeColor} tracking-wider uppercase shrink-0 mt-0.5">${h.action}</span>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-semibold text-slate-800">
                                                    ${h.action === 'CREACION' ? `Registro creado en <b>${labelTable}</b> (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'ELIMINACION' ? `Registro eliminado en <b>${labelTable}</b> (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'EDICION' ? `Se modificó <b>${h.field_name}</b> en <b>${labelTable}</b>` : ''}
                                                </p>
                                                <p class="text-3xs text-slate-400 mt-1 flex items-center gap-1">
                                                    <i data-lucide="clock" class="w-3 h-3"></i>
                                                    <span>${h.timestamp}</span>
                                                    <span class="mx-1">&bull;</span>
                                                    <i data-lucide="user" class="w-3 h-3"></i>
                                                    <span>${h.user_responsible}</span>
                                                </p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <div class="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                            <div>
                                <h3 class="font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                    <i data-lucide="mouse-pointer-click" class="text-teal-500 w-5 h-5"></i>
                                    <span>Acciones Rápidas</span>
                                </h3>
                                <div class="grid grid-cols-2 gap-3 mt-4">
                                    <button onclick="openAddModal('substances')" class="p-3 text-center bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                        <i data-lucide="plus-circle" class="w-6 h-6"></i>
                                        + Sustancia
                                    </button>
                                    <button onclick="openAddModal('chemical_materials')" class="p-3 text-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                        <i data-lucide="plus-circle" class="w-6 h-6"></i>
                                        + Mat. Químico
                                    </button>
                                    <button onclick="openAddModal('didactic_materials')" class="p-3 text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                        <i data-lucide="plus-circle" class="w-6 h-6"></i>
                                        + Mat. Didáctico
                                    </button>
                                    <a href="#/scan-qr" class="p-3 text-center bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                        <i data-lucide="qr-code" class="w-6 h-6"></i>
                                        Escáner Cámara
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Dashboard para Oficina o Sistemas
            const [equiposRes, histRes, loansRes] = await Promise.all([
                fetch('/api/equipos').then(r => r.json()),
                fetch('/api/history').then(r => r.json()),
                fetch('/api/loans').then(r => r.json())
            ]);

            const equipos = equiposRes.data || [];
            const history = histRes.data || [];
            const loans = loansRes.data || [];

            const totalEquipos = equipos.length;
            const enDisponibles = equipos.filter(e => e.status === 'Disponible' || e.status === 'Excelente' || e.status === 'Bueno').length;
            const enMantenimiento = equipos.filter(e => e.status === 'En Mantenimiento' || e.status === 'Reparación' || e.status === 'Regular' || e.status === 'Dañado').length;
            const prestamosActivos = loans.filter(l => l.status === 'ACTIVO').length;

            const spaceTitle = isOffice ? 'Inventario de Oficina' : 'Laboratorio de Sistemas';
            const spaceColor = isOffice ? 'blue' : 'purple';
            const spaceIcon = isOffice ? 'briefcase' : 'cpu';

            container.innerHTML = `
                <div class="space-y-8 animate-fade-in">
                    <div class="bg-gradient-to-r from-slate-900 via-${spaceColor}-900 to-${spaceColor}-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-950/10">
                        <div class="absolute -right-16 -top-16 w-64 h-64 bg-${spaceColor}-500/10 rounded-full blur-3xl"></div>
                        <div class="relative z-10 max-w-2xl">
                            <span class="text-${spaceColor}-400 text-sm font-bold uppercase tracking-wider">${spaceTitle}</span>
                            <h2 class="text-3xl font-extrabold mt-2">Bienvenido al Control de ${isOffice ? 'Oficina' : 'Sistemas'}</h2>
                            <p class="text-slate-300 mt-2">
                                ${isOffice ? 'Gestión de bienes, equipos informáticos de oficina, mobiliario, resguardos y asignaciones.' : 'Control de equipos informáticos, servidores, periféricos, mantenimiento preventivo/correctivo y préstamos.'}
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                            <div class="bg-${spaceColor}-50 text-${spaceColor}-600 p-4 rounded-2xl">
                                <i data-lucide="${spaceIcon}" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Equipos</span>
                                <h3 class="text-2xl font-bold mt-1 text-slate-800">${totalEquipos}</h3>
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                            <div class="bg-emerald-50 text-emerald-600 p-4 rounded-2xl">
                                <i data-lucide="check-circle-2" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Operativos / Buenos</span>
                                <h3 class="text-2xl font-bold mt-1 text-slate-800">${enDisponibles}</h3>
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                            <div class="bg-amber-50 text-amber-600 p-4 rounded-2xl">
                                <i data-lucide="wrench" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">En Mantenimiento</span>
                                <h3 class="text-2xl font-bold mt-1 text-slate-800">${enMantenimiento}</h3>
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                            <div class="bg-indigo-50 text-indigo-600 p-4 rounded-2xl">
                                <i data-lucide="handshake" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Préstamos Activos</span>
                                <h3 class="text-2xl font-bold mt-1 text-slate-800">${prestamosActivos}</h3>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div class="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm lg:col-span-2 flex flex-col min-h-[400px]">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                <h3 class="font-bold text-slate-900 flex items-center gap-2">
                                    <i data-lucide="activity" class="text-${spaceColor}-500 w-5 h-5"></i>
                                    <span>Actividad Reciente en ${isOffice ? 'Oficina' : 'Sistemas'}</span>
                                </h3>
                                <a href="#/history" class="text-xs font-bold text-${spaceColor}-600 hover:text-${spaceColor}-700">Ver todo</a>
                            </div>
                            <div class="flex-1 overflow-y-auto max-h-[350px] space-y-4 pr-1">
                                ${history.length === 0 ? `
                                    <div class="text-center text-slate-400 py-12 text-sm">No hay registros de actividad aún.</div>
                                ` : history.slice(0, 5).map(h => {
                                    let actionBadgeColor = 'bg-blue-50 text-blue-600 border-blue-200';
                                    if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                                    if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-red-50 text-red-600 border-red-200';

                                    return `
                                        <div class="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition">
                                            <span class="px-2.5 py-1 text-2xs font-bold border rounded-lg ${actionBadgeColor} tracking-wider uppercase shrink-0 mt-0.5">${h.action}</span>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-semibold text-slate-800">
                                                    ${h.action === 'CREACION' ? `Equipo registrado (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'ELIMINACION' ? `Equipo eliminado (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'EDICION' ? `Se modificó <b>${h.field_name}</b>` : ''}
                                                </p>
                                                <p class="text-3xs text-slate-400 mt-1 flex items-center gap-1">
                                                    <i data-lucide="clock" class="w-3 h-3"></i>
                                                    <span>${h.timestamp}</span>
                                                    <span class="mx-1">&bull;</span>
                                                    <i data-lucide="user" class="w-3 h-3"></i>
                                                    <span>${h.user_responsible}</span>
                                                </p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <div class="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                            <div>
                                <h3 class="font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                    <i data-lucide="mouse-pointer-click" class="text-${spaceColor}-500 w-5 h-5"></i>
                                    <span>Acciones Rápidas</span>
                                </h3>
                                <div class="grid grid-cols-2 gap-3 mt-4">
                                    <button onclick="openAddModal('equipos')" class="p-3 text-center bg-${spaceColor}-50 hover:bg-${spaceColor}-100 text-${spaceColor}-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                        <i data-lucide="plus-circle" class="w-6 h-6"></i>
                                        + Agregar Equipo
                                    </button>
                                    <a href="#/equipos" class="p-3 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                        <i data-lucide="list" class="w-6 h-6"></i>
                                        Ver Inventario
                                    </a>
                                    <a href="#/loans" class="p-3 text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                        <i data-lucide="handshake" class="w-6 h-6"></i>
                                        Préstamos
                                    </a>
                                    <a href="#/scan-qr" class="p-3 text-center bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                        <i data-lucide="qr-code" class="w-6 h-6"></i>
                                        Escáner QR
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Error de conexión: ${err.message}</div>`;
    }
}

