function formatChemicalFormulaHtml(formula) {
    if (!formula) return '-';
    return formula.replace(/([A-Za-z\)])(\d+)/g, '$1<sub>$2</sub>');
}

function getAddedDateFormatted(s) {
    const rawDate = s.created_at || s.entry_date;
    if (!rawDate) return '';
    try {
        const d = new Date(rawDate.includes(' ') ? rawDate.replace(' ', 'T') : rawDate);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
    } catch(e) {}
    return (rawDate || '').split(' ')[0];
}

function getItemDateString(s) {
    const raw = (s.created_at || s.entry_date || '').trim();
    if (!raw) return null;
    const matchISO = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchISO) {
        return `${matchISO[1]}-${matchISO[2]}-${matchISO[3]}`;
    }
    const matchLat = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchLat) {
        return `${matchLat[3]}-${matchLat[2]}-${matchLat[1]}`;
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return null;
}

function getItemDateObject(s) {
    const dateStr = getItemDateString(s);
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function matchesAddedRecentFilter(s, filterKey) {
    if (!filterKey) return true;
    const itemDateObj = getItemDateObject(s);
    if (!itemDateObj) return false;

    const now = new Date();
    const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filterKey === 'today') {
        return itemDateObj.getTime() === todayObj.getTime();
    }

    const diffTime = todayObj.getTime() - itemDateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (filterKey === '7d') return diffDays >= 0 && diffDays <= 7;
    if (filterKey === '30d') return diffDays >= 0 && diffDays <= 30;
    if (filterKey === '90d') return diffDays >= 0 && diffDays <= 90;

    return true;
}

