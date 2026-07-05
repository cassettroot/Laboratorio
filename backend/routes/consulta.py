import json
from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection

consulta_bp = Blueprint('consulta', __name__)

TABLE_MAPPING = {
    'ghs': 'consulta_ghs',
    'materiales': 'consulta_lab_materials',
    'ppe': 'consulta_ppe',
    'senales': 'consulta_safety_signs',
    'primeros': 'consulta_first_aid',
    'glosario': 'consulta_glossary',
    'compatibilidad': 'consulta_compatibility',
    'nfpa': 'consulta_nfpa'
}

@consulta_bp.route('/api/consulta/<section>', methods=['GET'])
def get_consulta_section(section):
    table_name = TABLE_MAPPING.get(section)
    if not table_name:
        return jsonify({"status": "error", "message": "Sección no encontrada"}), 404
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Para NFPA y compatibilidad, podemos ordenar por quad/level o por id
        if section == 'nfpa':
            cursor.execute(f"SELECT * FROM {table_name} ORDER BY quad, level")
        elif section == 'compatibilidad':
            cursor.execute(f"SELECT * FROM {table_name} ORDER BY id")
        elif section == 'glosario':
            cursor.execute(f"SELECT * FROM {table_name} ORDER BY term COLLATE NOCASE")
        else:
            cursor.execute(f"SELECT * FROM {table_name} ORDER BY id")
            
        rows = cursor.fetchall()
        conn.close()
        
        data = []
        for r in rows:
            item = dict(r)
            # Deserializar campos JSON
            if section == 'ghs':
                try:
                    item['examples'] = json.loads(item['examples'])
                except:
                    item['examples'] = []
                try:
                    item['recommendations'] = json.loads(item['recommendations'])
                except:
                    item['recommendations'] = []
            elif section == 'primeros':
                try:
                    item['steps'] = json.loads(item['steps'])
                except:
                    item['steps'] = []
            data.append(item)
            
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@consulta_bp.route('/api/consulta/<section>', methods=['POST'])
def add_consulta_item(section):
    from backend.routes.change_requests import check_and_queue_request
    pending_resp = check_and_queue_request(f'consulta_{section}', 'CREACION')
    if pending_resp:
        return pending_resp

    table_name = TABLE_MAPPING.get(section)
    if not table_name:
        return jsonify({"status": "error", "message": "Sección no encontrada"}), 404
        
    try:
        data = request.get_json() or {}
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if section == 'ghs':
            # ghs usa un ID de texto provisto
            item_id = data.get('id')
            if not item_id:
                return jsonify({"status": "error", "message": "ID requerido para pictograma GHS"}), 400
                
            cursor.execute('''
                INSERT INTO consulta_ghs (id, title, meaning, examples, recommendations, image_path)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                item_id,
                data.get('title', ''),
                data.get('meaning', ''),
                json.dumps(data.get('examples', [])),
                json.dumps(data.get('recommendations', [])),
                data.get('image_path', '')
            ))
            
        elif section == 'materiales':
            cursor.execute('''
                INSERT INTO consulta_lab_materials (name, desc, image_path)
                VALUES (?, ?, ?)
            ''', (
                data.get('name', ''),
                data.get('desc', ''),
                data.get('image_path', '')
            ))
            
        elif section == 'ppe':
            cursor.execute('''
                INSERT INTO consulta_ppe (title, purpose, when_use, limits, image_path)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                data.get('title', ''),
                data.get('purpose', ''),
                data.get('when_use', ''),
                data.get('limits', ''),
                data.get('image_path', '')
            ))
            
        elif section == 'senales':
            cursor.execute('''
                INSERT INTO consulta_safety_signs (label, desc, image_path)
                VALUES (?, ?, ?)
            ''', (
                data.get('label', ''),
                data.get('desc', ''),
                data.get('image_path', '')
            ))
            
        elif section == 'primeros':
            cursor.execute('''
                INSERT INTO consulta_first_aid (title, steps, image_path)
                VALUES (?, ?, ?)
            ''', (
                data.get('title', ''),
                json.dumps(data.get('steps', [])),
                data.get('image_path', '')
            ))
            
        elif section == 'glosario':
            cursor.execute('''
                INSERT INTO consulta_glossary (term, def, image_path)
                VALUES (?, ?, ?)
            ''', (
                data.get('term', ''),
                data.get('def', ''),
                data.get('image_path', '')
            ))
            
        elif section == 'compatibilidad':
            cursor.execute('''
                INSERT INTO consulta_compatibility (group1, group2, risk, severity)
                VALUES (?, ?, ?, ?)
            ''', (
                data.get('group1', ''),
                data.get('group2', ''),
                data.get('risk', ''),
                data.get('severity', 'media')
            ))
            
        elif section == 'nfpa':
            # nfpa tiene clave primaria compuesta de quad y level
            quad = data.get('quad')
            level = data.get('level')
            if not quad or level is None:
                return jsonify({"status": "error", "message": "Cuadrante y nivel requeridos"}), 400
                
            cursor.execute('''
                INSERT INTO consulta_nfpa (quad, level, label, desc)
                VALUES (?, ?, ?, ?)
            ''', (
                quad,
                str(level),
                data.get('label', ''),
                data.get('desc', '')
            ))
            
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        
        return jsonify({"status": "success", "id": new_id or data.get('id')})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@consulta_bp.route('/api/consulta/<section>/<item_id>', methods=['PUT'])
