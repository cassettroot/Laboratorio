async function renderDashboard(container) {
    container.innerHTML = `
        <div class="flex justify-center items-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div></div>
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
                <div class="space-y-6 animate-fade-in text-white">
                    <!-- Banner de Bienvenida Glassmorphism -->
                    <div class="glass-card p-7 text-white relative overflow-hidden">
                        <div class="relative z-10 max-w-2xl">
                            <span class="text-teal-400 text-xs font-black uppercase tracking-widest bg-teal-500/15 border border-teal-500/30 px-3 py-1 rounded-xl inline-block">Laboratorio de Química</span>
                            <h2 class="text-2xl sm:text-3xl font-black mt-2.5 tracking-tight text-white">Bienvenido a LabKeep Química</h2>
                            <p class="text-slate-300 mt-1.5 text-xs sm:text-sm leading-relaxed font-medium">
                                Gestión de reactivos, sustancias químicas, cristalería, modelos didácticos y control de caducidades con bitácora de auditoría.
                            </p>
                        </div>
                    </div>

                    <!-- Métricas de Contador -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="glass-card p-5 flex items-center gap-4 transition duration-200">
                            <div class="w-13 h-13 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="beaker" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-3xs font-black uppercase tracking-wider block">Sustancias</span>
                                <h3 class="text-2xl font-black mt-0.5 text-white tracking-tight">${substances.length}</h3>
                            </div>
                        </div>

                        <div class="glass-card p-5 flex items-center gap-4 transition duration-200">
                            <div class="w-13 h-13 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="droplet" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-3xs font-black uppercase tracking-wider block">Material Químico</span>
                                <h3 class="text-2xl font-black mt-0.5 text-white tracking-tight">${chemMaterials.length}</h3>
                            </div>
                        </div>

                        <div class="glass-card p-5 flex items-center gap-4 transition duration-200">
                            <div class="w-13 h-13 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="graduation-cap" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-3xs font-black uppercase tracking-wider block">Didácticos</span>
                                <h3 class="text-2xl font-black mt-0.5 text-white tracking-tight">${didMaterials.length}</h3>
                            </div>
                        </div>

                        <div class="glass-card p-5 flex items-center gap-4 transition duration-200">
                            <div class="w-13 h-13 rounded-2xl ${expirationAlerts.length > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-teal-500/15 text-teal-400 border-teal-500/30'} flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="bell" class="w-6 h-6 ${expirationAlerts.length > 0 ? 'animate-bounce' : ''}"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-3xs font-black uppercase tracking-wider block">Alertas Caducidad</span>
                                <h3 class="text-2xl font-black mt-0.5 ${expirationAlerts.length > 0 ? 'text-rose-400' : 'text-white'} tracking-tight">${expirationAlerts.length}</h3>
                            </div>
                        </div>
                    </div>

                    <!-- Panel de Actividad Reciente y Acciones Rápidas -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Actividad Reciente Glassmorphism -->
                        <div class="glass-card p-5 lg:col-span-2 flex flex-col min-h-[380px]">
                            <div class="flex items-center justify-between border-b border-white/10 pb-3.5 mb-3.5">
                                <h3 class="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                                    <i data-lucide="activity" class="text-teal-400 w-4.5 h-4.5"></i>
                                    <span>Actividad Reciente en Química</span>
                                </h3>
                                <a href="#/history" class="text-xs font-black text-teal-400 hover:text-teal-300 transition">Ver todo →</a>
                            </div>
                            <div class="flex-1 overflow-y-auto max-h-[340px] space-y-2.5 pr-1 no-scrollbar">
                                ${history.length === 0 ? `
                                    <div class="text-center text-slate-400 py-12 text-xs font-semibold">No hay registros de actividad aún.</div>
                                ` : history.slice(0, 6).map(h => {
                                    let actionBadgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
                                    if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                                    if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                                    const labelTable = h.table_name === 'substances' ? 'Sustancias' : (h.table_name === 'chemical_materials' ? 'Mat. Químico' : 'Mat. Didáctico');

                                    return `
                                        <div class="flex items-start gap-3 p-3 rounded-2xl glass-activity-item">
                                            <span class="px-2.5 py-1 text-3xs font-black border rounded-lg ${actionBadgeColor} tracking-wider uppercase shrink-0 mt-0.5">${h.action}</span>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                                                    ${h.action === 'CREACION' ? `Registro creado en <b class="text-teal-300 font-black">${labelTable}</b> (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'ELIMINACION' ? `Registro eliminado en <b class="text-rose-300 font-black">${labelTable}</b> (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'EDICION' ? `Se modificó <b class="text-teal-300 font-black">${h.field_name}</b> en <b class="text-white font-black">${labelTable}</b>` : ''}
                                                </p>
                                                <p class="text-3xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                                                    <i data-lucide="clock" class="w-3 h-3 text-slate-400"></i>
                                                    <span>${h.timestamp}</span>
                                                    <span class="mx-0.5 text-slate-500">&bull;</span>
                                                    <i data-lucide="user" class="w-3 h-3 text-teal-400"></i>
                                                    <span class="text-slate-300 font-semibold">${h.user_responsible}</span>
                                                </p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Acciones Rápidas Glassmorphism -->
                        <div class="glass-card p-5 flex flex-col justify-between">
                            <div>
                                <h3 class="font-extrabold text-white pb-3 border-b border-white/10 flex items-center gap-2 text-sm sm:text-base">
                                    <i data-lucide="mouse-pointer-click" class="text-teal-400 w-4.5 h-4.5"></i>
                                    <span>Acciones Rápidas</span>
                                </h3>
                                <div class="grid grid-cols-2 gap-3 mt-3.5">
                                    <button onclick="openAddModal('substances')" class="p-3.5 text-center glass-quick-btn flex flex-col items-center gap-2 group cursor-pointer">
                                        <i data-lucide="plus-circle" class="w-5 h-5 text-teal-400 group-hover:scale-110 transition"></i>
                                        <span class="text-xs font-extrabold">+ Sustancia</span>
                                    </button>
                                    <button onclick="openAddModal('chemical_materials')" class="p-3.5 text-center glass-quick-btn flex flex-col items-center gap-2 group cursor-pointer">
                                        <i data-lucide="plus-circle" class="w-5 h-5 text-sky-400 group-hover:scale-110 transition"></i>
                                        <span class="text-xs font-extrabold">+ Mat. Químico</span>
                                    </button>
                                    <button onclick="openAddModal('didactic_materials')" class="p-3.5 text-center glass-quick-btn flex flex-col items-center gap-2 group cursor-pointer">
                                        <i data-lucide="plus-circle" class="w-5 h-5 text-indigo-400 group-hover:scale-110 transition"></i>
                                        <span class="text-xs font-extrabold">+ Mat. Didáctico</span>
                                    </button>
                                    <a href="#/scan-qr" class="p-3.5 text-center glass-quick-btn flex flex-col items-center gap-2 group cursor-pointer">
                                        <i data-lucide="qr-code" class="w-5 h-5 text-purple-400 group-hover:scale-110 transition"></i>
                                        <span class="text-xs font-extrabold">Escáner Cámara</span>
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
                <div class="space-y-6 animate-fade-in text-white">
                    <div class="glass-card p-7 text-white relative overflow-hidden">
                        <div class="relative z-10 max-w-2xl">
                            <span class="text-sky-400 text-xs font-black uppercase tracking-widest bg-sky-500/15 border border-sky-500/30 px-3 py-1 rounded-xl inline-block">${spaceTitle}</span>
                            <h2 class="text-2xl sm:text-3xl font-black mt-2.5 tracking-tight text-white">Bienvenido al Control de ${isOffice ? 'Oficina' : 'Sistemas'}</h2>
                            <p class="text-slate-300 mt-1.5 text-xs sm:text-sm leading-relaxed font-medium">
                                ${isOffice ? 'Gestión de bienes, equipos informáticos de oficina, mobiliario, resguardos y asignaciones.' : 'Control de equipos informáticos, servidores, periféricos, mantenimiento preventivo/correctivo y préstamos.'}
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="glass-card p-5 flex items-center gap-4 transition duration-200">
                            <div class="w-13 h-13 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="${isOffice ? 'briefcase' : 'cpu'}" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-3xs font-black uppercase tracking-wider block">Total Equipos</span>
                                <h3 class="text-2xl font-black mt-0.5 text-white tracking-tight">${totalEquipos}</h3>
                            </div>
                        </div>

                        <div class="glass-card p-5 flex items-center gap-4 transition duration-200">
                            <div class="w-13 h-13 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="check-circle-2" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-3xs font-black uppercase tracking-wider block">Operativos / Buenos</span>
                                <h3 class="text-2xl font-black mt-0.5 text-white tracking-tight">${enDisponibles}</h3>
                            </div>
                        </div>

                        <div class="glass-card p-5 flex items-center gap-4 transition duration-200">
                            <div class="w-13 h-13 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="wrench" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-3xs font-black uppercase tracking-wider block">En Mantenimiento</span>
                                <h3 class="text-2xl font-black mt-0.5 text-white tracking-tight">${enMantenimiento}</h3>
                            </div>
                        </div>

                        <div class="glass-card p-5 flex items-center gap-4 transition duration-200">
                            <div class="w-13 h-13 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <i data-lucide="handshake" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <span class="text-slate-400 text-3xs font-black uppercase tracking-wider block">Préstamos Activos</span>
                                <h3 class="text-2xl font-black mt-0.5 text-white tracking-tight">${prestamosActivos}</h3>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="glass-card p-5 lg:col-span-2 flex flex-col min-h-[380px]">
                            <div class="flex items-center justify-between border-b border-white/10 pb-3.5 mb-3.5">
                                <h3 class="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                                    <i data-lucide="activity" class="text-sky-400 w-4.5 h-4.5"></i>
                                    <span>Actividad Reciente en ${isOffice ? 'Oficina' : 'Sistemas'}</span>
                                </h3>
                                <a href="#/history" class="text-xs font-black text-sky-400 hover:text-sky-300 transition">Ver todo →</a>
                            </div>
                            <div class="flex-1 overflow-y-auto max-h-[340px] space-y-2.5 pr-1 no-scrollbar">
                                ${history.length === 0 ? `
                                    <div class="text-center text-slate-400 py-12 text-xs font-semibold">No hay registros de actividad aún.</div>
                                ` : history.slice(0, 6).map(h => {
                                    let actionBadgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
                                    if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                                    if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                                    return `
                                        <div class="flex items-start gap-3 p-3 rounded-2xl glass-activity-item">
                                            <span class="px-2.5 py-1 text-3xs font-black border rounded-lg ${actionBadgeColor} tracking-wider uppercase shrink-0 mt-0.5">${h.action}</span>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                                                    ${h.action === 'CREACION' ? `Equipo registrado (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'ELIMINACION' ? `Equipo eliminado (ID: ${h.record_id})` : ''}
                                                    ${h.action === 'EDICION' ? `Se modificó <b class="text-sky-300 font-black">${h.field_name}</b>` : ''}
                                                </p>
                                                <p class="text-3xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                                                    <i data-lucide="clock" class="w-3 h-3 text-slate-400"></i>
                                                    <span>${h.timestamp}</span>
                                                    <span class="mx-0.5 text-slate-500">&bull;</span>
                                                    <i data-lucide="user" class="w-3 h-3 text-sky-400"></i>
                                                    <span class="text-slate-300 font-semibold">${h.user_responsible}</span>
                                                </p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <div class="glass-card p-5 flex flex-col justify-between">
                            <div>
                                <h3 class="font-extrabold text-white pb-3 border-b border-white/10 flex items-center gap-2 text-sm sm:text-base">
                                    <i data-lucide="mouse-pointer-click" class="text-sky-400 w-4.5 h-4.5"></i>
                                    <span>Acciones Rápidas</span>
                                </h3>
                                <div class="grid grid-cols-2 gap-3 mt-3.5">
                                    <button onclick="openAddModal('equipos')" class="p-3.5 text-center glass-quick-btn flex flex-col items-center gap-2 group cursor-pointer">
                                        <i data-lucide="plus-circle" class="w-5 h-5 text-sky-400 group-hover:scale-110 transition"></i>
                                        <span class="text-xs font-extrabold">+ Agregar Equipo</span>
                                    </button>
                                    <a href="#/equipos" class="p-3.5 text-center glass-quick-btn flex flex-col items-center gap-2 group cursor-pointer">
                                        <i data-lucide="list" class="w-5 h-5 text-emerald-400 group-hover:scale-110 transition"></i>
                                        <span class="text-xs font-extrabold">Ver Inventario</span>
                                    </a>
                                    <a href="#/loans" class="p-3.5 text-center glass-quick-btn flex flex-col items-center gap-2 group cursor-pointer">
                                        <i data-lucide="handshake" class="w-5 h-5 text-indigo-400 group-hover:scale-110 transition"></i>
                                        <span class="text-xs font-extrabold">Préstamos</span>
                                    </a>
                                    <a href="#/scan-qr" class="p-3.5 text-center glass-quick-btn flex flex-col items-center gap-2 group cursor-pointer">
                                        <i data-lucide="qr-code" class="w-5 h-5 text-purple-400 group-hover:scale-110 transition"></i>
                                        <span class="text-xs font-extrabold">Escáner QR</span>
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
