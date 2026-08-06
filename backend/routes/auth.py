from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection, encrypt_username, decrypt_username, get_user_by_username
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
    conn = get_db_connection()
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
    conn = get_db_connection()
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
            return jsonify({
                "status": "success", 
                "logged_in": True, 
                "user": session['user'],
                "email": user_data['email'] if 'email' in user_data.keys() else '',
                "role": user_data['role'],
                "active": user_data['active']
            })
    return jsonify({
        "status": "success", 
        "logged_in": False, 
        "user": None,
        "email": None,
        "role": None,
        "active": 0
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
        
    conn = get_db_connection()
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

# --- ENDPOINTS DE ADMINISTRACIÓN DE USUARIOS (Solo Admin) ---

@auth_bp.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, role, active, created_at FROM users ORDER BY id DESC')
    rows = cursor.fetchall()
    conn.close()
    
    users = []
    for r in rows:
        users.append({
            "id": r['id'],
            "username": decrypt_username(r['username']),
            "email": r['email'] or '',
            "role": r['role'],
            "active": r['active'],
            "created_at": r['created_at']
        })
        
    return jsonify({"status": "success", "data": users})

@auth_bp.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()
    role = data.get('role', 'responsable').strip()
    active = int(data.get('active', 1))
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Usuario y contraseña son requeridos."}), 400
        
    enc_username = encrypt_username(username)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id FROM users WHERE username = ?', (enc_username,))
        if cursor.fetchone():
            return jsonify({"status": "error", "message": "El nombre de usuario ya existe."}), 400
            
        hashed_pw = generate_password_hash(password)
        cursor.execute(
            'INSERT INTO users (username, password, email, role, active) VALUES (?, ?, ?, ?, ?)', 
            (enc_username, hashed_pw, email, role, active)
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Usuario creado exitosamente."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@auth_bp.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()
    role = data.get('role', 'responsable').strip()
    active = int(data.get('active', 1))
    
    if not username:
        return jsonify({"status": "error", "message": "El nombre de usuario es requerido."}), 400
        
    enc_username = encrypt_username(username)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Validar duplicados si cambia el nombre de usuario
        cursor.execute('SELECT id FROM users WHERE username = ? AND id != ?', (enc_username, user_id))
        if cursor.fetchone():
            return jsonify({"status": "error", "message": "El nombre de usuario ya está en uso."}), 400
            
        if password:
            hashed_pw = generate_password_hash(password)
            cursor.execute(
                'UPDATE users SET username = ?, password = ?, email = ?, role = ?, active = ? WHERE id = ?', 
                (enc_username, hashed_pw, email, role, active, user_id)
            )
        else:
            cursor.execute(
                'UPDATE users SET username = ?, email = ?, role = ?, active = ? WHERE id = ?', 
                (enc_username, email, role, active, user_id)
            )
        conn.commit()
        return jsonify({"status": "success", "message": "Usuario actualizado exitosamente."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@auth_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT username FROM users WHERE id = ?', (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({"status": "error", "message": "Usuario no encontrado."}), 404
            
        dec_username = decrypt_username(user_row['username'])
        if dec_username == session.get('user'):
            return jsonify({"status": "error", "message": "No puedes eliminar tu propio usuario activo."}), 400
            
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        return jsonify({"status": "success", "message": "Usuario eliminado exitosamente."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()
