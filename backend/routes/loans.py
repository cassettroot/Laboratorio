import os
import json
import sqlite3
from datetime import datetime
from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection, get_user_by_username, decrypt_username

loans_bp = Blueprint('loans', __name__, url_prefix='/api/loans')

UPLOAD_PHOTOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'static', 'uploads', 'photos')
os.makedirs(UPLOAD_PHOTOS_DIR, exist_ok=True)

def calculate_time_elapsed(date_str):
    if not date_str:
        return "Fecha desconocida"
    try:
        date_str_clean = date_str.replace('T', ' ')
        loan_dt = datetime.strptime(date_str_clean, '%Y-%m-%d %H:%M:%S')
        now = datetime.now()
        diff = now - loan_dt

        days = diff.days
        seconds = diff.seconds
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60

        if days > 0:
            return f"hace {days} día(s) y {hours} h"
        elif hours > 0:
            return f"hace {hours} h {minutes} min"
        elif minutes > 0:
            return f"hace {minutes} min"
        else:
            return "hace unos segundos"
    except Exception:
        return date_str

def get_current_user_role():
    if 'user' in session:
        u = get_user_by_username(session['user'])
        if u:
            return u['role']
    return 'estudiante'

@loans_bp.route('/registered-users', methods=['GET'])
def get_registered_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, role FROM users WHERE active = 1 ORDER BY id ASC')
    rows = cursor.fetchall()
    conn.close()

    users = []
    for r in rows:
        dec_name = decrypt_username(r['username'])
        users.append({
            "id": r['id'],
            "username": dec_name,
            "role": r['role']
        })

    return jsonify({"status": "success", "data": users})

@loans_bp.route('', methods=['GET'])
def get_loans():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM loans ORDER BY id DESC')
    rows = cursor.fetchall()
    conn.close()

    user_role = get_current_user_role()
    is_admin = (user_role == 'admin')

    result = []
    for r in rows:
        item = dict(r)
        if item.get('items_json'):
            try:
                item['items_list'] = json.loads(item['items_json'])
            except Exception:
                item['items_list'] = []

        if item['status'] in ['Prestado', 'Pendiente Verificación Admin']:
            item['elapsed_time'] = calculate_time_elapsed(item['loan_date'])
        else:
            item['elapsed_time'] = f"Concluido el {item.get('return_date', '')}"

        if not is_admin:
            item['notes'] = "Información interna de control"

        result.append(item)

    return jsonify({"status": "success", "data": result, "user_role": user_role})

@loans_bp.route('', methods=['POST'])
def create_loan():
    data = request.json or {}
    items_list = data.get('items_list', [])
    borrower_name = data.get('borrower_name', '').strip()
    borrower_user_id = data.get('borrower_user_id')
    borrower_type = data.get('borrower_type', 'Docente / Responsable')
    notes = data.get('notes', '').strip()

    if not items_list or len(items_list) == 0:
        return jsonify({"status": "error", "message": "Debe incluir al menos un elemento escaneado por QR o seleccionado."}), 400

    if not borrower_name:
        return jsonify({"status": "error", "message": "Debe seleccionar un usuario o docente registrado en el sistema."}), 400

    item_names_summary = ", ".join([f"{i.get('name', 'Elemento')} (Cant: {i.get('quantity', 1)})" for i in items_list])
    items_json = json.dumps(items_list)
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    approved_by = session.get('user', 'Admin')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO loans (
            item_type, item_id, item_name, items_json, borrower_name,
            borrower_user_id, borrower_type, quantity_borrowed, loan_date,
            status, verification_status, approved_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Prestado', 'En Préstamo', ?, ?)
    ''', (
        items_list[0].get('type', 'substance'),
        items_list[0].get('id', 0),
        item_names_summary,
        items_json,
        borrower_name,
        borrower_user_id or 0,
        borrower_type,
        len(items_list),
        now_str,
        approved_by,
        notes
    ))
    
    conn.commit()
    loan_id = cursor.lastrowid
    conn.close()

    return jsonify({"status": "success", "message": "Préstamo registrado exitosamente.", "loan_id": loan_id}), 201

@loans_bp.route('/<int:loan_id>/request-return', methods=['POST'])
def request_return_loan(loan_id):
    """El Responsable sube la foto de la sustancia guardada en su estante para solicitar la devolución."""
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    photo_path = None
    if 'photo' in request.files:
        file = request.files['photo']
        if file and file.filename != '':
            ext = os.path.splitext(file.filename)[1].lower() or '.jpg'
            filename = f"return_proof_{loan_id}_{int(datetime.now().timestamp())}{ext}"
            filepath = os.path.join(UPLOAD_PHOTOS_DIR, filename)
            file.save(filepath)
            photo_path = f"/static/uploads/photos/{filename}"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM loans WHERE id = ?", (loan_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Préstamo no encontrado"}), 404

    cursor.execute('''
        UPDATE loans SET 
            status = 'Pendiente Verificación Admin',
            verification_status = 'Pendiente de Verificación Admin',
            return_date = ?,
            return_photo_path = COALESCE(?, return_photo_path)
        WHERE id = ?
    ''', (now_str, photo_path, loan_id))
    
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Evidencia de entrega registrada. El Administrador verificará la devolución."})

@loans_bp.route('/<int:loan_id>/approve-return', methods=['PUT'])
def approve_return_loan(loan_id):
    """El Administrador verifica que la sustancia está en su sitio y aprueba la devolución."""
    user_role = get_current_user_role()
    if user_role != 'admin':
        return jsonify({"status": "error", "message": "Solo el administrador puede aprobar la verificación en estante."}), 403

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    admin_user = session.get('user', 'Admin')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE loans SET 
            status = 'Devuelto',
            verification_status = 'Aprobado y Verificado en Estante',
            verified_by_admin = ?,
            verified_at = ?
        WHERE id = ?
    ''', (admin_user, now_str, loan_id))
    
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Devolución verificada y aprobada exitosamente por el Administrador."})

@loans_bp.route('/<int:loan_id>', methods=['DELETE'])
def delete_loan(loan_id):
    user_role = get_current_user_role()
    if user_role != 'admin':
        return jsonify({"status": "error", "message": "Solo los administradores pueden eliminar registros de préstamos."}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM loans WHERE id = ?", (loan_id,))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Registro de préstamo eliminado."})
