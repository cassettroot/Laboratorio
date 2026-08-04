// static/js/views/warehouse.js
// ALMACÉN Y ESTANTERÍA: NAVEGACIÓN DIRECTA AL NIVEL + TOGGLE DE MODO EDICIÓN (DESACTIVADO POR DEFECTO)

let currentViewMode = 'photo'; // 'photo' | 'optimized'
let isWarehouseEditMode = false; // DESACTIVADO SIEMPRE POR DEFECTO (SOLO VISUALIZAR)
let selectedShelf = null;
let substancesListCache = [];
let warehouseSearchQuery = '';

// Estado dinámico de los niveles (editable cuando el modo edición está activo)
let customShelfState = {
    'A5': null,
    'A4': null,
    'A3': null,
    'A2': null,
    'A1': null,
    'B5': null,
    'B4': null,
    'B3': null,
    'B2': null,
    'B1': null,
    'altillo': null,
    'piso': null
};

// Cargar estado guardado
try {
    const savedState = localStorage.getItem('custom_warehouse_shelves_state');
    if (savedState) customShelfState = JSON.parse(savedState);
} catch (e) {
    console.warn("No se pudo cargar custom_warehouse_shelves_state:", e);
}

// Función auxiliar para obtener el Grupo de Almacenamiento Química (SGA)
function getStorageGroup(item) {
    const name = (item.name || '').toLowerCase();
    const risks = (item.risks_warnings || '').toLowerCase();
    const group = (item.substance_group || '').toLowerCase();

    if (name.includes('sulfúrico') || name.includes('clorhídrico') || name.includes('fórmico') || name.includes('fosfórico') || name.includes('propiónico') || name.includes('butírico') || name.includes('hidróxido') || name.includes('cal sodada') || risks.includes('corrosivo') || risks.includes('ghs05')) {
        return { code: 'Grupo 8', label: 'Grupo 8: Corrosivos (Ácidos/Bases)', badgeBg: 'bg-red-100 text-red-900 border-red-300' };
    }
    if (risks.includes('inflamable') || risks.includes('ghs02') || name.includes('naftalina') || group.includes('inflamable')) {
        return { code: 'Grupo 3', label: 'Grupo 3: Líquidos Inflamables', badgeBg: 'bg-amber-100 text-amber-900 border-amber-300' };
    }
    if (name.includes('aluminio en polvo') || name.includes('carburo de calcio') || group.includes('metales')) {
        return { code: 'Grupo 4', label: 'Grupo 4: Sólidos Reactivos', badgeBg: 'bg-orange-100 text-orange-900 border-orange-300' };
    }
    if (name.includes('peróxido') || name.includes('agua oxigenada') || group.includes('peróxido') || group.includes('comburente')) {
        return { code: 'Grupo 5', label: 'Grupo 5: Comburentes y Peróxidos', badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300' };
    }
    if (name.includes('bario') || risks.includes('tóxico') || risks.includes('ghs06')) {
        return { code: 'Grupo 6', label: 'Grupo 6: Sustancias Tóxicas', badgeBg: 'bg-purple-100 text-purple-900 border-purple-300' };
    }
    return { code: 'Grupo 9', label: 'Grupo 9: Sales e Inertes Misceláneos', badgeBg: 'bg-blue-100 text-blue-900 border-blue-300' };
}

async function renderWarehouseView(container) {
    container.innerHTML = `
        <div class="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            
            <!-- HEADER DE NAVEGACIÓN DE ALMACÉN -->
            <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-700/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <div class="flex flex-wrap items-center gap-3 mb-2">
                        <span class="bg-brand-500/20 text-brand-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-brand-500/30">
                            🏢 Infraestructura & Almacenamiento
                        </span>
                        <span class="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-500/30">
                            Clasificación por Grupos SGA
                        </span>
                    </div>
                    <h2 class="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                        Almacén de Reactivos y Equipos
                    </h2>
                    <p class="text-slate-400 text-sm mt-1 max-w-2xl">
                        Haz clic en cualquier nivel para ir directamente a la lista de sustancias que lo integran.
                    </p>
                    
                    <!-- BUSCADOR GLOBAL DE ALMACÉN -->
                    <div class="mt-4 relative max-w-xl">
                        <input 
                            type="text" 
                            id="search-warehouse-main" 
                            oninput="onSearchWarehouseMain(this.value)"
                            placeholder="🔍 Buscar sustancia por nombre, CAS, fórmula o Grupo SGA en el almacén..." 
                            class="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition shadow-inner"
                        />
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
                    </div>
                </div>

                <!-- CONTROLES: VISTAS Y INTERRUPTOR DE EDICIÓN -->
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    
                    <!-- BOTÓN INTERRUPTOR DE MODO EDICIÓN (DESACTIVADO POR DEFECTO) -->
                    <button id="btn-toggle-edit-mode" onclick="toggleWarehouseEditMode()" class="px-5 py-2.5 rounded-2xl font-bold text-xs transition duration-200 bg-slate-800 text-slate-300 border border-slate-700 hover:text-white flex items-center justify-center gap-2">
                        <i data-lucide="lock" class="w-4 h-4 text-emerald-400"></i>
                        <span>🔒 Modo Consulta (Solo Visualizar)</span>
                    </button>

                    <!-- SELECTOR DE VISTA -->
                    <div class="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
                        <button id="btn-mode-photo" onclick="switchWarehouseMode('photo')" class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition duration-200 bg-brand-500 text-slate-950 shadow-md">
                            <i data-lucide="camera" class="w-4 h-4"></i>
                            <span>📸 Foto Real</span>
                        </button>
                        <button id="btn-mode-opt" onclick="switchWarehouseMode('optimized')" class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition duration-200 text-slate-400 hover:text-white">
                            <i data-lucide="sparkles" class="w-4 h-4"></i>
                            <span>✨ Propuesta SGA</span>
                        </button>
                    </div>

                </div>
            </div>

            <!-- TARJETAS DE INDICADORES / RESUMEN -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div class="p-3 bg-amber-100 text-amber-700 rounded-xl">
                        <i data-lucide="layers" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-xs font-semibold text-slate-500 uppercase">Capacidad Vertical</span>
                        <h4 class="text-lg font-bold text-slate-900">10 Niveles + Altillo</h4>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div class="p-3 bg-blue-100 text-blue-700 rounded-xl">
                        <i data-lucide="shield-alert" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-xs font-semibold text-slate-500 uppercase">Kit de Derrames</span>
                        <h4 class="text-lg font-bold text-slate-900" id="stat-spill-kit">Ubicación Actual: Suelo</h4>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div class="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                        <i data-lucide="box" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-xs font-semibold text-slate-500 uppercase">Espacio Útil Libre</span>
                        <h4 class="text-lg font-bold text-slate-900" id="stat-free-space">60% Disponible</h4>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div class="p-3 bg-purple-100 text-purple-700 rounded-xl">
                        <i data-lucide="flask-conical" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-xs font-semibold text-slate-500 uppercase">Reactivos Registrados</span>
                        <h4 class="text-lg font-bold text-slate-900" id="stat-total-subs">Cargando...</h4>
                    </div>
                </div>
            </div>

            <!-- CONTENEDOR PRINCIPAL: ESTANTERÍA VIRTUAL (12 COLS COMPACTAS) -->
            <div class="bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
                
                <div class="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        <i data-lucide="grid" class="w-5 h-5 text-brand-400"></i>
                        <span id="shelving-title">Mapa Interactivo de Estantería</span>
                    </h3>
                    <span class="text-xs text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40 font-bold">
                        👇 Toca cualquier nivel para ver sus compuestos
                    </span>
                </div>

                <!-- FOTOGRAFÍA REAL DEL ESTANTE METÁLICO NEGRO -->
                <div class="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
                    <div class="w-full md:w-56 h-72 rounded-xl overflow-hidden border border-slate-700 shrink-0 shadow-lg relative group bg-slate-900">
                        <img src="/img/estante_negro_real.jpg" alt="Estante Metálico Negro Real" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        <a href="/img/estante_negro_real.jpg" target="_blank" class="absolute bottom-2 right-2 bg-slate-900/90 text-white text-3xs font-bold px-2 py-1 rounded-lg border border-slate-700 hover:bg-brand-600 transition flex items-center gap-1">
                            <i data-lucide="maximize-2" class="w-3 h-3"></i> Ampliar Foto
                        </a>
                    </div>
                    <div class="space-y-2 text-xs text-slate-300 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="bg-slate-800 text-amber-400 font-extrabold px-2.5 py-1 rounded-lg text-3xs border border-slate-700 uppercase">Estante Metálico Negro Doble</span>
                            <span class="text-3xs text-emerald-400 font-bold">● Fotografiado e Inventariado</span>
                        </div>
                        <h4 class="font-extrabold text-sm text-white">Estructura Real de Almacenamiento (Estante Izquierdo A / Estante Derecho B)</h4>
                        <p class="text-slate-400 leading-relaxed">
                            Módulo de estantería doble en acabado metálico negro con 5 niveles por columna y altillo superior para cajas de embalaje largo.
                        </p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-3xs font-mono">
                            <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                <span class="text-amber-400 font-bold block">Columna A (Izquierda):</span>
                                <span class="text-slate-400 block">● Niveles 2 a 5: Líquidos, Corrosivos y Reactivos SGA</span>
                                <span class="text-slate-300 block">● Base Nivel 1: Cajas Reactivos 2WAJ + Spill Kit</span>
                            </div>
                            <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                <span class="text-purple-400 font-bold block">Columna B (Derecha):</span>
                                <span class="text-slate-400 block">● Niveles 2 a 5: Sólidos, Indicadores, Metales y Orgánicos</span>
                                <span class="text-purple-300 block">● Base Nivel 1: Soluciones Acuosas en Gran Volumen</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- RECREACIÓN GRÁFICA DE LA ESTANTERÍA CON NAVEGACIÓN DIRECTA -->
                <div class="space-y-4 font-mono">
                    
                    <!-- 1. ALTILLO SUPERIOR -->
                    <div id="shelf-box-altillo" class="bg-amber-900/40 border-2 border-dashed border-amber-600/60 rounded-2xl p-4 text-center cursor-pointer hover:border-amber-400 transition" onclick="selectAndNavigateZone('altillo')">
                        <div class="flex items-center justify-between text-xs font-bold text-amber-300 uppercase mb-1">
                            <span class="flex items-center gap-1.5">📦 ALTILLO SUPERIOR (LOTE 12)</span>
                            <span class="bg-amber-800/60 px-2 py-0.5 rounded border border-amber-500/40 text-amber-200" id="badge-altillo">Cajas alargadas de cartón</span>
                        </div>
                        <div class="h-12 bg-amber-950/80 rounded-xl border border-amber-800/80 flex items-center justify-between px-4 text-amber-200 text-xs font-sans" id="content-altillo">
                            <span>📦 Cajas de embalaje largo superiores horizontales</span>
                        </div>
                    </div>

                    <!-- 2. ESTANTERÍA DOBLE (COLUMNA A Y B) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                        
                        <!-- COLUMNA IZQUIERDA (ESTANTE A) -->
                        <div class="space-y-3">
                            <div class="text-center font-bold text-slate-300 text-xs uppercase bg-slate-800/80 py-1.5 rounded-lg border border-slate-700">
                                Estante Izquierdo (Columna A)
                            </div>

                            <div id="shelf-A5" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('A5')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-slate-400">Nivel 5 (Alto)</span>
                                    <span class="status-pill text-slate-400" id="pill-A5">Vacío</span>
                                </div>
                                <div class="h-10 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans" id="content-A5">
                                    <span class="text-slate-600 italic">Libre</span>
                                </div>
                            </div>

                            <div id="shelf-A4" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('A4')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-slate-400">Nivel 4</span>
                                    <span class="status-pill text-slate-400" id="pill-A4">Vacío</span>
                                </div>
                                <div class="h-10 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans" id="content-A4">
                                    <span class="text-slate-600 italic">Libre</span>
                                </div>
                            </div>

                            <div id="shelf-A3" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('A3')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-slate-400">Nivel 3</span>
                                    <span class="status-pill text-slate-400" id="pill-A3">Vacío</span>
                                </div>
                                <div class="h-10 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans" id="content-A3">
                                    <span class="text-slate-600 italic">Libre</span>
                                </div>
                            </div>

                            <div id="shelf-A2" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('A2')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-slate-400">Nivel 2</span>
                                    <span class="status-pill text-slate-400" id="pill-A2">Vacío</span>
                                </div>
                                <div class="h-10 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans" id="content-A2">
                                    <span class="text-slate-600 italic">Libre</span>
                                </div>
                            </div>

                            <div id="shelf-A1" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('A1')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-slate-300">Nivel 1 (Piso Estante)</span>
                                    <span class="status-pill" id="pill-A1">Equipos & Cajas</span>
                                </div>
                                <div class="h-12 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans bg-slate-800/80 text-slate-300 gap-2" id="content-A1">
                                    <span>📦 Cajas Modelo 2WAJ + Mercado Libre IN</span>
                                </div>
                            </div>

                        </div>

                        <!-- COLUMNA DERECHA (ESTANTE B) -->
                        <div class="space-y-3">
                            <div class="text-center font-bold text-slate-300 text-xs uppercase bg-slate-800/80 py-1.5 rounded-lg border border-slate-700">
                                Estante Derecho (Columna B)
                            </div>

                            <div id="shelf-B5" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('B5')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-slate-400">Nivel 5 (Alto)</span>
                                    <span class="status-pill text-slate-400" id="pill-B5">Vacío</span>
                                </div>
                                <div class="h-10 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans" id="content-B5">
                                    <span class="text-slate-600 italic">Libre</span>
                                </div>
                            </div>

                            <div id="shelf-B4" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('B4')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-slate-400">Nivel 4</span>
                                    <span class="status-pill text-slate-400" id="pill-B4">Vacío</span>
                                </div>
                                <div class="h-10 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans" id="content-B4">
                                    <span class="text-slate-600 italic">Libre</span>
                                </div>
                            </div>

                            <div id="shelf-B3" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('B3')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-slate-400">Nivel 3</span>
                                    <span class="status-pill text-slate-400" id="pill-B3">Vacío</span>
                                </div>
                                <div class="h-10 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans" id="content-B3">
                                    <span class="text-slate-600 italic">Libre</span>
                                </div>
                            </div>

                            <div id="shelf-B2" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('B2')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-slate-400">Nivel 2</span>
                                    <span class="status-pill text-slate-400" id="pill-B2">Vacío</span>
                                </div>
                                <div class="h-10 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans" id="content-B2">
                                    <span class="text-slate-600 italic">Libre</span>
                                </div>
                            </div>

                            <div id="shelf-B1" class="shelf-box p-3 rounded-xl border transition cursor-pointer" onclick="selectAndNavigateZone('B1')">
                                <div class="flex justify-between items-center text-2xs font-bold uppercase mb-1">
                                    <span class="text-purple-400">Nivel 1 (Inferior)</span>
                                    <span class="status-pill bg-purple-500/20 text-purple-300 border border-purple-500/30" id="pill-B1">Kit PHYWE</span>
                                </div>
                                <div class="h-12 rounded-lg flex items-center justify-between px-2.5 text-xs font-sans bg-purple-950/50 text-purple-200 border border-purple-500/30 gap-2 font-bold" id="content-B1">
                                    <span>🧰 Caja Madera PHYWE</span>
                                </div>
                            </div>

                        </div>

                    </div>

                    <!-- 3. ÁREA DE PISO -->
                    <div id="zone-floor" class="bg-red-950/30 border border-red-500/40 rounded-2xl p-4 cursor-pointer hover:border-red-400 transition" onclick="selectAndNavigateZone('piso')">
                        <div class="flex items-center justify-between text-xs font-bold text-red-300 uppercase mb-2">
                            <span>🚨 ÁREA DE PISO Y PASILLO DE ALMACÉN</span>
                            <span class="bg-red-900/60 px-2 py-0.5 rounded text-red-200 border border-red-500/40" id="badge-piso">Insumos & Kit de Derrames en Suelo</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans" id="content-piso">
                            <div class="bg-yellow-500/20 border border-yellow-500/40 p-2.5 rounded-xl text-yellow-200 flex items-center gap-2">
                                <span class="text-base">⚠️</span>
                                <span><strong>Bolsa Amarilla (Kit de Derrame)</strong> + Bolsa Blanca de Tela</span>
                            </div>
                            <div class="bg-slate-800/90 border border-slate-700 p-2.5 rounded-xl text-slate-300 flex items-center gap-2">
                                <span class="text-base">📦</span>
                                <span><strong>Caja Saladitas</strong> con reactivos + Cajas de cartón apiladas</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            <!-- SECCIÓN DE INVENTARIO DESGLOSADO POR NIVEL -->
            <div class="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl space-y-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
                    <div>
                        <div class="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
                            <span>📋 Sustancias Asignadas al Nivel Seleccionado</span>
                        </div>
                        <h3 class="text-xl font-extrabold text-slate-900" id="breakdown-section-title">
                            Sustancias y Materiales por Estante y Nivel
                        </h3>
                    </div>

                    <div class="w-full md:w-80 relative">
                        <input 
                            type="text" 
                            id="search-warehouse-shelf" 
                            oninput="onSearchWarehouseShelf(this.value)"
                            placeholder="Buscar compuesto o Grupo (ej. Grupo 8)..." 
                            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                        />
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
                    </div>
                </div>

                <div class="space-y-4" id="shelves-inventory-breakdown"></div>
            </div>

        </div>

        <!-- MODAL DE EDICIÓN (SOLO SI EL MODO EDICIÓN ESTÁ ACTIVADO) -->
        <div id="modal-edit-shelf" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
            <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl animate-fade-in">
                <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 class="font-extrabold text-base text-white flex items-center gap-2">
                        <i data-lucide="edit-3" class="w-5 h-5 text-brand-400"></i>
                        <span id="modal-shelf-title">Editar Estado de Nivel</span>
                    </h3>
                    <button onclick="closeEditShelfModal()" class="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
                </div>

                <div class="space-y-4 text-xs font-sans">
                    <div>
                        <label class="block font-bold text-slate-300 uppercase tracking-wider mb-1">Estado / Etiqueta del Nivel</label>
                        <input type="text" id="edit-shelf-pill" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs" placeholder="ej. Piso 100% Vacío, Charola SGA" />
                    </div>
                    <div>
                        <label class="block font-bold text-slate-300 uppercase tracking-wider mb-1">Descripción del Contenido Actual</label>
                        <textarea id="edit-shelf-content" rows="3" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs" placeholder="Describe qué hay en este nivel..."></textarea>
                    </div>
                </div>

                <div class="flex gap-3 pt-2">
                    <button onclick="closeEditShelfModal()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs">Cancelar</button>
                    <button onclick="saveCustomShelfState()" class="flex-1 bg-brand-500 hover:bg-brand-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs shadow-md">Guardar Cambios</button>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    await loadWarehouseData();
    applyWarehouseStyles();
    switchWarehouseMode('opt');
    renderShelvesBreakdown();

    // Si viene de ver/editar una sustancia desde el almacén, restaurar el nivel seleccionado y la posición del scroll
    const fromWarehouse = sessionStorage.getItem('last_navigation_source') === 'warehouse';
    const savedLevel = sessionStorage.getItem('warehouse_selected_level');

    if (fromWarehouse && savedLevel) {
        setTimeout(() => {
            scrollToShelfBreakdown(savedLevel);
        }, 150);
    }
}

function toggleWarehouseEditMode() {
    isWarehouseEditMode = !isWarehouseEditMode;
    const btn = document.getElementById('btn-toggle-edit-mode');

    if (isWarehouseEditMode) {
        if (btn) {
            btn.className = "px-5 py-2.5 rounded-2xl font-bold text-xs transition duration-200 bg-amber-500 text-slate-950 shadow-md flex items-center justify-center gap-2";
            btn.innerHTML = `<i data-lucide="unlock" class="w-4 h-4"></i> <span>✏️ Modo Edición Habilitado</span>`;
        }
        alert("✏️ Modo Edición Activado. Haz clic en un nivel si deseas modificar su contenido o etiqueta.");
    } else {
        if (btn) {
            btn.className = "px-5 py-2.5 rounded-2xl font-bold text-xs transition duration-200 bg-slate-800 text-slate-300 border border-slate-700 hover:text-white flex items-center justify-center gap-2";
            btn.innerHTML = `<i data-lucide="lock" class="w-4 h-4 text-emerald-400"></i> <span>🔒 Modo Consulta (Solo Visualizar)</span>`;
        }
        alert("🔒 Modo Consulta Activado. Al tocar cualquier nivel navegarás directamente a sus sustancias.");
    }
    lucide.createIcons();
}

function trackWarehouseNavigation(shelfId) {
    sessionStorage.setItem('last_navigation_source', 'warehouse');
    sessionStorage.setItem('warehouse_selected_level', shelfId);
    sessionStorage.setItem('warehouse_scroll_y', window.scrollY.toString());
}
window.trackWarehouseNavigation = trackWarehouseNavigation;

function selectAndNavigateZone(zoneId) {
    sessionStorage.setItem('warehouse_selected_level', zoneId);
    if (isWarehouseEditMode) {
        // En modo edición abre el modal
        openEditShelfModal(zoneId);
    } else {
        // En modo consulta (por defecto) navega directamente a la lista de sustancias
        scrollToShelfBreakdown(zoneId);
    }
}

async function loadWarehouseData() {
    try {
        const res = await fetch('/api/substances');
        const data = await res.json();
        if (data.status === 'success') {
            substancesListCache = data.data || [];
            const el = document.getElementById('stat-total-subs');
            if (el) el.textContent = `${substancesListCache.length} Sustancias`;
        }
    } catch (e) {
        console.warn("Error cargando sustancias para almacén:", e);
    }
}

function applyWarehouseStyles() {
    const styleId = 'warehouse-custom-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .shelf-box {
            background-color: #0f172a;
            border-color: #334155;
        }
        .shelf-box:hover {
            border-color: #38bdf8;
            background-color: #1e293b;
        }
        .status-pill {
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 9999px;
            background-color: #334155;
            color: #cbd5e1;
        }
        .pictogram-badge {
            font-size: 9px;
            font-weight: 800;
            padding: 1px 6px;
            border-radius: 4px;
            text-transform: uppercase;
        }
    `;
    document.head.appendChild(style);
}

function switchWarehouseMode(mode) {
    currentViewMode = mode;
    const btnPhoto = document.getElementById('btn-mode-photo');
    const btnOpt = document.getElementById('btn-mode-opt');
    const shelvingTitle = document.getElementById('shelving-title');

    if (mode === 'photo') {
        if (btnPhoto) btnPhoto.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition duration-200 bg-brand-500 text-slate-950 shadow-md";
        if (btnOpt) btnOpt.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition duration-200 text-slate-400 hover:text-white";
        if (shelvingTitle) shelvingTitle.textContent = "📸 Vista Actual (Fotografía del Espacio Real)";
        renderPhotoModeLayout();
    } else {
        if (btnPhoto) btnPhoto.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition duration-200 text-slate-400 hover:text-white";
        if (btnOpt) btnOpt.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition duration-200 bg-emerald-500 text-slate-950 shadow-md";
        if (shelvingTitle) shelvingTitle.textContent = "✨ Propuesta de Organización Eficiente y Segura (SGA)";
        renderOptimizedModeLayout();
    }
}

function renderPhotoModeLayout() {
    // ESTANTE IZQUIERDO (COLUMNA A)
    updateShelfUI('A5', 'Óxidos & Comburentes', '🧪 Óxido MgO, Peróxido Manganeso, Naftalina', 'yellow', '🟡 G5/G6 COMBURENTES');
    updateShelfUI('A4', 'Cloruros & Carbonatos', '🧪 Cloruro Bario, Litio, Magnesio, Cal Sodada', 'blue', '🟣 G6/G9 SALES');
    updateShelfUI('A3', 'Solventes Orgánicos', '🍾 Etanol, Metanol, Acetona, Hexano, Éter', 'amber', '🟠 G3 INFLAMABLES');
    updateShelfUI('A2', 'Líquidos Corrosivos', '🍾 Ácido Sulfúrico, Clorhídrico, Fórmico', 'amber', '🔴 G8 CORROSIVOS');
    updateShelfUI('A1', 'Seguridad & Derrames', '📦 Cajas 2WAJ + Kit de Derrames Emergencia', 'yellow', '🚨 KIT DERRAMES');

    // ESTANTE DERECHO (COLUMNA B)
    updateShelfUI('B5', 'Indicadores & Colorantes', '🧪 Fenolftaleína, Azul Metileno, Naranja Metilo', 'purple', '🟣 G6/G9 COLORANTES');
    updateShelfUI('B4', 'Metales & Virutas', '🧪 Magnesio virutas, Carburo Calcio, Aluminio', 'orange', '🟠 G4 SÓLIDOS REACTIVOS');
    updateShelfUI('B3', 'Ácidos Orgánicos & Azúcares', '🧪 Ácido Cítrico, Tartárico, Sacarosa, Glucosa', 'emerald', '🟢 G9 ORGÁNICOS');
    updateShelfUI('B2', 'Sulfatos & Fosfatos', '🧪 Sulfato Sodio, Aluminio, Magnesio, Fosfato', 'blue', '🔵 G9 SALES COMPUESTAS');
    updateShelfUI('B1', 'Soluciones Acuosas & PHYWE', '🍾 Agua Destilada, Solución Amoniacal + Caja PHYWE', 'purple', '🧰 SOLUCIONES & EQUIPOS');

    const statSpill = document.getElementById('stat-spill-kit');
    if (statSpill) statSpill.textContent = "Estante A Nivel 1 (G8/Spill)";
    const statFree = document.getElementById('stat-free-space');
    if (statFree) statFree.textContent = "Columna A y B 100% Asignados";

    applyCustomStateOverrides();
}

function renderOptimizedModeLayout() {
    // ESTANTE IZQUIERDO (COLUMNA A) - LÍQUIDOS, CORROSIVOS E INFLAMABLES SGA
    updateShelfUI('A5', 'Comburentes y Óxidos (G5/G6)', '🧪 Peróxido de Manganeso, Agua Oxigenada, Nitrato de Sodio, Naftalina', 'yellow', '🟡 GRUPO 5 COMBURENTES | 🟣 GRUPO 6 TÓXICOS');
    updateShelfUI('A4', 'Cloruros, Carbonatos y Fluoruros (G6/G9)', '🧪 Cloruro de Bario, Cloruro de Litio, Cloruro de Magnesio, Cal Sodada', 'blue', '🟣 GRUPO 6 TÓXICOS / 🔵 GRUPO 9 SALES');
    updateShelfUI('A3', 'Solventes e Inflamables (G3)', '🍾 Etanol, Metanol, Acetona, Hexano, Éter de Petróleo, Isobutanol', 'amber', '🟠 GRUPO 3 LÍQUIDOS INFLAMABLES');
    updateShelfUI('A2', 'Líquidos Corrosivos (G8)', '🍾 Ácido Sulfúrico, Ácido Clorhídrico, Ácido Fórmico, Ácido Fosfórico', 'amber', '🔴 GRUPO 8 CORROSIVOS (ÁCIDOS/BASES)');
    updateShelfUI('A1', 'Reactivos Pesados + Spill Kit', '📦 Cajas 2WAJ de Reactivos + Kit de Derrames de Emergencia', 'yellow', '🚨 KIT DERRAMES / REACTIVOS PESADOS');

    // ESTANTE DERECHO (COLUMNA B) - SÓLIDOS REACTIVOS, ORGÁNICOS E INDICADORES SGA
    updateShelfUI('B5', 'Indicadores y Colorantes (G6/G9)', '🧪 Fenolftaleína, Azul de Metileno, Tornasol, Naranja de Metilo, Lugol', 'purple', '🟣 INDICADORES / COLORANTES');
    updateShelfUI('B4', 'Metales y Sólidos Reactivos (G4)', '🧪 Magnesio en virutas, Carburo de Calcio, Aluminio en Polvo, Hierro', 'orange', '🟠 GRUPO 4 SÓLIDOS REACTIVOS');
    updateShelfUI('B3', 'Ácidos Orgánicos y Carbohidratos (G9)', '🧪 Ácido Cítrico, Ácido Tartárico, Sacarosa, Glucosa Anhidra, Urea, Bórax', 'emerald', '🟢 GRUPO 9 ORGÁNICOS / CARBOHIDRATOS');
    updateShelfUI('B2', 'Sales Inorgánicas, Sulfatos y Fosfatos (G9)', '🧪 Sulfato de Sodio, Sulfato de Cobre, Sulfato de Magnesio, Fosfato', 'blue', '🔵 GRUPO 9 SALES INORGÁNICAS');
    updateShelfUI('B1', 'Soluciones Acuosas Gran Volumen (G9)', '🍾 Agua Destilada, Solución Amoniacal, Solución de Cobre + Caja PHYWE', 'purple', '🔵 SOLUCIONES ACUOSAS BASE');

    const statSpill = document.getElementById('stat-spill-kit');
    if (statSpill) statSpill.textContent = "Nivel 1 Estante A (Accesible en 10s)";
    const statFree = document.getElementById('stat-free-space');
    if (statFree) statFree.textContent = "100% Clasificación Sustancias SGA (Col A & B)";

    const floorContent = document.getElementById('content-piso');
    if (floorContent) {
        floorContent.innerHTML = `
            <div class="col-span-2 bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-xl text-emerald-200 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-lg">✅</span>
                    <span><strong>Suelo 100% Despejado:</strong> Organización exclusiva para sustancias químicas registradas. Equipos y cristalería ubicados en otra zona.</span>
                </div>
                <span class="text-xs font-bold bg-emerald-950 px-3 py-1 rounded-full border border-emerald-500/40 text-emerald-300">Norma Oficial SGA</span>
            </div>
        `;
    }

    applyCustomStateOverrides();
}

function updateShelfUI(shelfId, pillText, contentText, theme = 'slate', sgaBadgeText = '') {
    const pill = document.getElementById(`pill-${shelfId}`);
    const content = document.getElementById(`content-${shelfId}`);
    const box = document.getElementById(`shelf-${shelfId}`);

    if (pill) pill.textContent = pillText;
    if (content) {
        content.innerHTML = `
            <span>${contentText}</span>
            ${sgaBadgeText ? `<span class="pictogram-badge bg-slate-900/90 text-amber-300 border border-amber-500/30">${sgaBadgeText}</span>` : ''}
        `;
    }

    if (box) {
        if (theme === 'amber') {
            box.className = "shelf-box p-3 rounded-xl border border-amber-500/50 bg-amber-950/40 transition cursor-pointer hover:border-amber-400";
        } else if (theme === 'purple') {
            box.className = "shelf-box p-3 rounded-xl border border-purple-500/50 bg-purple-950/40 transition cursor-pointer hover:border-purple-400";
        } else if (theme === 'emerald') {
            box.className = "shelf-box p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/40 transition cursor-pointer hover:border-emerald-400";
        } else if (theme === 'blue') {
            box.className = "shelf-box p-3 rounded-xl border border-blue-500/50 bg-blue-950/40 transition cursor-pointer hover:border-blue-400";
        } else if (theme === 'yellow') {
            box.className = "shelf-box p-3 rounded-xl border border-yellow-500/50 bg-yellow-950/40 transition cursor-pointer hover:border-yellow-400";
        } else {
            box.className = "shelf-box p-3 rounded-xl border border-slate-800 bg-slate-900 transition cursor-pointer hover:border-slate-700";
        }
    }
}

function applyCustomStateOverrides() {
    Object.keys(customShelfState).forEach(zoneId => {
        const custom = customShelfState[zoneId];
        if (custom) {
            if (zoneId === 'piso') {
                const floorContent = document.getElementById('content-piso');
                const badgePiso = document.getElementById('badge-piso');
                if (badgePiso) badgePiso.textContent = custom.pill;
                if (floorContent) {
                    floorContent.innerHTML = `
                        <div class="col-span-2 bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-xl text-emerald-200 flex items-center justify-between">
                            <span>${custom.content}</span>
                        </div>
                    `;
                }
            } else {
                updateShelfUI(zoneId, custom.pill, custom.content, 'emerald', '✏️ MODIFICADO');
            }
        }
    });
}

function openEditShelfModal(shelfId) {
    selectedShelf = shelfId;
    const modal = document.getElementById('modal-edit-shelf');
    const title = document.getElementById('modal-shelf-title');
    const pillInput = document.getElementById('edit-shelf-pill');
    const contentInput = document.getElementById('edit-shelf-content');

    if (title) title.textContent = `Editar Estado de Nivel ${shelfId}`;

    const current = customShelfState[shelfId] || {};
    if (pillInput) pillInput.value = current.pill || '';
    if (contentInput) contentInput.value = current.content || '';

    if (modal) modal.classList.remove('hidden');
}

function closeEditShelfModal() {
    const modal = document.getElementById('modal-edit-shelf');
    if (modal) modal.classList.add('hidden');
}

function saveCustomShelfState() {
    if (!selectedShelf) return;

    const pillInput = document.getElementById('edit-shelf-pill');
    const contentInput = document.getElementById('edit-shelf-content');

    const pill = pillInput ? pillInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';

    if (!pill || !content) {
        alert("Por favor completa ambos campos para actualizar el estado del nivel.");
        return;
    }

    customShelfState[selectedShelf] = { pill, content };

    try {
        localStorage.setItem('custom_warehouse_shelves_state', JSON.stringify(customShelfState));
    } catch (e) {
        console.warn("Error guardando en localStorage:", e);
    }

    closeEditShelfModal();
    if (currentViewMode === 'photo') renderPhotoModeLayout();
    else renderOptimizedModeLayout();
    alert(`✅ Estado de ${selectedShelf} actualizado exitosamente.`);
}

function onSearchWarehouseMain(val) {
    warehouseSearchQuery = val.toLowerCase().trim();
    const shelfInput = document.getElementById('search-warehouse-shelf');
    if (shelfInput && shelfInput.value !== val) {
        shelfInput.value = val;
    }
    renderShelvesBreakdown();
    highlightMatchingShelvesInLayout();
}

function onSearchWarehouseShelf(val) {
    warehouseSearchQuery = val.toLowerCase().trim();
    const mainInput = document.getElementById('search-warehouse-main');
    if (mainInput && mainInput.value !== val) {
        mainInput.value = val;
    }
    renderShelvesBreakdown();
    highlightMatchingShelvesInLayout();
}

function highlightMatchingShelvesInLayout() {
    const allShelves = ['A5', 'A4', 'A3', 'A2', 'A1', 'B5', 'B4', 'B3', 'B2', 'B1'];
    if (!warehouseSearchQuery) {
        if (currentViewMode === 'photo') renderPhotoModeLayout();
        else renderOptimizedModeLayout();
        return;
    }

    allShelves.forEach(shelfId => {
        const shelfBox = document.getElementById(`shelf-${shelfId}`);
        const pill = document.getElementById(`pill-${shelfId}`);
        const content = document.getElementById(`content-${shelfId}`);
        if (!shelfBox) return;

        const config = getShelvesConfig().find(s => s.id === shelfId);
        if (!config) return;

        const matched = substancesListCache.filter(config.filterMatch).filter(s =>
            s.name.toLowerCase().includes(warehouseSearchQuery) ||
            (s.cas_number && s.cas_number.toLowerCase().includes(warehouseSearchQuery)) ||
            (s.chemical_formula && s.chemical_formula.toLowerCase().includes(warehouseSearchQuery)) ||
            getStorageGroup(s).code.toLowerCase().includes(warehouseSearchQuery)
        );

        if (matched.length > 0) {
            shelfBox.className = "shelf-box p-3 rounded-xl border-2 border-emerald-400 bg-emerald-950/70 transition cursor-pointer shadow-lg ring-2 ring-emerald-400/50 scale-[1.02]";
            if (pill) {
                pill.textContent = `🎯 ${matched.length} coincidencia(s)`;
                pill.className = "status-pill bg-emerald-500 text-slate-950 font-extrabold px-2 py-0.5 rounded shadow";
            }
            if (content) {
                content.innerHTML = `<span class="font-bold text-emerald-200">${matched.map(m => m.name).slice(0, 2).join(', ')}${matched.length > 2 ? '...' : ''}</span>`;
            }
        } else {
            shelfBox.className = "shelf-box p-3 rounded-xl border border-slate-800 bg-slate-950/40 opacity-30 transition cursor-pointer hover:opacity-100";
        }
    });
}

function getShelvesConfig() {
    return [
        {
            id: 'A5',
            title: '🧪 Estante Izquierdo (A) - Nivel 5 (Alto: Óxidos, Nitratos y Comburentes G5/G6)',
            badge: '🟡 GRUPO 5 COMBURENTES | 🟣 GRUPO 6 TÓXICOS',
            badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
            description: 'Compuestos oxidantes, nitratos y óxidos metálicos (Óxido de Magnesio, Peróxido de Manganeso, Nitrato de Sodio, Naftalina, Parafina).',
            filterMatch: (s) => getStorageGroup(s).code === 'Grupo 5' || s.name.includes('Óxido') || s.name.includes('Nitrato') || s.name.includes('Peróxido') || s.name.includes('Naftalina') || s.name.includes('Parafina')
        },
        {
            id: 'A4',
            title: '🧪 Estante Izquierdo (A) - Nivel 4 (Cloruros, Carbonatos y Fluoruros G6/G9)',
            badge: '🟣 GRUPO 6 TÓXICOS / 🔵 GRUPO 9 SALES',
            badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
            description: 'Sales inorgánicas puras (Cloruro de Bario, Cloruro de Litio, Cloruro de Magnesio, Carbonato de Calcio, Cal Sodada).',
            filterMatch: (s) => s.name.includes('Cloruro') || s.name.includes('Carbonato') || s.name.includes('Fluoruro') || s.name.includes('Cal Sodada')
        },
        {
            id: 'A3',
            title: '🧪 Estante Izquierdo (A) - Nivel 3 (Solventes y Líquidos Inflamables G3)',
            badge: '🟠 GRUPO 3 LÍQUIDOS INFLAMABLES',
            badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
            description: 'Frascos y garrafas de solventes orgánicos (Etanol, Metanol, Acetona, Hexano, Éter de Petróleo, Isobutanol, Propanol).',
            filterMatch: (s) => getStorageGroup(s).code === 'Grupo 3' || ['Etanol', 'Metanol', 'Acetona', 'Hexano', 'Éter', 'Alcohol', 'Solvente', 'Isobutanol', 'Propanol'].some(k => s.name.includes(k))
        },
        {
            id: 'A2',
            title: '🧪 Estante Izquierdo (A) - Nivel 2 (Central: Líquidos Corrosivos G8)',
            badge: '🔴 GRUPO 8 CORROSIVOS (ÁCIDOS/BASES)',
            badgeBg: 'bg-red-100 text-red-900 border-red-300',
            description: 'Envases de vidrio ámbar (Ácido Sulfúrico, Ácido Clorhídrico, Ácido Fórmico, Ácido Fosfórico, Ácido Acético, Hidróxidos).',
            filterMatch: (s) => getStorageGroup(s).code === 'Grupo 8' || (s.physical_state === 'Líquido' && (s.name.includes('Ácido') || s.name.includes('Hidróxido')))
        },
        {
            id: 'A1',
            title: '🚨 Estante Izquierdo (A) - Nivel 1 (Seguridad & Kit de Derrames)',
            badge: '🚨 SEGURIDAD / EMERGENCIA',
            badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            description: 'Kit de contención de derrames químicos (Bolsa Amarilla) e insumos de protección y contención.',
            filterMatch: (s) => s.name.includes('Derrame') || s.name.includes('Kit') || s.name.includes('Seguridad')
        },
        {
            id: 'B5',
            title: '🧪 Estante Derecho (B) - Nivel 5 (Alto: Indicadores y Colorantes G6/G9)',
            badge: '🟣 INDICADORES / COLORANTES',
            badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
            description: 'Colorantes de laboratorio e indicadores de pH (Fenolftaleína, Azul de Metileno, Naranja de Metilo, Tornasol, Eosina, Lugol, Fehling).',
            filterMatch: (s) => ['Fenolftaleína', 'Azul', 'Naranja', 'Tornasol', 'Eosina', 'Lugol', 'Fehling', 'Verde', 'Colorante', 'Indicador'].some(k => s.name.includes(k))
        },
        {
            id: 'B4',
            title: '🧪 Estante Derecho (B) - Nivel 4 (Metales y Sólidos Reactivos G4)',
            badge: '🟠 GRUPO 4 SÓLIDOS REACTIVOS / METALES',
            badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
            description: 'Metales en virutas/polvo y sólidos reactivos (Magnesio en virutas, Carburo de Calcio, Aluminio en Polvo, Zinc, Hierro, Azufre).',
            filterMatch: (s) => getStorageGroup(s).code === 'Grupo 4' || ['Magnesio', 'Carburo', 'Aluminio', 'Zinc', 'Hierro', 'Azufre', 'Cobre', 'Metal'].some(k => s.name.includes(k))
        },
        {
            id: 'B3',
            title: '🧪 Estante Derecho (B) - Nivel 3 (Ácidos Orgánicos Sólidos, Carbohidratos y Azúcares G9)',
            badge: '🟢 GRUPO 9 ORGÁNICOS / CARBOHIDRATOS',
            badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
            description: 'Compuestos orgánicos biológicos y azúcares (Ácido Cítrico, Ácido Tartárico, Sacarosa, Glucosa Anhidra, Urea, Almidón, Fructosa, Bórax).',
            filterMatch: (s) => ['Cítrico', 'Tartárico', 'Sacarosa', 'Glucosa', 'Urea', 'Almidón', 'Fructosa', 'Lactosa', 'Benzoico', 'Bórax'].some(k => s.name.includes(k))
        },
        {
            id: 'B2',
            title: '📦 Estante Derecho (B) - Nivel 2 (Sulfatos, Fosfatos y Sales Inorgánicas G9)',
            badge: '🔵 GRUPO 9 SALES INORGÁNICAS',
            badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
            description: 'Sales compuestas, sulfatos y fosfatos (Sulfato de Sodio, Sulfato de Cobre, Sulfato de Magnesio, Sulfato de Aluminio, Fosfato, Tiosulfato).',
            filterMatch: (s) => s.name.includes('Sulfato') || s.name.includes('Fosfato') || s.name.includes('Tartrato') || s.name.includes('Tiosulfato') || s.name.includes('Cianuro') || (!s.name.includes('Cloruro') && !s.name.includes('Carbonato') && s.physical_state === 'Sólido')
        },
        {
            id: 'B1',
            title: '🧰 Estante Derecho (B) - Nivel 1 (Soluciones Acuosas & Caja PHYWE)',
            badge: '🧰 CARGA PESADA & SOLUCIONES ACUOSAS',
            badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
            description: 'Garrafas de Agua Destilada, Solución Amoniacal, Soluciones acuosas preparadas y Caja PHYWE con equipos.',
            filterMatch: (s) => s.name.includes('Agua Destilada') || s.name.includes('Amoniacal') || s.name.includes('Solución') || s.name.includes('Yeso') || s.unit === 'kg' || s.unit === 'L'
        }
    ];
}

function scrollToShelfBreakdown(shelfId) {
    let targetCardId = `shelf-card-${shelfId}`;
    if (shelfId === 'altillo' || shelfId === 'piso') targetCardId = `shelf-card-A1`;

    const el = document.getElementById(targetCardId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-brand-500', 'bg-amber-50');
        setTimeout(() => {
            el.classList.remove('ring-4', 'ring-brand-500', 'bg-amber-50');
        }, 3000);
    }
}

function renderShelvesBreakdown() {
    const container = document.getElementById('shelves-inventory-breakdown');
    if (!container) return;

    const shelvesConfig = getShelvesConfig();
    let html = '';

    shelvesConfig.forEach(shelf => {
        let matchedItems = substancesListCache.filter(shelf.filterMatch);

        if (warehouseSearchQuery) {
            matchedItems = matchedItems.filter(s => 
                s.name.toLowerCase().includes(warehouseSearchQuery) ||
                (s.cas_number && s.cas_number.toLowerCase().includes(warehouseSearchQuery)) ||
                (s.chemical_formula && s.chemical_formula.toLowerCase().includes(warehouseSearchQuery)) ||
                getStorageGroup(s).code.toLowerCase().includes(warehouseSearchQuery)
            );
        }

        if (warehouseSearchQuery && matchedItems.length === 0) return;

        html += `
            <div id="shelf-card-${shelf.id}" class="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 transition duration-300">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                    <div>
                        <h4 class="font-extrabold text-slate-900 text-sm md:text-base flex items-center gap-2">
                            <span>${shelf.title}</span>
                        </h4>
                        <p class="text-xs text-slate-500 mt-0.5">${shelf.description}</p>
                    </div>
                    <span class="text-2xs font-bold px-3 py-1 rounded-full border ${shelf.badgeBg} uppercase tracking-wider shrink-0">
                        ${shelf.badge} (${matchedItems.length})
                    </span>
                </div>

                ${matchedItems.length === 0 ? `
                    <div class="p-4 bg-slate-100/60 rounded-xl text-center text-xs text-slate-400 italic">
                        No hay elementos asignados en esta categoría actualmente.
                    </div>
                ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        ${matchedItems.map(item => {
                            const groupInfo = getStorageGroup(item);
                            return `
                                <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-brand-500 transition space-y-2 flex flex-col justify-between">
                                    <div>
                                        <div class="flex justify-between items-start gap-2">
                                            <h5 class="font-bold text-xs text-slate-900 leading-tight">${item.name}</h5>
                                            <span class="text-3xs font-bold uppercase px-2 py-0.5 rounded ${groupInfo.badgeBg}">
                                                ${groupInfo.code}
                                            </span>
                                        </div>
                                        <div class="text-3xs text-slate-500 mt-1 font-mono">
                                            <span>Fórmula: ${item.chemical_formula || 'N/A'}</span> • <span>CAS: ${item.cas_number || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div class="flex justify-between items-center text-xs border-t border-slate-100 pt-2 mt-2">
                                        <span class="font-bold text-slate-700">Stock: ${item.quantity} ${item.unit || 'g'}</span>
                                        <a href="#/substances/${item.id}" onclick="trackWarehouseNavigation('${shelf.id}')" class="text-brand-600 hover:text-brand-700 font-bold text-2xs flex items-center gap-1">
                                            <span>Ver Ficha</span>
                                            <i data-lucide="chevron-right" class="w-3 h-3"></i>
                                        </a>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;
    });

    container.innerHTML = html;
    lucide.createIcons();
}
window.onSearchWarehouseMain = onSearchWarehouseMain;
window.onSearchWarehouseShelf = onSearchWarehouseShelf;
