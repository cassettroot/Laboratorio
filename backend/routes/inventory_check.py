from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection
from backend.utils.auth_helpers import require_login, db_connection, safe_db_error
import re

inventory_check_bp = Blueprint('inventory_check', __name__)


# Whitelist de tablas permitidas y sus queries pre-definidas (evita f-strings en SQL)
_TABLE_SELECT_QR = {
    'substances':         'SELECT * FROM substances WHERE qr_content = ?',
    'chemical_materials': 'SELECT * FROM chemical_materials WHERE qr_content = ?',
    'didactic_materials': 'SELECT * FROM didactic_materials WHERE qr_content = ?',
    'equipos':            'SELECT * FROM equipos WHERE qr_content = ?',
}
_TABLE_SELECT_ID = {
    'substances':         'SELECT * FROM substances WHERE id = ?',
    'chemical_materials': 'SELECT * FROM chemical_materials WHERE id = ?',
    'didactic_materials': 'SELECT * FROM didactic_materials WHERE id = ?',
    'equipos':            'SELECT * FROM equipos WHERE id = ?',
}

def _resolve_qr(qr_code: str, conn):
    """
    Busca en las 4 tablas de inventario el ítem que corresponde a un qr_content dado.
    Retorna (table_name, type_name, row_dict) o (None, None, None) si no se encuentra.
    """
    tables = [
        ('substances',         'substance'),
        ('chemical_materials', 'chemical_material'),
        ('didactic_materials', 'didactic_material'),
        ('equipos',            'equipo'),
    ]
    type_map = {t: n for t, n in tables}
    cursor = conn.cursor()
    for table, type_name in tables:
        try:
            cursor.execute(_TABLE_SELECT_QR[table], (qr_code,))
            row = cursor.fetchone()
            if row:
                return table, type_name, dict(row)
        except Exception:
            pass

    # Fallback: decodificar el patrón LAB-<TABLE>-<ID>
    m = re.match(r'^LAB-([A-Z_]+)-(\d+)$', qr_code, re.IGNORECASE)
    if m:
        raw_table = m.group(1).lower()
        item_id   = int(m.group(2))
        table_map = {
            'sub': 'substances',
            'substances': 'substances',
            'chemical_materials': 'chemical_materials',
            'chem': 'chemical_materials',
            'did': 'didactic_materials',
            'didactic_materials': 'didactic_materials',
            'equipo': 'equipos',
            'equipos': 'equipos',
        }
        table = table_map.get(raw_table)
        if table and table in _TABLE_SELECT_ID:
            try:
                cursor.execute(_TABLE_SELECT_ID[table], (item_id,))
                row = cursor.fetchone()
                if row:
                    return table, type_map[table], dict(row)
            except Exception:
                pass

    return None, None, None


@inventory_check_bp.route('/api/inventory-check/list', methods=['GET'])
def get_check_list():
    category = request.args.get('category', 'substances').strip()
    allowed = ['substances', 'chemical_materials', 'didactic_materials', 'equipos']
    if category not in allowed:
        return jsonify({'status': 'error', 'message': 'Categoría no válida'}), 400

    # Queries pre-definidas por categoría (sin f-strings)
    _QUERIES = {
        'substances': '''
            SELECT id, name, stock_units, qr_content, location, image_path,
                   chemical_formula, cas_number, unit, quantity
            FROM substances ORDER BY name ASC
        ''',
        'chemical_materials': '''
            SELECT id, name, quantity, qr_content, location, image_path,
                   inventory_number, serial_number, no_sep, category
            FROM chemical_materials ORDER BY name ASC
        ''',
        'didactic_materials': '''
            SELECT id, name, quantity, qr_content, location, image_path, category
            FROM didactic_materials ORDER BY name ASC
        ''',
        'equipos': '''
            SELECT
                id,
                nombre           AS name,
                1                AS quantity,
                NULL             AS qr_content,
                NULL             AS location,
                NULL             AS image_path,
                no_inventario    AS inventory_number,
                serie            AS serial_number,
                NULL             AS no_sep,
                NULL             AS category
            FROM equipos
            ORDER BY nombre ASC
        ''',
    }

    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(_QUERIES[category])
            rows = cursor.fetchall()
        return jsonify({'status': 'success', 'category': category, 'data': [dict(r) for r in rows]})
    except Exception as e:
        return jsonify({
            'status': 'success',
            'category': category,
            'data': [],
            'warning': 'No se pudo cargar el inventario de esta categoría.'
        })


