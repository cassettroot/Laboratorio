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
        { id: 'itma', name: 'Verde ITMA', dotBg: 'bg-emerald-500', activeRing: 'ring-2 ring-emerald-400 border-emerald-500' },
        { id: 'light', name: 'Modo Dia', dotBg: 'bg-slate-300', activeRing: 'ring-2 ring-slate-300 border-slate-400' },
        { id: 'dark', name: 'Modo Noche', dotBg: 'bg-slate-900', activeRing: 'ring-2 ring-sky-400 border-sky-500' },
        { id: 'neon', name: 'Neon', dotBg: 'bg-purple-600', activeRing: 'ring-2 ring-purple-400 border-purple-500' },
        { id: 'ocean', name: 'Oceano', dotBg: 'bg-teal-500', activeRing: 'ring-2 ring-teal-400 border-teal-500' },
        { id: 'sunset', name: 'Atardecer', dotBg: 'bg-amber-500', activeRing: 'ring-2 ring-amber-400 border-amber-500' },
        { id: 'emerald', name: 'Esmeralda', dotBg: 'bg-emerald-600', activeRing: 'ring-2 ring-emerald-400 border-emerald-500' },
        { id: 'cyberpunk', name: 'Ciberpunk', dotBg: 'bg-yellow-400', activeRing: 'ring-2 ring-yellow-400 border-yellow-500' },
        { id: 'amethyst', name: 'Amatista', dotBg: 'bg-fuchsia-500', activeRing: 'ring-2 ring-fuchsia-400 border-fuchsia-500' },
        { id: 'cosmos', name: 'Cosmos', dotBg: 'bg-amber-400', activeRing: 'ring-2 ring-amber-300 border-amber-400' }
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
                        <div class="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shadow-md">
                            <i data-lucide="palette" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-extrabold text-white tracking-tight">Temas de la Interfaz</h3>
                            <p class="text-xs text-slate-300 font-medium">Elige la paleta de colores para sincronizar la barra lateral, botones e iconos</p>
                        </div>
                    </div>
                    <span class="text-2xs font-extrabold px-3.5 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-xl shadow-xs">10 Temas Disponibles</span>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 pt-1">
                    ${themesData.map(t => {
                        const isSelected = currentTheme === t.id;
                        return `
                            <button type="button" onclick="selectThemeFromSettings('${t.id}')" class="relative p-4 rounded-2xl border text-center font-extrabold text-xs transition-all duration-200 flex flex-col items-center gap-3 ${isSelected ? 'border-emerald-400 bg-emerald-950/40 text-white shadow-[0_0_20px_rgba(52,211,153,0.3)] ring-2 ring-emerald-400/60 transform scale-[1.04]' : 'bg-slate-900/60 text-slate-300 border-slate-700/70 hover:border-slate-500 hover:text-white hover:bg-slate-800/80 hover:scale-[1.02]'}">
                                ${isSelected ? '<span class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-md animate-pulse">✓</span>' : ''}
                                <div class="w-10 h-10 rounded-full ${t.dotBg} shadow-lg border-2 border-white/20"></div>
                                <span class="font-extrabold text-xs tracking-wide">${t.name}</span>
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