function isRecentlyAdded(s, days = 7) {
    const itemDateObj = getItemDateObject(s);
    if (!itemDateObj) return false;
    const now = new Date();
    const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((todayObj.getTime() - itemDateObj.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
}

function buildGroupBadgesHtml(substance_group) {
    if (!substance_group) return '';
    const groups = substance_group.split(/[,/;|]/).map(g => g.trim()).filter(Boolean);
    return groups.map(group => {
        let gColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-black shadow-[0_0_10px_rgba(6,182,212,0.2)]';
        const g = group.toLowerCase();
        if (g.includes('inflam')) {
            gColor = 'badge-inflammable bg-red-500/20 text-red-400 border-red-500/50 font-black shadow-[0_0_12px_rgba(239,68,68,0.25)]';
        } else if (g.includes('tox') || g.includes('venen')) {
            gColor = 'badge-toxic bg-purple-500/20 text-purple-300 border-purple-500/50 font-black shadow-[0_0_12px_rgba(168,85,247,0.25)]';
        } else if (g.includes('corros')) {
            gColor = 'badge-corrosive bg-amber-500/20 text-amber-300 border-amber-500/50 font-black shadow-[0_0_12px_rgba(245,158,11,0.25)]';
        } else if (g.includes('explos')) {
            gColor = 'badge-explosive bg-yellow-500/20 text-yellow-300 border-yellow-500/50 font-black shadow-[0_0_12px_rgba(234,179,8,0.25)]';
        } else if (g.includes('comburent')) {
            gColor = 'badge-comburent bg-pink-500/20 text-pink-300 border-pink-500/50 font-black shadow-[0_0_12px_rgba(236,72,153,0.25)]';
        } else if (g.includes('irrit')) {
            gColor = 'badge-irritant bg-emerald-500/20 text-emerald-400 border-emerald-500/50 font-black shadow-[0_0_12px_rgba(16,185,129,0.25)]';
        } else if (g.includes('alcoh') || g.includes('solvent')) {
            gColor = 'badge-alcohol bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-black shadow-[0_0_12px_rgba(6,182,212,0.25)]';
        } else if (g.includes('ester') || g.includes('éster') || g.includes('aldehid') || g.includes('aldehíd') || g.includes('cetona')) {
            gColor = 'badge-organic bg-violet-500/20 text-violet-300 border-violet-500/50 font-black shadow-[0_0_12px_rgba(139,92,246,0.25)]';
        } else if (g.includes('acid') || g.includes('ácid')) {
            gColor = 'badge-acid bg-rose-500/20 text-rose-300 border-rose-500/50 font-black shadow-[0_0_12px_rgba(244,63,94,0.25)]';
        } else if (g.includes('base') || g.includes('alcali')) {
            gColor = 'badge-base bg-blue-500/20 text-blue-300 border-blue-500/50 font-black shadow-[0_0_12px_rgba(59,130,246,0.25)]';
        }
        return `<span class="px-3 py-1 rounded-xl border text-3xs font-black uppercase tracking-wider ${gColor}">${group}</span>`;
    }).join(' ');
}

function getMissingSubstanceFields(s) {
    const missing = [];
    if (!s.location || !s.location.trim()) missing.push('Ubicación');
    if (!s.expiration_date || !s.expiration_date.trim()) missing.push('Caducidad');
    if (!s.entry_date || !s.entry_date.trim()) missing.push('Fecha Entrada');
    if (!s.image_path || !s.image_path.trim()) missing.push('Foto');
    if (!s.chemical_formula || !s.chemical_formula.trim()) missing.push('Fórmula');
    if (!s.cas_number || !s.cas_number.trim()) missing.push('CAS');
    if (!s.pdf_path || !s.pdf_path.trim()) missing.push('PDF (HDS)');
    if (!s.external_links || !s.external_links.trim()) missing.push('Links Ref.');
    return missing;
}

function toggleSubstancesFilterActiveMode() {
    toggleSubstancesFiltersPanel();
}
window.toggleSubstancesFilterActiveMode = toggleSubstancesFilterActiveMode;

function toggleSubstancesFiltersPanel() {
    const panel = document.getElementById('substances-filters-panel');
    if (!panel) return;
    
    panel.classList.toggle('hidden');
    const isOpen = !panel.classList.contains('hidden');
    if (!state.substancesFilters) state.substancesFilters = {};
    state.substancesFilters.isPanelOpen = isOpen;
    state.substancesFilters.areFiltersActive = isOpen;

    const btn = document.getElementById('btn-toggle-filter-mode');
    if (btn) {
        if (isOpen) {
            btn.className = 'px-3.5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition shadow-md shrink-0 bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 cursor-pointer';
            btn.innerHTML = `<i data-lucide="filter" class="w-4 h-4 text-slate-950"></i><span>Filtros Activos</span>`;
        } else {
            btn.className = 'px-3.5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition border shadow-sm shrink-0 glass-btn text-white cursor-pointer';
            btn.innerHTML = `<i data-lucide="filter" class="w-4 h-4 text-teal-400"></i><span>Activar Filtros</span>`;
        }
        if (window.lucide) window.lucide.createIcons();
    }
}
window.toggleSubstancesFiltersPanel = toggleSubstancesFiltersPanel;

function resetSubstancesFilters() {
    state.substancesFilters = {
        search: '',
        sort: 'name_asc',
        group: '',
        physical_state: '',
        completeness: '',
        risk: '',
        location: '',
        added_recent: '',
        isPanelOpen: false,
        areFiltersActive: false
    };

    const search = document.getElementById('search-substances');
    const sort = document.getElementById('sort-substances');
    const group = document.getElementById('group-substances');
    const stateFilter = document.getElementById('filter-state');
    const completeness = document.getElementById('filter-completeness');
    const risk = document.getElementById('filter-risk');
    const loc = document.getElementById('filter-location');
    const addedRecent = document.getElementById('filter-added-recent');

    if (search) search.value = '';
    if (sort) sort.value = 'name_asc';
    if (group) group.value = '';
    if (stateFilter) stateFilter.value = '';
    if (completeness) completeness.value = '';
    if (risk) risk.value = '';
    if (loc) loc.value = '';
    if (addedRecent) addedRecent.value = '';

    const badge = document.getElementById('active-filters-badge');
    if (badge) {
        badge.textContent = '0';
        badge.classList.add('hidden');
    }

    if (window._triggerSubstancesFetch) window._triggerSubstancesFetch();
}

async function renderSubstancesList(container) {
    if (!state.substancesFilters) {
        state.substancesFilters = {
            search: '',
            sort: 'name_asc',
            group: '',
            completeness: '',
            risk: '',
            location: '',
            added_recent: '',
            isPanelOpen: false,
            areFiltersActive: false
        };
    }

    const f = state.substancesFilters;

    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="sticky -top-8 z-20 py-2 space-y-3 no-print">
                <!-- Fila Principal: Búsqueda y Botones -->
                <div class="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div class="flex items-center gap-3 w-full md:w-auto flex-1 max-w-2xl">
                        <div class="relative w-full">
                            <input id="search-substances" type="text" value="${f.search || ''}" placeholder="Buscar por CAS, nombre, grupo o ubicación..." class="w-full bg-slate-900/70 border border-slate-700/80 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-brand-500 outline-none transition shadow-sm font-semibold text-white placeholder:text-slate-400">
                            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                        </div>
                        
                        <button type="button" id="btn-toggle-filter-mode" onclick="toggleSubstancesFilterActiveMode()" class="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition border shadow-sm shrink-0 ${f.areFiltersActive ? 'bg-brand-600 text-white border-brand-700 hover:bg-brand-700' : 'bg-slate-900/70 text-slate-200 border-slate-700/80 hover:bg-slate-800'}">
                            <i data-lucide="${f.areFiltersActive ? 'filter-check' : 'filter'}" class="w-4 h-4 text-brand-400"></i>
                            <span>${f.areFiltersActive ? '⚡ Activar Filtros: SÍ' : '⚡ Activar Filtros'}</span>
                        </button>

                        <button type="button" id="btn-toggle-filters" onclick="toggleSubstancesFiltersPanel()" class="bg-slate-900/70 hover:bg-slate-800 border border-slate-700/80 font-bold px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-white shadow-sm shrink-0">
                            <i data-lucide="sliders-horizontal" class="w-4 h-4 text-brand-400"></i>
                            <span>Opciones</span>
                            <span id="active-filters-badge" class="hidden bg-brand-500 text-slate-900 text-3xs font-extrabold px-2 py-0.5 rounded-full">0</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-2.5 w-full md:w-auto justify-end">
                        <div class="flex border border-slate-700/80 rounded-xl overflow-hidden shadow-sm bg-slate-900/70 shrink-0 text-white">
                            <button onclick="setSubstancesViewMode('list')" id="btn-view-list" class="px-3.5 py-2.5 transition flex items-center justify-center font-bold text-xs" title="Vista de Lista">
                                <i data-lucide="list" class="w-4 h-4"></i>
                            </button>
                            <button onclick="setSubstancesViewMode('grid')" id="btn-view-grid" class="px-3.5 py-2.5 transition flex items-center justify-center font-bold text-xs" title="Vista de Cuadrícula">
                                <i data-lucide="layout-grid" class="w-4 h-4"></i>
                            </button>
                        </div>

                        ${(state.isLoggedIn && state.userRole === 'admin') ? `
                        <button onclick="openQRBatchModal()" class="bg-indigo-600 hover:bg-indigo-700 font-extrabold px-3.5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-md shrink-0" title="Imprimir o Descargar Códigos QR de Sustancias (Solo Admin)">
                            <i data-lucide="qr-code" class="w-4 h-4 text-amber-300"></i>
                            <span class="hidden sm:inline">🖨️ Códigos QR</span>
                            <span class="sm:hidden">QR</span>
                        </button>
                        <button onclick="exportTableToExcel('substances')" class="bg-slate-900/70 hover:bg-slate-800 border border-slate-700/80 font-bold px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-white shadow-sm shrink-0">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            <span class="hidden sm:inline">Exportar</span>
                        </button>
                        ` : ''}

                        ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                        <button onclick="openAddModal('substances')" class="bg-teal-600 hover:bg-teal-700 font-extrabold px-4 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg shrink-0">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            <span>Registrar Sustancia</span>
                        </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Panel Plegable de Filtros Avanzados y Ordenamiento -->
                <div id="substances-filters-panel" class="${f.isPanelOpen ? '' : 'hidden'} glass-card border border-white/10 rounded-2xl p-5 shadow-2xl animate-fade-in space-y-4">
                    <div class="flex items-center justify-between pb-3 border-b border-white/10">
                        <span class="text-xs font-black uppercase tracking-wider text-teal-300 flex items-center gap-2">
                            <i data-lucide="filter" class="w-4 h-4 text-teal-400"></i>
                            Opciones de Filtro y Ordenamiento
                        </span>
                        <button onclick="resetSubstancesFilters()" class="text-xs font-black text-teal-400 hover:text-teal-300 transition flex items-center gap-1 cursor-pointer">
                            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                            <span>Restablecer Filtros</span>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
                        <div>
                            <label class="block text-3xs font-black uppercase tracking-wider mb-1.5 opacity-80">Ordenar por</label>
                            <select id="sort-substances" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold">
                                <option value="name_asc" ${f.sort === 'name_asc' ? 'selected' : ''}>🔤 Nombre (A - Z)</option>
                                <option value="name_desc" ${f.sort === 'name_desc' ? 'selected' : ''}>🔤 Nombre (Z - A)</option>
                                <option value="cas_asc" ${f.sort === 'cas_asc' ? 'selected' : ''}>🔢 Número CAS (A - Z)</option>
                                <option value="cas_desc" ${f.sort === 'cas_desc' ? 'selected' : ''}>🔢 Número CAS (Z - A)</option>
                                <option value="quantity_desc" ${f.sort === 'quantity_desc' ? 'selected' : ''}>📦 Stock (Mayor a Menor)</option>
                                <option value="quantity_asc" ${f.sort === 'quantity_asc' ? 'selected' : ''}>📦 Stock (Menor a Mayor)</option>
                                <option value="id_desc" ${f.sort === 'id_desc' ? 'selected' : ''}>🆕 Registro (Más recientes)</option>
                                <option value="id_asc" ${f.sort === 'id_asc' ? 'selected' : ''}>⌛ Registro (Más antiguos)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-black uppercase tracking-wider mb-1.5 opacity-80">📅 Agregado Recientemente</label>
                            <select id="filter-added-recent" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold">
                                <option value="" ${!f.added_recent ? 'selected' : ''}>-- Todas las fechas --</option>
                                <option value="today" ${f.added_recent === 'today' ? 'selected' : ''}>🆕 Agregados Hoy</option>
                                <option value="7d" ${f.added_recent === '7d' ? 'selected' : ''}>📅 Últimos 7 días</option>
                                <option value="30d" ${f.added_recent === '30d' ? 'selected' : ''}>📅 Últimos 30 días</option>
                                <option value="90d" ${f.added_recent === '90d' ? 'selected' : ''}>📅 Últimos 90 días</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-black uppercase tracking-wider mb-1.5 opacity-80">Agrupar por</label>
                            <select id="group-substances" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold">
                                <option value="" ${!f.group ? 'selected' : ''}>-- Sin Agrupar --</option>
                                <option value="physical_state" ${f.group === 'physical_state' ? 'selected' : ''}>📁 Estado Físico</option>
                                <option value="location" ${f.group === 'location' ? 'selected' : ''}>📍 Ubicación</option>
                                <option value="substance_group" ${f.group === 'substance_group' ? 'selected' : ''}>🏷️ Grupo Químico</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-black uppercase tracking-wider mb-1.5 opacity-80">Estado Físico</label>
                            <select id="filter-state" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold">
                                <option value="" ${!f.physical_state ? 'selected' : ''}>-- Todos --</option>
                                <option value="Sólido" ${f.physical_state === 'Sólido' ? 'selected' : ''}>Sólido</option>
                                <option value="Líquido" ${f.physical_state === 'Líquido' ? 'selected' : ''}>Líquido</option>
                                <option value="Gaseoso" ${f.physical_state === 'Gaseoso' ? 'selected' : ''}>Gaseoso</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-black uppercase tracking-wider mb-1.5 opacity-80">Incompletos / Faltantes</label>
                            <select id="filter-completeness" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold">
                                <option value="" ${!f.completeness ? 'selected' : ''}>-- Todos los reactivos --</option>
                                <option value="incomplete" ${f.completeness === 'incomplete' ? 'selected' : ''}>⚠️ Ver solo Incompletos</option>
                                <option value="missing_location" ${f.completeness === 'missing_location' ? 'selected' : ''}>📍 Falta Ubicación</option>
                                <option value="missing_expiration" ${f.completeness === 'missing_expiration' ? 'selected' : ''}>📅 Falta Caducidad</option>
                                <option value="missing_photo" ${f.completeness === 'missing_photo' ? 'selected' : ''}>📷 Falta Foto</option>
                                <option value="missing_formula" ${f.completeness === 'missing_formula' ? 'selected' : ''}>🧪 Falta Fórmula / CAS</option>
                                <option value="missing_pdf" ${f.completeness === 'missing_pdf' ? 'selected' : ''}>📄 Falta Documento PDF (HDS)</option>
                                <option value="missing_links" ${f.completeness === 'missing_links' ? 'selected' : ''}>🔗 Falta Links de Referencia</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-black uppercase tracking-wider mb-1.5 opacity-80">Peligrosidad (SGA)</label>
                            <select id="filter-risk" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold">
                                <option value="" ${!f.risk ? 'selected' : ''}>-- Todos --</option>
                                <option value="corrosive" ${f.risk === 'corrosive' ? 'selected' : ''}>⚠️ Corrosivos</option>
                                <option value="toxic" ${f.risk === 'toxic' ? 'selected' : ''}>☠️ Tóxicos</option>
                                <option value="flammable" ${f.risk === 'flammable' ? 'selected' : ''}>🔥 Inflamables</option>
                                <option value="explosive" ${f.risk === 'explosive' ? 'selected' : ''}>💥 Explosivos</option>
                                <option value="oxidizing" ${f.risk === 'oxidizing' ? 'selected' : ''}>⭕🔥 Comburentes</option>
                                <option value="irritant" ${f.risk === 'irritant' ? 'selected' : ''}>❗ Irritantes</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-black uppercase tracking-wider mb-1.5 opacity-80">Ubicación</label>
                            <input id="filter-location" type="text" value="${f.location || ''}" placeholder="Ej. Estante 1..." class="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold">
                        </div>
                    </div>
                </div>
            </div>

            <div id="substances-data-container">
                <div class="py-12 text-center text-slate-400">Cargando sustancias químicas...</div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const fetchAndRender = async () => {
        window._triggerSubstancesFetch = fetchAndRender;
        const f = state.substancesFilters || {};

        const search = document.getElementById('search-substances')?.value || '';
        const physical_state = document.getElementById('filter-state')?.value || '';
        const location = document.getElementById('filter-location')?.value || '';
        const sortVal = document.getElementById('sort-substances')?.value || 'name_asc';
        const groupVal = document.getElementById('group-substances')?.value || '';
        const completenessVal = f.areFiltersActive ? (document.getElementById('filter-completeness')?.value || '') : '';
        const riskVal = f.areFiltersActive ? (document.getElementById('filter-risk')?.value || '') : '';
        const addedRecentVal = document.getElementById('filter-added-recent')?.value || f.added_recent || '';

        // Persistir en objeto de estado global
        if (!state.substancesFilters) state.substancesFilters = {};
        state.substancesFilters.search = search;
        state.substancesFilters.physical_state = physical_state;
        state.substancesFilters.location = location;
        state.substancesFilters.sort = sortVal;
        state.substancesFilters.group = groupVal;
        state.substancesFilters.completeness = completenessVal;
        state.substancesFilters.risk = riskVal;
        state.substancesFilters.added_recent = addedRecentVal;

        // Contador de Filtros Activos
        let activeCount = 0;
        if (sortVal && sortVal !== 'name_asc') activeCount++;
        if (groupVal) activeCount++;
        if (physical_state) activeCount++;
        if (completenessVal) activeCount++;
        if (riskVal) activeCount++;
        if (addedRecentVal) activeCount++;
        if (location && location.trim() !== '') activeCount++;

        const badge = document.getElementById('active-filters-badge');
        if (badge) {
            if (activeCount > 0) {
                badge.textContent = activeCount.toString();
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        const dataContainer = document.getElementById('substances-data-container');
        if (!dataContainer) return;

        const btnList = document.getElementById('btn-view-list');
        const btnGrid = document.getElementById('btn-view-grid');
        if (btnList && btnGrid) {
            if (state.substancesViewMode === 'list') {
                btnList.className = 'px-3.5 py-2.5 bg-brand-500 text-slate-900 transition flex items-center justify-center font-bold text-xs';
                btnGrid.className = 'px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 transition flex items-center justify-center font-bold text-xs';
            } else {
                btnGrid.className = 'px-3.5 py-2.5 bg-brand-500 text-slate-900 transition flex items-center justify-center font-bold text-xs';
                btnList.className = 'px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 transition flex items-center justify-center font-bold text-xs';
            }
        }

        try {
            const url = new URL('/api/substances', window.location.origin);
            if (search) url.searchParams.append('search', search);
            if (physical_state) url.searchParams.append('physical_state', physical_state);
            if (location) url.searchParams.append('location', location);
            if (addedRecentVal) url.searchParams.append('added_recent', addedRecentVal);

            const res = await fetch(url).then(r => r.json());
            let substancesList = res.data || [];

            if (addedRecentVal) {
                substancesList = substancesList.filter(s => matchesAddedRecentFilter(s, addedRecentVal));
            }

            const completeness = f.areFiltersActive ? (document.getElementById('filter-completeness')?.value || '') : '';
            if (completeness === 'incomplete') {
                substancesList = substancesList.filter(s => getMissingSubstanceFields(s).length > 0);
            } else if (completeness === 'missing_location') {
                substancesList = substancesList.filter(s => !s.location || !s.location.trim());
            } else if (completeness === 'missing_expiration') {
                substancesList = substancesList.filter(s => !s.expiration_date || !s.expiration_date.trim());
            } else if (completeness === 'missing_photo') {
                substancesList = substancesList.filter(s => !s.image_path || !s.image_path.trim());
            } else if (completeness === 'missing_formula') {
                substancesList = substancesList.filter(s => !s.chemical_formula || !s.chemical_formula.trim() || !s.cas_number || !s.cas_number.trim());
            } else if (completeness === 'missing_pdf') {
                substancesList = substancesList.filter(s => !s.pdf_path || !s.pdf_path.trim());
            } else if (completeness === 'missing_links') {
                substancesList = substancesList.filter(s => !s.external_links || !s.external_links.trim());
            }

            const risk = f.areFiltersActive ? (document.getElementById('filter-risk')?.value || '') : '';
            if (risk) {
                substancesList = substancesList.filter(s => {
                    const n = (s.name || '').toLowerCase();
                    const r = (s.risks_warnings || '').toLowerCase();
                    if (risk === 'corrosive') return n.includes('sulfúrico') || n.includes('clorhídrico') || n.includes('fórmico') || n.includes('fosfórico') || n.includes('propiónico') || n.includes('butírico') || n.includes('hidróxido') || n.includes('cal sodada') || r.includes('corrosiv') || r.includes('ghs05');
                    if (risk === 'toxic') return r.includes('tóxic') || r.includes('toxic') || r.includes('veneno') || r.includes('ghs06');
                    if (risk === 'flammable') return r.includes('inflamable') || r.includes('combustible') || r.includes('ghs02');
                    if (risk === 'explosive') return r.includes('explosiv') || r.includes('ghs01');
                    if (risk === 'oxidizing') return r.includes('comburente') || r.includes('oxidante') || r.includes('ghs03');
                    if (risk === 'irritant') return r.includes('irritan') || r.includes('nocivo') || r.includes('ghs07');
                    return true;
                });
            }

            const sortBy = document.getElementById('sort-substances')?.value || 'name_asc';
            substancesList.sort((a, b) => {
                if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'cas_asc') return (a.cas_number || '').localeCompare(b.cas_number || '', 'es', { numeric: true });
                if (sortBy === 'cas_desc') return (b.cas_number || '').localeCompare(a.cas_number || '', 'es', { numeric: true });
                if (sortBy === 'quantity_desc') return (b.quantity || 0) - (a.quantity || 0);
                if (sortBy === 'quantity_asc') return (a.quantity || 0) - (b.quantity || 0);
                if (sortBy === 'id_asc') return a.id - b.id;
                if (sortBy === 'id_desc') return b.id - a.id;
                return (a.name || '').localeCompare(b.name || '', 'es');
            });

            state.substances = substancesList;

            if (state.substances.length === 0) {
                const labelMap = {
                    'today': 'Agregados Hoy',
                    '7d': 'Últimos 7 días',
                    '30d': 'Últimos 30 días',
                    '90d': 'Últimos 90 días'
                };
                const filterText = labelMap[addedRecentVal] ? `con el filtro de fecha "${labelMap[addedRecentVal]}"` : 'con los filtros aplicados';
                dataContainer.innerHTML = `<div class="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-12 text-center text-slate-300 font-bold">No se encontraron sustancias químicas ${filterText}.</div>`;
                return;
            }

            const groupBy = document.getElementById('group-substances')?.value || '';

            if (groupBy) {
                const groups = {};
                state.substances.forEach(s => {
                    let key = 'Sin Clasificar';
                    if (groupBy === 'physical_state') key = s.physical_state || 'Sin Estado Físico';
                    else if (groupBy === 'location') key = s.location || 'Sin Ubicación';
                    else if (groupBy === 'substance_group') key = s.substance_group ? s.substance_group.split(/[,/;|]/)[0].trim() : 'Sin Grupo Químico';

                    if (!groups[key]) groups[key] = [];
                    groups[key].push(s);
                });

                let groupedHtml = '';
                for (const [groupTitle, groupItems] of Object.entries(groups)) {
                    groupedHtml += `
                        <div class="mb-8 space-y-4">
                            <div class="flex items-center gap-2 pb-2 border-b-2 border-slate-200">
                                <span class="text-sm font-extrabold text-slate-800 uppercase tracking-wide">${groupTitle}</span>
                                <span class="bg-brand-100 text-brand-800 text-2xs font-extrabold px-2.5 py-0.5 rounded-full">${groupItems.length} reactivos</span>
                            </div>
                            ${renderSubstancesBlock(groupItems, state.substancesViewMode)}
                        </div>
                    `;
                }
                dataContainer.innerHTML = groupedHtml;
            } else {
                dataContainer.innerHTML = renderSubstancesBlock(state.substances, state.substancesViewMode);
            }

            if (window.lucide) window.lucide.createIcons();

            // Restaurar posición del Scroll si se regresa de una ficha detallada
            const savedScroll = sessionStorage.getItem('substances_scroll_y');
            if (savedScroll) {
                setTimeout(() => {
                    window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
                }, 60);
            }
        } catch (err) {
            console.error("Error al cargar sustancias:", err);
            dataContainer.innerHTML = `<div class="bg-white border rounded-3xl p-12 text-center text-red-500 font-bold">Error al cargar datos: ${err.message}</div>`;
        }
    };

    let debounceTimer = null;
    const debouncedFetch = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchAndRender();
        }, 200);
    };

    const searchInput = document.getElementById('search-substances');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            debouncedFetch();
        });
    }

    const locInput = document.getElementById('filter-location');
    if (locInput) {
        locInput.addEventListener('input', (e) => {
            debouncedFetch();
        });
    }

    document.getElementById('sort-substances')?.addEventListener('change', fetchAndRender);
    document.getElementById('group-substances')?.addEventListener('change', fetchAndRender);
    document.getElementById('filter-state')?.addEventListener('change', fetchAndRender);
    document.getElementById('filter-completeness')?.addEventListener('change', fetchAndRender);
    document.getElementById('filter-risk')?.addEventListener('change', fetchAndRender);
    document.getElementById('filter-location')?.addEventListener('input', fetchAndRender);
    document.getElementById('filter-added-recent')?.addEventListener('change', fetchAndRender);

    fetchAndRender();
}

