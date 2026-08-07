async function renderDashboard(container) {
    container.innerHTML = `
        <div class="flex justify-center items-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div></div>
    `;

    const currentInventory = localStorage.getItem('inventory_id') || 'inventario';
    const isLab = currentInventory === 'inventario';
    const isOffice = currentInventory === 'oficina';

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
                <div class="space-y-8 animate-fade-in text-white">
                    <!-- Banner de Bienvenida -->
                    <div class="glass-card-premium rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl border border-slate-700/60">
                        <div class="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                        <div class="relative z-10 max-w-2xl">
                            <span class="text-emerald-400 text-xs font-extrabold uppercase tracking-widest bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-xl">Laboratorio de Química</span>
                            <h2 class="text-3xl font-black mt-3 tracking-tight text-white">Bienvenido a LabKeep Química</h2>
                            <p class="text-slate-300 mt-2 text-sm leading-relaxed font-medium">
                                Gestión de reactivos, sustancias químicas, cristalería, modelos didácticos y control de caducidades con bitácora de auditoría.
                            </p>
                        </div>
                    </div>

                    <!-- Métricas de Contador -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="glass-card-premium p-6 rounded-3xl border border-slate-700/60 shadow-xl flex items-center gap-5 hover-scale transition duration-200">
                            <div class="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="beaker" class="w-7 h-7"></i>
                            </div>
                            <div>
                                <span class="text-slate-300 text-xs font-extrabold uppercase tracking-wider block">Sustancias</span>
                                <h3 class="text-3xl font-black mt-1 text-white tracking-tight">${substances.length}</h3>
                            </div>
                        </div>

                        <div class="glass-card-premium p-6 rounded-3xl border border-slate-700/60 shadow-xl flex items-center gap-5 hover-scale transition duration-200">
                            <div class="w-14 h-14 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="droplet" class="w-7 h-7"></i>
                            </div>
                            <div>
                                <span class="text-slate-300 text-xs font-extrabold uppercase tracking-wider block">Material Químico</span>
                                <h3 class="text-3xl font-black mt-1 text-white tracking-tight">${chemMaterials.length}</h3>
                            </div>
                        </div>

                        <div class="glass-card-premium p-6 rounded-3xl border border-slate-700/60 shadow-xl flex items-center gap-5 hover-scale transition duration-200">
                            <div class="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="graduation-cap" class="w-7 h-7"></i>
                            </div>
                            <div>
                                <span class="text-slate-300 text-xs font-extrabold uppercase tracking-wider block">Didácticos</span>
                                <h3 class="text-3xl font-black mt-1 text-white tracking-tight">${didMaterials.length}</h3>
                            </div>
                        </div>

                        <div class="glass-card-premium p-6 rounded-3xl border border-slate-700/60 shadow-xl flex items-center gap-5 hover-scale transition duration-200">
                            <div class="w-14 h-14 rounded-2xl ${expirationAlerts.length > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'} flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="bell" class="w-7 h-7 ${expirationAlerts.length > 0 ? 'animate-bounce' : ''}"></i>
                            </div>
                            <div>
                                <span class="text-slate-300 text-xs font-extrabold uppercase tracking-wider block">Alertas Caducidad</span>
                                <h3 class="text-3xl font-black mt-1 ${expirationAlerts.length > 0 ? 'text-rose-400' : 'text-white'} tracking-tight">${expirationAlerts.length}</h3>
                            </div>
                        </div>
                    </div>

                    <!-- Panel de Actividad Reciente y Acciones Rápidas -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <!-- Actividad Reciente -->
                        <div class="glass-card-premium border border-slate-700/60 rounded-3xl p-6 shadow-xl lg:col-span-2 flex flex-col min-h-[400px]">
                            <div class="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-4">
                                <h3 class="font-extrabold text-white text-base flex items-center gap-2">
                                    <i data-lucide="activity" class="text-emerald-400 w-5 h-5"></i>
                                    <span>Actividad Reciente en Química</span>
                                </h3>
                                <a href="#/history" class="text-xs font-extrabold text-emerald-400 hover:text-emerald-300 transition">Ver todo →</a>
                            </div>
                            <div class="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1">
                                ${history.length === 0 ? `
                                    <div class="text-center text-slate-400 py-12 text-sm font-medium">No hay registros de actividad aún.</div>
                                ` : history.slice(0, 6).map(h => {
                                    let actionBadgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                                    if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                                    if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                                    const labelTable = h.table_name === 'substances' ? 'Sustancias' : (h.table_name === 'chemical_materials' ? 'Mat. Químico' : 'Mat. Didáctico');

                                    return `
                                        <div class="flex items-start gap-4 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-slate-600 transition">
                                            <span class="px-2.5 py-1 text-2xs font-extrabold border rounded-xl ${actionBadgeColor} tracking-wider uppercase shrink-0 mt-0.5 shadow-2xs">${h.action}</span>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-semibold text-slate-100 leading-snug">
                                                    ${h.action === 'CREACION' ? `Registro creado en <b class="text-emerald-300 font-extrabold">${labelTable}</b> (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'ELIMINACION' ? `Registro eliminado en <b class="text-rose-300 font-extrabold">${labelTable}</b> (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'EDICION' ? `Se modificó <b class="text-emerald-300 font-extrabold">${h.field_name}</b> en <b class="text-white font-extrabold">${labelTable}</b>` : ''}
                                                </p>
                                                <p class="text-xs text-slate-300 mt-1.5 flex items-center gap-1.5 font-medium">
                                                    <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i>
                                                    <span>${h.timestamp}</span>
                                                    <span class="mx-1 text-slate-500">&bull;</span>
                                                    <i data-lucide="user" class="w-3.5 h-3.5 text-emerald-400"></i>
                                                    <span class="text-slate-200 font-semibold">${h.user_responsible}</span>
                                                </p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Acciones Rápidas -->
                        <div class="glass-card-premium border border-slate-700/60 rounded-3xl p-6 shadow-xl flex flex-col gap-6">
                            <div>
                                <h3 class="font-extrabold text-white pb-3 border-b border-slate-700/60 flex items-center gap-2 text-base">
                                    <i data-lucide="mouse-pointer-click" class="text-emerald-400 w-5 h-5"></i>
                                    <span>Acciones Rápidas</span>
                                </h3>
                                <div class="grid grid-cols-2 gap-3 mt-4">
                                    <button onclick="openAddModal('substances')" class="p-4 text-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 rounded-2xl transition-all duration-200 font-extrabold text-xs text-white flex flex-col items-center gap-2.5 shadow-md cursor-pointer group">
                                        <i data-lucide="plus-circle" class="w-6 h-6 text-emerald-400 group-hover:scale-110 transition"></i>
                                        <span>+ Sustancia</span>
                                    </button>
                                    <button onclick="openAddModal('chemical_materials')" class="p-4 text-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/40 rounded-2xl transition-all duration-200 font-extrabold text-xs text-white flex flex-col items-center gap-2.5 shadow-md cursor-pointer group">
                                        <i data-lucide="plus-circle" class="w-6 h-6 text-sky-400 group-hover:scale-110 transition"></i>
                                        <span>+ Mat. Químico</span>
                                    </button>
                                    <button onclick="openAddModal('didactic_materials')" class="p-4 text-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/40 rounded-2xl transition-all duration-200 font-extrabold text-xs text-white flex flex-col items-center gap-2.5 shadow-md cursor-pointer group">
                                        <i data-lucide="plus-circle" class="w-6 h-6 text-indigo-400 group-hover:scale-110 transition"></i>
                                        <span>+ Mat. Didáctico</span>
                                    </button>
                                    <a href="#/scan-qr" class="p-4 text-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/40 rounded-2xl transition-all duration-200 font-extrabold text-xs text-white flex flex-col items-center gap-2.5 shadow-md cursor-pointer group">
                                        <i data-lucide="qr-code" class="w-6 h-6 text-purple-400 group-hover:scale-110 transition"></i>
                                        <span>Escáner Cámara</span>
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
            const prestamosActivos = loans.filter(l => l.status === 'ACTIVO' || l.status === 'Prestado').length;

            const spaceTitle = isOffice ? 'Inventario de Oficina' : 'Laboratorio de Sistemas';

            container.innerHTML = `
                <div class="space-y-8 animate-fade-in text-white">
                    <div class="glass-card-premium rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl border border-slate-700/60">
                        <div class="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl"></div>
                        <div class="relative z-10 max-w-2xl">
                            <span class="text-sky-400 text-xs font-extrabold uppercase tracking-widest bg-sky-500/15 border border-sky-500/30 px-3 py-1 rounded-xl">${spaceTitle}</span>
                            <h2 class="text-3xl font-black mt-3 tracking-tight text-white">Bienvenido al Control de ${isOffice ? 'Oficina' : 'Sistemas'}</h2>
                            <p class="text-slate-300 mt-2 text-sm leading-relaxed font-medium">
                                ${isOffice ? 'Gestión de bienes, equipos informáticos de oficina, mobiliario, resguardos y asignaciones.' : 'Control de equipos informáticos, servidores, periféricos, mantenimiento preventivo/correctivo y préstamos.'}
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="glass-card-premium p-6 rounded-3xl border border-slate-700/60 shadow-xl flex items-center gap-5 hover-scale transition duration-200">
                            <div class="w-14 h-14 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="${isOffice ? 'briefcase' : 'cpu'}" class="w-7 h-7"></i>
                            </div>
                            <div>
                                <span class="text-slate-300 text-xs font-extrabold uppercase tracking-wider block">Total Equipos</span>
                                <h3 class="text-3xl font-black mt-1 text-white tracking-tight">${totalEquipos}</h3>
                            </div>
                        </div>

                        <div class="glass-card-premium p-6 rounded-3xl border border-slate-700/60 shadow-xl flex items-center gap-5 hover-scale transition duration-200">
                            <div class="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="check-circle-2" class="w-7 h-7"></i>
                            </div>
                            <div>
                                <span class="text-slate-300 text-xs font-extrabold uppercase tracking-wider block">Operativos / Buenos</span>
                                <h3 class="text-3xl font-black mt-1 text-white tracking-tight">${enDisponibles}</h3>
                            </div>
                        </div>

                        <div class="glass-card-premium p-6 rounded-3xl border border-slate-700/60 shadow-xl flex items-center gap-5 hover-scale transition duration-200">
                            <div class="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="wrench" class="w-7 h-7"></i>
                            </div>
                            <div>
                                <span class="text-slate-300 text-xs font-extrabold uppercase tracking-wider block">En Mantenimiento</span>
                                <h3 class="text-3xl font-black mt-1 text-white tracking-tight">${enMantenimiento}</h3>
                            </div>
                        </div>

                        <div class="glass-card-premium p-6 rounded-3xl border border-slate-700/60 shadow-xl flex items-center gap-5 hover-scale transition duration-200">
                            <div class="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="handshake" class="w-7 h-7"></i>
                            </div>
                            <div>
                                <span class="text-slate-300 text-xs font-extrabold uppercase tracking-wider block">Préstamos Activos</span>
                                <h3 class="text-3xl font-black mt-1 text-white tracking-tight">${prestamosActivos}</h3>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div class="glass-card-premium border border-slate-700/60 rounded-3xl p-6 shadow-xl lg:col-span-2 flex flex-col min-h-[400px]">
                            <div class="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-4">
                                <h3 class="font-extrabold text-white text-base flex items-center gap-2">
                                    <i data-lucide="activity" class="text-sky-400 w-5 h-5"></i>
                                    <span>Actividad Reciente en ${isOffice ? 'Oficina' : 'Sistemas'}</span>
                                </h3>
                                <a href="#/history" class="text-xs font-extrabold text-sky-400 hover:text-sky-300 transition">Ver todo →</a>
                            </div>
                            <div class="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1">
                                ${history.length === 0 ? `
                                    <div class="text-center text-slate-400 py-12 text-sm font-medium">No hay registros de actividad aún.</div>
                                ` : history.slice(0, 6).map(h => {
                                    let actionBadgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                                    if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                                    if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                                    return `
                                        <div class="flex items-start gap-4 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-slate-600 transition">
                                            <span class="px-2.5 py-1 text-2xs font-extrabold border rounded-xl ${actionBadgeColor} tracking-wider uppercase shrink-0 mt-0.5 shadow-2xs">${h.action}</span>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-semibold text-slate-100 leading-snug">
                                                    ${h.action === 'CREACION' ? `Equipo registrado (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'ELIMINACION' ? `Equipo eliminado (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'EDICION' ? `Se modificó <b class="text-sky-300 font-extrabold">${h.field_name}</b>` : ''}
                                                </p>
                                                <p class="text-xs text-slate-300 mt-1.5 flex items-center gap-1.5 font-medium">
                                                    <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i>
                                                    <span>${h.timestamp}</span>
                                                    <span class="mx-1 text-slate-500">&bull;</span>
                                                    <i data-lucide="user" class="w-3.5 h-3.5 text-sky-400"></i>
                                                    <span class="text-slate-200 font-semibold">${h.user_responsible}</span>
                                                </p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <div class="glass-card-premium border border-slate-700/60 rounded-3xl p-6 shadow-xl flex flex-col gap-6">
                            <div>
                                <h3 class="font-extrabold text-white pb-3 border-b border-slate-700/60 flex items-center gap-2 text-base">
                                    <i data-lucide="mouse-pointer-click" class="text-sky-400 w-5 h-5"></i>
                                    <span>Acciones Rápidas</span>
                                </h3>
                                <div class="grid grid-cols-2 gap-3 mt-4">
                                    <button onclick="openAddModal('equipos')" class="p-4 text-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/40 rounded-2xl transition-all duration-200 font-extrabold text-xs text-white flex flex-col items-center gap-2.5 shadow-md cursor-pointer group">
                                        <i data-lucide="plus-circle" class="w-6 h-6 text-sky-400 group-hover:scale-110 transition"></i>
                                        <span>+ Agregar Equipo</span>
                                    </button>
                                    <a href="#/equipos" class="p-4 text-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 rounded-2xl transition-all duration-200 font-extrabold text-xs text-white flex flex-col items-center gap-2.5 shadow-md cursor-pointer group">
                                        <i data-lucide="list" class="w-6 h-6 text-emerald-400 group-hover:scale-110 transition"></i>
                                        <span>Ver Inventario</span>
                                    </a>
                                    <a href="#/loans" class="p-4 text-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/40 rounded-2xl transition-all duration-200 font-extrabold text-xs text-white flex flex-col items-center gap-2.5 shadow-md cursor-pointer group">
                                        <i data-lucide="handshake" class="w-6 h-6 text-indigo-400 group-hover:scale-110 transition"></i>
                                        <span>Préstamos</span>
                                    </a>
                                    <a href="#/scan-qr" class="p-4 text-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/40 rounded-2xl transition-all duration-200 font-extrabold text-xs text-white flex flex-col items-center gap-2.5 shadow-md cursor-pointer group">
                                        <i data-lucide="qr-code" class="w-6 h-6 text-purple-400 group-hover:scale-110 transition"></i>
                                        <span>Escáner QR</span>
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
        container.innerHTML = `<div class="p-8 text-center text-rose-400 font-bold">Error de conexión: ${err.message}</div>`;
    }
}
