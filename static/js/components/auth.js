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

            if (container) {
                container.innerHTML = `
                    <span class="text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                        <i data-lucide="user" class="w-3.5 h-3.5 text-brand-500"></i>
                        <span>Sesión: <strong class="font-extrabold">${res.user}</strong></span>
                    </span>
                    <button onclick="handleLogout()" class="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 border border-transparent hover:border-red-100">
                        <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                        <span>Cerrar Sesión</span>
                    </button>
                `;
            }
        } else {
            state.isLoggedIn = false;
            state.activeUser = '';
            state.userRole = null;
            state.userActive = 0;

            if (container) {
                container.innerHTML = `
                    <span class="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <i data-lucide="eye" class="w-3.5 h-3.5 text-slate-400"></i>
                        <span>Modo Lectura</span>
                    </span>
                    <button onclick="openAuthModal()" class="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm shadow-brand-600/10">
                        <i data-lucide="log-in" class="w-3.5 h-3.5"></i>
                        <span>Iniciar Sesión</span>
                    </button>
                `;
            }
        }

        updateSidebarVisibility();

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
    const navScanQr = document.getElementById('nav-scan-qr');
    const navHistory = document.getElementById('nav-history');
    const navConsulta = document.getElementById('nav-consulta');
    const navBackup = document.getElementById('nav-backup');
    const navUsers = document.getElementById('nav-users');
    const navNotifications = document.getElementById('nav-notifications');
    const navAccount = document.getElementById('nav-account');

    if (!state.isLoggedIn) {
        // Cerrada la sesión: solo sustancias químicas, materiales químicos, material didáctico, escáner QR
        if (navDashboard) navDashboard.classList.add('hidden');
        if (navSubstances) navSubstances.classList.remove('hidden');
        if (navChemMaterials) navChemMaterials.classList.remove('hidden');
        if (navDidMaterials) navDidMaterials.classList.remove('hidden');
        if (navScanQr) navScanQr.classList.remove('hidden');
        if (navHistory) navHistory.classList.add('hidden');
        if (navConsulta) navConsulta.classList.add('hidden');
        if (navBackup) navBackup.classList.add('hidden');
        if (navUsers) navUsers.classList.add('hidden');
        if (navNotifications) navNotifications.classList.add('hidden');
        if (navAccount) navAccount.classList.add('hidden');
    } else {
        // Sesión iniciada:
        if (navDashboard) navDashboard.classList.remove('hidden');
        if (navSubstances) navSubstances.classList.remove('hidden');
        if (navChemMaterials) navChemMaterials.classList.remove('hidden');
        if (navDidMaterials) navDidMaterials.classList.remove('hidden');
        if (navScanQr) navScanQr.classList.remove('hidden');
        if (navConsulta) navConsulta.classList.remove('hidden');
        if (navNotifications) navNotifications.classList.remove('hidden');
        if (navAccount) navAccount.classList.remove('hidden');

        if (state.userRole === 'admin') {
            if (navHistory) navHistory.classList.remove('hidden');
            if (navBackup) navBackup.classList.remove('hidden');
            if (navUsers) navUsers.classList.remove('hidden');
        } else {
            // responsable no puede ver historial, base de datos ni usuarios
            if (navHistory) navHistory.classList.add('hidden');
            if (navBackup) navBackup.classList.add('hidden');
            if (navUsers) navUsers.classList.add('hidden');
        }
    }
}
