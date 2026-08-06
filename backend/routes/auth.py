from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection, get_users_db_connection, encrypt_username, decrypt_username, get_user_by_username
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Usuario y contraseña son obligatorios"}), 400
        
    enc_username = encrypt_username(username)
    conn = get_users_db_connection()
    cursor = conn.cursor()
    try:
        # Verificar si ya existe
        cursor.execute('SELECT * FROM users WHERE username = ?', (enc_username,))
        if cursor.fetchone():
            return jsonify({"status": "error", "message": "El nombre de usuario ya está registrado"}), 400

        hashed_pw = generate_password_hash(password)
        cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (enc_username, hashed_pw))
        conn.commit()
        return jsonify({"status": "success", "message": "Usuario registrado exitosamente"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Usuario y contraseña son requeridos"}), 400
        
    enc_username = encrypt_username(username)
    conn = get_users_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (enc_username,))
    user = cursor.fetchone()
    conn.close()
    
    if user and check_password_hash(user['password'], password):
        session['user'] = username  # Guardamos el usuario descifrado en sesión
        session.permanent = True
        return jsonify({
            "status": "success", 
            "message": "Sesión iniciada correctamente", 
            "user": username
        })
        
    return jsonify({"status": "error", "message": "Usuario o contraseña incorrectos"}), 401

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"status": "success", "message": "Sesión cerrada correctamente"})

@auth_bp.route('/api/auth/status', methods=['GET'])
def status():
    if 'user' in session:
        user_data = get_user_by_username(session['user'])
        if user_data:
            assigned_labs = 'all'
            if 'assigned_labs' in user_data.keys() and user_data['assigned_labs']:
                assigned_labs = user_data['assigned_labs']
            return jsonify({
                "status": "success", 
                "logged_in": True, 
                "user": session['user'],
                "email": user_data['email'] if 'email' in user_data.keys() else '',
                "role": user_data['role'],
                "active": user_data['active'],
                "assigned_labs": assigned_labs
            })
    return jsonify({
        "status": "success", 
        "logged_in": False, 
        "user": None,
        "email": None,
        "role": None,
        "active": 0,
        "assigned_labs": "all"
    })

@auth_bp.route('/api/auth/change-password', methods=['POST'])
def change_password():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado."}), 401
    data = request.get_json() or {}
    old_password = data.get('old_password', '').strip()
    new_password = data.get('new_password', '').strip()
    
    if not old_password or not new_password:
        return jsonify({"status": "error", "message": "Ambas contraseñas son requeridas."}), 400
        
    conn = get_users_db_connection()
    cursor = conn.cursor()
    enc_username = encrypt_username(session['user'])
    cursor.execute('SELECT * FROM users WHERE username = ?', (enc_username,))
    user = cursor.fetchone()
    
    if not user or not check_password_hash(user['password'], old_password):
        conn.close()
        return jsonify({"status": "error", "message": "Contraseña actual incorrecta."}), 400
        
    hashed_pw = generate_password_hash(new_password)
    cursor.execute('UPDATE users SET password = ? WHERE id = ?', (hashed_pw, user['id']))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Contraseña actualizada exitosamente."})

# --- ENDPOINTS DE ADMINISTRACIÓN DE USUARIOS ---

@auth_bp.route('/api/users', methods=['GET'])
def get_users():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado."}), 401

    curr_user = get_user_by_username(session['user'])
    if not curr_user:
        return jsonify({"status": "error", "message": "Sesión inválida."}), 401

    curr_role = curr_user['role']
    curr_labs = curr_user['assigned_labs'] or 'all'

    # Un responsable no puede listar usuarios globales ni administrar cuentas
    if curr_role == 'responsable':
        return jsonify({"status": "success", "data": []})

    conn = get_users_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id, username, email, role, active, assigned_labs, created_at FROM users ORDER BY id DESC')
        rows = cursor.fetchall()
    finally:
        conn.close()
    
    users = []
    for r in rows:
        keys = r.keys()
        u_labs = r['assigned_labs'] if 'assigned_labs' in keys and r['assigned_labs'] else 'all'
        u_role = r['role']
        
        # El Jefe de Área NO puede ver perfiles de Administrador General ni usuarios de otras áreas
        if curr_role == 'jefe':
            if u_role == 'admin':
                continue
            
            # Si el jefe tiene un laboratorio asignado específico (o se obtiene del header)
            effective_jefe_lab = curr_labs
            if effective_jefe_lab == 'all':
                effective_jefe_lab = request.headers.get('X-Inventory-Id', 'inventario')
            
            if u_labs == 'all':
                continue
            if not any(lab in u_labs.split(',') for lab in effective_jefe_lab.split(',')):
                continue

        users.append({
            "id": r['id'],
            "username": decrypt_username(r['username']),
            "email": r['email'] or '',
            "role": u_role,
            "active": r['active'],
            "assigned_labs": u_labs,
            "created_at": r['created_at'] if 'created_at' in keys else ''
        })
        
    return jsonify({"status": "success", "data": users})

