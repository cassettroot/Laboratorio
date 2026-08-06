const EXPORT_COLORS = {
    primary: 'FF0D9488',
    primaryDark: 'FF0F766E',
    headerText: 'FFFFFFFF',
    bandLight: 'FFF0FDFA',
    bandWhite: 'FFFFFFFF',
    text: 'FF1E293B',
    border: 'FFCBD5E1'
};

function colLetter(n) {
    let s = '';
    while (n > 0) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); }
    return s;
}

async function buildWorkbook(sheetName, title, headers, rows) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LabKeep - ITMA II Laboratorio';
    workbook.created = new Date();

    const ws = workbook.addWorksheet(sheetName);

    // Title row
    const lastCol = colLetter(headers.length);
    ws.mergeCells(`A1:${lastCol}1`);
    const titleCell = ws.getCell('A1');
    titleCell.value = `TECNM - ITMA II  |  ${title}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E293B' }, name: 'Calibri' };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(1).height = 34;

    // Subtitle row (date)
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    ws.mergeCells(`A2:${lastCol}2`);
    const dateCell = ws.getCell('A2');
    dateCell.value = `Reporte generado el ${dateStr}  |  Total de registros: ${rows.length}`;
    dateCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' }, name: 'Calibri' };
    dateCell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(2).height = 22;

    // Calculate auto column widths with padding
    headers.forEach((h, colIdx) => {
        let maxLen = h.length;
        rows.forEach(r => {
            const val = (r[colIdx] !== null && r[colIdx] !== undefined) ? String(r[colIdx]) : '';
            if (val.length > maxLen) maxLen = val.length;
        });
        const col = ws.getColumn(colIdx + 1);
        col.width = Math.min(Math.max(maxLen + 5, 14), 55);
    });

    // Table with data
    const tableStartRow = 3;
    const tableEndRow = tableStartRow + rows.length - 1;
    const tableRef = `A${tableStartRow}:${lastCol}${tableEndRow}`;
    ws.addTable({
        name: sheetName.replace(/[^a-zA-Z0-9_]/g, '_'),
        ref: tableRef,
        headerRow: true,
        totalsRow: false,
        style: {
            theme: 'TableStyleMedium2',
            showRowStripes: true,
            showFirstColumn: false
        },
        columns: headers.map(h => ({ name: h, filterButton: true })),
        rows: rows
    });

    // Header styling
    const headerRow = ws.getRow(tableStartRow);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    headerRow.height = 30;

    // Data rows styling
    for (let i = 0; i < rows.length; i++) {
        const row = ws.getRow(tableStartRow + 1 + i);
        const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
        row.eachCell((cell, j) => {
            cell.font = { size: 10, name: 'Calibri', color: { argb: 'FF334155' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            const isLeft = headers[j - 1] === 'Material' || headers[j - 1] === 'Sustancia' || headers[j - 1] === 'Descripción / Material' || headers[j - 1] === 'Observaciones';
            cell.alignment = { vertical: 'middle', horizontal: isLeft ? 'left' : 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
        });
        row.height = 24;
    }

    ws.views = [{ state: 'frozen', ySplit: 3 }];
    return workbook;
}

function downloadXlsx(workbook, filename) {
    workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace(/\.xls$/, '.xlsx');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }).catch(err => {
        alert('Error al generar el archivo Excel: ' + err.message);
    });
}

function exportTableToExcel(type) {
    let items = [];
    let sheetName = '';
    let title = '';
    let headers = [];

    const spaceId = localStorage.getItem('inventory_id') || 'inventario';
    const spaceNames = {
        'inventario': 'Laboratorio_de_Quimica',
        'oficina': 'Inventario_Oficina',
        'sistemas': 'Laboratorio_de_Sistemas'
    };
    const deptName = spaceNames[spaceId] || 'Laboratorio';
    const today = new Date().toISOString().split('T')[0];

    if (type === 'substances') {
        items = state.substances || [];
        sheetName = 'Sustancias';
        title = `Inventario de Sustancias Químicas - ${deptName.replace(/_/g, ' ')}`;
        headers = ['ID Sistema', 'ID Original (Excel)', 'Sustancia', 'Grupo', 'Fórmula', 'CAS', 'Estado', 'Cantidad', 'Unidad', 'Ubicación', 'Caducidad', 'Responsable', 'Observaciones'];
    } else if (type === 'chemical_materials' || type === 'equipos') {
        items = (state.chemMaterials && state.chemMaterials.length > 0) ? state.chemMaterials : (state.equipos || []);
        sheetName = 'Materiales y Equipos';
        title = `Inventario de Materiales y Equipos - ${deptName.replace(/_/g, ' ')}`;
        headers = ['ID Sistema', 'ID Original (Excel)', 'Ubicación', 'Descripción / Material', 'No. Inventario', 'No. Serie', 'No. SEP', 'Estado', 'Responsable', 'Observaciones'];
    } else if (type === 'didactic_materials') {
        items = state.didMaterials || [];
        sheetName = 'Material Didáctico';
        title = `Inventario de Materiales Didácticos - ${deptName.replace(/_/g, ' ')}`;
        headers = ['ID Sistema', 'ID Original (Excel)', 'Material', 'Categoría', 'Estado', 'Cantidad', 'Ubicación', 'Responsable', 'Observaciones'];
    }

    if (!items || items.length === 0) {
        alert('No hay registros en la tabla activa para exportar.');
        return;
    }

    if (typeof ExcelJS === 'undefined') {
        alert('La librería ExcelJS no está disponible. Verifique su conexión a internet.');
        return;
    }

    let rows;
    if (type === 'substances') {
        rows = items.map(s => [
            s.id, s.original_id || '-', s.name, s.substance_group || '', s.chemical_formula || '',
            s.cas_number || '', s.physical_state || '', s.quantity, s.unit,
            s.location || '', s.expiration_date || '', s.responsible || '', s.observations || ''
        ]);
    } else if (type === 'chemical_materials') {
        rows = items.map(m => [
            m.id, m.original_id || '-', m.location || '-', m.name, m.inventory_number || '-', m.serial_number || '-',
            m.no_sep || '-', m.status || 'Buenas Condiciones', m.responsible || '-', m.observations || '-'
        ]);
    } else {
        rows = items.map(d => [
            d.id, d.original_id || '-', d.name, d.category || '', d.status || '', d.quantity,
            d.location || '', d.responsible || '', d.observations || ''
        ]);
    }

    const customFilename = `Inventario_${deptName}_${today}.xlsx`;

    buildWorkbook(sheetName, title, headers, rows).then(wb => {
        downloadXlsx(wb, customFilename);
    });
}

function exportHistoryExcel() {
    if (state.history.length === 0) {
        alert('No hay registros en el historial activo para exportar.');
        return;
    }

    if (typeof ExcelJS === 'undefined') {
        alert('La librería ExcelJS no está disponible. Verifique su conexión a internet.');
        return;
    }

    const headers = ['Fecha y Hora', 'Responsable', 'Acción', 'Módulo', 'ID Registro', 'Campo', 'Valor Anterior', 'Valor Nuevo'];

    const rows = state.history.map(h => {
        const module = h.table_name === 'substances' ? 'Sustancias'
            : h.table_name === 'chemical_materials' ? 'Mat. Químico'
            : 'Mat. Didáctico';
        return [
            h.timestamp, h.user_responsible, h.action, module,
            h.record_id, h.field_name || '', h.old_value || '', h.new_value || ''
        ];
    });

    buildWorkbook('Historial', 'Historial de Auditoría', headers, rows).then(wb => {
        downloadXlsx(wb, 'Historial_Cambios_Inventario.xlsx');
    });
}
