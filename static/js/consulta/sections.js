function groupNfpaData(flatData) {
    const quads = [
        { color: "Azul", quad: "blue", levels: [] },
        { color: "Rojo", quad: "red", levels: [] },
        { color: "Amarillo", quad: "yellow", levels: [] },
        { color: "Blanco", quad: "white", levels: [] }
    ];
    flatData.forEach(row => {
        const q = quads.find(x => x.quad === row.quad);
        if (q) {
            const lvl = isNaN(row.level) ? row.level : Number(row.level);
            q.levels.push({
                level: lvl,
                label: row.label,
                desc: row.desc
            });
        }
    });
    return quads;
}

function ghsSection(data = []) {
    const addBtn = state.isLoggedIn ? `
        <div class="mb-6 flex justify-end">
            <button onclick="openConsultaAddModal('ghs')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition flex items-center gap-1.5 shadow-md">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>Agregar Pictograma</span>
            </button>
        </div>
    ` : '';

    return `<div id="consulta-ghs" class="text-white">
        <p class="text-slate-300 font-medium mb-6 leading-relaxed">Los pictogramas del Sistema Globalmente Armonizado (GHS) identifican los peligros de las sustancias químicas. Cada uno representa un tipo de riesgo específico.</p>
        ${addBtn}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${data.map(p => {
                const imgHtml = p.image_path ? 
                    `<img src="${p.image_path}" alt="${p.title}" class="w-full h-full object-contain">` : 
                    `<svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
                
                const actionsHtml = state.isLoggedIn ? `
                    <div class="absolute top-2 right-2 flex gap-1.5 bg-slate-800/90 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700 z-10">
                        <button onclick="openConsultaEditModal('ghs', '${p.id}')" class="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition" title="Editar">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteConsultaItem('ghs', '${p.id}')" class="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                ` : '';

                return `
                <div class="glass-card-premium rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden hover:border-emerald-500/40 transition-all duration-200 relative bg-slate-900/90">
                    ${actionsHtml}
                    <div class="flex items-center gap-4 p-5 pb-4 border-b border-slate-700/60">
                        <div class="w-20 h-20 rounded-2xl bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden p-2 border border-slate-800">
                            ${imgHtml}
                        </div>
                        <div>
                            <h3 class="text-lg font-extrabold text-white leading-snug">${p.title}</h3>
                            <p class="text-xs text-slate-300 mt-1 font-medium leading-relaxed">${p.meaning}</p>
                        </div>
                    </div>
                    <div class="p-5 space-y-4">
                        <div>
                            <p class="text-xs font-extrabold text-emerald-400 uppercase tracking-wider mb-1.5">Ejemplos</p>
                            <ul class="text-xs text-slate-200 list-disc list-inside space-y-1 font-medium">${(p.examples || []).map(e => `<li>${e}</li>`).join('')}</ul>
                        </div>
                        <div>
                            <p class="text-xs font-extrabold text-amber-400 uppercase tracking-wider mb-1.5">Recomendaciones</p>
                            <ul class="text-xs text-slate-200 list-disc list-inside space-y-1 font-medium">${(p.recommendations || []).map(r => `<li>${r}</li>`).join('')}</ul>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>`;
}

