let activeAuthTab = 'login';

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');

    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-confirm-password').value = '';
    switchAuthTab('login');

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');

    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function switchAuthTab(tab) {
    activeAuthTab = tab;
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const confirmContainer = document.getElementById('auth-confirm-container');
    const btnSubmit = document.getElementById('btn-auth-submit');

    if (tab === 'login') {
        tabLogin.className = 'flex-1 text-center font-bold text-sm pb-2 border-b-2 border-brand-500 text-brand-600 outline-none';
        tabRegister.className = 'flex-1 text-center font-bold text-sm pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-600 outline-none';
        confirmContainer.classList.add('hidden');
        btnSubmit.textContent = 'Ingresar';
    } else {
        tabRegister.className = 'flex-1 text-center font-bold text-sm pb-2 border-b-2 border-brand-500 text-brand-600 outline-none';
        tabLogin.className = 'flex-1 text-center font-bold text-sm pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-600 outline-none';
        confirmContainer.classList.remove('hidden');
        btnSubmit.textContent = 'Registrarse';
    }
}

async function handleAuthSubmit() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!username || !password) {
        alert("Por favor rellene todos los campos.");
        return;
    }

    if (activeAuthTab === 'register') {
        const confirmPw = document.getElementById('auth-confirm-password').value.trim();
        if (password !== confirmPw) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            }).then(r => r.json());

            if (res.status === 'success') {
                alert("Cuenta creada con éxito. Ahora puede iniciar sesión.");
                switchAuthTab('login');
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert("Error al registrar cuenta: " + err.message);
        }
    } else {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            }).then(r => r.json());

            if (res.status === 'success') {
                closeAuthModal();
                await checkSessionStatus();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert("Error de conexión: " + err.message);
        }
    }
}