@inventory_check_bp.route('/api/inventory-check/scan', methods=['POST'])
def resolve_scan():
    data = request.get_json() or {}
    qr_code = str(data.get('qr_code') or '').strip()
    if not qr_code:
        return jsonify({'status': 'error', 'message': 'Código QR vacío'}), 400

    try:
        with db_connection() as conn:
            table, type_name, item = _resolve_qr(qr_code, conn)
    except Exception as e:
        return safe_db_error(e)

    if not item:
        return jsonify({'status': 'not_found', 'message': 'QR no reconocido en el inventario'})

    return jsonify({'status': 'success', 'table': table, 'type': type_name, 'data': item})


# Queries de stock pre-definidas (sin f-strings)
_STOCK_SELECT = {
    'substances':         'SELECT stock_units AS qty FROM substances WHERE id = ?',
    'chemical_materials': 'SELECT quantity AS qty FROM chemical_materials WHERE id = ?',
    'didactic_materials': 'SELECT quantity AS qty FROM didactic_materials WHERE id = ?',
    'equipos':            'SELECT 1 AS qty FROM equipos WHERE id = ?',
}
_STOCK_UPDATE = {
    'substances':         'UPDATE substances SET stock_units = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    'chemical_materials': 'UPDATE chemical_materials SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    'didactic_materials': 'UPDATE didactic_materials SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    'equipos':            'UPDATE equipos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
}
_STOCK_SELECT_FULL = {
    'substances':         'SELECT * FROM substances WHERE id = ?',
    'chemical_materials': 'SELECT * FROM chemical_materials WHERE id = ?',
    'didactic_materials': 'SELECT * FROM didactic_materials WHERE id = ?',
    'equipos':            'SELECT * FROM equipos WHERE id = ?',
}

@inventory_check_bp.route('/api/inventory-check/add-stock', methods=['POST'])
@require_login
def add_stock():
    data      = request.get_json() or {}
    table     = str(data.get('table') or '').strip()
    item_id   = data.get('id')
    increment = int(data.get('increment', 1))

    allowed_tables = ['substances', 'chemical_materials', 'didactic_materials', 'equipos']
    if table not in allowed_tables:
        return jsonify({'status': 'error', 'message': 'Tabla no válida'}), 400
    if not item_id:
        return jsonify({'status': 'error', 'message': 'ID requerido'}), 400

    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(_STOCK_SELECT[table], (item_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({'status': 'error', 'message': 'Elemento no encontrado'}), 404

            if table == 'equipos':
                # Equipos no tienen cantidad numérica real
                cursor.execute(_STOCK_UPDATE['equipos'], (item_id,))
            else:
                new_qty = (row['qty'] or 1) + increment
                cursor.execute(_STOCK_UPDATE[table], (new_qty, item_id))

            conn.commit()
            cursor.execute(_STOCK_SELECT_FULL[table], (item_id,))
            updated = cursor.fetchone()
        return jsonify({'status': 'success', 'data': dict(updated)})
    except Exception as e:
        return safe_db_error(e)


@inventory_check_bp.route('/api/inventory-check/save-session', methods=['POST'])
def save_session():
    data        = request.get_json() or {}
    category    = str(data.get('category') or 'unknown')
    total       = int(data.get('total', 0))
    checked     = int(data.get('checked', 0))
    missing_ids = data.get('missing_ids', [])

    responsible = session.get('user', 'Sistema Local')

    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            detail = (
                f"Chequeo de inventario — {category} | "
                f"Presentes: {checked}/{total} | "
                f"IDs faltantes: {missing_ids}"
            )
            cursor.execute('''
                INSERT INTO change_history (table_name, record_id, action, changed_by, details, timestamp)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (category, 0, 'CHEQUEO', responsible, detail))
            conn.commit()
        return jsonify({'status': 'success', 'message': 'Sesión de chequeo guardada'})
    except Exception as e:
        return safe_db_error(e)
