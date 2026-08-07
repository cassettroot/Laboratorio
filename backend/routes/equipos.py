from flask import Blueprint, request, jsonify
from backend.database import get_db_connection

equipos_bp = Blueprint('equipos', __name__)

@equipos_bp.route('/api/equipos', methods=['GET'])
def get_equipos():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM equipos ORDER BY id DESC')
    items = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({"status": "success", "data": items})

@equipos_bp.route('/api/equipos', methods=['POST'])
def add_equipo():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO equipos (nombre, caracteristicas_bien, no_inventario, marca, modelo, serie, valor)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('nombre'),
            data.get('caracteristicas_bien'),
            data.get('no_inventario'),
            data.get('marca'),
            data.get('modelo'),
            data.get('serie'),
            data.get('valor')
        ))
        
        item_id = cursor.lastrowid
        
        # Guardar en historial
        username = request.headers.get('X-User-Name', 'Desconocido')
        cursor.execute('''
            INSERT INTO change_history (user_responsible, action, table_name, record_id, new_value)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, 'CREAR', 'equipos', item_id, f"Registró bien/equipo: {data.get('nombre')}"))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Elemento registrado exitosamente."})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@equipos_bp.route('/api/equipos/<int:item_id>', methods=['GET'])
def get_equipo(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM equipos WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"status": "error", "message": "Bien o equipo no encontrado"}), 404

    item = dict(row)
    if 'nombre' in item and 'name' not in item:
        item['name'] = item['nombre']
    if 'no_inventario' in item and 'inventory_number' not in item:
        item['inventory_number'] = item['no_inventario']
    if 'serie' in item and 'serial_number' not in item:
        item['serial_number'] = item['serie']
    if 'caracteristicas_bien' in item and 'observations' not in item:
        item['observations'] = item['caracteristicas_bien']

    return jsonify({"status": "success", "data": item})

@equipos_bp.route('/api/equipos/<int:item_id>', methods=['PUT'])
def update_equipo(item_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE equipos SET 
                nombre = ?, 
                caracteristicas_bien = ?, 
                no_inventario = ?, 
                marca = ?, 
                modelo = ?, 
                serie = ?, 
                valor = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            data.get('nombre'),
            data.get('caracteristicas_bien'),
            data.get('no_inventario'),
            data.get('marca'),
            data.get('modelo'),
            data.get('serie'),
            data.get('valor'),
            item_id
        ))
        
        username = request.headers.get('X-User-Name', 'Desconocido')
        cursor.execute('''
            INSERT INTO change_history (user_responsible, action, table_name, record_id, new_value)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, 'EDITAR', 'equipos', item_id, f"Actualizó bien/equipo: {data.get('nombre')}"))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Elemento actualizado exitosamente."})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@equipos_bp.route('/api/equipos/<int:item_id>', methods=['DELETE'])
def delete_equipo(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM equipos WHERE id = ?', (item_id,))
        username = request.headers.get('X-User-Name', 'Desconocido')
        cursor.execute('''
            INSERT INTO change_history (user_responsible, action, table_name, record_id, new_value)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, 'ELIMINAR', 'equipos', item_id, "Eliminó un bien/equipo"))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Elemento eliminado exitosamente."})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()
