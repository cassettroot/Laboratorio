import json
import sqlite3
from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection
from backend.history_logger import log_creation, log_updates, log_deletion
from backend.routes.tools import generate_qr

change_requests_bp = Blueprint('change_requests', __name__)

@change_requests_bp.route('/api/change-requests', methods=['GET'])
def get_change_requests():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado. Inicie sesión."}), 401

    # Necesitamos saber el rol de usuario para filtrar
    from backend.database import get_user_by_username
    user_data = get_user_by_username(session['user'])
    if not user_data:
        return jsonify({"status": "error", "message": "Usuario no encontrado"}), 404

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_data['role'] == 'admin':
        # Admin ve todas las solicitudes
        cursor.execute('SELECT * FROM change_requests ORDER BY id DESC')
    else:
        # Responsable ve solo las suyas
        cursor.execute('SELECT * FROM change_requests WHERE requester_username = ? ORDER BY id DESC', (session['user'],))

    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append(dict(r))

    return jsonify({"status": "success", "data": result})

@change_requests_bp.route('/api/change-requests/<int:req_id>', methods=['GET'])
def get_change_request(req_id):
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado. Inicie sesión."}), 401

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM change_requests WHERE id = ?', (req_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"status": "error", "message": "Solicitud no encontrada"}), 404

    # Validar permisos (el responsable solo puede ver la suya)
    from backend.database import get_user_by_username
    user_data = get_user_by_username(session['user'])
    if user_data and user_data['role'] != 'admin' and row['requester_username'] != session['user']:
        return jsonify({"status": "error", "message": "Acceso denegado."}), 403

    return jsonify({"status": "success", "data": dict(row)})

