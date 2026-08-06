const state = {
    activeRoute: '#/',
    substances: [],
    chemMaterials: [],
    didMaterials: [],
    history: [],
    activeUser: '',
    isLoggedIn: false,
    userRole: null,
    userActive: 0,
    assignedLabs: 'all',
    substancesViewMode: localStorage.getItem('itma2_substances_view_mode') || 'list',
    webcamStream: null,
    html5QrScanner: null
};

function getActiveUser() {
    return state.activeUser || '';
}

function setSubstancesViewMode(mode) {
    state.substancesViewMode = mode;
    localStorage.setItem('itma2_substances_view_mode', mode);
    router();
}
