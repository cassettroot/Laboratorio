import sqlite3
from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Usuario y contraseña son obligatorios"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Verificar si ya existe
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        if cursor.fetchone():
            return jsonify({"status": "error", "message": "El nombre de usuario ya está registrado"}), 400

        hashed_pw = generate_password_hash(password)
        cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hashed_pw))
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
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user and check_password_hash(user['password'], password):
        session['user'] = user['username']
        # Guardar permanentemente la cookie por conveniencia
        session.permanent = True
        return jsonify({
            "status": "success", 
            "message": "Sesión iniciada correctamente", 
            "user": user['username']
        })
        
    return jsonify({"status": "error", "message": "Usuario o contraseña incorrectos"}), 401

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"status": "success", "message": "Sesión cerrada correctamente"})

@auth_bp.route('/api/auth/status', methods=['GET'])
def status():
    if 'user' in session:
        return jsonify({
            "status": "success", 
            "logged_in": True, 
            "user": session['user']
        })
    return jsonify({
        "status": "success", 
        "logged_in": False, 
        "user": None
    })