def update_consulta_item(section, item_id):
    from backend.routes.change_requests import check_and_queue_request
    pending_resp = check_and_queue_request(f'consulta_{section}', 'EDICION', target_id=item_id)
    if pending_resp:
        return pending_resp

    table_name = TABLE_MAPPING.get(section)
    if not table_name:
        return jsonify({"status": "error", "message": "Sección no encontrada"}), 404
        
    try:
        data = request.get_json() or {}
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if section == 'ghs':
            cursor.execute('''
                UPDATE consulta_ghs
                SET title = ?, meaning = ?, examples = ?, recommendations = ?, image_path = ?
                WHERE id = ?
            ''', (
                data.get('title', ''),
                data.get('meaning', ''),
                json.dumps(data.get('examples', [])),
                json.dumps(data.get('recommendations', [])),
                data.get('image_path', ''),
                item_id
            ))
            
        elif section == 'materiales':
            cursor.execute('''
                UPDATE consulta_lab_materials
                SET name = ?, desc = ?, image_path = ?
                WHERE id = ?
            ''', (
                data.get('name', ''),
                data.get('desc', ''),
                data.get('image_path', ''),
                item_id
            ))
            
        elif section == 'ppe':
            cursor.execute('''
                UPDATE consulta_ppe
                SET title = ?, purpose = ?, when_use = ?, limits = ?, image_path = ?
                WHERE id = ?
            ''', (
                data.get('title', ''),
                data.get('purpose', ''),
                data.get('when_use', ''),
                data.get('limits', ''),
                data.get('image_path', ''),
                item_id
            ))
            
        elif section == 'senales':
            cursor.execute('''
                UPDATE consulta_safety_signs
                SET label = ?, desc = ?, image_path = ?
                WHERE id = ?
            ''', (
                data.get('label', ''),
                data.get('desc', ''),
                data.get('image_path', ''),
                item_id
            ))
            
        elif section == 'primeros':
            cursor.execute('''
                UPDATE consulta_first_aid
                SET title = ?, steps = ?, image_path = ?
                WHERE id = ?
            ''', (
                data.get('title', ''),
                json.dumps(data.get('steps', [])),
                data.get('image_path', ''),
                item_id
            ))
            
        elif section == 'glosario':
            cursor.execute('''
                UPDATE consulta_glossary
                SET term = ?, def = ?, image_path = ?
                WHERE id = ?
            ''', (
                data.get('term', ''),
                data.get('def', ''),
                data.get('image_path', ''),
                item_id
            ))
            
        elif section == 'compatibilidad':
            cursor.execute('''
                UPDATE consulta_compatibility
                SET group1 = ?, group2 = ?, risk = ?, severity = ?
                WHERE id = ?
            ''', (
                data.get('group1', ''),
                data.get('group2', ''),
                data.get('risk', ''),
                data.get('severity', 'media'),
                item_id
            ))
            
        elif section == 'nfpa':
            # item_id será en formato quad:level para NFPA
            parts = item_id.split(':')
            if len(parts) != 2:
                return jsonify({"status": "error", "message": "ID compuesto quad:level requerido para NFPA"}), 400
            quad, level = parts
            cursor.execute('''
                UPDATE consulta_nfpa
                SET label = ?, desc = ?
                WHERE quad = ? AND level = ?
            ''', (
                data.get('label', ''),
                data.get('desc', ''),
                quad,
                level
            ))
            
        conn.commit()
        conn.close()
        
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@consulta_bp.route('/api/consulta/<section>/<item_id>', methods=['DELETE'])
def delete_consulta_item(section, item_id):
    from flask import session
    from backend.database import get_user_by_username
    user = session.get('user')
    user_data = get_user_by_username(user) if user else None
    if not user_data or user_data['role'] != 'admin':
        return jsonify({"status": "error", "message": "Acceso denegado. Solo el administrador puede eliminar elementos de consulta."}), 403

    table_name = TABLE_MAPPING.get(section)
    if not table_name:
        return jsonify({"status": "error", "message": "Sección no encontrada"}), 404
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if section == 'nfpa':
            parts = item_id.split(':')
            if len(parts) != 2:
                return jsonify({"status": "error", "message": "ID compuesto quad:level requerido para NFPA"}), 400
            quad, level = parts
            cursor.execute(f"DELETE FROM {table_name} WHERE quad = ? AND level = ?", (quad, level))
        elif section == 'ghs':
            cursor.execute(f"DELETE FROM {table_name} WHERE id = ?", (item_id,))
        else:
            cursor.execute(f"DELETE FROM {table_name} WHERE id = ?", (item_id,))
            
        conn.commit()
        conn.close()
        
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