@change_requests_bp.route('/api/change-requests/<int:req_id>/approve', methods=['POST'])
def approve_change_request(req_id):
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado. Inicie sesión."}), 401

    from backend.database import get_user_by_username
    user_data = get_user_by_username(session['user'])
    if not user_data or user_data['role'] != 'admin' or user_data['active'] != 1:
        return jsonify({"status": "error", "message": "Acceso denegado. Permisos de administrador activo requeridos."}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM change_requests WHERE id = ?', (req_id,))
        req = cursor.fetchone()
        if not req:
            return jsonify({"status": "error", "message": "Solicitud no encontrada."}), 404

        if req['status'] != 'PENDIENTE':
            return jsonify({"status": "error", "message": "Esta solicitud ya ha sido procesada."}), 400

        # Aplicar el cambio a la base de datos
        applied_id = apply_request_to_db(cursor, req)
        
        # Actualizar estado de la solicitud y registrar qué administrador aprobó
        admin_username = session.get('user', 'admin')
        cursor.execute(
            "UPDATE change_requests SET status = 'APROBADO', approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (admin_username, req_id)
        )
        
        conn.commit()

        # Notificar al usuario por correo
        try:
            from backend.services.email_service import notify_user_request_status
            notify_user_request_status(req['requester_username'], dict(req), 'APROBADO')
        except Exception as e:
            print("[EMAIL WARN]", str(e))

        return jsonify({"status": "success", "message": f"Solicitud aprobada por {admin_username} y cambios aplicados exitosamente.", "target_id": applied_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": f"Error al procesar la aprobación: {str(e)}"}), 500
    finally:
        conn.close()

@change_requests_bp.route('/api/change-requests/<int:req_id>/reject', methods=['POST'])
def reject_change_request(req_id):
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado. Inicie sesión."}), 401

    from backend.database import get_user_by_username
    user_data = get_user_by_username(session['user'])
    if not user_data or user_data['role'] != 'admin' or user_data['active'] != 1:
        return jsonify({"status": "error", "message": "Acceso denegado. Permisos de administrador activo requeridos."}), 403

    data = request.get_json() or {}
    feedback = data.get('feedback', '').strip()
    if not feedback:
        return jsonify({"status": "error", "message": "El mensaje de retroalimentación es requerido para pedir corrección."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM change_requests WHERE id = ?', (req_id,))
        req = cursor.fetchone()
        if not req:
            return jsonify({"status": "error", "message": "Solicitud no encontrada."}), 404

        if req['status'] != 'PENDIENTE':
            return jsonify({"status": "error", "message": "Esta solicitud ya ha sido procesada."}), 400

        admin_username = session.get('user', 'admin')
        cursor.execute(
            "UPDATE change_requests SET status = 'CORRECCION', feedback = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (feedback, admin_username, req_id)
        )
        conn.commit()

        # Notificar al usuario por correo
        try:
            from backend.services.email_service import notify_user_request_status
            notify_user_request_status(req['requester_username'], dict(req), 'RECHAZADO', feedback)
        except Exception as e:
            print("[EMAIL WARN]", str(e))

        return jsonify({"status": "success", "message": "Solicitud devuelta para corrección."})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@change_requests_bp.route('/api/change-requests/<int:req_id>', methods=['PUT'])
def update_change_request(req_id):
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado. Inicie sesión."}), 401

    data = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM change_requests WHERE id = ?', (req_id,))
        req = cursor.fetchone()
        if not req:
            return jsonify({"status": "error", "message": "Solicitud no encontrada."}), 404

        # Validar permisos
        if req['requester_username'] != session['user']:
            return jsonify({"status": "error", "message": "Acceso denegado. No eres el creador de esta solicitud."}), 403

        # Reiniciar estado a PENDIENTE, actualizar data y limpiar feedback anterior
        cursor.execute('''
            UPDATE change_requests 
            SET data = ?, status = 'PENDIENTE', feedback = NULL, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (json.dumps(data), req_id))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Solicitud modificada y re-enviada al administrador."})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()


# Helper para aplicar cambios en base de datos
def apply_request_to_db(cursor, req):
    req_type = req['type']
    req_action = req['action']
    target_id = req['target_id']
    requester = req['requester_username']
    data = json.loads(req['data']) if req['data'] else {}

    if req_type == 'substances':
        if req_action == 'CREACION':
            cursor.execute('''
                INSERT INTO substances (
                    name, chemical_formula, cas_number, composition, concentration,
                    physical_state, color, odor, risks_warnings, quantity, unit,
                    location, entry_date, expiration_date, responsible, observations, image_path,
                    external_links, pdf_path, substance_group, stock_units, container_content
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('name'), data.get('chemical_formula'), data.get('cas_number'),
                data.get('composition'), data.get('concentration'), data.get('physical_state'),
                data.get('color'), data.get('odor'), data.get('risks_warnings'),
                float(data.get('quantity', 0)), data.get('unit', 'g'), data.get('location'),
                data.get('entry_date'), data.get('expiration_date'), data.get('responsible', requester),
                data.get('observations'), data.get('image_path'), data.get('external_links'),
                data.get('pdf_path'), data.get('substance_group'), int(data.get('stock_units', 1)),
                data.get('container_content')
            ))
            new_id = cursor.lastrowid
            custom_qr = data.get('qr_content', '').strip() or f"LAB-SUBSTANCES-{new_id}"
            qr_path, qr_content = generate_qr('substances', new_id, custom_qr)
            cursor.execute('UPDATE substances SET qr_path = ?, qr_content = ? WHERE id = ?', (qr_path, qr_content, new_id))
            log_creation(cursor.connection, requester, 'substances', new_id)
            return new_id

        elif req_action == 'EDICION':
            cursor.execute('SELECT * FROM substances WHERE id = ?', (target_id,))
            old_row = cursor.fetchone()
            if old_row:
                new_data = {
                    "name": data.get('name'), "chemical_formula": data.get('chemical_formula'),
                    "cas_number": data.get('cas_number'), "composition": data.get('composition'),
                    "concentration": data.get('concentration'), "physical_state": data.get('physical_state'),
                    "color": data.get('color'), "odor": data.get('odor'), "risks_warnings": data.get('risks_warnings'),
                    "quantity": float(data.get('quantity', 0)), "unit": data.get('unit', 'g'),
                    "location": data.get('location'), "entry_date": data.get('entry_date'),
                    "expiration_date": data.get('expiration_date'), "responsible": data.get('responsible'),
                    "observations": data.get('observations'), "image_path": data.get('image_path'),
                    "external_links": data.get('external_links'), "pdf_path": data.get('pdf_path'),
                    "substance_group": data.get('substance_group'), "stock_units": int(data.get('stock_units', 1)),
                    "container_content": data.get('container_content')
                }
                custom_qr = data.get('qr_content', '').strip() or f"LAB-SUBSTANCES-{target_id}"
                qr_path = old_row['qr_path']
                qr_content = old_row['qr_content']
                if custom_qr != old_row['qr_content']:
                    qr_path, qr_content = generate_qr('substances', target_id, custom_qr)
                    new_data["qr_content"] = qr_content

                log_updates(cursor.connection, requester, 'substances', target_id, old_row, new_data)
                
                cursor.execute('''
                    UPDATE substances SET
                        name = ?, chemical_formula = ?, cas_number = ?, composition = ?, concentration = ?,
                        physical_state = ?, color = ?, odor = ?, risks_warnings = ?, quantity = ?, unit = ?,
                        location = ?, entry_date = ?, expiration_date = ?, responsible = ?, observations = ?,
                        image_path = ?, qr_path = ?, qr_content = ?, external_links = ?, pdf_path = ?,
                        substance_group = ?, stock_units = ?, container_content = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (
                    new_data['name'], new_data['chemical_formula'], new_data['cas_number'],
                    new_data['composition'], new_data['concentration'], new_data['physical_state'],
                    new_data['color'], new_data['odor'], new_data['risks_warnings'],
                    new_data['quantity'], new_data['unit'], new_data['location'],
                    new_data['entry_date'], new_data['expiration_date'], new_data['responsible'],
                    new_data['observations'], new_data['image_path'], qr_path, qr_content,
                    new_data['external_links'], new_data['pdf_path'], new_data['substance_group'],
                    new_data['stock_units'], new_data['container_content'], target_id
                ))
            return target_id

        elif req_action == 'ELIMINACION':
            log_deletion(cursor.connection, requester, 'substances', target_id)
            cursor.execute('DELETE FROM substances WHERE id = ?', (target_id,))
            return target_id

    elif req_type == 'chemical_materials':
        if req_action == 'CREACION':
            cursor.execute('''
                INSERT INTO chemical_materials (
                    name, category, quantity, unit, location, status, responsible, observations, image_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('name'), data.get('category'), float(data.get('quantity', 0)),
                data.get('unit', 'piezas'), data.get('location'), data.get('status'),
                data.get('responsible', requester), data.get('observations'), data.get('image_path')
            ))
            new_id = cursor.lastrowid
            custom_qr = data.get('qr_content', '').strip() or f"LAB-CHEMICAL_MATERIALS-{new_id}"
            qr_path, qr_content = generate_qr('chemical_materials', new_id, custom_qr)
            cursor.execute('UPDATE chemical_materials SET qr_path = ?, qr_content = ? WHERE id = ?', (qr_path, qr_content, new_id))
            log_creation(cursor.connection, requester, 'chemical_materials', new_id)
            return new_id

        elif req_action == 'EDICION':
            cursor.execute('SELECT * FROM chemical_materials WHERE id = ?', (target_id,))
            old_row = cursor.fetchone()
            if old_row:
                new_data = {
                    "name": data.get('name'), "category": data.get('category'),
                    "quantity": float(data.get('quantity', 0)), "unit": data.get('unit', 'piezas'),
                    "location": data.get('location'), "status": data.get('status'),
                    "responsible": data.get('responsible'), "observations": data.get('observations'),
                    "image_path": data.get('image_path')
                }
                custom_qr = data.get('qr_content', '').strip() or f"LAB-CHEMICAL_MATERIALS-{target_id}"
                qr_path = old_row['qr_path']
                qr_content = old_row['qr_content']
                if custom_qr != old_row['qr_content']:
                    qr_path, qr_content = generate_qr('chemical_materials', target_id, custom_qr)
                    new_data["qr_content"] = qr_content

                log_updates(cursor.connection, requester, 'chemical_materials', target_id, old_row, new_data)

                cursor.execute('''
                    UPDATE chemical_materials SET
                        name = ?, category = ?, quantity = ?, unit = ?, location = ?,
                        status = ?, responsible = ?, observations = ?, image_path = ?,
                        qr_path = ?, qr_content = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (
                    new_data['name'], new_data['category'], new_data['quantity'], new_data['unit'],
                    new_data['location'], new_data['status'], new_data['responsible'],
                    new_data['observations'], new_data['image_path'], qr_path, qr_content, target_id
                ))
            return target_id

        elif req_action == 'ELIMINACION':
            log_deletion(cursor.connection, requester, 'chemical_materials', target_id)
            cursor.execute('DELETE FROM chemical_materials WHERE id = ?', (target_id,))
            return target_id

    elif req_type == 'didactic_materials':
        if req_action == 'CREACION':
            cursor.execute('''
                INSERT INTO didactic_materials (
                    name, category, quantity, location, status, responsible, observations, image_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('name'), data.get('category'), int(data.get('quantity', 0)),
                data.get('location'), data.get('status'), data.get('responsible', requester),
                data.get('observations'), data.get('image_path')
            ))
            new_id = cursor.lastrowid
            custom_qr = data.get('qr_content', '').strip() or f"LAB-DIDACTIC_MATERIALS-{new_id}"
            qr_path, qr_content = generate_qr('didactic_materials', new_id, custom_qr)
            cursor.execute('UPDATE didactic_materials SET qr_path = ?, qr_content = ? WHERE id = ?', (qr_path, qr_content, new_id))
            log_creation(cursor.connection, requester, 'didactic_materials', new_id)
            return new_id

        elif req_action == 'EDICION':
            cursor.execute('SELECT * FROM didactic_materials WHERE id = ?', (target_id,))
            old_row = cursor.fetchone()
            if old_row:
                new_data = {
                    "name": data.get('name'), "category": data.get('category'),
                    "quantity": int(data.get('quantity', 0)), "location": data.get('location'),
                    "status": data.get('status'), "responsible": data.get('responsible'),
                    "observations": data.get('observations'), "image_path": data.get('image_path')
                }
                custom_qr = data.get('qr_content', '').strip() or f"LAB-DIDACTIC_MATERIALS-{target_id}"
                qr_path = old_row['qr_path']
                qr_content = old_row['qr_content']
                if custom_qr != old_row['qr_content']:
                    qr_path, qr_content = generate_qr('didactic_materials', target_id, custom_qr)
                    new_data["qr_content"] = qr_content

                log_updates(cursor.connection, requester, 'didactic_materials', target_id, old_row, new_data)

                cursor.execute('''
                    UPDATE didactic_materials SET
                        name = ?, category = ?, quantity = ?, location = ?, status = ?,
                        responsible = ?, observations = ?, image_path = ?, qr_path = ?,
                        qr_content = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (
                    new_data['name'], new_data['category'], new_data['quantity'], new_data['location'],
                    new_data['status'], new_data['responsible'], new_data['observations'],
                    new_data['image_path'], qr_path, qr_content, target_id
                ))
            return target_id

        elif req_action == 'ELIMINACION':
            log_deletion(cursor.connection, requester, 'didactic_materials', target_id)
            cursor.execute('DELETE FROM didactic_materials WHERE id = ?', (target_id,))
            return target_id

    elif req_type.startswith('consulta_'):
        section = req_type.replace('consulta_', '')
        from backend.routes.consulta import TABLE_MAPPING
        table_name = TABLE_MAPPING.get(section)
        
        if table_name:
            if req_action == 'CREACION':
                if section == 'ghs':
                    cursor.execute('''
                        INSERT INTO consulta_ghs (id, title, meaning, examples, recommendations, image_path)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (data.get('id'), data.get('title'), data.get('meaning'), json.dumps(data.get('examples', [])), json.dumps(data.get('recommendations', [])), data.get('image_path')))
                    return data.get('id')
                elif section == 'materiales':
                    cursor.execute('INSERT INTO consulta_lab_materials (name, desc, image_path) VALUES (?, ?, ?)', (data.get('name'), data.get('desc'), data.get('image_path')))
                    return cursor.lastrowid
                elif section == 'ppe':
                    cursor.execute('INSERT INTO consulta_ppe (title, purpose, when_use, limits, image_path) VALUES (?, ?, ?, ?, ?)', (data.get('title'), data.get('purpose'), data.get('when_use'), data.get('limits'), data.get('image_path')))
                    return cursor.lastrowid
                elif section == 'senales':
                    cursor.execute('INSERT INTO consulta_safety_signs (label, desc, image_path) VALUES (?, ?, ?)', (data.get('label'), data.get('desc'), data.get('image_path')))
                    return cursor.lastrowid
                elif section == 'primeros':
                    cursor.execute('INSERT INTO consulta_first_aid (title, steps, image_path) VALUES (?, ?, ?)', (data.get('title'), json.dumps(data.get('steps', [])), data.get('image_path')))
                    return cursor.lastrowid
                elif section == 'glosario':
                    cursor.execute('INSERT INTO consulta_glossary (term, def, image_path) VALUES (?, ?, ?)', (data.get('term'), data.get('def'), data.get('image_path')))
                    return cursor.lastrowid
                elif section == 'compatibilidad':
                    cursor.execute('INSERT INTO consulta_compatibility (group1, group2, risk, severity) VALUES (?, ?, ?, ?)', (data.get('group1'), data.get('group2'), data.get('risk'), data.get('severity')))
                    return cursor.lastrowid
                elif section == 'nfpa':
                    cursor.execute('INSERT INTO consulta_nfpa (quad, level, label, desc) VALUES (?, ?, ?, ?)', (data.get('quad'), str(data.get('level')), data.get('label'), data.get('desc')))
                    return f"{data.get('quad')}_{data.get('level')}"

            elif req_action == 'EDICION':
                if section == 'ghs':
                    cursor.execute('UPDATE consulta_ghs SET title = ?, meaning = ?, examples = ?, recommendations = ?, image_path = ? WHERE id = ?', (data.get('title'), data.get('meaning'), json.dumps(data.get('examples', [])), json.dumps(data.get('recommendations', [])), data.get('image_path'), target_id))
                elif section == 'materiales':
                    cursor.execute('UPDATE consulta_lab_materials SET name = ?, desc = ?, image_path = ? WHERE id = ?', (data.get('name'), data.get('desc'), data.get('image_path'), target_id))
                elif section == 'ppe':
                    cursor.execute('UPDATE consulta_ppe SET title = ?, purpose = ?, when_use = ?, limits = ?, image_path = ? WHERE id = ?', (data.get('title'), data.get('purpose'), data.get('when_use'), data.get('limits'), data.get('image_path'), target_id))
                elif section == 'senales':
                    cursor.execute('UPDATE consulta_safety_signs SET label = ?, desc = ?, image_path = ? WHERE id = ?', (data.get('label'), data.get('desc'), data.get('image_path'), target_id))
                elif section == 'primeros':
                    cursor.execute('UPDATE consulta_first_aid SET title = ?, steps = ?, image_path = ? WHERE id = ?', (data.get('title'), json.dumps(data.get('steps', [])), data.get('image_path'), target_id))
                elif section == 'glosario':
                    cursor.execute('UPDATE consulta_glossary SET term = ?, def = ?, image_path = ? WHERE id = ?', (data.get('term'), data.get('def'), data.get('image_path'), target_id))
                elif section == 'compatibilidad':
                    cursor.execute('UPDATE consulta_compatibility SET group1 = ?, group2 = ?, risk = ?, severity = ? WHERE id = ?', (data.get('group1'), data.get('group2'), data.get('risk'), data.get('severity'), target_id))
                elif section == 'nfpa':
                    cursor.execute('UPDATE consulta_nfpa SET label = ?, desc = ? WHERE quad = ? AND level = ?', (data.get('label'), data.get('desc'), data.get('quad'), str(data.get('level'))))
                return target_id
    return None

def check_and_queue_request(req_type, req_action, target_id=None, target_name=None):
    from flask import session, request, jsonify
    from backend.database import get_user_by_username, get_db_connection
    import json

    user = session.get('user')
    if not user:
        return None

    user_data = get_user_by_username(user)
    if user_data and user_data['role'] == 'responsable':
        data_payload = request.get_json() or {}

        # Resolve target name
        t_name = target_name
        if not t_name:
            if req_action in ['ELIMINACION', 'EDICION'] and target_id is not None:
                conn = get_db_connection()
                cursor = conn.cursor()
                db_table = req_type
                if req_type.startswith('consulta_'):
                    from backend.routes.consulta import TABLE_MAPPING
                    db_table = TABLE_MAPPING.get(req_type.replace('consulta_', ''))
                
                if db_table:
                    try:
                        cursor.execute(f"SELECT * FROM {db_table} WHERE id = ?", (target_id,))
                        row = cursor.fetchone()
                        if row:
                            row_dict = dict(row)
                            t_name = row_dict.get('name') or row_dict.get('title') or row_dict.get('label') or row_dict.get('term')
                    except Exception as e:
                        print("Error fetching target name:", str(e))
                conn.close()
            else:
                t_name = data_payload.get('name') or data_payload.get('title') or data_payload.get('label') or data_payload.get('term')

        target_id_str = str(target_id) if target_id is not None else None

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO change_requests (requester_username, type, action, target_id, target_name, data, status)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE')
        ''', (user, req_type, req_action, target_id_str, t_name, json.dumps(data_payload)))
        new_req_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # Notificar administradores por correo
        try:
            from backend.services.email_service import notify_admins_new_request
            notify_admins_new_request({
                "id": new_req_id,
                "requester_username": user,
                "type": req_type,
                "action": req_action,
                "target_name": t_name
            })
        except Exception as e:
            print("[EMAIL WARN]", str(e))

        return jsonify({
            "status": "success",
            "message": "Solicitud de cambio enviada al administrador para su aprobación.",
            "pending": True
        })

    return None