function nfpaSection(flatData = []) {
    const quadsData = groupNfpaData(flatData);
    const quads = ['blue', 'red', 'yellow', 'white'];
    const labels = ['Azul - Salud', 'Rojo - Inflamabilidad', 'Amarillo - Reactividad', 'Blanco - Especial'];
    const bgColors = {
        blue: '#2563eb',
        red: '#dc2626',
        yellow: '#ca8a04',
        white: '#ffffff'
    };
    const textColors = {
        blue: '#ffffff',
        red: '#ffffff',
        yellow: '#ffffff',
        white: '#0f172a'
    };

    const positions = [
        'top:0;left:0;',
        'top:0;right:0;',
        'bottom:0;left:0;',
        'bottom:0;right:0;'
    ];

    window.CURRENT_NFPA_DATA = quadsData;

    return `
    <div id="consulta-nfpa" class="text-white">
        <p class="text-slate-300 font-medium mb-6 leading-relaxed">
            El diamante NFPA 704 es un sistema de identificación de peligros.
            Selecciona un nivel en cada cuadrante para ver su significado.
        </p>

        <div class="grid lg:grid-cols-2 gap-8">

            <!-- Diamante -->
            <div class="flex justify-center items-center py-4">
                <div
                    class="relative overflow-hidden border-4 border-slate-900 shadow-2xl rounded-2xl"
                    style="
                        width:260px;
                        height:260px;
                        transform:rotate(45deg);
                        background:#0f172a;
                    "
                >
                    <!-- División vertical -->
                    <div
                        style="
                            position:absolute;
                            left:50%;
                            top:0;
                            width:4px;
                            height:100%;
                            background:#0f172a;
                            transform:translateX(-50%);
                        ">
                    </div>

                    <!-- División horizontal -->
                    <div
                        style="
                            position:absolute;
                            top:50%;
                            left:0;
                            width:100%;
                            height:4px;
                            background:#0f172a;
                            transform:translateY(-50%);
                        ">
                    </div>

                    ${quads.map((q, qi) => `
                        <div
                            onclick="showNfpaLevel('${q}', '${q === 'white' ? 'W' : '0'}')"
                            class="absolute flex items-center justify-center cursor-pointer transition-all hover:brightness-110"
                            style="
                                ${positions[qi]}
                                width:50%;
                                height:50%;
                                background:${bgColors[q]};
                                color:${textColors[q]};
                            "
                        >
                            <span
                                id="nfpa-val-${q}"
                                style="
                                    transform:rotate(-45deg);
                                    font-size:2.6rem;
                                    font-weight:900;
                                    user-select:none;
                                    color: ${textColors[q]};
                                "
                            >
                                ${q === 'white' ? 'W' : '0'}
                            </span>
                        </div>
                    `).join('')}

                </div>

            </div>

            <!-- Panel derecho -->
            <div class="space-y-4">

                ${quadsData.map((data, qi) => {
                    const firstLvl = data.levels.find(l => String(l.level) === '0' || String(l.level) === 'W') || data.levels[0];
                    return `
                    <div class="glass-card-premium rounded-2xl border border-slate-700/60 p-4 shadow-lg bg-slate-900/90">

                        <div class="flex items-center gap-3 mb-3">

                            <span
                                class="w-4 h-4 rounded-full shrink-0 shadow-sm"
                                style="
                                    background:${bgColors[data.quad]};
                                    border:1px solid ${data.quad === 'white' ? '#cbd5e1' : 'transparent'};
                                ">
                            </span>

                            <h3 class="font-extrabold text-white text-base">
                                ${data.color} - ${labels[qi].split(' - ')[1]}
                            </h3>

                        </div>

                        <div class="flex flex-wrap gap-2 mb-3">

                            ${data.levels.map(l => `
                                <button
                                    id="nfpa-btn-${data.quad}-${l.level}"
                                    class="px-3 py-1.5 text-xs rounded-xl border transition font-extrabold cursor-pointer
                                    ${String(l.level) === '0' || String(l.level) === 'W'
                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-500/50'}"

                                    onclick="selectNfpaLevel(
                                        '${data.quad}',
                                        '${l.level}',
                                        this
                                    )"
                                >
                                    ${l.level}
                                </button>
                            `).join('')}

                        </div>

                        <div class="flex justify-between items-start gap-4">
                            <p
                                class="text-xs text-slate-200 flex-1 leading-relaxed font-medium"
                                id="nfpa-desc-${data.quad}"
                            >
                                ${firstLvl ? `Nivel ${firstLvl.level}: ${firstLvl.desc}` : ''}
                            </p>
                            ${state.isLoggedIn ? `
                                <button onclick="openNfpaEditBtnClick('${data.quad}')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition shrink-0" title="Editar este nivel">
                                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                </button>
                            ` : ''}
                        </div>

                    </div>
                `}).join('')}

            </div>

        </div>
    </div>
    `;
}

function openNfpaEditBtnClick(quad) {
    const valEl = document.getElementById(`nfpa-val-${quad}`);
    const activeLevel = valEl ? valEl.textContent.trim() : '0';
    openConsultaEditModal('nfpa', `${quad}:${activeLevel}`);
}
window.openNfpaEditBtnClick = openNfpaEditBtnClick;

