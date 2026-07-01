from flask import Blueprint, request, jsonify
from backend.database import get_db_connection
from backend.history_logger import log_creation, log_deletion, log_updates
from backend.routes.tools import generate_qr

chem_materials_bp = Blueprint('chem_materials', __name__)

@chem_materials_bp.route('/api/chemical-materials', methods=['GET'])
def get_materials():
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    location = request.args.get('location', '').strip()
    status = request.args.get('status', '').strip()
    similar_to = request.args.get('similar_to', '').strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Búsqueda por similitud
    if similar_to:
        cursor.execute('SELECT * FROM chemical_materials WHERE id = ?', (similar_to,))
        base_item = cursor.fetchone()
        if not base_item:
            conn.close()
            return jsonify({"status": "error", "message": "Material base no encontrado"}), 404
        
        cursor.execute('''
            SELECT * FROM chemical_materials 
            WHERE id != ? AND (
                (category IS NOT NULL AND category != '' AND category = ?) OR 
                (status IS NOT NULL AND status != '' AND status = ?) OR 
                (location IS NOT NULL AND location != '' AND location = ?)
            )
        ''', (base_item['id'], base_item['category'], base_item['status'], base_item['location']))
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"status": "success", "data": [dict(r) for r in rows]})

    query = 'SELECT * FROM chemical_materials WHERE 1=1'
    params = []

    if search:
        query += ''' AND (
            name LIKE ? OR 
            category LIKE ? OR 
            location LIKE ? OR 
            status LIKE ? OR 
            responsible LIKE ? OR 
            observations LIKE ?
        )'''
        like_search = f'%{search}%'
        params.extend([like_search] * 6)

    if category:
        query += ' AND category LIKE ?'
        params.append(f'%{category}%')

    if location:
        query += ' AND location LIKE ?'
        params.append(f'%{location}%')

    if status:
        query += ' AND status LIKE ?'
        params.append(f'%{status}%')

    query += ' ORDER BY id DESC'

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return jsonify({"status": "success", "data": [dict(r) for r in rows]})

@chem_materials_bp.route('/api/chemical-materials/<int:item_id>', methods=['GET'])
def get_material(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM chemical_materials WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"status": "error", "message": "Material no encontrado"}), 404

    return jsonify({"status": "success", "data": dict(row)})

@chem_materials_bp.route('/api/chemical-materials', methods=['POST'])
def create_material():
    data = request.get_json() or {}
    from flask import session
    user_responsible = session.get('user', request.headers.get('X-User-Responsible', 'Sistema Local'))

    name = data.get('name', '').strip()
    quantity_str = data.get('quantity', '0')
    unit = data.get('unit', 'piezas').strip()

    if not name:
        return jsonify({"status": "error", "message": "El nombre del material es obligatorio"}), 400

    try:
        quantity = float(quantity_str)
    except ValueError:
        return jsonify({"status": "error", "message": "La cantidad debe ser un número válido"}), 400

    fields = ['category', 'location', 'status', 'responsible', 'observations', 'image_path']
    optional_vals = {f: data.get(f, '').strip() if data.get(f) is not None else None for f in fields}

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO chemical_materials (
                name, category, quantity, unit, location, status, responsible, observations, image_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            name, optional_vals['category'], quantity, unit, optional_vals['location'],
            optional_vals['status'], optional_vals['responsible'], optional_vals['observations'],
            optional_vals['image_path']
        ))
        
        record_id = cursor.lastrowid

        # Generar QR
        custom_qr_content = data.get('qr_content', '').strip() or None
        qr_path, qr_content = generate_qr('chemical_materials', record_id, custom_qr_content)

        cursor.execute('''
            UPDATE chemical_materials 
            SET qr_path = ?, qr_content = ? 
            WHERE id = ?
        ''', (qr_path, qr_content, record_id))

        log_creation(conn, user_responsible, 'chemical_materials', record_id)
        conn.commit()
        
        cursor.execute('SELECT * FROM chemical_materials WHERE id = ?', (record_id,))
        new_row = cursor.fetchone()
        conn.close()

        return jsonify({"status": "success", "data": dict(new_row)}), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"status": "error", "message": str(e)}), 500

@chem_materials_bp.route('/api/chemical-materials/<int:item_id>', methods=['PUT'])
def update_material(item_id):
    data = request.get_json() or {}
    from flask import session
    user_responsible = session.get('user', request.headers.get('X-User-Responsible', 'Sistema Local'))

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM chemical_materials WHERE id = ?', (item_id,))
    old_row = cursor.fetchone()
    if not old_row:
        conn.close()
        return jsonify({"status": "error", "message": "Material no encontrado"}), 404

    name = data.get('name', '').strip()
    quantity_str = data.get('quantity', '0')
    unit = data.get('unit', 'piezas').strip()

    if not name:
        return jsonify({"status": "error", "message": "El nombre del material es obligatorio"}), 400

    try:
        quantity = float(quantity_str)
    except ValueError:
        return jsonify({"status": "error", "message": "La cantidad debe ser un número"}), 400

    fields = ['category', 'location', 'status', 'responsible', 'observations', 'image_path']
    optional_vals = {f: data.get(f, '').strip() if data.get(f) is not None else None for f in fields}

    try:
        new_data = {
            "name": name,
            "quantity": quantity,
            "unit": unit,
            **optional_vals
        }

        # Manejo de cambios en el QR
        new_qr_content = data.get('qr_content', '').strip() or f"LAB-CHEMICAL_MATERIALS-{item_id}"
        qr_path = old_row['qr_path']
        qr_content = old_row['qr_content']
        
        if new_qr_content != old_row['qr_content']:
            qr_path, qr_content = generate_qr('chemical_materials', item_id, new_qr_content)
            new_data["qr_content"] = qr_content

        log_updates(conn, user_responsible, 'chemical_materials', item_id, old_row, new_data)

        cursor.execute('''
            UPDATE chemical_materials SET
                name = ?, category = ?, quantity = ?, unit = ?, location = ?, status = ?,
                responsible = ?, observations = ?, image_path = ?, qr_path = ?, qr_content = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            name, optional_vals['category'], quantity, unit, optional_vals['location'],
            optional_vals['status'], optional_vals['responsible'], optional_vals['observations'],
            optional_vals['image_path'], qr_path, qr_content, item_id
        ))

        conn.commit()
        
        cursor.execute('SELECT * FROM chemical_materials WHERE id = ?', (item_id,))
        updated_row = cursor.fetchone()
        conn.close()

        return jsonify({"status": "success", "data": dict(updated_row)})

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"status": "error", "message": str(e)}), 500

@chem_materials_bp.route('/api/chemical-materials/<int:item_id>', methods=['DELETE'])
def delete_material(item_id):
    from flask import session
    user_responsible = session.get('user', request.headers.get('X-User-Responsible', 'Sistema Local'))

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM chemical_materials WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"status": "error", "message": "Material no encontrado"}), 404

    try:
        log_deletion(conn, user_responsible, 'chemical_materials', item_id)
        cursor.execute('DELETE FROM chemical_materials WHERE id = ?', (item_id,))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Material químico eliminado correctamente"})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"status": "error", "message": str(e)}), 500