function getSubstanceMainImage(s) {
    if (s.image_path && s.image_path.trim()) return s.image_path.trim();
    if (s.presentation_images) {
        try {
            const imgs = typeof s.presentation_images === 'string' ? JSON.parse(s.presentation_images) : s.presentation_images;
            if (Array.isArray(imgs) && imgs.length > 0 && imgs[0].image_path) {
                return imgs[0].image_path.trim();
            }
        } catch(e) {}
    }
    return '';
}

function renderSubstancesBlock(items, mode) {
    const f = state.substancesFilters || {};
    if (mode === 'list') {
        return `
            <div class="glass-table-container">
                <div class="overflow-x-auto no-scrollbar">
                    <table class="glass-table w-full text-left text-xs sm:text-sm">
                        <thead>
                            <tr>
                                <th class="py-4 px-4 text-center w-12">#</th>
                                <th class="py-4 px-6">Sustancia</th>
                                <th class="py-4 px-6">Grupo SGA</th>
                                <th class="py-4 px-6">Fórmula / CAS</th>
                                <th class="py-4 px-6">Ubicación Estante</th>
                                <th class="py-4 px-6">Estado Físico</th>
                                <th class="py-4 px-6">Cantidad</th>
                                <th class="py-4 px-6">Caducidad</th>
                                <th class="py-4 px-6 no-print text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5 font-medium">
                            ${items.map((s, idx) => {
                                const today = new Date();
                                const cardImage = getSubstanceMainImage(s);
                                let expBadge = `<span class="text-slate-300 font-semibold">${s.expiration_date || 'N/D'}</span>`;
                                if (s.expiration_date === 'Sin caducidad' || s.expiration_date === 'No aplica') {
                                    expBadge = `<span class="bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-lg text-3xs font-extrabold uppercase shrink-0">Sin Caducidad</span>`;
                                } else if (s.expiration_date) {
                                    const exp = new Date(s.expiration_date);
                                    if (!isNaN(exp)) {
                                        const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                                        if (diff < 0) {
                                            expBadge = `<span class="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-lg text-3xs font-extrabold uppercase shrink-0">Caducado</span>`;
                                        } else if (diff <= 30) {
                                            expBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg text-3xs font-extrabold uppercase shrink-0">Por caducar</span>`;
                                        }
                                    }
                                }

                                const missingFields = getMissingSubstanceFields(s);
                                const missingBadge = (missingFields.length > 0 && f.areFiltersActive) ? `
                                    <div class="mt-1 flex flex-wrap gap-1">
                                        <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-3xs font-black flex items-center gap-1">
                                            <span>⚠️ Falta: ${missingFields.join(', ')}</span>
                                        </span>
                                    </div>
                                ` : '';

                                const stateColor = s.physical_state === 'Líquido' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : (s.physical_state === 'Sólido' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40');

                                return `
                                    <tr class="hover:bg-white/5 transition">
                                        <td class="py-4 px-4 text-center">
                                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-white/5 text-slate-300 font-black text-xs font-mono border border-white/10 shadow-2xs">${idx + 1}</span>
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="flex items-center gap-3">
                                                <div class="w-11 h-11 rounded-xl bg-slate-900/80 flex items-center justify-center text-slate-400 overflow-hidden border border-white/10 shrink-0 shadow-sm ${cardImage ? 'cursor-pointer hover:border-teal-400 transition' : ''}" ${cardImage ? `onclick="openImageViewer('${cardImage}', '${(s.name || '').replace(/'/g, "\\'")}')" title="Haz clic para ver foto en tamaño completo"` : ''}>
                                                    ${cardImage ? `<img src="${cardImage}" class="w-full h-full object-cover">` : `<i data-lucide="flask-conical" class="w-5 h-5 text-teal-400"></i>`}
                                                </div>
                                                <div>
                                                    <a href="#/substances/${s.id}" class="text-xs sm:text-sm font-black text-white hover:text-teal-400 transition block">${s.name}</a>
                                                    <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span class="text-3xs text-teal-300/80 uppercase tracking-wider font-mono font-bold">LAB-SUB-${s.id}</span>
                                                        ${getAddedDateFormatted(s) ? `<span class="text-3xs font-extrabold ${isRecentlyAdded(s, 7) ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30' : 'text-slate-400 bg-white/5 border border-white/10'} px-2 py-0.5 rounded-lg inline-flex items-center gap-1">🗓️ Agregado: ${getAddedDateFormatted(s)}</span>` : ''}
                                                    </div>
                                                    ${missingBadge}
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-4 px-6 flex flex-wrap gap-1">
                                            ${buildGroupBadgesHtml(s.substance_group, s.risks_warnings) || '<span class="text-xs text-slate-400">Sin grupo</span>'}
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="text-xs sm:text-sm text-white font-bold">${formatChemicalFormulaHtml(s.chemical_formula) || '-'}</div>
                                            <div class="text-3xs text-slate-400 font-semibold font-mono">CAS: ${s.cas_number || '-'}</div>
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="flex flex-col gap-1 items-start">
                                                <span class="text-3xs font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl inline-block max-w-[180px] truncate" title="${s.location || 'No asignada'}">
                                                    📍 ${s.location || 'No asignada'}
                                                </span>
                                            </div>
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="flex flex-col gap-1 items-start">
                                                <span class="px-2.5 py-1 rounded-xl text-3xs font-black uppercase tracking-wider ${stateColor}">${s.physical_state || 'N/D'}</span>
                                            </div>
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="text-xs sm:text-sm font-black text-white">${s.quantity} <span class="text-xs font-semibold text-slate-400">${s.unit}</span></div>
                                            ${s.container_content ? `<div class="text-3xs text-slate-400 font-bold">Contenido: ${s.container_content}</div>` : ''}
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="flex flex-col gap-1 items-start">
                                                ${expBadge}
                                                <span class="text-3xs text-slate-400 font-medium">${s.expiration_date || ''}</span>
                                            </div>
                                        </td>
                                        <td class="py-4 px-6 no-print text-right">
                                            <div class="flex items-center justify-end gap-1.5">
                                                <a href="#/substances/${s.id}" class="glass-btn px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer" title="Ver Detalle y Editar">
                                                    <i data-lucide="eye" class="w-3.5 h-3.5 text-teal-400"></i>
                                                    <span>Ver</span>
                                                </a>
                                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                                    <button onclick="deleteItem('substances', ${s.id})" class="p-1.5 glass-btn rounded-xl text-rose-400 hover:text-rose-300 hover:border-rose-500/50 transition cursor-pointer" title="Eliminar">
                                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                ${items.map(s => {
                    const today = new Date();
                    let expBadge = '';
                    if (s.expiration_date === 'Sin caducidad' || s.expiration_date === 'No aplica') {
                        expBadge = `<span class="absolute top-3 left-3 bg-sky-500 text-white font-black text-3xs uppercase tracking-wider px-3 py-1 rounded-xl shadow-lg border border-sky-300 z-10">Sin Caducidad</span>`;
                    } else if (s.expiration_date) {
                        const exp = new Date(s.expiration_date);
                        if (!isNaN(exp)) {
                            const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                            if (diff < 0) {
                                expBadge = `<span class="absolute top-3 left-3 bg-rose-600 text-white text-3xs font-extrabold uppercase px-2.5 py-1 rounded-xl shadow-md z-10">Caducado</span>`;
                            } else if (diff <= 30) {
                                expBadge = `<span class="absolute top-3 left-3 bg-amber-500 text-white text-3xs font-extrabold uppercase px-2.5 py-1 rounded-xl shadow-md z-10">Por Caducar</span>`;
                            }
                        }
                    }

                    const cardImage = getSubstanceMainImage(s);
                    let groupBadgeHtml = buildGroupBadgesHtml(s.substance_group, s.risks_warnings);
                    let presBadge = '';
                    if (s.presentation_images) {
                        try {
                            const imgs = typeof s.presentation_images === 'string' ? JSON.parse(s.presentation_images) : s.presentation_images;
                            if (Array.isArray(imgs) && imgs.length > 0) {
                                presBadge = `<span class="substance-photo-badge absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm text-white text-3xs font-black px-2.5 py-1 rounded-xl border border-slate-700 z-10 flex items-center gap-1 shadow-sm"><i data-lucide="image" class="w-3 h-3 text-cyan-400"></i> ${imgs.length + (s.image_path ? 1 : 0)} fotos</span>`;
                            }
                        } catch(e) {}
                    }

                    return `
                        <div class="glass-card border border-white/10 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition duration-300 flex flex-col group relative">
                            <div class="relative w-full aspect-square bg-slate-900/30 border-b border-white/10 flex items-center justify-center text-slate-300 overflow-hidden shrink-0 group/img ${cardImage ? 'cursor-pointer' : ''}" ${cardImage ? `onclick="openImageViewer('${cardImage}', '${(s.name || '').replace(/'/g, "\\'")}')"` : ''}>
                                ${expBadge}
                                ${presBadge}
                                ${cardImage ? `
                                    <img src="${cardImage}" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover/img:scale-105 transition duration-500">
                                    <div class="substance-img-overlay absolute inset-0 opacity-0 group-hover/img:opacity-100 transition duration-300 flex items-center justify-center text-xs font-black gap-1.5 backdrop-blur-[3px]">
                                        <i data-lucide="maximize-2" class="w-4 h-4 text-teal-400"></i>
                                        <span>Ver Foto Completa</span>
                                    </div>
                                ` : `
                                    <i data-lucide="flask-conical" class="w-12 h-12 text-slate-500"></i>
                                `}
                                <div class="substance-container-badge absolute bottom-3 left-3 right-3 glass-modal backdrop-blur-md text-xs rounded-2xl p-2.5 flex justify-center items-center shadow-xl border border-white/10 z-10">
                                    <span class="font-black flex items-center gap-1.5">
                                        <i data-lucide="scale" class="w-4 h-4 text-teal-400"></i>
                                        <span>${s.container_content || (s.quantity + ' ' + (s.unit || ''))}</span>
                                    </span>
                                </div>
                            </div>

                            <div class="p-5 flex-1 flex flex-col justify-between gap-4">
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between gap-2 flex-wrap">
                                        <span class="substance-id-code text-xs font-mono font-black uppercase tracking-wider text-amber-400">LAB-SUB-${s.id}</span>
                                    </div>
                                    <div class="flex flex-wrap gap-1.5">
                                        ${groupBadgeHtml}
                                    </div>
                                    <h4 class="font-black text-white text-base leading-snug line-clamp-2 hover:text-cyan-300 transition cursor-pointer" title="${s.name}">${s.name}</h4>

                                    <div class="text-xs space-y-2 pt-3 border-t border-slate-800">
                                        <div class="flex justify-between items-center"><span class="font-extrabold text-white">Fórmula:</span><span class="font-bold text-slate-100 truncate max-w-[140px]" title="${s.chemical_formula || ''}">${formatChemicalFormulaHtml(s.chemical_formula)}</span></div>
                                        <div class="flex justify-between items-center"><span class="font-extrabold text-white">CAS:</span><span class="font-bold text-slate-100">${s.cas_number || '-'}</span></div>
                                        <div class="flex justify-between items-center"><span class="font-extrabold text-white">Estado:</span><span class="font-black text-emerald-400">${s.physical_state || 'N/D'}</span></div>
                                        <div class="flex justify-between items-center"><span class="font-extrabold text-white">Ubicación:</span><span class="font-extrabold text-amber-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-amber-400/50 text-3xs truncate max-w-[130px]" title="${s.location || 'No asignada'}">📍 ${s.location || 'No asignada'}</span></div>
                                        <div class="flex justify-between items-center"><span class="font-extrabold text-white">Total Stock:</span><span class="font-black text-white">${s.quantity} ${s.unit}</span></div>
                                        <div class="flex justify-between items-center"><span class="font-extrabold text-white">Fecha Agregado:</span><span class="font-black ${isRecentlyAdded(s, 7) ? 'text-emerald-400 font-extrabold bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-lg' : 'text-slate-300'} text-3xs">🗓️ ${getAddedDateFormatted(s) || 'N/D'}</span></div>
                                        ${(() => {
                                            if (!f.areFiltersActive) return '';
                                            const missing = getMissingSubstanceFields(s);
                                            return missing.length > 0 ? `
                                                <div class="pt-2 border-t border-slate-800">
                                                    <span class="bg-slate-950 text-rose-300 border border-rose-400 px-2.5 py-1 rounded-xl text-3xs font-extrabold block truncate" title="Faltan datos: ${missing.join(', ')}">
                                                        ⚠️ Falta: ${missing.join(', ')}
                                                    </span>
                                                </div>
                                            ` : '';
                                        })()}
                                    </div>
                                </div>

                                <div class="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                                    <a href="#/substances/${s.id}" class="p-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition shadow-md flex items-center gap-1.5 text-xs font-extrabold" title="Ver Detalle y Editar">
                                        <i data-lucide="eye" class="w-4 h-4 text-emerald-400"></i>
                                        <span>Ver Detalle</span>
                                    </a>
                                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                        <button onclick="deleteItem('substances', ${s.id})" class="p-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl transition" title="Eliminar">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
}

async function openSubstanceLoanModal(substanceId) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para solicitar un préstamo.");
        return;
    }

    let modalEl = document.getElementById('modal-request-substance-loan');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'modal-request-substance-loan';
        modalEl.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4';
        document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in relative border border-slate-200">
            <div class="flex justify-between items-start border-b pb-4 border-slate-100">
                <div>
                    <span class="bg-amber-100 text-amber-800 text-3xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        🤝 Préstamo de Sustancia
                    </span>
                    <h3 class="text-xl font-bold text-slate-900 mt-1">Solicitar Préstamo de Sustancia</h3>
                </div>
                <button onclick="closeSubstanceLoanModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div id="substance-loan-modal-content" class="py-6 text-center text-slate-400">
                <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2"></i>
                <span>Cargando información de la sustancia...</span>
            </div>
        </div>
    `;

    modalEl.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();

    try {
        const [subRes, usersRes] = await Promise.all([
            fetch(`/api/substances/${substanceId}`).then(r => r.json()),
            fetch('/api/loans/registered-users').then(r => r.json())
        ]);

        if (subRes.status === 'error') {
            document.getElementById('substance-loan-modal-content').innerHTML = `
                <div class="text-red-500 font-bold p-4">${subRes.message}</div>
            `;
            return;
        }

        const substance = subRes.data;
        const users = usersRes.data || [];
        const availableStockUnits = (substance.stock_units !== null && substance.stock_units !== undefined && substance.stock_units > 0) ? substance.stock_units : Math.floor(substance.quantity || 1);

        const userOptions = users.map(u => {
            const isSelected = (u.username === state.user) ? 'selected' : '';
            return `<option value="${u.id}" data-name="${u.username}" data-role="${u.role}" ${isSelected}>${u.username} (${u.role})</option>`;
        }).join('');

        const contentDiv = document.getElementById('substance-loan-modal-content');
        contentDiv.innerHTML = `
            <form onsubmit="event.preventDefault(); submitSubstanceLoanRequest(${substance.id});" class="space-y-4 text-left">
                <div class="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-1 text-xs">
                    <div class="flex justify-between items-center">
                        <span class="font-extrabold text-amber-900 text-sm">${substance.name}</span>
                        <span class="text-3xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md font-bold">Stock: ${availableStockUnits} unidades</span>
                    </div>
                    ${substance.chemical_formula ? `<p class="text-amber-800 font-medium">Fórmula: <strong>${substance.chemical_formula}</strong></p>` : ''}
                    ${substance.location ? `<p class="text-amber-800 font-medium">Ubicación: <strong>${substance.location}</strong></p>` : ''}
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-2xs text-amber-800 font-medium flex items-center gap-2">
                    <i data-lucide="clock" class="w-4 h-4 text-amber-600 shrink-0"></i>
                    <span>La solicitud quedará en estado <strong>Pendiente de Aprobación por Administrador</strong>. El conteo de tiempo iniciará cuando el Administrador apruebe el préstamo.</span>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Unidades a Solicitar (Stock Disponible: ${availableStockUnits}) *</label>
                    <div class="flex gap-2">
                        <input type="number" id="substance-loan-qty" min="1" max="${availableStockUnits}" value="1" step="1" required
                            class="flex-1 bg-slate-50 border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition">
                        <span class="bg-slate-100 border border-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 flex items-center shrink-0">
                            unidades
                        </span>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Responsable Solicitante *</label>
                    <input type="hidden" id="substance-loan-user-name" value="${state.user || 'Responsable'}">
                    <div class="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2">
                        <i data-lucide="user-check" class="w-4 h-4 text-emerald-600 shrink-0"></i>
                        <span>${state.user || 'Responsable'} (Sesión Iniciada)</span>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Solicitante</label>
                    <input type="hidden" id="substance-loan-user-type" value="Responsable">
                    <div class="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                        Responsable de Laboratorio
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Motivo / Observaciones del Préstamo</label>
                    <textarea id="substance-loan-notes" rows="3" placeholder="Ej. Práctica #2 de Laboratorio de Química Orgánica..."
                        class="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"></textarea>
                </div>

                <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button type="button" onclick="closeSubstanceLoanModal()"
                        class="px-4 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition">
                        Cancelar
                    </button>
                    <button type="submit" id="btn-submit-substance-loan"
                        class="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition">
                        <i data-lucide="send" class="w-4 h-4"></i>
                        <span>Enviar Solicitud</span>
                    </button>
                </div>
            </form>
        `;

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        document.getElementById('substance-loan-modal-content').innerHTML = `
            <div class="text-red-500 font-bold p-4">Error al cargar la información: ${err.message}</div>
        `;
    }
}

function closeSubstanceLoanModal() {
    const modalEl = document.getElementById('modal-request-substance-loan');
    if (modalEl) modalEl.classList.add('hidden');
}

async function submitSubstanceLoanRequest(substanceId) {
    const btn = document.getElementById('btn-submit-substance-loan');
    if (btn) btn.disabled = true;

    const qtyInput = document.getElementById('substance-loan-qty');
    const notesInput = document.getElementById('substance-loan-notes');

    const qty = parseInt(qtyInput?.value || '1', 10);
    if (isNaN(qty) || qty <= 0) {
        alert("Por favor ingrese un número entero de unidades mayor a 0.");
        if (btn) btn.disabled = false;
        return;
    }

    const borrowerName = state.user || 'Responsable';
    const borrowerType = 'Responsable';
    const notes = notesInput ? notesInput.value.trim() : '';

    try {
        const subRes = await fetch(`/api/substances/${substanceId}`).then(r => r.json());
        const substance = subRes.data || {};
        const availableStockUnits = (substance.stock_units !== null && substance.stock_units !== undefined && substance.stock_units > 0) ? substance.stock_units : Math.max(1, Math.floor(substance.quantity || 1));

        if (qty > availableStockUnits) {
            alert(`La cantidad solicitada (${qty} unidades) excede el stock disponible (${availableStockUnits} unidades).`);
            if (btn) btn.disabled = false;
            return;
        }

        const res = await fetch('/api/loans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                borrower_name: borrowerName,
                borrower_user_id: parseInt(borrowerUserId),
                borrower_type: borrowerType,
                items_list: [
                    {
                        id: substance.id || substanceId,
                        name: substance.name || 'Sustancia',
                        type: 'substance',
                        quantity: qty,
                        unit: substance.unit || 'g',
                        location: substance.location || '',
                        chemical_formula: substance.chemical_formula || ''
                    }
                ],
                notes: notes
            })
        });

        const data = await res.json();
        if (data.status === 'success') {
            closeSubstanceLoanModal();
            alert("✅ Solicitud de préstamo registrada exitosamente. Se ha enviado una notificación por correo a los administradores.");
            
            if (window._triggerSubstancesFetch) window._triggerSubstancesFetch();
            if (typeof loadLoansData === 'function') loadLoansData();
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error al enviar la solicitud de préstamo: " + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

// --- MÓDULO DE IMPRESIÓN Y DESCARGA MASIVA DE CÓDIGOS QR (SOLO ADMINISTRADOR) ---
let qrBatchModalState = {
    filterType: 'all', // 'all' | 'liquid' | 'solid' | 'gas'
    searchTerm: '',
    selectedIds: new Set(),
    itemCopies: {} // { [substanceId]: number }
};


window.openQRBatchModal = async function(entityType = 'substances') {
    if (!state.isLoggedIn || state.userRole !== 'admin') {
        alert('Esta función de impresión masiva de códigos QR está reservada exclusivamente para Administradores.');
        return;
    }

    qrBatchModalState.entityType = entityType;

    if (entityType === 'chemical_materials') {
        if (!state.chemMaterials || state.chemMaterials.length === 0) {
            try {
                const res = await fetch('/api/chemical-materials').then(r => r.json());
                state.chemMaterials = res.data || [];
            } catch (e) {
                console.warn('Error al precargar materiales químicos para modal QR:', e);
            }
        }
        state.currentQRItems = state.chemMaterials || [];
    } else if (entityType === 'didactic_materials') {
        if (!state.didacticMaterials || state.didacticMaterials.length === 0) {
            try {
                const res = await fetch('/api/didactic-materials').then(r => r.json());
                state.didacticMaterials = res.data || [];
            } catch (e) {
                console.warn('Error al precargar materiales didácticos para modal QR:', e);
            }
        }
        state.currentQRItems = state.didacticMaterials || [];
    } else {
        if (!state.substances || state.substances.length === 0) {
            try {
                const res = await fetch('/api/substances').then(r => r.json());
                state.substances = res.data || [];
            } catch (e) {
                console.warn('Error al precargar sustancias para modal QR:', e);
            }
        }
        state.currentQRItems = state.substances || [];
    }

    const items = state.currentQRItems || [];
    qrBatchModalState.selectedIds = new Set(items.map(s => s.id));
    qrBatchModalState.searchTerm = '';
    qrBatchModalState.filterType = 'all';
    qrBatchModalState.dateFilter = 'all';
    qrBatchModalState.itemCopies = {};
    items.forEach(s => {
        qrBatchModalState.itemCopies[s.id] = 1;
    });

    renderQRBatchModalDOM();
};

window.closeQRBatchModal = function() {
    const modalEl = document.getElementById('qr-batch-modal');
    if (modalEl) modalEl.remove();
};

window.setQRFilter = function(filterType) {
    qrBatchModalState.filterType = filterType;
    const filtered = getFilteredQRSubstances();
    qrBatchModalState.selectedIds = new Set(filtered.map(s => s.id));
    renderQRBatchModalDOM();
};

window.setQRDateFilter = function(dateFilter) {
    qrBatchModalState.dateFilter = dateFilter;
    const filtered = getFilteredQRSubstances();
    qrBatchModalState.selectedIds = new Set(filtered.map(s => s.id));
    renderQRBatchModalDOM();
};

window.handleQRSearchInput = function(val) {
    qrBatchModalState.searchTerm = val || '';
    renderQRBatchModalDOM();
};

window.selectAllQRItems = function(selectVal) {
    const substances = getFilteredQRSubstances();
    if (selectVal) {
        substances.forEach(s => qrBatchModalState.selectedIds.add(s.id));
    } else {
        substances.forEach(s => qrBatchModalState.selectedIds.delete(s.id));
    }
    renderQRBatchModalDOM();
};

window.toggleQRItemSelection = function(id) {
    if (qrBatchModalState.selectedIds.has(id)) {
        qrBatchModalState.selectedIds.delete(id);
    } else {
        qrBatchModalState.selectedIds.add(id);
    }
    renderQRBatchModalDOM();
};

window.changeQRCopies = function(id, delta) {
    if (!qrBatchModalState.itemCopies) qrBatchModalState.itemCopies = {};
    const current = qrBatchModalState.itemCopies[id] || 1;
    const next = Math.max(1, Math.min(99, current + delta));
    qrBatchModalState.itemCopies[id] = next;
    if (!qrBatchModalState.selectedIds.has(id) && delta > 0) {
        qrBatchModalState.selectedIds.add(id);
    }
    renderQRBatchModalDOM();
};

window.setQRCopies = function(id, val) {
    if (!qrBatchModalState.itemCopies) qrBatchModalState.itemCopies = {};
    const parsed = parseInt(val, 10);
    const next = isNaN(parsed) || parsed < 1 ? 1 : Math.min(99, parsed);
    qrBatchModalState.itemCopies[id] = next;
    renderQRBatchModalDOM();
};

function getFilteredQRSubstances() {
    const substances = state.currentQRItems || state.substances || [];
    const term = (qrBatchModalState.searchTerm || '').toLowerCase().trim();
    const type = qrBatchModalState.filterType;
    const dateFilter = qrBatchModalState.dateFilter || 'all';

    return substances.filter(s => {
        if (type === 'liquid' && !(s.physical_state || '').includes('Líquido')) return false;
        if (type === 'solid' && !(s.physical_state || '').includes('Sólido')) return false;
        if (type === 'gas' && !(s.physical_state || '').includes('Gaseoso')) return false;

        if (dateFilter && dateFilter !== 'all' && !matchesAddedRecentFilter(s, dateFilter)) return false;

        if (term) {
            const matchName = (s.name || '').toLowerCase().includes(term);
            const matchCas = (s.cas_number || s.inventory_number || s.no_sep || '').toLowerCase().includes(term);
            const matchFormula = (s.chemical_formula || s.capacity || s.category || '').toLowerCase().includes(term);
            const idStr = (s.id || '').toString();
            const matchId = idStr === term || (idStr.includes(term.replace(/[^0-9]/g, '')) && term.replace(/[^0-9]/g, '').length > 0);
            return matchName || matchCas || matchFormula || matchId;
        }
        return true;
    });
}

function renderQRBatchModalDOM() {
    let existingModal = document.getElementById('qr-batch-modal');
    if (!existingModal) {
        existingModal = document.createElement('div');
        existingModal.id = 'qr-batch-modal';
        document.body.appendChild(existingModal);
    }

    // Guardar estado del foco antes de reescribir el DOM
    const activeId = document.activeElement ? document.activeElement.id : null;
    let cursorPosition = null;
    if (activeId === 'qr-modal-search' && document.activeElement.selectionStart !== undefined) {
        cursorPosition = document.activeElement.selectionStart;
    }

    const allSubstances = state.currentQRItems || state.substances || [];
    const liquidsCount = allSubstances.filter(s => (s.physical_state || '').includes('Líquido')).length;
    const solidsCount = allSubstances.filter(s => (s.physical_state || '').includes('Sólido')).length;

    const items = getFilteredQRSubstances();
    const selectedSubstances = allSubstances.filter(s => qrBatchModalState.selectedIds.has(s.id));
    const selectedCount = selectedSubstances.length;

    let totalQRLabels = 0;
    selectedSubstances.forEach(s => {
        const copies = (qrBatchModalState.itemCopies && qrBatchModalState.itemCopies[s.id]) || 1;
        totalQRLabels += copies;
    });

    const listHtml = items.length === 0 ? `
        <div class="py-12 text-center text-slate-400 font-semibold bg-[#111a2d] rounded-2xl border border-slate-800/80">
            <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60"></i>
            <span>No se encontraron reactivos con el filtro o búsqueda actual.</span>
        </div>
    ` : items.map(s => {
        const isChecked = qrBatchModalState.selectedIds.has(s.id);
        const copies = (qrBatchModalState.itemCopies && qrBatchModalState.itemCopies[s.id]) || 1;

        const stateBadgeClass = s.physical_state === 'Líquido' 
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
            : (s.physical_state === 'Sólido' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30');

        const cardStyle = isChecked 
            ? 'bg-teal-950/30 border-2 border-teal-400/80 shadow-md shadow-teal-950/40 text-slate-100' 
            : 'bg-[#121b2d] border border-slate-800/80 hover:border-slate-700 text-slate-300';

        return `
            <div class="p-3 rounded-xl transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${cardStyle}">
                <label class="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0 w-full sm:w-auto">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleQRItemSelection(${s.id})" class="w-5 h-5 rounded-md border-slate-700 bg-slate-900 text-teal-400 focus:ring-teal-500 focus:ring-offset-slate-900 shrink-0 cursor-pointer">
                    ${s.qr_path ? `
                        <img src="${s.qr_path}" class="w-11 h-11 rounded-lg border border-slate-700 bg-white object-contain p-0.5 shrink-0 shadow-sm">
                    ` : `
                        <div class="w-11 h-11 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                            <i data-lucide="qr-code" class="w-5 h-5 text-slate-500"></i>
                        </div>
                    `}
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-extrabold text-white text-sm truncate">${s.name}</span>
                            <span class="text-3xs font-mono px-2.5 py-0.5 rounded-full font-bold ${stateBadgeClass}">${s.physical_state || 'Genérico'}</span>
                            ${s.substance_group ? `<span class="text-3xs font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60">🏷️ ${s.substance_group}</span>` : ''}
                        </div>
                        <div class="text-xs text-slate-400 flex items-center gap-3 mt-1 flex-wrap font-medium">
                            <span>Fórmula: <strong class="text-slate-200 font-semibold">${s.chemical_formula || '-'}</strong></span>
                            <span>CAS: <strong class="text-slate-200 font-semibold">${s.cas_number || '-'}</strong></span>
                            <span>Stock: <strong class="text-teal-400 font-bold">${s.container_content || `${s.quantity} ${s.unit}`}</strong></span>
                            ${getAddedDateFormatted(s) ? `<span class="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">🗓️ Reg: ${getAddedDateFormatted(s)}</span>` : ''}
                            <span class="text-3xs font-mono text-slate-500">LAB-SUB-${s.id}</span>
                        </div>
                    </div>
                </label>

                <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
                    <!-- Selector de Número de Copias por QR -->
                    <div class="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl p-1 shrink-0" title="Número de impresiones/etiquetas para esta sustancia">
                        <button type="button" onclick="changeQRCopies(${s.id}, -1)" class="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs transition select-none">-</button>
                        <input type="number" min="1" max="99" value="${copies}" onchange="setQRCopies(${s.id}, this.value)" class="w-8 text-center bg-transparent font-extrabold text-xs text-teal-300 outline-none">
                        <button type="button" onclick="changeQRCopies(${s.id}, 1)" class="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs transition select-none">+</button>
                        <span class="text-3xs text-slate-400 font-bold pr-1 select-none">copia(s)</span>
                    </div>

                    ${s.qr_path ? `
                        <button type="button" onclick="downloadSingleSubstanceQRPDF(${s.id})" class="px-3 py-1.5 bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 hover:border-teal-500/60 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm" title="Descargar etiquetas QR de este elemento (${copies} copia/s)">
                            <i data-lucide="download" class="w-3.5 h-3.5 text-teal-400"></i>
                            <span>Descargar QR (${copies})</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    const itemsContainer = document.getElementById('qr-modal-items-list');
    const badgeContainer = document.getElementById('qr-selected-count-badge');

    if (itemsContainer && badgeContainer) {
        itemsContainer.innerHTML = listHtml;
        badgeContainer.textContent = selectedCount.toString();
        const totalBadge = document.getElementById('qr-total-labels-badge');
        if (totalBadge) totalBadge.textContent = totalQRLabels.toString();

        const downloadPdfBtn = document.getElementById('qr-download-pdf-btn');
        if (downloadPdfBtn) {
            downloadPdfBtn.innerHTML = `
                <i data-lucide="download" class="w-4 h-4 text-teal-200"></i>
                <span>Descargar PDF (${totalQRLabels} etiq.)</span>
            `;
            downloadPdfBtn.disabled = selectedCount === 0;
            downloadPdfBtn.className = `px-4.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-teal-950/50 transition flex items-center gap-2 ${selectedCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}`;
        }

        const printBtn = document.getElementById('qr-print-btn');
        if (printBtn) {
            printBtn.innerHTML = `
                <i data-lucide="printer" class="w-4 h-4 text-cyan-200"></i>
                <span>Imprimir Planilla (${totalQRLabels} etiq.)</span>
            `;
            printBtn.disabled = selectedCount === 0;
            printBtn.className = `px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-950/50 transition flex items-center gap-2 ${selectedCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}`;
        }

        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const titleText = qrBatchModalState.entityType === 'chemical_materials' 
        ? 'Impresión y Descarga Masiva - Materiales Químicos' 
        : (qrBatchModalState.entityType === 'didactic_materials' ? 'Impresión y Descarga Masiva - Materiales Didácticos' : 'Impresión y Descarga Masiva de Códigos QR');

    existingModal.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in no-print';
    existingModal.innerHTML = `
        <div class="bg-[#0d1527] rounded-3xl border border-slate-800 shadow-2xl shadow-cyan-950/50 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 font-sans">
            <!-- Header Modal -->
            <div class="px-6 py-4 bg-[#090d16] border-b border-slate-800 text-white flex items-center justify-between shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-lg shadow-inner">
                        <i data-lucide="qr-code" class="w-5 h-5 text-teal-400"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-extrabold text-white tracking-wide">${titleText}</h3>
                        <p class="text-xs text-slate-400 font-medium">Define el número de copias/etiquetas a imprimir por cada elemento</p>
                    </div>
                </div>
                <button type="button" onclick="closeQRBatchModal()" class="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition font-bold text-sm border border-slate-700/50">✕</button>
            </div>

            <!-- Toolbar Filtros Rápidos -->
            <div class="p-4 bg-[#111a2e] border-b border-slate-800/80 flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">Filtro rápido:</span>
                    <button type="button" onclick="setQRFilter('liquid')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition border ${qrBatchModalState.filterType === 'liquid' ? 'bg-teal-600/30 text-teal-300 border-teal-500/50 shadow-sm shadow-teal-950' : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'}">
                        💧 Líquidos (${liquidsCount})
                    </button>
                    <button type="button" onclick="setQRFilter('solid')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition border ${qrBatchModalState.filterType === 'solid' ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-950' : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'}">
                        📦 Sólidos / Equipos (${solidsCount})
                    </button>
                    <button type="button" onclick="setQRFilter('all')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition border ${qrBatchModalState.filterType === 'all' ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-950' : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'}">
                        🧪 Todos (${allSubstances.length})
                    </button>

                    <div class="flex items-center gap-1.5 border-l border-slate-700/80 pl-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">📅 Fecha:</span>
                        <select id="qr-date-filter-select" onchange="setQRDateFilter(this.value)" class="bg-slate-900 border border-slate-700 text-teal-300 font-extrabold text-xs px-2.5 py-1 rounded-xl outline-none">
                            <option value="all" ${qrBatchModalState.dateFilter === 'all' ? 'selected' : ''}>-- Todas --</option>
                            <option value="today" ${qrBatchModalState.dateFilter === 'today' ? 'selected' : ''}>🆕 Agregados Hoy</option>
                            <option value="7d" ${qrBatchModalState.dateFilter === '7d' ? 'selected' : ''}>📅 Últimos 7 días</option>
                            <option value="30d" ${qrBatchModalState.dateFilter === '30d' ? 'selected' : ''}>📅 Últimos 30 días</option>
                            <option value="90d" ${qrBatchModalState.dateFilter === '90d' ? 'selected' : ''}>📅 Últimos 90 días</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <input id="qr-modal-search" type="text" value="${qrBatchModalState.searchTerm}" oninput="handleQRSearchInput(this.value)" placeholder="Buscar por nombre, código o ID..." class="bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 flex-1 min-w-[140px] md:w-52">
                    <button type="button" onclick="selectAllQRItems(true)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition shrink-0">☑️ Marcar Visibles</button>
                    <button type="button" onclick="selectAllQRItems(false)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition shrink-0">🎯 Desmarcar</button>
                </div>
            </div>

            <!-- Lista de Elementos Seleccionables -->
            <div id="qr-modal-items-list" class="p-4 overflow-y-auto flex-1 space-y-2 max-h-[52vh]">
                ${listHtml}
            </div>

            <!-- Footer con Acciones Masivas Dinámicas -->
            <div class="p-4 bg-[#090d16] border-t border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
                <div class="text-xs font-semibold text-slate-400">
                    Incluidos: <span id="qr-selected-count-badge" class="text-teal-400 font-extrabold text-sm px-1.5 py-0.5 rounded bg-teal-950/60 border border-teal-800/40">${selectedCount}</span> elementos | <span id="qr-total-labels-badge" class="text-cyan-400 font-extrabold text-sm px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">${totalQRLabels}</span> etiqueta(s) QR
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button id="qr-download-pdf-btn" type="button" onclick="downloadSelectedQRPDF()" class="px-4.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-teal-950/50 transition flex items-center gap-2 ${selectedCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}" ${selectedCount === 0 ? 'disabled' : ''}>
                        <i data-lucide="download" class="w-4 h-4 text-teal-200"></i>
                        <span>Descargar PDF (${totalQRLabels} etiq.)</span>
                    </button>
                    <button id="qr-print-btn" type="button" onclick="printSelectedQRSheetPDF()" class="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-950/50 transition flex items-center gap-2 ${selectedCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}" ${selectedCount === 0 ? 'disabled' : ''}>
                        <i data-lucide="printer" class="w-4 h-4 text-cyan-200"></i>
                        <span>Imprimir Planilla (${totalQRLabels} etiq.)</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    if (window.lucide) window.lucide.createIcons();

    // Restaurar foco si estaba en algún elemento (ej. buscador)
    if (activeId) {
        setTimeout(() => {
            const el = document.getElementById(activeId);
            if (el) {
                el.focus();
                if (cursorPosition !== null && el.setSelectionRange) {
                    el.setSelectionRange(cursorPosition, cursorPosition);
                }
            }
        }, 0);
    }
}

