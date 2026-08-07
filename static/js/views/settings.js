// Vista de Configuración y Personalización del Sistema (Refinada y de Alta Fidelidad)
window.renderSettings = function(container) {
    const currentTheme = localStorage.getItem('app_theme') || 'itma';
    const currentInv = localStorage.getItem('inventory_id') || 'inventario';
    const activeUser = (typeof state !== 'undefined' && state.activeUser) ? state.activeUser : 'Invitado';
    const userRole = (typeof state !== 'undefined' && state.userRole) ? state.userRole : 'estudiante';

    const roleNames = {
        'admin': 'Administrador General',
        'jefe': 'Jefe de Área',
        'responsable': 'Responsable de Laboratorio',
        'estudiante': 'Estudiante / Modo Consulta'
    };

    const themesData = [
        { id: 'light', name: 'Modo Claro', icon: 'sun', desc: 'Lienzo blanco puro con tarjetas elevadas e interfaz ultra limpia (#FFFFFF)', bgClass: 'bg-white text-slate-900 border-slate-300' },
        { id: 'dark', name: 'Modo Oscuro', icon: 'moon', desc: 'Paleta grafito profesional de alta legibilidad (#0F172A / #1E293B)', bgClass: 'bg-slate-900 text-white border-slate-700' }
    ];

    container.innerHTML = `
        <div class="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in text-white">
            <!-- Encabezado de Configuración -->
            <div class="glass-card-premium rounded-3xl p-6 border border-slate-700/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-2xl shadow-inner">
                        ⚙️
                    </div>
                    <div>
                        <h2 class="text-xl font-extrabold text-white tracking-tight">Configuración del Sistema</h2>
                        <p class="text-xs text-slate-300 mt-0.5 font-medium">Personaliza la apariencia visual, la navegación y las preferencias de tu cuenta</p>
                    </div>
                </div>
                <div class="px-4 py-2 bg-slate-800/90 rounded-2xl border border-slate-700 text-xs font-extrabold text-emerald-300 flex items-center gap-2 shadow-md">
                    <i data-lucide="user" class="w-4 h-4 text-emerald-400"></i>
                    <span>${activeUser} (${roleNames[userRole] || userRole})</span>
                </div>
            </div>

            <!-- SECCIÓN 1: SELECCIÓN Y PERSONALIZACIÓN DE TEMAS VISUALES -->
            <div class="glass-card-premium rounded-3xl p-6 border border-slate-700/60 shadow-2xl space-y-5">
                <div class="flex items-center justify-between pb-4 border-b border-slate-700/60">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-300 border border-brand-500/40 flex items-center justify-center shadow-md">
                            <i data-lucide="palette" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-extrabold text-white tracking-tight">Apariencia Visual del Sistema</h3>
                            <p class="text-xs text-slate-300 font-medium">Elige el tema base unificado para adaptar la barra lateral, botones y tablas</p>
                        </div>
                    </div>
                    <span class="text-2xs font-extrabold px-3.5 py-1.5 bg-brand-500/20 text-brand-300 border border-brand-500/40 rounded-xl shadow-xs">Sistema Dual Unificado</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                    ${themesData.map(t => {
                        const isSelected = (currentTheme === t.id) || (currentTheme !== 'light' && t.id === 'dark');
                        return `
                            <button type="button" onclick="selectThemeFromSettings('${t.id}')" class="relative p-6 rounded-2xl border text-left font-extrabold transition-all duration-200 flex items-start gap-4 ${isSelected ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-[0_0_25px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400' : 'bg-slate-900/60 text-slate-300 border-slate-700/70 hover:border-slate-500 hover:text-white hover:bg-slate-800/80'}">
                                ${isSelected ? '<span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-2xs uppercase tracking-wider shadow-md">✓ Activo</span>' : ''}
                                <div class="w-12 h-12 rounded-2xl ${t.bgClass} shadow-lg flex items-center justify-center shrink-0 border border-slate-500/30">
                                    <i data-lucide="${t.icon}" class="w-6 h-6"></i>
                                </div>
                                <div class="space-y-1">
                                    <h4 class="font-extrabold text-base tracking-wide">${t.name}</h4>
                                    <p class="text-xs font-normal text-slate-300 leading-relaxed">${t.desc}</p>
                                </div>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- SECCIÓN 2: PREFERENCIAS DE ESPACIO DE TRABAJO Y ROL -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Espacio Predeterminado -->
                <div class="glass-card-premium rounded-3xl p-6 border border-slate-700/60 shadow-xl space-y-4">
                    <div class="flex items-center gap-3 pb-3 border-b border-slate-700/60">
                        <div class="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center shadow-md">
                            <i data-lucide="building" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-extrabold text-white tracking-tight">Espacio Activo</h3>
                            <p class="text-xs text-slate-300 font-medium">Selecciona el área de trabajo al iniciar la aplicación</p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <button type="button" onclick="selectSpaceFromSettings('inventario')" class="w-full p-4 rounded-2xl border text-left font-extrabold text-xs flex items-center justify-between transition ${currentInv === 'inventario' ? 'bg-emerald-500/20 text-white border-emerald-500/60 ring-2 ring-emerald-500/40 shadow-md' : 'bg-slate-900/60 text-slate-300 border-slate-700/70 hover:bg-slate-800'}">
                            <div class="flex items-center gap-3">
                                <i data-lucide="flask-conical" class="w-4 h-4 text-emerald-400"></i>
                                <span class="text-sm">Laboratorio de Química</span>
                            </div>
                            ${currentInv === 'inventario' ? '<span class="text-3xs font-extrabold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-lg">ACTIVO</span>' : ''}
                        </button>

                        <button type="button" onclick="selectSpaceFromSettings('oficina')" class="w-full p-4 rounded-2xl border text-left font-extrabold text-xs flex items-center justify-between transition ${currentInv === 'oficina' ? 'bg-sky-500/20 text-white border-sky-500/60 ring-2 ring-sky-500/40 shadow-md' : 'bg-slate-900/60 text-slate-300 border-slate-700/70 hover:bg-slate-800'}">
                            <div class="flex items-center gap-3">
                                <i data-lucide="briefcase" class="w-4 h-4 text-sky-400"></i>
                                <span class="text-sm">Inventario de Oficina</span>
                            </div>
                            ${currentInv === 'oficina' ? '<span class="text-3xs font-extrabold text-sky-300 bg-sky-500/20 border border-sky-500/40 px-2.5 py-1 rounded-lg">ACTIVO</span>' : ''}
                        </button>

                        <button type="button" onclick="selectSpaceFromSettings('sistemas')" class="w-full p-4 rounded-2xl border text-left font-extrabold text-xs flex items-center justify-between transition ${currentInv === 'sistemas' ? 'bg-purple-500/20 text-white border-purple-500/60 ring-2 ring-purple-500/40 shadow-md' : 'bg-slate-900/60 text-slate-300 border-slate-700/70 hover:bg-slate-800'}">
                            <div class="flex items-center gap-3">
                                <i data-lucide="cpu" class="w-4 h-4 text-purple-400"></i>
                                <span class="text-sm">Laboratorio de Sistemas</span>
                            </div>
                            ${currentInv === 'sistemas' ? '<span class="text-3xs font-extrabold text-purple-300 bg-purple-500/20 border border-purple-500/40 px-2.5 py-1 rounded-lg">ACTIVO</span>' : ''}
                        </button>
                    </div>
                </div>

                <!-- Resumen de Cuenta y Permisos -->
                <div class="glass-card-premium rounded-3xl p-6 border border-slate-700/60 shadow-xl space-y-4">
                    <div class="flex items-center gap-3 pb-3 border-b border-slate-700/60">
                        <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shadow-md">
                            <i data-lucide="shield-check" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-extrabold text-white tracking-tight">Perfil y Permisos</h3>
                            <p class="text-xs text-slate-300 font-medium">Privilegios asignados en la plataforma ITMA II</p>
                        </div>
                    </div>

                    <div class="space-y-3 text-xs">
                        <div class="p-3.5 bg-slate-900/70 rounded-2xl border border-slate-700/70 flex justify-between items-center">
                            <span class="font-bold text-slate-300">Nombre de Usuario:</span>
                            <strong class="font-extrabold text-white text-sm">${activeUser}</strong>
                        </div>
                        <div class="p-3.5 bg-slate-900/70 rounded-2xl border border-slate-700/70 flex justify-between items-center">
                            <span class="font-bold text-slate-300">Nivel de Acceso:</span>
                            <strong class="font-extrabold text-emerald-300 text-sm">${roleNames[userRole] || userRole}</strong>
                        </div>
                        <div class="p-3.5 bg-slate-900/70 rounded-2xl border border-slate-700/70 space-y-1">
                            <span class="font-bold text-slate-300 block">Capacidades asignadas:</span>
                            <p class="text-2xs text-slate-200 leading-relaxed font-medium">
                                ${userRole === 'admin' ? 'Acceso global a todos los laboratorios, gestión de usuarios, edición directa y control del historial.' : (userRole === 'jefe' ? 'Gestión completa de insumos y equipos del área asignada.' : (userRole === 'responsable' ? 'Consulta de inventario y envío de solicitudes de modificación para revisión.' : 'Consulta de reactivos de Química.'))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
};

window.selectThemeFromSettings = function(themeName) {
    if (typeof setWebTheme === 'function') {
        setWebTheme(themeName);
    }
    const container = document.getElementById('main-content');
    if (container && typeof renderSettings === 'function') {
        renderSettings(container);
    }
};

window.selectSpaceFromSettings = function(spaceId) {
    if (typeof selectSpace === 'function') {
        selectSpace(spaceId);
    } else {
        localStorage.setItem('inventory_id', spaceId);
        window.location.reload();
    }
};
