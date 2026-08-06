from flask import Blueprint, request, jsonify
from backend.database import get_db_connection
from backend.history_logger import log_creation, log_deletion, log_updates
from backend.routes.tools import generate_qr
import json
import time
from datetime import datetime

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

    if not row:
        conn.close()
        return jsonify({"status": "error", "message": "Sustancia no encontrada"}), 404

    data = dict(row)

    # Buscar otras presentaciones del mismo producto (mismo CAS o mismo nombre)
    related_presentations = []
    cas = (data.get('cas_number') or '').strip()
    name = (data.get('name') or '').strip()

    query_parts = []
    params = [item_id]

    if cas and cas.upper() not in ('N/D', 'N/A', '-'):
        query_parts.append('cas_number = ?')
        params.append(cas)
    if name:
        query_parts.append('LOWER(name) = LOWER(?)')
        params.append(name)

    if query_parts:
        where_clause = " OR ".join(query_parts)
        cursor.execute(f'SELECT * FROM substances WHERE id != ? AND ({where_clause}) ORDER BY id DESC', params)
        related_rows = cursor.fetchall()
        related_presentations = [dict(r) for r in related_rows]

    conn.close()

    return jsonify({
        "status": "success",
        "data": data,
        "related_presentations": related_presentations
    })

@substances_bp.route('/api/substances', methods=['POST'])
def create_substance():
    """
    Crea una sustancia, genera su QR localmente y guarda la acción en el historial.
    """
    from backend.routes.change_requests import check_and_queue_request
    pending_resp = check_and_queue_request('substances', 'CREACION')
    if pending_resp:
        return pending_resp

    data = request.get_json() or {}
    from flask import session
    user_responsible = session.get('user', request.headers.get('X-User-Responsible', 'Sistema Local'))

    name = data.get('name', '').strip()
    quantity_str = data.get('quantity', '0')
    unit = data.get('unit', '').strip()

    if not name:
        return jsonify({"status": "error", "message": "El nombre de la sustancia es obligatorio"}), 400
        
    if not unit:
        container_content = data.get('container_content', '').strip()
        if container_content:
            import re
            match = re.search(r'[a-zA-ZáéíóúÁÉÍÓÚñÑ°%]+$', container_content)
            unit = match.group(0) if match else "g"
        else:
            unit = "g"

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

    raw_pres_imgs = data.get('presentation_images')
    if isinstance(raw_pres_imgs, list):
        pres_imgs_str = json.dumps(raw_pres_imgs, ensure_ascii=False)
    elif isinstance(raw_pres_imgs, str):
        pres_imgs_str = raw_pres_imgs.strip()
    else:
        pres_imgs_str = '[]'
    optional_vals['presentation_images'] = pres_imgs_str

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Inserción inicial del registro
        cursor.execute('''
            INSERT INTO substances (
                name, chemical_formula, cas_number, composition, concentration,
                physical_state, color, odor, risks_warnings, quantity, unit,
                location, entry_date, expiration_date, responsible, observations, image_path,
                external_links, pdf_path, substance_group, stock_units, container_content, presentation_images
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            name, optional_vals['chemical_formula'], optional_vals['cas_number'],
            optional_vals['composition'], optional_vals['concentration'],
            optional_vals['physical_state'], optional_vals['color'],
            optional_vals['odor'], optional_vals['risks_warnings'],
            quantity, unit, optional_vals['location'], optional_vals['entry_date'],
            optional_vals['expiration_date'], optional_vals['responsible'],
            optional_vals['observations'], optional_vals['image_path'],
            optional_vals['external_links'], optional_vals['pdf_path'],
            optional_vals['substance_group'], stock_units, optional_vals['container_content'],
            optional_vals['presentation_images']
        ))
        
        record_id = cursor.lastrowid

        # Generar QR estático (LAB-SUB-id) que no cambia aunque se modifique la sustancia
        custom_qr_content = data.get('qr_content', '').strip() or f"LAB-SUB-{record_id}"
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
    from backend.routes.change_requests import check_and_queue_request
    pending_resp = check_and_queue_request('substances', 'EDICION', target_id=item_id)
    if pending_resp:
        return pending_resp

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

    name = data.get('name', old_row['name']).strip() if data.get('name') is not None and str(data.get('name')).strip() != '' else old_row['name']
    
    quantity_raw = data.get('quantity')
    if quantity_raw is not None and str(quantity_raw).strip() != '':
        try:
            quantity = float(quantity_raw)
        except ValueError:
            return jsonify({"status": "error", "message": "La cantidad debe ser un número válido"}), 400
    else:
        quantity = old_row['quantity']

    unit_raw = data.get('unit')
    if unit_raw is not None and str(unit_raw).strip() != '':
        unit = str(unit_raw).strip()
    else:
        unit = old_row['unit'] or 'g'

    stock_units_raw = data.get('stock_units')
    if stock_units_raw is not None and str(stock_units_raw).strip() != '':
        try:
            stock_units = int(stock_units_raw)
        except (ValueError, TypeError):
            stock_units = old_row['stock_units'] or 1
    else:
        stock_units = old_row['stock_units'] or 1

    raw_pres_imgs = data.get('presentation_images')
    if isinstance(raw_pres_imgs, list):
        pres_imgs_str = json.dumps(raw_pres_imgs, ensure_ascii=False)
    elif isinstance(raw_pres_imgs, str) and raw_pres_imgs.strip() != '':
        pres_imgs_str = raw_pres_imgs.strip()
    else:
        pres_imgs_str = old_row['presentation_images'] or '[]'

    fields = [
        'chemical_formula', 'cas_number', 'composition', 'concentration',
        'physical_state', 'color', 'odor', 'risks_warnings', 'location',
        'entry_date', 'expiration_date', 'responsible', 'observations', 'image_path',
        'external_links', 'pdf_path', 'substance_group', 'container_content'
    ]

    optional_vals = {}
    for f in fields:
        if f in data:
            val = data[f]
            optional_vals[f] = val.strip() if isinstance(val, str) else val
        else:
            optional_vals[f] = old_row[f]

    optional_vals['presentation_images'] = pres_imgs_str

    try:
        # Armar el diccionario con los nuevos datos para auditar
        new_data = {
            "name": name,
            "quantity": quantity,
            "unit": unit,
            "stock_units": stock_units,
            **optional_vals
        }

        # Preservar QR estático (no cambia al editar)
        qr_path = old_row['qr_path'] or f"/static/uploads/qrs/qr_substances_{item_id}.png"
        qr_content = old_row['qr_content'] or f"LAB-SUB-{item_id}"

        # Auditar actualizaciones campo por campo
        log_updates(conn, user_responsible, 'substances', item_id, old_row, new_data)

        # Realizar la actualización en la BD
        cursor.execute('''
            UPDATE substances SET
                name = ?, chemical_formula = ?, cas_number = ?, composition = ?, concentration = ?,
                physical_state = ?, color = ?, odor = ?, risks_warnings = ?, quantity = ?, unit = ?,
                location = ?, entry_date = ?, expiration_date = ?, responsible = ?, observations = ?,
                image_path = ?, qr_path = ?, qr_content = ?, external_links = ?, pdf_path = ?,
                substance_group = ?, stock_units = ?, container_content = ?, presentation_images = ?, updated_at = CURRENT_TIMESTAMP
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
            optional_vals['presentation_images'],
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
    from backend.routes.change_requests import check_and_queue_request
    pending_resp = check_and_queue_request('substances', 'ELIMINACION', target_id=item_id)
    if pending_resp:
        return pending_resp

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


@substances_bp.route('/api/substances/<int:item_id>/presentation-images', methods=['POST'])
def add_presentation_image(item_id):
    data = request.get_json() or {}
    image_path = data.get('image_path', '').strip()
    label = data.get('label', '').strip() or 'Nueva Presentación'

    if not image_path:
        return jsonify({"status": "error", "message": "Ruta de imagen requerida"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT presentation_images, image_path FROM substances WHERE id = ?', (item_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"status": "error", "message": "Sustancia no encontrada"}), 404

        current_imgs = []
        if row['presentation_images']:
            try:
                current_imgs = json.loads(row['presentation_images'])
            except Exception:
                current_imgs = []

        new_entry = {
            "id": int(time.time() * 1000),
            "image_path": image_path,
            "label": label,
            "created_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        current_imgs.append(new_entry)

        # Si no tiene imagen principal, asignar la primera foto de presentación cargada como principal
        if not row['image_path'] or not str(row['image_path']).strip():
            cursor.execute('UPDATE substances SET image_path = ? WHERE id = ?', (image_path, item_id))

        cursor.execute('UPDATE substances SET presentation_images = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                       (json.dumps(current_imgs, ensure_ascii=False), item_id))
        conn.commit()

        cursor.execute('SELECT * FROM substances WHERE id = ?', (item_id,))
        updated_row = cursor.fetchone()
        conn.close()

        return jsonify({"status": "success", "data": dict(updated_row), "message": "Imagen de presentación agregada correctamente"})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"status": "error", "message": str(e)}), 500


@substances_bp.route('/api/substances/<int:item_id>/presentation-images/<int:img_idx>', methods=['DELETE'])
def delete_presentation_image(item_id, img_idx):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT presentation_images FROM substances WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"status": "error", "message": "Sustancia no encontrada"}), 404

    current_imgs = []
    if row['presentation_images']:
        try:
            current_imgs = json.loads(row['presentation_images'])
        except Exception:
            current_imgs = []

    if 0 <= img_idx < len(current_imgs):
        current_imgs.pop(img_idx)

    cursor.execute('UPDATE substances SET presentation_images = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                   (json.dumps(current_imgs, ensure_ascii=False), item_id))
    conn.commit()

    cursor.execute('SELECT * FROM substances WHERE id = ?', (item_id,))
    updated_row = cursor.fetchone()
    conn.close()

    return jsonify({"status": "success", "data": dict(updated_row), "message": "Imagen de presentación eliminada correctamente"})

