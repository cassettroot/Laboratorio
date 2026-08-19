from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection, get_users_db_connection, encrypt_username, decrypt_username, get_user_by_username
from werkzeug.security import generate_password_hash, check_password_hash
from backend.utils.auth_helpers import require_login, require_role, users_db_connection, safe_db_error

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')  # No hacer strip() de contraseñas
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Usuario y contraseña son obligatorios"}), 400
        
    enc_username = encrypt_username(username)
    try:
        with users_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE username = ?', (enc_username,))
            if cursor.fetchone():
                return jsonify({"status": "error", "message": "El nombre de usuario ya está registrado"}), 400
            hashed_pw = generate_password_hash(password)
            cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (enc_username, hashed_pw))
            conn.commit()
        return jsonify({"status": "success", "message": "Usuario registrado exitosamente"})
    except Exception as e:
        return safe_db_error(e)

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')  # No hacer strip() de contraseñas
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Usuario y contraseña son requeridos"}), 400
        
    enc_username = encrypt_username(username)
    try:
        with users_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE username = ?', (enc_username,))
            user = cursor.fetchone()
    except Exception as e:
        return safe_db_error(e)
    
    if user and check_password_hash(user['password'], password):
        session['user'] = username
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
@require_login
def change_password():
    data = request.get_json() or {}
    old_password = data.get('old_password', '')  # No strip en contraseñas
    new_password = data.get('new_password', '')
    
    if not old_password or not new_password:
        return jsonify({"status": "error", "message": "Ambas contraseñas son requeridas."}), 400
    if len(new_password) < 6:
        return jsonify({"status": "error", "message": "La nueva contraseña debe tener al menos 6 caracteres."}), 400
        
    enc_username = encrypt_username(session['user'])
    try:
        with users_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE username = ?', (enc_username,))
            user = cursor.fetchone()
            if not user or not check_password_hash(user['password'], old_password):
                return jsonify({"status": "error", "message": "Contraseña actual incorrecta."}), 400
            hashed_pw = generate_password_hash(new_password)
            cursor.execute('UPDATE users SET password = ? WHERE id = ?', (hashed_pw, user['id']))
            conn.commit()
        return jsonify({"status": "success", "message": "Contraseña actualizada exitosamente."})
    except Exception as e:
        return safe_db_error(e)

# --- ENDPOINTS DE ADMINISTRACIÓN DE USUARIOS ---

@auth_bp.route('/api/users', methods=['GET'])
@require_login
def get_users():
    curr_user = get_user_by_username(session['user'])
    if not curr_user:
        return jsonify({"status": "error", "message": "Sesión inválida."}), 401

    curr_role = curr_user['role']
    curr_labs = curr_user['assigned_labs'] or 'all'

    if curr_role == 'responsable':
        return jsonify({"status": "success", "data": []})

    try:
        with users_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, email, role, active, assigned_labs, created_at FROM users ORDER BY id DESC')
            rows = cursor.fetchall()
    except Exception as e:
        return safe_db_error(e)
    
    users = []
    for r in rows:
        keys = r.keys()
        u_labs = r['assigned_labs'] if 'assigned_labs' in keys and r['assigned_labs'] else 'all'
        u_role = r['role']
        
        if curr_role == 'jefe':
            if u_role == 'admin':
                continue
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
@require_role('admin', 'jefe')
def create_user():
    curr_user = get_user_by_username(session['user'])
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')  # No strip en contraseñas
    email = data.get('email', '').strip()
    role = data.get('role', 'responsable').strip()
    active = int(data.get('active', 1))
    assigned_labs = data.get('assigned_labs', 'all').strip()

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
    try:
        with users_db_connection() as conn:
            cursor = conn.cursor()
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
        return safe_db_error(e)

@auth_bp.route('/api/users/<int:user_id>', methods=['PUT'])
@require_role('admin', 'jefe')
def update_user(user_id):
    curr_user = get_user_by_username(session['user'])
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')  # No strip en contraseñas
    email = data.get('email', '').strip()
    role = data.get('role', 'responsable').strip()
    active = int(data.get('active', 1))
    assigned_labs = data.get('assigned_labs', 'all').strip()

    try:
        with users_db_connection() as conn:
            cursor = conn.cursor()
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
        return safe_db_error(e)

@auth_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@require_role('admin', 'jefe')
def delete_user(user_id):
    curr_user = get_user_by_username(session['user'])
    try:
        with users_db_connection() as conn:
            cursor = conn.cursor()
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
        return safe_db_error(e)


# --- ENDPOINTS DE SEGURIDAD DE RED Y DISPOSITIVOS ---

@auth_bp.route('/api/auth/devices', methods=['GET'])
@require_role('admin', 'jefe')
def list_devices():
    try:
        conn = get_users_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, alias, status, created_at FROM device_approvals ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"status": "success", "data": [dict(r) for r in rows]})
    except Exception as e:
        return safe_db_error(e)

@auth_bp.route('/api/auth/devices/<int:device_id>/<action>', methods=['POST', 'DELETE'])
@require_role('admin', 'jefe')
def manage_device(device_id, action):
    if action not in ['approve', 'reject', 'delete']:
        return jsonify({"status": "error", "message": "Acción inválida"}), 400
    
    try:
        conn = get_users_db_connection()
        cursor = conn.cursor()
        if action == 'delete':
            cursor.execute('DELETE FROM device_approvals WHERE id = ?', (device_id,))
            conn.commit()
            conn.close()
            return jsonify({"status": "success", "message": "Dispositivo eliminado exitosamente."})

        new_status = 'APPROVED' if action == 'approve' else 'REJECTED'
        cursor.execute('UPDATE device_approvals SET status = ? WHERE id = ?', (new_status, device_id))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": f"Dispositivo {new_status.lower()} exitosamente."})
    except Exception as e:
        return safe_db_error(e)

def _get_server_lan_ip():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and ip != "127.0.0.1":
            return ip
    except Exception:
        pass
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if ip and ip != "127.0.0.1":
            return ip
    except Exception:
        pass
    try:
        for item in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = item[4][0]
            if ip and not ip.startswith("127."):
                return ip
    except Exception:
        pass
    return "127.0.0.1"

@auth_bp.route('/api/auth/qr-pairing', methods=['GET'])
@require_role('admin', 'jefe')
def get_qr_pairing():
    import qrcode
    import base64
    from io import BytesIO
    from flask import current_app
    import json

    local_ip = _get_server_lan_ip()
    server_url = f"http://{local_ip}:5000"
    app_token = current_app.config.get('MASTER_APP_TOKEN', '')

    payload = json.dumps({
        "type": "server_pairing",
        "url": server_url,
        "token": app_token
    })

    qr_data_url = None
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        img_io = BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        qr_b64 = base64.b64encode(img_io.getvalue()).decode('utf-8')
        qr_data_url = f"data:image/png;base64,{qr_b64}"
    except Exception as e:
        print("Error al generar QR base64:", e)

    return jsonify({
        "status": "success",
        "data": {
            "url": server_url,
            "token": app_token,
            "qr_data_url": qr_data_url
        }
    })

@auth_bp.route('/api/auth/qr-image', methods=['GET'])
@require_role('admin', 'jefe')
def get_qr_image():
    import qrcode
    from io import BytesIO
    from flask import send_file, current_app
    import json
    
    local_ip = _get_server_lan_ip()
    server_url = f"http://{local_ip}:5000"
    app_token = current_app.config.get('MASTER_APP_TOKEN', '')
    
    payload = json.dumps({
        "type": "server_pairing",
        "url": server_url,
        "token": app_token
    })
    
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    return send_file(img_io, mimetype='image/png')