@auth_bp.route('/api/users', methods=['POST'])
def create_user():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado."}), 401

    curr_user = get_user_by_username(session['user'])
    if not curr_user or curr_user['role'] not in ['admin', 'jefe']:
        return jsonify({"status": "error", "message": "Los Responsables no tienen permisos para crear usuarios."}), 403

    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()
    role = data.get('role', 'responsable').strip()
    active = int(data.get('active', 1))
    assigned_labs = data.get('assigned_labs', 'all').strip()

    # El Jefe de Área solo puede crear usuarios en su laboratorio y NO puede crear administradores
    if curr_user['role'] == 'jefe':
        if role == 'admin':
            return jsonify({"status": "error", "message": "Los Jefes de Área no pueden crear Administradores Generales."}), 403
        
        jefe_lab = curr_user['assigned_labs']
        if not jefe_lab or jefe_lab == 'all':
            jefe_lab = request.headers.get('X-Inventory-Id', 'inventario')
        assigned_labs = jefe_lab

    if not username or not password:
        return jsonify({"status": "error", "message": "Usuario y contraseña son requeridos."}), 400
        
    enc_username = encrypt_username(username)
    conn = get_users_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id FROM users WHERE username = ?', (enc_username,))
        if cursor.fetchone():
            return jsonify({"status": "error", "message": "El nombre de usuario ya existe."}), 400
            
        hashed_pw = generate_password_hash(password)
        cursor.execute(
            'INSERT INTO users (username, password, email, role, active, assigned_labs) VALUES (?, ?, ?, ?, ?, ?)', 
            (enc_username, hashed_pw, email, role, active, assigned_labs)
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Usuario creado exitosamente en tu área."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@auth_bp.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado."}), 401

    curr_user = get_user_by_username(session['user'])
    if not curr_user or curr_user['role'] not in ['admin', 'jefe']:
        return jsonify({"status": "error", "message": "Los Responsables no tienen permisos para editar usuarios."}), 403

    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()
    role = data.get('role', 'responsable').strip()
    active = int(data.get('active', 1))
    assigned_labs = data.get('assigned_labs', 'all').strip()

    conn = get_users_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT role FROM users WHERE id = ?', (user_id,))
        target_user = cursor.fetchone()
        if not target_user:
            return jsonify({"status": "error", "message": "Usuario no encontrado."}), 404

        if curr_user['role'] == 'jefe':
            if target_user['role'] == 'admin':
                return jsonify({"status": "error", "message": "Los Jefes de Área no pueden modificar perfiles de Administradores Generales."}), 403
            if role == 'admin':
                return jsonify({"status": "error", "message": "Los Jefes de Área no pueden asignar el rol de Administrador General."}), 403
            
            jefe_lab = curr_user['assigned_labs']
            if not jefe_lab or jefe_lab == 'all':
                jefe_lab = request.headers.get('X-Inventory-Id', 'inventario')
            assigned_labs = jefe_lab

        if not username:
            return jsonify({"status": "error", "message": "El nombre de usuario es requerido."}), 400
            
        enc_username = encrypt_username(username)
        cursor.execute('SELECT id FROM users WHERE username = ? AND id != ?', (enc_username, user_id))
        if cursor.fetchone():
            return jsonify({"status": "error", "message": "El nombre de usuario ya está en uso."}), 400
            
        if password:
            hashed_pw = generate_password_hash(password)
            cursor.execute(
                'UPDATE users SET username = ?, password = ?, email = ?, role = ?, active = ?, assigned_labs = ? WHERE id = ?', 
                (enc_username, hashed_pw, email, role, active, assigned_labs, user_id)
            )
        else:
            cursor.execute(
                'UPDATE users SET username = ?, email = ?, role = ?, active = ?, assigned_labs = ? WHERE id = ?', 
                (enc_username, email, role, active, assigned_labs, user_id)
            )
        conn.commit()
        return jsonify({"status": "success", "message": "Usuario actualizado exitosamente."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@auth_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado."}), 401

    curr_user = get_user_by_username(session['user'])
    if not curr_user or curr_user['role'] not in ['admin', 'jefe']:
        return jsonify({"status": "error", "message": "Los Responsables no tienen permisos para eliminar usuarios."}), 403

    conn = get_users_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT username, role FROM users WHERE id = ?', (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({"status": "error", "message": "Usuario no encontrado."}), 404
            
        dec_username = decrypt_username(user_row['username'])
        if dec_username == session.get('user'):
            return jsonify({"status": "error", "message": "No puedes eliminar tu propio usuario activo."}), 400
            
        if curr_user['role'] == 'jefe' and user_row['role'] == 'admin':
            return jsonify({"status": "error", "message": "Los Jefes de Área no pueden eliminar Administradores Generales."}), 403

        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        return jsonify({"status": "success", "message": "Usuario eliminado exitosamente."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()