function labMaterialsSection(data = []) {
    const addBtn = state.isLoggedIn ? `
        <div class="mb-6 flex justify-end">
            <button onclick="openConsultaAddModal('materiales')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition flex items-center gap-1.5 shadow-md">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>Agregar Material</span>
            </button>
        </div>
    ` : '';

    return `<div id="consulta-materiales" class="text-white">
        <p class="text-slate-300 font-medium mb-6 leading-relaxed">Instrumentos y equipos básicos de laboratorio, su uso y limitaciones.</p>
        ${addBtn}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${data.map(m => {
                const imgHtml = m.image_path ? 
                    `<img src="${m.image_path}" alt="${m.name}" class="w-full h-full object-contain p-4">` : 
                    `<div class="flex flex-col items-center justify-center text-slate-400">
                        <svg class="w-12 h-12 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <span class="text-xs">Agregar foto</span>
                    </div>`;

                const actionsHtml = state.isLoggedIn ? `
                    <div class="absolute top-2 right-2 flex gap-1.5 bg-slate-800/90 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700 z-10">
                        <button onclick="openConsultaEditModal('materiales', ${m.id})" class="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition" title="Editar">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteConsultaItem('materiales', ${m.id})" class="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                ` : '';

                return `
                <div class="glass-card-premium rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden hover:border-emerald-500/40 transition-all duration-200 relative bg-slate-900/90">
                    ${actionsHtml}
                    <div class="h-44 bg-slate-950 border-b border-slate-800 flex items-center justify-center relative p-2">
                        ${imgHtml}
                    </div>
                    <div class="p-5">
                        <h3 class="font-extrabold text-white text-lg">${m.name}</h3>
                        <p class="text-xs text-slate-200 mt-2 leading-relaxed font-medium">${m.desc}</p>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>`;
}

function ppeSection(data = []) {
    const addBtn = state.isLoggedIn ? `
        <div class="mb-6 flex justify-end">
            <button onclick="openConsultaAddModal('ppe')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition flex items-center gap-1.5 shadow-md">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>Agregar Equipo</span>
            </button>
        </div>
    ` : '';

    return `<div id="consulta-ppe" class="text-white">
        <p class="text-slate-300 font-medium mb-6 leading-relaxed">El equipo de protección personal (EPP) es obligatorio en el laboratorio. Cada elemento tiene una función específica.</p>
        ${addBtn}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${data.map(p => {
                const imgHtml = p.image_path ? 
                    `<img src="${p.image_path}" alt="${p.title}" class="w-full h-full object-contain">` : 
                    `<svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;

                const actionsHtml = state.isLoggedIn ? `
                    <div class="absolute top-2 right-2 flex gap-1.5 bg-slate-800/90 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700 z-10">
                        <button onclick="openConsultaEditModal('ppe', ${p.id})" class="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition" title="Editar">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteConsultaItem('ppe', ${p.id})" class="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                ` : '';

                return `
                <div class="glass-card-premium rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden hover:border-emerald-500/40 transition-all duration-200 relative bg-slate-900/90">
                    ${actionsHtml}
                    <div class="flex items-center gap-4 p-5 border-b border-slate-700/60">
                        <div class="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden p-2">
                            ${imgHtml}
                        </div>
                        <h3 class="font-extrabold text-white text-lg">${p.title}</h3>
                    </div>
                    <div class="p-5 space-y-3 text-xs text-slate-200 font-medium">
                        <div><span class="font-extrabold text-emerald-400">Propósito:</span> ${p.purpose}</div>
                        <div><span class="font-extrabold text-sky-400">Cuándo usarlo:</span> ${p.when_use}</div>
                        <div><span class="font-extrabold text-amber-400">Limitaciones:</span> ${p.limits}</div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>`;
}

function compatibilitySection(data = []) {
    const severityBadge = (s) => {
        if (s === 'critica' || s === 'crítica') return '<span class="text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-900 text-rose-300 border border-rose-400">Crítica</span>';
        if (s === 'alta') return '<span class="text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-900 text-orange-300 border border-orange-400">Alta</span>';
        return '<span class="text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-900 text-amber-300 border border-amber-400">Media</span>';
    };

    const addBtn = state.isLoggedIn ? `
        <div class="mb-6 flex justify-end">
            <button onclick="openConsultaAddModal('compatibilidad')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition flex items-center gap-1.5 shadow-md">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>Agregar Regla</span>
            </button>
        </div>
    ` : '';

    return `<div id="consulta-compatibilidad" class="text-white">
        <p class="text-slate-300 font-medium mb-6 leading-relaxed">Almacenar sustancias incompatibles juntas puede provocar reacciones peligrosas. Consulta esta tabla antes de guardar productos químicos.</p>
        ${addBtn}
        <div class="glass-card-premium rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden bg-slate-900/90">
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-950 text-white font-extrabold uppercase tracking-wider border-b border-slate-800">
                            <th class="px-6 py-4">Grupo 1</th>
                            <th class="px-6 py-4">Grupo 2</th>
                            <th class="px-6 py-4">Riesgo</th>
                            <th class="px-6 py-4 text-center w-28">Severidad</th>
                            ${state.isLoggedIn ? '<th class="px-6 py-4 text-center w-28">Acciones</th>' : ''}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/70 text-slate-200 font-medium">
                        ${data.map((c, i) => {
                            const actionsHtml = state.isLoggedIn ? `
                                <td class="px-6 py-4 text-center">
                                    <div class="flex justify-center gap-1.5">
                                        <button onclick="openConsultaEditModal('compatibilidad', ${c.id})" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition" title="Editar">
                                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                                        </button>
                                        <button onclick="deleteConsultaItem('compatibilidad', ${c.id})" class="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl transition" title="Eliminar">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </td>
                            ` : '';

                            return `
                            <tr class="hover:bg-slate-800/60 transition border-b border-slate-800/60">
                                <td class="px-6 py-4 font-extrabold text-white text-sm">${c.group1}</td>
                                <td class="px-6 py-4 text-slate-200 font-medium"><span class="text-rose-400 font-extrabold mr-1">✕</span> ${c.group2}</td>
                                <td class="px-6 py-4 text-slate-300 leading-relaxed">${c.risk}</td>
                                <td class="px-6 py-4 text-center">${severityBadge(c.severity)}</td>
                                ${actionsHtml}
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;
}

function firstAidSection(data = []) {
    const addBtn = state.isLoggedIn ? `
        <div class="mb-6 flex justify-end">
            <button onclick="openConsultaAddModal('primeros')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition flex items-center gap-1.5 shadow-md">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>Agregar Primer Auxilio</span>
            </button>
        </div>
    ` : '';

    return `<div id="consulta-primeros" class="text-white">
        <p class="text-slate-300 font-medium mb-6 leading-relaxed">En caso de accidente en el laboratorio, sigue estos pasos básicos de primeros auxilios mientras llega la atención médica.</p>
        ${addBtn}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${data.map(fa => {
                const actionsHtml = state.isLoggedIn ? `
                    <div class="absolute top-2 right-2 flex gap-1.5 bg-slate-800/90 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700 z-10">
                        <button onclick="openConsultaEditModal('primeros', ${fa.id})" class="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition" title="Editar">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteConsultaItem('primeros', ${fa.id})" class="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                ` : '';

                const imgHtml = fa.image_path ? `
                    <div class="px-5 pt-4">
                        <div class="w-full h-44 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-2">
                            <img src="${fa.image_path}" class="w-full h-full object-cover rounded-xl">
                        </div>
                    </div>
                ` : '';

                return `
                <div class="glass-card-premium rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden relative bg-slate-900/90">
                    ${actionsHtml}
                    <div class="bg-rose-500/15 px-5 py-3.5 border-b border-rose-500/30 pr-20">
                        <h3 class="font-extrabold text-white text-base flex items-center gap-2">
                            <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-400"></i>
                            ${fa.title}
                        </h3>
                    </div>
                    ${imgHtml}
                    <ol class="p-5 space-y-3">
                        ${(fa.steps || []).map((s, si) => `
                            <li class="text-xs text-slate-200 font-medium flex items-start gap-3">
                                <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">${si + 1}</span>
                                <span class="leading-relaxed mt-0.5">${s}</span>
                            </li>
                        `).join('')}
                    </ol>
                </div>
                `;
            }).join('')}
        </div>
    </div>`;
}

function safetySignsSection(data = []) {
    const addBtn = state.isLoggedIn ? `
        <div class="mb-6 flex justify-end">
            <button onclick="openConsultaAddModal('senales')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition flex items-center gap-1.5 shadow-md">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>Agregar Señal</span>
            </button>
        </div>
    ` : '';

    return `<div id="consulta-senales" class="text-white">
        <p class="text-slate-300 font-medium mb-6 leading-relaxed">Las señales de seguridad en el laboratorio utilizan colores y símbolos estandarizados para comunicar riesgos y obligaciones.</p>
        ${addBtn}
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            ${data.map(s => {
                const imgHtml = s.image_path ? 
                    `<img src="${s.image_path}" alt="${s.label}" class="w-full h-full object-contain">` : 
                    `<svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;

                const actionsHtml = state.isLoggedIn ? `
                    <div class="absolute top-2 right-2 flex gap-1.5 bg-slate-800/90 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="openConsultaEditModal('senales', ${s.id})" class="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition" title="Editar">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="deleteConsultaItem('senales', ${s.id})" class="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition" title="Eliminar">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                ` : '';

                return `
                <div class="glass-card-premium rounded-2xl border border-slate-700/60 p-5 text-center hover:border-emerald-500/40 transition-all duration-200 relative group bg-slate-900/90">
                    ${actionsHtml}
                    <div class="w-20 h-20 rounded-2xl bg-slate-950 flex items-center justify-center mx-auto mb-3 overflow-hidden p-2 border border-slate-800">
                        ${imgHtml}
                    </div>
                    <p class="text-sm font-extrabold text-white">${s.label}</p>
                    <p class="text-xs text-slate-300 mt-1 font-medium leading-relaxed">${s.desc}</p>
                </div>
                `;
            }).join('')}
        </div>
    </div>`;
}

function glossarySection(data = []) {
    const sorted = [...data].sort((a, b) => a.term.localeCompare(b.term));
    const first = sorted[0] || { term: 'Glosario vacío', def: 'Agrega términos usando el botón.', id: null };
    
    window.CURRENT_GLOSSARY = sorted;

    const addBtn = state.isLoggedIn ? `
        <div class="mb-4 flex justify-end">
            <button onclick="openConsultaAddModal('glosario')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition flex items-center gap-1 shadow-md">
                <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                <span>Nuevo Término</span>
            </button>
        </div>
    ` : '';

    return `<div id="consulta-glosario" class="text-white">
        <p class="text-slate-300 font-medium mb-6 leading-relaxed">Selecciona un término para ver su definición.</p>
        <div class="flex flex-col md:flex-row gap-5">
            <div class="w-full md:w-64 shrink-0">
                ${addBtn}
                <input type="text" id="glossary-search" placeholder="Buscar término..." class="w-full mb-3 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold text-white outline-none focus:border-emerald-500 transition" oninput="filterGlossary()">
                <div id="glossary-terms" class="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    ${sorted.map(g => `
                        <button class="glossary-term w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition ${g.term === first.term ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'}"
                                data-term="${g.term}"
                                onclick="selectGlossaryTerm('${g.term}')">
                            ${g.term}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="flex-1" id="glossary-detail">
                <div class="glass-card-premium rounded-2xl border border-slate-700/60 p-6 relative min-h-[180px] bg-slate-900/90">
                    ${state.isLoggedIn && first.id ? `
                        <div class="absolute top-4 right-4 flex gap-1.5 z-10 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                            <button onclick="openConsultaEditModal('glosario', ${first.id})" class="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition" title="Editar">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="deleteConsultaItem('glosario', ${first.id})" class="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition" title="Eliminar">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    ` : ''}
                    <h3 class="text-xl font-black text-white mb-2">${first.term}</h3>
                    <p class="text-sm text-slate-200 leading-relaxed font-medium">${first.def}</p>
                    ${first.image_path ? `
                        <div class="mt-4 max-w-sm rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
                            <img src="${first.image_path}" class="w-full h-auto object-cover rounded-lg">
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    </div>`;
}
