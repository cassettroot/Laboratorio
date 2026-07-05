async function renderUsersView(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Gestión de Seguridad</span>
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button onclick="openUserCreateModal()" class="bg-brand-600 hover:bg-brand-700 font-bold px-5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg shadow-brand-600/10">
                        <i data-lucide="user-plus" class="w-4 h-4"></i>
                        <span>Registrar Usuario</span>
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                                <th class="py-4 px-6">Usuario</th>
                                <th class="py-4 px-6">Rol</th>
                                <th class="py-4 px-6">Estado</th>
                                <th class="py-4 px-6">Fecha Registro</th>
                                <th class="py-4 px-6 no-print text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body" class="divide-y divide-slate-100 text-slate-700 font-medium">
                            <tr>
                                <td colspan="5" class="py-12 text-center text-slate-400">Cargando usuarios registrados...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Custom self-contained User Modal -->
        <div id="user-detail-modal" class="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[90] flex items-center justify-center hidden no-print">
            <div class="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 transform scale-95 opacity-0 transition duration-200" id="user-detail-modal-content">
                <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 id="user-modal-title" class="font-bold text-slate-900 text-lg">Registrar Usuario</h3>
                    <button onclick="closeUserModal()" class="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg transition">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                <form id="user-form" class="space-y-4" onsubmit="event.preventDefault(); handleUserFormSubmit();">
                    <input type="hidden" id="user-form-id" value="">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre de Usuario</label>
                        <input type="text" id="user-form-username" placeholder="Ej. alejandro_ruiz" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none transition font-semibold focus:border-brand-500 focus:bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
                        <input type="password" id="user-form-password" placeholder="••••••••" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none transition font-semibold focus:border-brand-500 focus:bg-white">
                        <span id="user-form-password-help" class="text-3xs text-slate-400 block mt-1 hidden">Dejar vacío para mantener la contraseña actual.</span>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rol</label>
                            <select id="user-form-role" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none transition font-semibold focus:border-brand-500 focus:bg-white">
                                <option value="responsable">Responsable</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado</label>
                            <select id="user-form-active" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none transition font-semibold focus:border-brand-500 focus:bg-white">
                                <option value="1">Activo</option>
                                <option value="0">Inactivo</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
                        <button type="button" onclick="closeUserModal()" class="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
                        <button type="submit" id="btn-user-submit" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    await fetchAndRenderUsers();
}

async function fetchAndRenderUsers() {
    const body = document.getElementById('users-table-body');
    if (!body) return;

    try {
        const res = await fetch('/api/users').then(r => r.json());
        if (res.status === 'error') {
            body.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-red-500 font-bold">${res.message}</td></tr>`;
            return;
        }

        const users = res.data || [];
        if (users.length === 0) {
            body.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-400 font-semibold">No hay usuarios registrados.</td></tr>`;
            return;
        }

        body.innerHTML = users.map(u => {
            const roleColor = u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-teal-50 text-teal-700 border-teal-200';
            const activeColor = u.active === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200';
            const activeLabel = u.active === 1 ? 'Activo' : 'Inactivo';

            return `
                <tr class="hover:bg-slate-50/50 transition">
                    <td class="py-4 px-6">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200/50">
                                ${u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <span class="text-sm font-bold text-slate-900">${u.username}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6">
                        <span class="px-2.5 py-0.5 rounded-lg border text-3xs font-extrabold uppercase tracking-wider ${roleColor}">
                            ${u.role}
                        </span>
                    </td>
                    <td class="py-4 px-6">
                        <span class="px-2.5 py-0.5 rounded-lg border text-3xs font-extrabold uppercase tracking-wider ${activeColor}">
                            ${activeLabel}
                        </span>
                    </td>
                    <td class="py-4 px-6 text-slate-400 text-xs">${u.created_at}</td>
                    <td class="py-4 px-6 no-print text-right">
                        <div class="flex items-center justify-end gap-1.5">
                            <button onclick='openUserEditModal(${JSON.stringify(u)})' class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition" title="Editar">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="handleDeleteUser(${u.id}, '${u.username}')" class="p-2 hover:bg-red-50 text-red-500 rounded-lg transition" title="Eliminar">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        body.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-red-500 font-bold">Error al cargar usuarios.</td></tr>`;
    }
}

function openUserCreateModal() {
    const modal = document.getElementById('user-detail-modal');
    const content = document.getElementById('user-detail-modal-content');
    
    document.getElementById('user-modal-title').textContent = "Registrar Usuario";
    document.getElementById('user-form-id').value = "";
    document.getElementById('user-form-username').value = "";
    document.getElementById('user-form-username').disabled = false;
    document.getElementById('user-form-password').value = "";
    document.getElementById('user-form-password').required = true;
    document.getElementById('user-form-password-help').classList.add('hidden');
    document.getElementById('user-form-role').value = "responsable";
    document.getElementById('user-form-active').value = "1";

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);
}

function openUserEditModal(user) {
    const modal = document.getElementById('user-detail-modal');
    const content = document.getElementById('user-detail-modal-content');

    document.getElementById('user-modal-title').textContent = "Editar Usuario";
    document.getElementById('user-form-id').value = user.id;
    document.getElementById('user-form-username').value = user.username;
    // Permitir editar el nombre si se desea, pero bloquear si es el usuario logueado por seguridad
    document.getElementById('user-form-username').disabled = (user.username === state.activeUser);
    
    document.getElementById('user-form-password').value = "";
    document.getElementById('user-form-password').required = false;
    document.getElementById('user-form-password-help').classList.remove('hidden');
    document.getElementById('user-form-role').value = user.role;
    document.getElementById('user-form-active').value = user.active.toString();

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);
}

function closeUserModal() {
    const modal = document.getElementById('user-detail-modal');
    const content = document.getElementById('user-detail-modal-content');

    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

async function handleUserFormSubmit() {
    const userId = document.getElementById('user-form-id').value;
    const username = document.getElementById('user-form-username').value.trim();
    const password = document.getElementById('user-form-password').value.trim();
    const role = document.getElementById('user-form-role').value;
    const active = parseInt(document.getElementById('user-form-active').value);

    const payload = { username, role, active };
    if (password) payload.password = password;

    const isEdit = userId !== "";
    const url = isEdit ? `/api/users/${userId}` : '/api/users';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.status === 'success') {
            closeUserModal();
            
            // Si el admin se editó a sí mismo (ej. cambió su contraseña u otras propiedades), actualizar el estado
            if (isEdit && username === state.activeUser) {
                await checkSessionStatus();
            } else {
                await fetchAndRenderUsers();
            }
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}

async function handleDeleteUser(userId, username) {
    if (username === state.activeUser) {
        alert("No puedes eliminar tu propio usuario actual con sesión activa.");
        return;
    }

    if (!confirm(`¿Está seguro de eliminar permanentemente al usuario "${username}"?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        }).then(r => r.json());

        if (res.status === 'success') {
            await fetchAndRenderUsers();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}