async function handleLogout() {
    try {
        const res = await fetch('/api/auth/logout', { method: 'POST' }).then(r => r.json());
        if (res.status === 'success') {
            await checkSessionStatus();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error al cerrar sesión: " + err.message);
    }
}

async function checkSessionStatus() {
    try {
        const res = await fetch('/api/auth/status').then(r => r.json());
        const container = document.getElementById('user-auth-control');

        if (res.status === 'success' && res.logged_in) {
            state.isLoggedIn = true;
            state.activeUser = res.user;
            state.userRole = res.role;
            state.userActive = res.active;
            state.assignedLabs = res.assigned_labs || 'all';

            if (container) {
                container.innerHTML = `
                    <span class="text-xs font-extrabold bg-slate-900 text-white border border-slate-700 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                        <i data-lucide="user" class="w-3.5 h-3.5 text-emerald-400"></i>
                        <span>Sesión: <strong class="font-extrabold text-white">${res.user}</strong></span>
                    </span>
                    <button onclick="handleLogout()" class="bg-slate-900 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-rose-500/30 hover:border-rose-400 shadow-md cursor-pointer">
                        <i data-lucide="log-out" class="w-3.5 h-3.5 text-rose-400"></i>
                        <span>🚪 Cerrar Sesión</span>
                    </button>
                `;
            }
        } else {
            state.isLoggedIn = false;
            state.activeUser = '';
            state.userRole = null;
            state.userActive = 0;
            state.assignedLabs = 'all';

            if (container) {
                container.innerHTML = `
                    <span class="text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                        <i data-lucide="eye" class="w-3.5 h-3.5 text-slate-300"></i>
                        <span>Modo Lectura</span>
                    </span>
                    <button onclick="openAuthModal()" class="bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-emerald-500/50 shadow-md cursor-pointer">
                        <i data-lucide="log-in" class="w-3.5 h-3.5 text-emerald-400"></i>
                        <span>Iniciar Sesión &rarr;</span>
                    </button>
                `;
            }
        }

        updateSidebarVisibility();
        if (typeof updateSpaceSelectAuthStatus === 'function') updateSpaceSelectAuthStatus();

        if (window.lucide) window.lucide.createIcons();

        if (typeof router === 'function' && state.activeRoute) {
            router();
        }
    } catch (err) {
        console.error("Error comprobando sesión: ", err);
    }
}

function updateSidebarVisibility() {
    const navDashboard = document.getElementById('nav-dashboard');
    const navSubstances = document.getElementById('nav-substances');
    const navChemMaterials = document.getElementById('nav-chem-materials');
    const navDidMaterials = document.getElementById('nav-did-materials');
    const navEquipos = document.getElementById('nav-equipos');
    const navScanQr = document.getElementById('nav-scan-qr');
    const navLoans = document.getElementById('nav-loans');
    const navHistory = document.getElementById('nav-history');
    const navConsulta = document.getElementById('nav-consulta');
    const navBackup = document.getElementById('nav-backup');
    const navUsers = document.getElementById('nav-users');
    const navNotifications = document.getElementById('nav-notifications');
    const navAccount = document.getElementById('nav-account');

    // Usuarios y Mi Cuenta se gestionan únicamente dentro del menú modal de laboratorios
    if (navUsers) navUsers.classList.add('hidden');
    if (navAccount) navAccount.classList.add('hidden');

    const currentInv = localStorage.getItem('inventory_id') || 'inventario';
    const isLab = currentInv === 'inventario';

    if (!state.isLoggedIn) {
        // Modo Lectura / Estudiante (Sin sesión):
        if (navDashboard) navDashboard.classList.add('hidden');
        if (navScanQr) navScanQr.classList.remove('hidden');
        if (navLoans) navLoans.classList.remove('hidden');

        if (isLab) {
            if (navSubstances) navSubstances.classList.remove('hidden');
            if (navChemMaterials) navChemMaterials.classList.remove('hidden');
            if (navDidMaterials) navDidMaterials.classList.remove('hidden');
            if (navEquipos) navEquipos.classList.add('hidden');
        } else {
            if (navSubstances) navSubstances.classList.add('hidden');
            if (navChemMaterials) navChemMaterials.classList.add('hidden');
            if (navDidMaterials) navDidMaterials.classList.add('hidden');
            if (navEquipos) navEquipos.classList.remove('hidden');
        }

        if (navConsulta) navConsulta.classList.add('hidden');
        if (navHistory) navHistory.classList.add('hidden');
        if (navBackup) navBackup.classList.add('hidden');
        if (navNotifications) navNotifications.classList.add('hidden');
    } else {
        // Con sesión iniciada (Admin o Responsable):
        if (navDashboard) navDashboard.classList.remove('hidden');
        if (navScanQr) navScanQr.classList.remove('hidden');
        if (navLoans) navLoans.classList.remove('hidden');
        if (navNotifications) navNotifications.classList.remove('hidden');

        if (isLab) {
            if (navSubstances) navSubstances.classList.remove('hidden');
            if (navChemMaterials) navChemMaterials.classList.remove('hidden');
            if (navDidMaterials) navDidMaterials.classList.remove('hidden');
            if (navConsulta) navConsulta.classList.remove('hidden');
            if (navEquipos) navEquipos.classList.add('hidden');
        } else {
            if (navSubstances) navSubstances.classList.add('hidden');
            if (navChemMaterials) navChemMaterials.classList.add('hidden');
            if (navDidMaterials) navDidMaterials.classList.add('hidden');
            if (navConsulta) navConsulta.classList.add('hidden');
            if (navEquipos) navEquipos.classList.remove('hidden');
        }

        if (state.userRole === 'admin') {
            if (navHistory) navHistory.classList.remove('hidden');
            if (navBackup) navBackup.classList.remove('hidden');
        } else {
            if (navHistory) navHistory.classList.add('hidden');
            if (navBackup) navBackup.classList.add('hidden');
        }
    }
}

function openSpaceSelectModal() {
    const modal = document.getElementById('space-select-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const closeBtn = document.getElementById('close-space-modal-btn');
        if (closeBtn) {
            if (localStorage.getItem('inventory_selected')) {
                closeBtn.classList.remove('hidden');
            } else {
                closeBtn.classList.add('hidden');
            }
        }
        updateSpaceSelectAuthStatus();

        if (state.isLoggedIn && state.userRole === 'responsable') {
            switchSpaceModalTab('profile');
        } else {
            switchSpaceModalTab('spaces');
        }
    }
}

function closeSpaceSelectModal() {
    const modal = document.getElementById('space-select-modal');
    if (modal) modal.classList.add('hidden');
}

function selectSpace(spaceId) {
    localStorage.setItem('inventory_id', spaceId);
    localStorage.setItem('inventory_selected', 'true');
    closeSpaceSelectModal();
    
    // Actualizar nombre del espacio activo en el header si existe
    const badge = document.getElementById('current-space-badge');
    if (badge) {
        const names = {
            'inventario': '🧪 Lab. de Química',
            'oficina': '💼 Inventario de Oficina',
            'sistemas': '💻 Lab. de Sistemas'
        };
        badge.innerHTML = `<span class="font-extrabold">${names[spaceId] || spaceId}</span>`;
    }
    
    // Recargar vista según espacio
    if (spaceId === 'inventario') {
        window.location.hash = '#/chemical-materials';
    } else {
        window.location.hash = '#/chemical-materials';
    }
    window.location.reload();
}

function switchSpaceModalTab(tabName) {
    const spacesTab = document.getElementById('space-tab-content-spaces');
    const profileTab = document.getElementById('space-tab-content-profile');
    const usersTab = document.getElementById('space-tab-content-users');

    const btnSpaces = document.getElementById('space-modal-tab-btn-spaces');
    const btnProfile = document.getElementById('space-modal-tab-btn-profile');
    const btnUsers = document.getElementById('space-modal-tab-btn-users');

    if (spacesTab) spacesTab.classList.add('hidden');
    if (profileTab) profileTab.classList.add('hidden');
    if (usersTab) usersTab.classList.add('hidden');

    const inactiveClass = 'px-4 py-2 text-xs font-bold rounded-xl text-slate-400 hover:text-white transition flex items-center gap-1.5';
    const activeClass = 'px-4 py-2 text-xs font-extrabold rounded-xl bg-brand-500 text-slate-900 shadow-md shadow-brand-500/20 flex items-center gap-1.5';

    if (btnSpaces) btnSpaces.className = inactiveClass;
    if (btnProfile) btnProfile.className = inactiveClass;
    if (btnUsers) btnUsers.className = inactiveClass;

    if (tabName === 'spaces') {
        if (spacesTab) spacesTab.classList.remove('hidden');
        if (btnSpaces) btnSpaces.className = activeClass;
    } else if (tabName === 'profile') {
        if (profileTab) profileTab.classList.remove('hidden');
        if (btnProfile) btnProfile.className = activeClass;
        loadSpaceProfileData();
    } else if (tabName === 'users') {
        if (usersTab) usersTab.classList.remove('hidden');
        if (btnUsers) btnUsers.className = activeClass;
        loadSpaceUsersList();
    }
    if (window.lucide) window.lucide.createIcons();
}

function updateSpaceSelectAuthStatus() {
    const btnSpaces = document.getElementById('space-modal-tab-btn-spaces');
    const btnProfile = document.getElementById('space-modal-tab-btn-profile');
    const btnUsers = document.getElementById('space-modal-tab-btn-users');

    const loginPanel = document.getElementById('space-inline-login-panel');
    const activeUserPanel = document.getElementById('space-active-user-panel');

    const activeUsernameEl = document.getElementById('space-active-username');
    const activeRoleEl = document.getElementById('space-active-role');
    const activeLabsEl = document.getElementById('space-active-labs');

    if (state.isLoggedIn) {
        if (state.userRole === 'admin') {
            // Admin General ve rotación, perfil y gestión de todos los usuarios
            if (btnSpaces) btnSpaces.classList.remove('hidden');
            if (btnProfile) btnProfile.classList.remove('hidden');
            if (btnUsers) btnUsers.classList.remove('hidden');
        } else if (state.userRole === 'jefe') {
            // Jefe de Área ve rotación (su área), perfil y gestión de usuarios de su área
            if (btnSpaces) btnSpaces.classList.remove('hidden');
            if (btnProfile) btnProfile.classList.remove('hidden');
            if (btnUsers) btnUsers.classList.remove('hidden');
        } else {
            // Responsable solo ve 'Mi Perfil'
            if (btnSpaces) btnSpaces.classList.add('hidden');
            if (btnProfile) btnProfile.classList.remove('hidden');
            if (btnUsers) btnUsers.classList.add('hidden');
        }

        // Mostrar datos de sesión activa en lugar de pedir login nuevamente
        if (loginPanel) loginPanel.classList.add('hidden');
        if (activeUserPanel) activeUserPanel.classList.remove('hidden');

        if (activeUsernameEl) activeUsernameEl.textContent = state.activeUser || 'Usuario';
        
        const roleNames = {
            'admin': '👑 Administrador General',
            'jefe': '⭐ Jefe de Área',
            'responsable': '🔑 Responsable de Laboratorio'
        };
        if (activeRoleEl) activeRoleEl.textContent = roleNames[state.userRole] || '🔑 Responsable';

        const labsMap = {
            'all': '🌐 Todos los Labs',
            'inventario': '🧪 Química',
            'oficina': '💼 Oficina',
            'sistemas': '💻 Sistemas'
        };
        if (activeLabsEl) activeLabsEl.textContent = labsMap[state.assignedLabs] || state.assignedLabs || 'Todos';

    } else {
        // Sin iniciar sesión (Modo Lectura / Estudiantes):
        if (btnSpaces) btnSpaces.classList.remove('hidden');
        if (btnProfile) btnProfile.classList.add('hidden');
        if (btnUsers) btnUsers.classList.add('hidden');

        if (loginPanel) loginPanel.classList.remove('hidden');
        if (activeUserPanel) activeUserPanel.classList.add('hidden');
    }

    updateSpaceCardsAccess();
}

function updateSpaceCardsAccess() {
    const cardChem = document.getElementById('space-card-inventario');
    const cardOffice = document.getElementById('space-card-oficina');
    const cardSystems = document.getElementById('space-card-sistemas');

    if (!state.isLoggedIn) {
        // Estudiante / Lectura: Mostrar los 3 espacios
        if (cardChem) cardChem.classList.remove('hidden');
        if (cardOffice) cardOffice.classList.remove('hidden');
        if (cardSystems) cardSystems.classList.remove('hidden');
        return;
    }

    const assigned = state.assignedLabs || 'all';
    const isAll = assigned === 'all' || state.userRole === 'admin';

    if (cardChem) {
        if (isAll || assigned.includes('inventario')) cardChem.classList.remove('hidden');
        else cardChem.classList.add('hidden');
    }
    if (cardOffice) {
        if (isAll || assigned.includes('oficina')) cardOffice.classList.remove('hidden');
        else cardOffice.classList.add('hidden');
    }
    if (cardSystems) {
        if (isAll || assigned.includes('sistemas')) cardSystems.classList.remove('hidden');
        else cardSystems.classList.add('hidden');
    }
}

async function handleSpaceInlineLogin() {
    const userEl = document.getElementById('space-auth-username');
    const passEl = document.getElementById('space-auth-password');
    const feedback = document.getElementById('space-login-feedback');
    const btn = document.getElementById('btn-space-inline-login');

    if (!userEl || !passEl) return;
    const username = userEl.value.trim();
    const password = passEl.value.trim();

    if (!username || !password) {
        if (feedback) {
            feedback.className = 'text-2xs font-bold p-2.5 rounded-xl border bg-red-50 text-red-700 border-red-200';
            feedback.textContent = 'Por favor ingresa usuario y contraseña.';
            feedback.classList.remove('hidden');
        }
        return;
    }

    if (btn) btn.disabled = true;
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(r => r.json());

        if (res.status === 'success') {
            if (feedback) {
                feedback.className = 'text-2xs font-bold p-2.5 rounded-xl border bg-emerald-50 text-emerald-700 border-emerald-200';
                feedback.textContent = '¡Sesión iniciada correctamente!';
                feedback.classList.remove('hidden');
            }
            await checkSessionStatus();
            userEl.value = '';
            passEl.value = '';
        } else {
            if (feedback) {
                feedback.className = 'text-2xs font-bold p-2.5 rounded-xl border bg-red-50 text-red-700 border-red-200';
                feedback.textContent = res.message || 'Error al iniciar sesión.';
                feedback.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error("Error inline login: ", err);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function loadSpaceProfileData() {
    const elName = document.getElementById('space-profile-name');
    const elEmail = document.getElementById('space-profile-email');
    const elRole = document.getElementById('space-profile-role');
    const elLabs = document.getElementById('space-profile-labs');

    if (elName) elName.textContent = state.activeUser || 'Usuario';
    if (elRole) elRole.textContent = state.userRole === 'admin' ? '👑 Administrador General' : '🔑 Responsable de Laboratorio';

    const labsMap = {
        'all': '🌐 Todos los Laboratorios',
        'inventario': '🧪 Lab. de Química',
        'oficina': '💼 Inventario de Oficina',
        'sistemas': '💻 Lab. de Sistemas'
    };
    if (elLabs) elLabs.textContent = labsMap[state.assignedLabs] || state.assignedLabs || 'Todos';
}

async function handleSpaceChangePassword() {
    const oldPw = document.getElementById('profile-old-password');
    const newPw = document.getElementById('profile-new-password');
    const feedback = document.getElementById('profile-pw-feedback');

    if (!oldPw || !newPw) return;
    const old_password = oldPw.value.trim();
    const new_password = newPw.value.trim();

    if (!old_password || !new_password) {
        if (feedback) {
            feedback.className = 'text-2xs font-bold p-2.5 rounded-xl border bg-red-50 text-red-700 border-red-200';
            feedback.textContent = 'Ambas contraseñas son requeridas.';
            feedback.classList.remove('hidden');
        }
        return;
    }

    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password, new_password })
        }).then(r => r.json());

        if (res.status === 'success') {
            if (feedback) {
                feedback.className = 'text-2xs font-bold p-2.5 rounded-xl border bg-emerald-50 text-emerald-700 border-emerald-200';
                feedback.textContent = res.message || 'Contraseña actualizada.';
                feedback.classList.remove('hidden');
            }
            oldPw.value = '';
            newPw.value = '';
        } else {
            if (feedback) {
                feedback.className = 'text-2xs font-bold p-2.5 rounded-xl border bg-red-50 text-red-700 border-red-200';
                feedback.textContent = res.message || 'Error al cambiar la contraseña.';
                feedback.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error("Error password change: ", err);
    }
}

let _spaceUsersCache = [];

async function loadSpaceUsersList() {
    const tbody = document.getElementById('space-users-table-body');
    if (!tbody) return;

    try {
        const res = await fetch('/api/users').then(r => r.json());
        if (res.status === 'success' && Array.isArray(res.data)) {
            _spaceUsersCache = res.data;
            if (res.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">No hay usuarios registrados.</td></tr>`;
                return;
            }

            const labsNames = {
                'all': '🌐 Todos',
                'inventario': '🧪 Química',
                'oficina': '💼 Oficina',
                'sistemas': '💻 Sistemas'
            };

            tbody.innerHTML = res.data.map(u => {
                let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                let badgeText = '🔑 Responsable';

                if (u.role === 'admin') {
                    badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                    badgeText = '👑 Admin';
                } else if (u.role === 'jefe') {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                    badgeText = '⭐ Jefe de Área';
                }

                return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-3 font-bold text-slate-900">${escHtml(u.username)}</td>
                    <td class="p-3 text-slate-500">${escHtml(u.email || '-')}</td>
                    <td class="p-3">
                        <span class="px-2 py-0.5 rounded-lg text-2xs font-bold border ${badgeClass}">
                            ${badgeText}
                        </span>
                    </td>
                    <td class="p-3 text-slate-600">
                        <span class="px-2 py-0.5 rounded-lg text-2xs font-bold bg-slate-100 border border-slate-200">
                            ${escHtml(labsNames[u.assigned_labs] || u.assigned_labs || 'Todos')}
                        </span>
                    </td>
                    <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded-lg text-2xs font-bold ${u.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}">
                            ${u.active ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td class="p-3 text-center">
                        <div class="flex items-center justify-center gap-1">
                            <button onclick="openSpaceUserEditById(${u.id})" class="p-1 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50" title="Editar">
                                ✏️
                            </button>
                            <button onclick="deleteSpaceUser(${u.id})" class="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            }).join('');
        }
    } catch (err) {
        console.error("Error cargando usuarios: ", err);
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Error al cargar usuarios.</td></tr>`;
    }
}

function openSpaceUserEditById(userId) {
    const target = _spaceUsersCache.find(u => u.id === userId);
    if (target) {
        openSpaceUserModal(target);
    }
}

function openSpaceUserModal(userObj = null) {
    const card = document.getElementById('space-user-form-card');
    const title = document.getElementById('space-user-form-title');
    const editId = document.getElementById('space-user-edit-id');
    const username = document.getElementById('su-username');
    const email = document.getElementById('su-email');
    const password = document.getElementById('su-password');
    const role = document.getElementById('su-role');
    const active = document.getElementById('su-active');

    const labAll = document.getElementById('su-lab-all');
    const labInv = document.getElementById('su-lab-inventario');
    const labOff = document.getElementById('su-lab-oficina');
    const labSys = document.getElementById('su-lab-sistemas');

    const labAllWrapper = document.getElementById('su-lab-all-wrapper');
    const labInvWrapper = document.getElementById('su-lab-inventario-wrapper');
    const labOffWrapper = document.getElementById('su-lab-oficina-wrapper');
    const labSysWrapper = document.getElementById('su-lab-sistemas-wrapper');

    if (!card) return;
    card.classList.remove('hidden');

    const isGlobalAdmin = (state.userRole === 'admin');

    // 1. Dinamizar opciones de Rol
    if (role) {
        if (isGlobalAdmin) {
            role.innerHTML = `
                <option value="responsable">🔑 Responsable de Laboratorio</option>
                <option value="jefe">⭐ Jefe de Área</option>
                <option value="admin">👑 Administrador General</option>
            `;
        } else {
            // El Jefe de Área solo puede crear o asignar el rol Responsable de Laboratorio
            role.innerHTML = `
                <option value="responsable">🔑 Responsable de Laboratorio</option>
            `;
        }
    }

    if (isGlobalAdmin) {
        // Administrador General: Ve y administra Control Total + todos los laboratorios
        if (labAllWrapper) labAllWrapper.classList.remove('hidden');
        if (labInvWrapper) labInvWrapper.classList.remove('hidden');
        if (labOffWrapper) labOffWrapper.classList.remove('hidden');
        if (labSysWrapper) labSysWrapper.classList.remove('hidden');

        if (labAll) labAll.disabled = false;
        if (labInv) labInv.disabled = false;
        if (labOff) labOff.disabled = false;
        if (labSys) labSys.disabled = false;

        if (userObj) {
            if (title) title.textContent = `Editar Usuario: ${userObj.username}`;
            if (editId) editId.value = userObj.id;
            if (username) username.value = userObj.username;
            if (email) email.value = userObj.email || '';
            if (password) password.value = '';
            if (role) role.value = userObj.role || 'responsable';
            if (active) active.value = userObj.active ? '1' : '0';

            const assigned = userObj.assigned_labs || 'all';
            if (assigned === 'all') {
                if (labAll) labAll.checked = true;
                toggleSuLabAll(true);
            } else {
                if (labAll) labAll.checked = false;
                if (labInv) labInv.checked = assigned.includes('inventario');
                if (labOff) labOff.checked = assigned.includes('oficina');
                if (labSys) labSys.checked = assigned.includes('sistemas');
            }
        } else {
            if (title) title.textContent = 'Registrar Nuevo Usuario';
            if (editId) editId.value = '';
            if (username) username.value = '';
            if (email) email.value = '';
            if (password) password.value = '';
            if (role) role.value = 'responsable';
            if (active) active.value = '1';
            if (labAll) labAll.checked = true;
            toggleSuLabAll(true);
        }
    } else {
        // Jefe de Área: NO puede seleccionar Control Total ni laboratorios ajenos. Se fija automáticamente a su propio laboratorio.
        if (labAllWrapper) labAllWrapper.classList.add('hidden');
        if (labAll) {
            labAll.checked = false;
            labAll.disabled = true;
        }

        const myArea = state.assignedLabs || 'inventario';

        if (labInvWrapper) {
            if (myArea.includes('inventario')) {
                labInvWrapper.classList.remove('hidden');
                if (labInv) { labInv.checked = true; labInv.disabled = true; }
            } else {
                labInvWrapper.classList.add('hidden');
                if (labInv) { labInv.checked = false; labInv.disabled = true; }
            }
        }
        if (labOffWrapper) {
            if (myArea.includes('oficina')) {
                labOffWrapper.classList.remove('hidden');
                if (labOff) { labOff.checked = true; labOff.disabled = true; }
            } else {
                labOffWrapper.classList.add('hidden');
                if (labOff) { labOff.checked = false; labOff.disabled = true; }
            }
        }
        if (labSysWrapper) {
            if (myArea.includes('sistemas')) {
                labSysWrapper.classList.remove('hidden');
                if (labSys) { labSys.checked = true; labSys.disabled = true; }
            } else {
                labSysWrapper.classList.add('hidden');
                if (labSys) { labSys.checked = false; labSys.disabled = true; }
            }
        }

        if (userObj) {
            if (title) title.textContent = `Editar Usuario: ${userObj.username}`;
            if (editId) editId.value = userObj.id;
            if (username) username.value = userObj.username;
            if (email) email.value = userObj.email || '';
            if (password) password.value = '';
            if (role) role.value = 'responsable';
            if (active) active.value = userObj.active ? '1' : '0';
        } else {
            if (title) title.textContent = 'Registrar Nuevo Usuario';
            if (editId) editId.value = '';
            if (username) username.value = '';
            if (email) email.value = '';
            if (password) password.value = '';
            if (role) role.value = 'responsable';
            if (active) active.value = '1';
        }
    }
}

function closeSpaceUserModal() {
    const card = document.getElementById('space-user-form-card');
    if (card) card.classList.add('hidden');
}

function toggleSuLabAll(checked) {
    const singles = document.querySelectorAll('.su-lab-single');
    singles.forEach(chk => {
        if (checked) {
            chk.checked = true;
            chk.disabled = true;
        } else {
            chk.disabled = false;
        }
    });
}

async function saveSpaceUser() {
    const editId = document.getElementById('space-user-edit-id')?.value;
    const username = document.getElementById('su-username')?.value.trim();
    const email = document.getElementById('su-email')?.value.trim();
    const password = document.getElementById('su-password')?.value.trim();
    const role = document.getElementById('su-role')?.value || 'responsable';
    const active = document.getElementById('su-active')?.value;

    const labAll = document.getElementById('su-lab-all')?.checked;
    const labInv = document.getElementById('su-lab-inventario')?.checked;
    const labOff = document.getElementById('su-lab-oficina')?.checked;
    const labSys = document.getElementById('su-lab-sistemas')?.checked;

    if (!username) {
        alert("El nombre de usuario es requerido.");
        return;
    }

    let assigned_labs = 'all';
    if (state.userRole !== 'admin') {
        // Jefe de Área se limita estrictamente a su laboratorio asignado
        assigned_labs = state.assignedLabs || 'inventario';
    } else {
        if (!labAll) {
            const selected = [];
            if (labInv && labInv.checked) selected.push('inventario');
            if (labOff && labOff.checked) selected.push('oficina');
            if (labSys && labSys.checked) selected.push('sistemas');
            assigned_labs = selected.length > 0 ? selected.join(',') : 'all';
        }
    }

    const payload = {
        username,
        email,
        password,
        role,
        active: parseInt(active || 1),
        assigned_labs
    };

    try {
        let res;
        if (editId) {
            res = await fetch(`/api/users/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json());
        } else {
            res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json());
        }

        if (res.status === 'success') {
            alert(res.message || 'Usuario guardado exitosamente.');
            closeSpaceUserModal();
            loadSpaceUsersList();
        } else {
            alert(res.message || 'Error al guardar el usuario.');
        }
    } catch (err) {
        console.error("Error guardando usuario: ", err);
        alert("Error de conexión al guardar el usuario.");
    }
}

async function deleteSpaceUser(userId) {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
        const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' }).then(r => r.json());
        if (res.status === 'success') {
            loadSpaceUsersList();
        } else {
            alert(res.message || 'Error al eliminar usuario.');
        }
    } catch (err) {
        console.error("Error eliminando usuario: ", err);
    }
}
