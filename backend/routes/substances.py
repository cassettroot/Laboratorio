from flask import Blueprint, request, jsonify
from backend.database import get_db_connection
from backend.history_logger import log_creation, log_deletion, log_updates
from backend.routes.tools import generate_qr
import sqlite3

substances_bp = Blueprint('substances', __name__)




@substances_bp.route('/api/substances', methods=['GET'])
def get_substances():
    """
    Obtiene la lista de sustancias químicas con soporte para búsquedas y filtros parciales.
    Si se proporciona el parámetro 'similar_to', busca sustancias parecidas.
    """
    search = request.args.get('search', '').strip()
    physical_state = request.args.get('physical_state', '').strip()
    color = request.args.get('color', '').strip()
    location = request.args.get('location', '').strip()
    similar_to = request.args.get('similar_to', '').strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Búsqueda de parecidos (Requerimiento 7)
    if similar_to:
        cursor.execute('SELECT * FROM substances WHERE id = ?', (similar_to,))
        base_item = cursor.fetchone()
        if not base_item:
            conn.close()
            return jsonify({"status": "error", "message": "Elemento base para búsqueda de similitud no encontrado"}), 404
        
        # Buscar sustancias con el mismo estado físico o ubicación, excluyendo la misma sustancia
        cursor.execute('''
            SELECT * FROM substances 
            WHERE id != ? AND (
                (physical_state IS NOT NULL AND physical_state != '' AND physical_state = ?) OR 
                (location IS NOT NULL AND location != '' AND location = ?)
            )
        ''', (base_item['id'], base_item['physical_state'], base_item['location']))
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"status": "success", "data": [dict(r) for r in rows]})

    # Búsqueda normal con filtros múltiples
    query = 'SELECT * FROM substances WHERE 1=1'
    params = []

    if search:
        query += ''' AND (
            name LIKE ? OR 
            chemical_formula LIKE ? OR 
            cas_number LIKE ? OR 
            location LIKE ? OR 
            responsible LIKE ? OR 
            observations LIKE ?
        )'''
        like_search = f'%{search}%'
        params.extend([like_search] * 6)

    if physical_state:
        query += ' AND physical_state LIKE ?'
        params.append(f'%{physical_state}%')

    if color:
        query += ' AND color LIKE ?'
        params.append(f'%{color}%')

    if location:
        query += ' AND location LIKE ?'
        params.append(f'%{location}%')

    # Ordenar por fecha de última actualización o ID de forma descendente
    query += ' ORDER BY id DESC'

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return jsonify({"status": "success", "data": [dict(r) for r in rows]})

@substances_bp.route('/api/substances/<int:item_id>', methods=['GET'])
def get_substance(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM substances WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"status": "error", "message": "Sustancia no encontrada"}), 404

    return jsonify({"status": "success", "data": dict(row)})