window.downloadSingleSubstanceQRPDF = async function(substanceId) {
    const allSubstances = state.currentQRItems || state.substances || [];
    const s = allSubstances.find(item => item.id === substanceId);
    if (!s) return;

    const copies = (qrBatchModalState.itemCopies && qrBatchModalState.itemCopies[s.id]) || 1;

    // Si es solo 1 copia y tiene qr_path, ofrecer descarga directa del archivo PNG
    if (copies === 1 && s.qr_path) {
        const link = document.createElement('a');
        link.href = s.qr_path;
        link.download = `qr_${s.name.replace(/ /g, '_')}_LAB-SUB-${s.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    // Si son múltiples copias (2, 3 o más), generar el documento PDF unificado de etiquetas repetidas
    const expandedLabels = [];
    for (let i = 0; i < copies; i++) {
        expandedLabels.push({ substance: s, copyIndex: i + 1, totalCopies: copies });
    }

    const fileName = `etiquetas_qr_${s.name.replace(/ /g, '_')}_LAB-SUB-${s.id}_(${copies}_copias).pdf`;

    const pdfContainer = document.createElement('div');
    pdfContainer.style.padding = '12px';
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.color = '#0f172a';
    pdfContainer.style.fontFamily = 'sans-serif';
    pdfContainer.style.width = '100%';
    pdfContainer.style.boxSizing = 'border-box';

    const headerHtml = `
        <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; background-color: #ffffff;">
            <h2 style="font-size: 15pt; font-weight: bold; margin: 0; color: #0f172a;">ETIQUETAS QR - ${s.name.toUpperCase()}</h2>
            <p style="font-size: 8.5pt; margin: 3px 0 0 0; color: #475569;">LAB-SUB-${s.id} | Copias a imprimir: ${copies} | Fecha: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}</p>
        </div>
    `;

    const labelGridHtml = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; box-sizing: border-box; background-color: #ffffff;">
            ${expandedLabels.map(item => `
                <div style="border: 1.5px dashed #475569; border-radius: 8px; padding: 8px; text-align: center; background-color: #ffffff; background: #ffffff; page-break-inside: avoid; break-inside: avoid; position: relative; box-sizing: border-box;">
                    <span style="position: absolute; top: 2px; right: 4px; font-size: 7pt; color: #94a3b8;">✂️</span>
                    
                    <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${s.name}</div>
                    
                    <div style="font-size: 8pt; font-weight: 700; color: #0284c7; margin-bottom: 3px;">${s.chemical_formula || ''} ${s.cas_number ? `| CAS: ${s.cas_number}` : ''}</div>
                    
                    ${s.qr_path ? `
                        <img src="${s.qr_path}" style="width: 100px; height: 100px; margin: 0 auto; display: block; object-fit: contain; background-color: #ffffff;">
                    ` : `
                        <div style="width: 100px; height: 100px; margin: 0 auto; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8.5pt; color: #999; background-color: #ffffff;">Sin QR</div>
                    `}
                    
                    <div style="font-size: 8.5pt; font-family: monospace; font-weight: bold; color: #1e293b; margin-top: 3px;">LAB-SUB-${s.id}</div>
                    <div style="font-size: 7.5pt; font-weight: bold; color: #15803d; margin-top: 1px;">
                        Stock: ${s.container_content || `${s.quantity} ${s.unit}`} ${item.totalCopies > 1 ? `<span style="color:#0284c7; font-weight:800;">[Envase/Copia ${item.copyIndex}/${item.totalCopies}]</span>` : ''}
                    </div>
                    ${getAddedDateFormatted(s) ? `<div style="font-size: 7pt; font-weight: bold; color: #047857; margin-top: 1px;">🗓️ Reg: ${getAddedDateFormatted(s)}</div>` : ''}
                    ${s.substance_group ? `<div style="font-size: 7pt; font-weight: bold; color: #64748b; margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px;">🏷️ ${s.substance_group}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;

    pdfContainer.innerHTML = headerHtml + labelGridHtml;

    if (window.html2pdf) {
        const opt = {
            margin:       [8, 8, 8, 8],
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };
        try {
            await window.html2pdf().set(opt).from(pdfContainer).save();
            return;
        } catch(e) {
            console.warn("Fallo html2pdf individual:", e);
        }
    }

    // Fallback nativo
    window.print();
};

window.downloadSelectedQRPDF = async function() {
    const allSubstances = state.currentQRItems || state.substances || [];
    const selectedSubstances = allSubstances.filter(s => qrBatchModalState.selectedIds.has(s.id));

    if (selectedSubstances.length === 0) {
        alert('No has seleccionado ningún elemento para incluir en el documento PDF.');
        return;
    }

    // Expandir copias según la cantidad seleccionada por el usuario para cada elemento
    const expandedLabels = [];
    selectedSubstances.forEach(s => {
        const copies = (qrBatchModalState.itemCopies && qrBatchModalState.itemCopies[s.id]) || 1;
        for (let i = 0; i < copies; i++) {
            expandedLabels.push({ substance: s, copyIndex: i + 1, totalCopies: copies });
        }
    });

    const fileSuffix = qrBatchModalState.filterType === 'liquid' ? 'liquidos' : (qrBatchModalState.filterType === 'solid' ? 'solidos' : 'todos');
    const fileName = `planilla_unica_etiquetas_qr_${fileSuffix}_${new Date().toISOString().slice(0,10)}.pdf`;

    // Crear contenedor HTML unificado para el documento PDF único con fondo 100% blanco
    const pdfContainer = document.createElement('div');
    pdfContainer.style.padding = '12px';
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.background = '#ffffff';
    pdfContainer.style.color = '#0f172a';
    pdfContainer.style.fontFamily = 'sans-serif';
    pdfContainer.style.width = '100%';
    pdfContainer.style.boxSizing = 'border-box';

    const headerHtml = `
        <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; background-color: #ffffff;">
            <h2 style="font-size: 15pt; font-weight: bold; margin: 0; color: #0f172a;">LABORATORIO DE QUÍMICA - PLANILLA UNIFICADA DE ETIQUETAS QR</h2>
            <p style="font-size: 8.5pt; margin: 3px 0 0 0; color: #475569;">Documento Único | Sustancias: ${selectedSubstances.length} | Etiquetas Totales: ${expandedLabels.length} | Fecha: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}</p>
        </div>
    `;

    const labelGridHtml = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; box-sizing: border-box; background-color: #ffffff;">
            ${expandedLabels.map(item => {
                const s = item.substance;
                return `
                    <div style="border: 1.5px dashed #475569; border-radius: 8px; padding: 8px; text-align: center; background-color: #ffffff; background: #ffffff; page-break-inside: avoid; break-inside: avoid; position: relative; box-sizing: border-box;">
                        <span style="position: absolute; top: 2px; right: 4px; font-size: 7pt; color: #94a3b8;">✂️</span>
                        
                        <!-- Nombre obligatorio de la sustancia -->
                        <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${s.name}</div>
                        
                        <div style="font-size: 8pt; font-weight: 700; color: #0284c7; margin-bottom: 3px;">${s.chemical_formula || ''} ${s.cas_number ? `| CAS: ${s.cas_number}` : ''}</div>
                        
                        ${s.qr_path ? `
                            <img src="${s.qr_path}" style="width: 100px; height: 100px; margin: 0 auto; display: block; object-fit: contain; background-color: #ffffff;">
                        ` : `
                            <div style="width: 100px; height: 100px; margin: 0 auto; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8.5pt; color: #999; background-color: #ffffff;">Sin QR</div>
                        `}
                        
                        <div style="font-size: 8.5pt; font-family: monospace; font-weight: bold; color: #1e293b; margin-top: 3px;">LAB-SUB-${s.id}</div>
                        <div style="font-size: 7.5pt; font-weight: bold; color: #15803d; margin-top: 1px;">
                            Stock: ${s.container_content || `${s.quantity} ${s.unit}`} ${item.totalCopies > 1 ? `<span style="color:#0284c7; font-weight:800;">[Envase/Copia ${item.copyIndex}/${item.totalCopies}]</span>` : ''}
                        </div>
                        ${getAddedDateFormatted(s) ? `<div style="font-size: 7pt; font-weight: bold; color: #047857; margin-top: 1px;">🗓️ Reg: ${getAddedDateFormatted(s)}</div>` : ''}
                        ${s.substance_group ? `<div style="font-size: 7pt; font-weight: bold; color: #64748b; margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px;">🏷️ ${s.substance_group}</div>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    pdfContainer.innerHTML = headerHtml + labelGridHtml;

    // Generar UN SOLO documento PDF con todas las páginas necesarias
    if (window.html2pdf) {
        const opt = {
            margin:       [8, 8, 8, 8],
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };
        try {
            await window.html2pdf().set(opt).from(pdfContainer).save();
            return;
        } catch(e) {
            console.warn("Fallo con html2pdf, recurriendo a impresión PDF nativa:", e);
        }
    }

    // Fallback nativo: Abre la ventana de impresión unificada para guardar como 1 archivo PDF
    printSelectedQRLabels();
};

window.printSelectedQRSheetPDF = function() {
    window.printSelectedQRLabels();
};

window.printSelectedQRLabels = function() {
    const allSubstances = state.currentQRItems || state.substances || [];
    let selectedSubstances = allSubstances.filter(s => qrBatchModalState.selectedIds.has(s.id));

    if (selectedSubstances.length === 0) {
        alert('No has seleccionado ningún elemento para imprimir su código QR.');
        return;
    }

    // Expandir copias segun la cantidad configurada para cada sustancia
    const expandedLabels = [];
    selectedSubstances.forEach(s => {
        const copies = (qrBatchModalState.itemCopies && qrBatchModalState.itemCopies[s.id]) || 1;
        for (let i = 0; i < copies; i++) {
            expandedLabels.push({ substance: s, copyIndex: i + 1, totalCopies: copies });
        }
    });

    let printArea = document.getElementById('qr-print-area');
    if (!printArea) {
        printArea = document.createElement('div');
        printArea.id = 'qr-print-area';
        document.body.appendChild(printArea);
    }

    const printHeaderHtml = `
        <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; background-color: #ffffff;" class="no-print">
            <h2 style="font-size: 16pt; font-weight: bold; margin: 0; color: #0f172a;">LABORATORIO - PLANILLA DE ETIQUETAS QR PARA RECORTAR</h2>
            <p style="font-size: 9pt; margin: 2px 0 0 0; color: #475569;">Total de etiquetas QR en esta planilla: ${expandedLabels.length} (Reactivos distintos: ${selectedSubstances.length}) | Impreso el ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}</p>
        </div>
    `;

    // Layout usando inline-block en lugar de grid para mejor manejo de saltos de página y espacios
    const labelGridHtml = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 100%; box-sizing: border-box; background-color: #ffffff; background: #ffffff;">
            ${expandedLabels.map(item => {
                const s = item.substance;
                return `
                    <div style="border: 1.5px dashed #475569; border-radius: 10px; padding: 8px; text-align: center; background-color: #ffffff; background: #ffffff; page-break-inside: avoid; position: relative; box-sizing: border-box;">
                        <span style="position: absolute; top: 2px; right: 4px; font-size: 7pt; color: #94a3b8;">✂️</span>
                        
                        <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${s.name}</div>
                        
                        <div style="font-size: 8pt; font-weight: 700; color: #0284c7; margin-bottom: 4px;">${s.chemical_formula || ''} ${s.cas_number ? `| CAS: ${s.cas_number}` : ''}</div>
                        
                        ${s.qr_path ? `
                            <img src="${s.qr_path}" style="width: 95px; height: 95px; margin: 0 auto; display: block; object-fit: contain; background-color: #ffffff;">
                        ` : `
                            <div style="width: 95px; height: 95px; margin: 0 auto; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #999; background-color: #ffffff;">Sin QR</div>
                        `}
                        
                        <div style="font-size: 8.5pt; font-family: monospace; font-weight: bold; color: #1e293b; margin-top: 3px;">LAB-SUB-${s.id}</div>
                        <div style="font-size: 7.5pt; font-weight: bold; color: #15803d; margin-top: 1px;">
                            ${s.container_content || `${s.quantity} ${s.unit}`} ${item.totalCopies > 1 ? `<span style="color:#0284c7; font-weight:800;">[${item.copyIndex}/${item.totalCopies}]</span>` : ''}
                        </div>
                        ${s.substance_group ? `<div style="font-size: 7pt; font-weight: bold; color: #64748b; margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px;">🏷️ ${s.substance_group}</div>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    printArea.innerHTML = `
        <div style="padding: 10px; background-color: #ffffff; background: #ffffff;">
            ${printHeaderHtml}
            ${labelGridHtml}
        </div>
    `;

    document.body.classList.add('printing-qr-sheet');

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-qr-sheet');
        }, 1000);
    }, 250);
};
