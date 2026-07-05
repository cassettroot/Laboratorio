function renderAccountView(container) {
    if (!state.isLoggedIn) {
        container.innerHTML = `
            <div class="bg-white border rounded-3xl p-12 text-center text-slate-400">
                <i data-lucide="lock" class="w-12 h-12 text-slate-300 mx-auto mb-4 animate-bounce"></i>
                <h3 class="text-lg font-bold text-slate-800">Iniciar Sesión Requerido</h3>
                <p class="text-sm mt-1">Por favor inicie sesión para ver su cuenta.</p>
                <button onclick="openAuthModal()" class="mt-4 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition text-sm">
                    Iniciar Sesión
                </button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const initials = state.activeUser ? state.activeUser.substring(0, 2).toUpperCase() : 'U';
    const roleLabel = state.userRole === 'admin' ? 'Administrador' : 'Responsable de Inventario';
    const roleColor = state.userRole === 'admin' 
        ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm shadow-purple-500/5' 
        : 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm shadow-teal-500/5';
    
    const activeLabel = state.userActive === 1 ? 'Activo' : 'Inactivo';
    const activeColor = state.userActive === 1 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : 'bg-rose-50 text-rose-700 border-rose-200';

    const permissionsDesc = state.userRole === 'admin'
        ? `
            <div class="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 flex gap-3 text-purple-950">
                <i data-lucide="shield" class="w-5 h-5 text-purple-500 shrink-0 mt-0.5"></i>
                <div>
                    <h5 class="text-xs font-bold uppercase tracking-wider text-purple-800">Permisos de Administrador</h5>
                    <p class="text-xs mt-1 leading-relaxed text-purple-700 font-medium">
                        Tienes acceso completo para administrar la base de datos (copias de seguridad e importación), historial de auditoría global y control total sobre los usuarios registrados (crear, editar, activar/desactivar y eliminar). Tu rol es puramente administrativo; no tienes permisos para registrar o modificar reactivos o materiales en el inventario.
                    </p>
                </div>
            </div>
        `
        : `
            <div class="bg-teal-50/50 border border-teal-100 rounded-2xl p-4 flex gap-3 text-teal-950">
                <i data-lucide="beaker" class="w-5 h-5 text-teal-500 shrink-0 mt-0.5"></i>
                <div>
                    <h5 class="text-xs font-bold uppercase tracking-wider text-teal-800">Permisos de Responsable</h5>
                    <p class="text-xs mt-1 leading-relaxed text-teal-700 font-medium">
                        Tienes permisos para realizar cualquier tipo de modificación o registro en las sustancias químicas, reactivos, materiales didácticos y de laboratorio. No tienes acceso al panel de administración de base de datos ni a la lista de usuarios.
                    </p>
                </div>
            </div>
        `;

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto animate-fade-in">
            <!-- Profile Info Card -->
            <div class="lg:col-span-1 flex flex-col gap-6">
                <div class="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                    <div class="absolute -right-12 -top-12 w-32 h-32 bg-slate-50 rounded-full blur-xl"></div>
                    <div class="w-20 h-20 rounded-full bg-brand-500 text-slate-900 font-extrabold text-2xl flex items-center justify-center border-4 border-slate-100 shadow-md relative z-10">
                        ${initials}
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 mt-4 relative z-10">${state.activeUser}</h3>
                    <span class="text-3xs text-slate-400 font-bold uppercase tracking-wider mt-1">ID de Sesión Local</span>
                    
                    <div class="w-full border-t border-slate-100 pt-5 mt-5 space-y-3.5 text-left text-sm">
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400 font-semibold text-xs">Rol de Usuario:</span>
                            <span class="px-2.5 py-0.5 rounded-lg border text-3xs font-extrabold uppercase tracking-wider ${roleColor}">
                                ${roleLabel}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400 font-semibold text-xs">Estado de Cuenta:</span>
                            <span class="px-2.5 py-0.5 rounded-lg border text-3xs font-extrabold uppercase tracking-wider ${activeColor}">
                                ${activeLabel}
                            </span>
                        </div>
                    </div>
                </div>
                
                ${permissionsDesc}
            </div>

            <!-- Change Password Card -->
            <div class="lg:col-span-2">
                <div class="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 h-full">
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <i data-lucide="key-round" class="w-5 h-5 text-brand-500"></i>
                            <span>Seguridad y Contraseña</span>
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Cambia tu contraseña de acceso local de forma segura.</p>
                    </div>

                    <form id="change-pwd-form" class="space-y-4" onsubmit="event.preventDefault(); handleChangePassword();">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña Actual</label>
                            <input type="password" id="pwd-old" placeholder="••••••••" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none transition font-semibold focus:border-brand-500 focus:bg-white">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nueva Contraseña</label>
                                <input type="password" id="pwd-new" placeholder="••••••••" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none transition font-semibold focus:border-brand-500 focus:bg-white">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirmar Nueva Contraseña</label>
                                <input type="password" id="pwd-confirm" placeholder="••••••••" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none transition font-semibold focus:border-brand-500 focus:bg-white">
                            </div>
                        </div>
                        <div class="flex justify-end pt-2">
                            <button type="submit" class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition text-sm flex items-center gap-1.5 shadow-md shadow-brand-600/10">
                                <i data-lucide="save" class="w-4 h-4"></i>
                                <span>Actualizar Contraseña</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

async function handleChangePassword() {
    const old_password = document.getElementById('pwd-old').value.trim();
    const new_password = document.getElementById('pwd-new').value.trim();
    const confirm_password = document.getElementById('pwd-confirm').value.trim();

    if (!old_password || !new_password || !confirm_password) {
        alert("Todos los campos de contraseña son requeridos.");
        return;
    }

    if (new_password !== confirm_password) {
        alert("La nueva contraseña y su confirmación no coinciden.");
        return;
    }

    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password, new_password })
        }).then(r => r.json());

        if (res.status === 'success') {
            alert("Contraseña actualizada exitosamente.");
            document.getElementById('change-pwd-form').reset();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}