@substances_bp.route('/api/substances', methods=['POST'])
def create_substance():
    """
    Crea una sustancia, genera su QR localmente y guarda la acción en el historial.
    """
    data = request.get_json() or {}
    from flask import session
    user_responsible = session.get('user', request.headers.get('X-User-Responsible', 'Sistema Local'))

    name = data.get('name', '').strip()
    quantity_str = data.get('quantity', '0')
    unit = data.get('unit', '').strip()

    if not name:
        return jsonify({"status": "error", "message": "El nombre de la sustancia es obligatorio"}), 400
    if not unit:
        return jsonify({"status": "error", "message": "La unidad de medida es obligatoria"}), 400

    try:
        quantity = float(quantity_str)
    except ValueError:
        return jsonify({"status": "error", "message": "La cantidad debe ser un número válido"}), 400

    try:
        stock_units = int(data.get('stock_units', 1))
    except (ValueError, TypeError):
        stock_units = 1

    # Extraer campos opcionales
    fields = [
        'chemical_formula', 'cas_number', 'composition', 'concentration',
        'physical_state', 'color', 'odor', 'risks_warnings', 'location',
        'entry_date', 'expiration_date', 'responsible', 'observations', 'image_path',
        'external_links', 'pdf_path', 'substance_group', 'container_content'
    ]
    optional_vals = {f: data.get(f, '').strip() if data.get(f) is not None else None for f in fields}

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Inserción inicial del registro
        cursor.execute('''
            INSERT INTO substances (
                name, chemical_formula, cas_number, composition, concentration,
                physical_state, color, odor, risks_warnings, quantity, unit,
                location, entry_date, expiration_date, responsible, observations, image_path,
                external_links, pdf_path, substance_group, stock_units, container_content
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            name, optional_vals['chemical_formula'], optional_vals['cas_number'],
            optional_vals['composition'], optional_vals['concentration'],
            optional_vals['physical_state'], optional_vals['color'],
            optional_vals['odor'], optional_vals['risks_warnings'],
            quantity, unit, optional_vals['location'], optional_vals['entry_date'],
            optional_vals['expiration_date'], optional_vals['responsible'],
            optional_vals['observations'], optional_vals['image_path'],
            optional_vals['external_links'], optional_vals['pdf_path'],
            optional_vals['substance_group'], stock_units, optional_vals['container_content']
        ))
        
        record_id = cursor.lastrowid

        # Generar QR único (estático para evitar que cambie el patrón impreso al actualizar)
        custom_qr_content = data.get('qr_content', '').strip() or f"LAB-SUBSTANCES-{record_id}"

        qr_path, qr_content = generate_qr('substances', record_id, custom_qr_content)

        # Actualizar ruta y contenido de QR
        cursor.execute('''
            UPDATE substances 
            SET qr_path = ?, qr_content = ? 
            WHERE id = ?
        ''', (qr_path, qr_content, record_id))

        # Registrar en historial
        log_creation(conn, user_responsible, 'substances', record_id)

        conn.commit()
        
        # Recuperar registro insertado final
        cursor.execute('SELECT * FROM substances WHERE id = ?', (record_id,))
        new_row = cursor.fetchone()
        conn.close()

        return jsonify({"status": "success", "data": dict(new_row)}), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"status": "error", "message": str(e)}), 500

@substances_bp.route('/api/substances/<int:item_id>', methods=['PUT'])
def update_substance(item_id):
    """
    Actualiza la sustancia, audita campos modificados y regenera el QR si cambió su contenido.
    """
    data = request.get_json() or {}
    from flask import session
    user_responsible = session.get('user', request.headers.get('X-User-Responsible', 'Sistema Local'))

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM substances WHERE id = ?', (item_id,))
    old_row = cursor.fetchone()
    if not old_row:
        conn.close()
        return jsonify({"status": "error", "message": "Sustancia no encontrada"}), 404

    name = data.get('name', '').strip()
    quantity_str = data.get('quantity', '0')
    unit = data.get('unit', '').strip()

    if not name:
        return jsonify({"status": "error", "message": "El nombre de la sustancia es obligatorio"}), 400
    if not unit:
        return jsonify({"status": "error", "message": "La unidad de medida es obligatoria"}), 400

    try:
        quantity = float(quantity_str)
    except ValueError:
        return jsonify({"status": "error", "message": "La cantidad debe ser un número válido"}), 400

    try:
        stock_units = int(data.get('stock_units', 1))
    except (ValueError, TypeError):
        stock_units = 1

    fields = [
        'chemical_formula', 'cas_number', 'composition', 'concentration',
        'physical_state', 'color', 'odor', 'risks_warnings', 'location',
        'entry_date', 'expiration_date', 'responsible', 'observations', 'image_path',
        'external_links', 'pdf_path', 'substance_group', 'container_content'
    ]
    optional_vals = {f: data.get(f, '').strip() if data.get(f) is not None else None for f in fields}

    try:
        # Armar el diccionario con los nuevos datos para auditar
        new_data = {
            "name": name,
            "quantity": quantity,
            "unit": unit,
            "stock_units": stock_units,
            **optional_vals
        }

        # Manejo de cambios en el QR
        custom_qr_content = data.get('qr_content', '').strip() or f"LAB-SUBSTANCES-{item_id}"
        new_qr_content = custom_qr_content

        qr_path = old_row['qr_path']
        qr_content = old_row['qr_content']
        
        # Si se especificó un contenido de QR nuevo (o cambiaron los datos de la sustancia) y es distinto al actual
        if new_qr_content != old_row['qr_content']:
            qr_path, qr_content = generate_qr('substances', item_id, new_qr_content)
            new_data["qr_content"] = qr_content

        # Auditar actualizaciones campo por campo
        log_updates(conn, user_responsible, 'substances', item_id, old_row, new_data)

        # Realizar la actualización en la BD
        cursor.execute('''
            UPDATE substances SET
                name = ?, chemical_formula = ?, cas_number = ?, composition = ?, concentration = ?,
                physical_state = ?, color = ?, odor = ?, risks_warnings = ?, quantity = ?, unit = ?,
                location = ?, entry_date = ?, expiration_date = ?, responsible = ?, observations = ?,
                image_path = ?, qr_path = ?, qr_content = ?, external_links = ?, pdf_path = ?,
                substance_group = ?, stock_units = ?, container_content = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            name, optional_vals['chemical_formula'], optional_vals['cas_number'],
            optional_vals['composition'], optional_vals['concentration'],
            optional_vals['physical_state'], optional_vals['color'],
            optional_vals['odor'], optional_vals['risks_warnings'],
            quantity, unit, optional_vals['location'], optional_vals['entry_date'],
            optional_vals['expiration_date'], optional_vals['responsible'],
            optional_vals['observations'], optional_vals['image_path'],
            qr_path, qr_content, optional_vals['external_links'], optional_vals['pdf_path'],
            optional_vals['substance_group'], stock_units, optional_vals['container_content'],
            item_id
        ))

        conn.commit()
        
        # Recuperar registro actualizado
        cursor.execute('SELECT * FROM substances WHERE id = ?', (item_id,))
        updated_row = cursor.fetchone()
        conn.close()

        return jsonify({"status": "success", "data": dict(updated_row)})

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"status": "error", "message": str(e)}), 500

@substances_bp.route('/api/substances/<int:item_id>', methods=['DELETE'])
def delete_substance(item_id):
    from flask import session
    user_responsible = session.get('user', request.headers.get('X-User-Responsible', 'Sistema Local'))

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM substances WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"status": "error", "message": "Sustancia no encontrada"}), 404

    try:
        # Registrar eliminación en historial
        log_deletion(conn, user_responsible, 'substances', item_id)
        
        # Eliminar físicamente
        cursor.execute('DELETE FROM substances WHERE id = ?', (item_id,))
        conn.commit()
        conn.close()
        
        return jsonify({"status": "success", "message": "Sustancia eliminada correctamente"})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"status": "error", "message": str(e)}), 500
