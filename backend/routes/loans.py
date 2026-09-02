import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, session
from backend.utils.auth_helpers import safe_db_error
from backend.database import get_db_connection, get_user_by_username, decrypt_username

loans_bp = Blueprint('loans', __name__, url_prefix='/api/loans')

UPLOAD_PHOTOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'static', 'uploads', 'photos')
os.makedirs(UPLOAD_PHOTOS_DIR, exist_ok=True)

def calculate_time_elapsed(date_str, status='Prestado'):
    if status == 'Pendiente Aprobación Admin':
        return "⏳ Esperando aprobación del Administrador"
    if status == 'Pendiente Verificación Admin':
        return "📷 Devolución en revisión por el Administrador"
    if status == 'Requiere Atención':
        return "⚠️ Requiere atención por observación"
    if status == 'Rechazado':
        return "✕ Rechazado por Administrador"
    if status == 'Devuelto':
        return f"Concluido el {date_str or ''}"
    if not date_str:
        return "Fecha de inicio no registrada"
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
            return f"hace {days} d {hours} h {minutes} m"
        elif hours > 0:
            return f"hace {hours} h {minutes} m"
        elif minutes > 0:
            return f"hace {minutes} m"
        else:
            return "hace unos segundos"
    except Exception:
        return date_str

def get_current_user_role():
    user = session.get('user') or request.headers.get('X-User')
    if user:
        u = get_user_by_username(user)
        if u:
            try:
                return dict(u).get('role', 'admin').lower()
            except Exception:
                return 'admin'
    hdr_role = request.headers.get('X-User-Role')
    if hdr_role:
        return hdr_role.lower()
    return 'admin'

@loans_bp.route('/registered-users', methods=['GET'])
def get_registered_users():
    """Retorna únicamente usuarios activos con rol de Responsable o Administrador."""
    from backend.database import get_users_db_connection
    conn = get_users_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, role FROM users WHERE active = 1 AND role IN ('responsable', 'admin') ORDER BY id ASC")
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
    pending_count = 0
    attention_count = 0

    for r in rows:
        item = dict(r)
        if item.get('items_json'):
            try:
                item['items_list'] = json.loads(item['items_json'])
            except Exception:
                item['items_list'] = []

        item['elapsed_time'] = calculate_time_elapsed(item.get('loan_date'), item.get('status', 'Prestado'))

        st = item.get('status', '')
        if st in ['Pendiente Aprobación Admin', 'Pendiente Verificación Admin']:
            pending_count += 1
        if st == 'Requiere Atención':
            attention_count += 1

        result.append(item)

    return jsonify({
        "status": "success",
        "data": result,
        "user_role": user_role,
        "pending_count": pending_count,
        "attention_count": attention_count,
        "total_badges": pending_count + attention_count
    })

@loans_bp.route('', methods=['POST'])
def create_loan():
    data = request.json or {}
    items_list = data.get('items_list', [])
    borrower_name = data.get('borrower_name', '').strip()
    borrower_user_id = data.get('borrower_user_id')
    borrower_type = "Responsable"
    notes = data.get('notes', '').strip()

    if not items_list or len(items_list) == 0:
        return jsonify({"status": "error", "message": "Debe incluir al menos un elemento para el préstamo."}), 400

    if not borrower_name:
        return jsonify({"status": "error", "message": "Debe seleccionar un responsable registrado en el sistema."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Validar stock disponible basado exclusivamente en unidades
    for item in items_list:
        item_id = item.get('id')
        req_qty = float(item.get('quantity', 1.0))
        item_type = item.get('type', 'substance')
        if item_type == 'substance' and item_id:
            cursor.execute("SELECT name, stock_units, quantity FROM substances WHERE id = ?", (item_id,))
            sub = cursor.fetchone()
            if sub:
                available_stock = sub['stock_units'] if (sub['stock_units'] is not None and sub['stock_units'] > 0) else sub['quantity']
                if req_qty > available_stock:
                    conn.close()
                    return jsonify({
                        "status": "error",
                        "message": f"La cantidad solicitada ({req_qty} unidades) de '{sub['name']}' excede el stock disponible ({available_stock} unidades)."
                    }), 400

    item_names_summary = ", ".join([f"{i.get('name', 'Elemento')} ({i.get('quantity', 1)} unidades)" for i in items_list])
    items_json = json.dumps(items_list)
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    requested_by = session.get('user', borrower_name)

    # Estado inicial: Pendiente de aprobación por Administrador
    cursor.execute('''
        INSERT INTO loans (
            item_type, item_id, item_name, items_json, borrower_name,
            borrower_user_id, borrower_type, quantity_borrowed, loan_date,
            status, verification_status, approved_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente Aprobación Admin', 'Pendiente Aprobación Admin', ?, ?)
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
        requested_by,
        notes
    ))
    
    conn.commit()
    loan_id = cursor.lastrowid
    conn.close()

    try:
        from backend.services.email_service import notify_admins_loan_request
        notify_admins_loan_request({
            "id": loan_id,
            "item_name": item_names_summary,
            "borrower_name": borrower_name,
            "borrower_type": borrower_type,
            "quantity_borrowed": len(items_list),
            "loan_date": now_str,
            "approved_by": requested_by,
            "notes": notes
        })
    except Exception as e:
        print("[EMAIL WARN] Error al enviar notificación de préstamo a los administradores:", str(e))

    return jsonify({
        "status": "success",
        "message": "Solicitud de préstamo enviada exitosamente. El tiempo iniciará en cuanto el Administrador la apruebe.",
        "loan_id": loan_id
    }), 201

@loans_bp.route('/<int:loan_id>/approve-loan', methods=['PUT', 'POST'])
def approve_loan_request(loan_id):
    """El Administrador aprueba la solicitud de préstamo e inicia el tiempo transcurrido."""
    user_role = get_current_user_role()
    if user_role != 'admin':
        return jsonify({"status": "error", "message": "Solo el administrador puede aprobar solicitudes de préstamo."}), 403

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    admin_user = session.get('user', 'Admin')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, item_name, borrower_name FROM loans WHERE id = ?", (loan_id,))
    loan = cursor.fetchone()
    if not loan:
        conn.close()
        return jsonify({"status": "error", "message": "Préstamo no encontrado"}), 404

    cursor.execute('''
        UPDATE loans SET 
            status = 'Prestado',
            verification_status = 'En Préstamo Activo',
            loan_date = ?,
            approved_by = ?
        WHERE id = ?
    ''', (now_str, admin_user, loan_id))
    
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": f"Préstamo #PR-{loan_id} aprobado por {admin_user}. El tiempo transcurrido ha comenzado."})

@loans_bp.route('/<int:loan_id>/reject-loan', methods=['PUT', 'POST'])
def reject_loan_request(loan_id):
    """El Administrador rechaza la solicitud inicial de préstamo con una justificación."""
    user_role = get_current_user_role()
    if user_role != 'admin':
        return jsonify({"status": "error", "message": "Solo el administrador puede rechazar solicitudes de préstamo."}), 403

    data = request.get_json(silent=True) or request.form or {}
    reason = (data.get('reason') or data.get('justification') or '').strip()
    if not reason:
        return jsonify({"status": "error", "message": "Debe especificar la razón o justificación del rechazo."}), 400

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM loans WHERE id = ?", (loan_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Préstamo no encontrado"}), 404

    cursor.execute('''
        UPDATE loans SET 
            status = 'Rechazado',
            verification_status = 'Rechazado por Admin',
            rejection_reason = ?,
            rejection_date = ?
        WHERE id = ?
    ''', (reason, now_str, loan_id))
    
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": f"Solicitud #PR-{loan_id} rechazada. Se registró la justificación."})

@loans_bp.route('/<int:loan_id>/request-return', methods=['POST', 'PUT'])
def request_return_loan(loan_id):
    """El usuario que solicitó el préstamo sube la evidencia y la descripción de uso."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, borrower_name, approved_by FROM loans WHERE id = ?", (loan_id,))
    loan = cursor.fetchone()
    if not loan:
        conn.close()
        return jsonify({"status": "error", "message": "Préstamo no encontrado"}), 404

    # Validación de Seguridad: Solo la persona solicitante (o Admin) puede devolver el material
    current_user = session.get('user')
    user_role = get_current_user_role()
    if current_user and user_role != 'admin':
        borrower = (loan['borrower_name'] or '').strip().lower()
        approved_by = (loan['approved_by'] or '').strip().lower()
        curr_lower = current_user.strip().lower()
        if curr_lower != borrower and curr_lower != approved_by:
            conn.close()
            return jsonify({
                "status": "error",
                "message": f"Solo la persona que solicitó este material ({loan['borrower_name']}) puede realizar la entrega."
            }), 403

    return_notes = request.form.get('notes', '').strip() or request.form.get('return_notes', '').strip()
    
    photo_path = None
    if 'photo' in request.files:
        file = request.files['photo']
        if file and file.filename != '':
            ext = os.path.splitext(file.filename)[1].lower() or '.jpg'
            filename = f"return_proof_{loan_id}_{int(datetime.now().timestamp())}{ext}"
            filepath = os.path.join(UPLOAD_PHOTOS_DIR, filename)
            file.save(filepath)
            photo_path = f"/static/uploads/photos/{filename}"

    cursor.execute('''
        UPDATE loans SET 
            status = 'Pendiente Verificación Admin',
            verification_status = 'Pendiente de Verificación Admin',
            return_notes = ?,
            return_photo_path = COALESCE(?, return_photo_path)
        WHERE id = ?
    ''', (return_notes, photo_path, loan_id))
    
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Evidencia de entrega y descripción enviadas. Pendiente de verificación por el Administrador."})

@loans_bp.route('/<int:loan_id>/reject-return', methods=['PUT', 'POST'])
def reject_return_loan(loan_id):
    """El Administrador rechaza o hace una observación a la devolución (etiqueta 'Requiere Atención')."""
    user_role = get_current_user_role()
    if user_role != 'admin':
        return jsonify({"status": "error", "message": "Solo el administrador puede objetar devoluciones."}), 403

    data = request.get_json(silent=True) or request.form or {}
    reason = (data.get('reason') or data.get('justification') or '').strip()
    if not reason:
        return jsonify({"status": "error", "message": "Debe especificar la razón u observación para marcar el requerimiento de atención."}), 400

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM loans WHERE id = ?", (loan_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Préstamo no encontrado"}), 404

    cursor.execute('''
        UPDATE loans SET 
            status = 'Requiere Atención',
            verification_status = 'Devolución Con Observaciones',
            rejection_reason = ?,
            rejection_date = ?
        WHERE id = ?
    ''', (reason, now_str, loan_id))
    
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": f"Devolución del préstamo #PR-{loan_id} marcada como 'Requiere Atención' con la justificación ingresada."})

@loans_bp.route('/<int:loan_id>/approve-return', methods=['PUT', 'POST'])
def approve_return_loan(loan_id):
    """El Administrador verifica el material y la foto de entrega, deteniendo el tiempo de préstamo y concluyéndolo."""
    user_role = get_current_user_role()
    if user_role != 'admin':
        return jsonify({"status": "error", "message": "Solo el administrador puede aprobar la devolución final."}), 403

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    admin_user = session.get('user', 'Admin')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, item_name, borrower_name, return_photo_path, return_notes FROM loans WHERE id = ?", (loan_id,))
    loan = cursor.fetchone()
    if not loan:
        conn.close()
        return jsonify({"status": "error", "message": "Préstamo no encontrado"}), 404

    cursor.execute('''
        UPDATE loans SET 
            status = 'Devuelto',
            verification_status = 'Aprobado y Concluido',
            return_date = ?,
            verified_by_admin = ?,
            verified_at = ?
        WHERE id = ?
    ''', (now_str, admin_user, now_str, loan_id))
    
    # Registrar en el Historial de Cambios (Audit Log)
    try:
        notes_desc = loan['return_notes'] or 'Devolución de material verificado en estante'
        photo_info = loan['return_photo_path'] or ''
        cursor.execute('''
            INSERT INTO change_history (user_responsible, action, table_name, record_id, field_name, old_value, new_value)
            VALUES (?, 'DEVOLUCION_PRESTAMO', 'loans', ?, 'return_photo_path', ?, ?)
        ''', (admin_user, loan_id, notes_desc, photo_info))
    except Exception as e:
        print("[HISTORIAL WARN] Error registrando en historial:", str(e))

    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Devolución verificada y aprobada. Tiempo de préstamo concluido y guardado en historial."})

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

@loans_bp.route('/<int:loan_id>/control-mayor', methods=['POST', 'PUT'])
def process_control_mayor(loan_id):
    """El Administrador cierra el préstamo bajo el protocolo especial Control Mayor (material fuera del laboratorio o resguardado)."""
    user_role = get_current_user_role()
    if user_role != 'admin':
        return jsonify({"status": "error", "message": "Solo el administrador puede registrar cierres por Control Mayor."}), 403

    admin_user = session.get('user') or request.headers.get('X-User') or 'Admin'
    data = request.form or (request.json if request.is_json else {}) or {}
    notes = (data.get('notes') or data.get('control_mayor_notes') or '').strip()
    
    if not notes:
        return jsonify({"status": "error", "message": "Debe especificar la razón o nota explicativa para el registro de Control Mayor."}), 400

    photo_path = None
    if 'photo' in request.files:
        file = request.files['photo']
        if file and file.filename != '':
            ext = os.path.splitext(file.filename)[1].lower() or '.jpg'
            filename = f"control_mayor_{loan_id}_{int(datetime.now().timestamp())}{ext}"
            filepath = os.path.join(UPLOAD_PHOTOS_DIR, filename)
            file.save(filepath)
            photo_path = f"/static/uploads/photos/{filename}"

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, item_name, borrower_name FROM loans WHERE id = ?", (loan_id,))
    loan = cursor.fetchone()
    if not loan:
        conn.close()
        return jsonify({"status": "error", "message": "Préstamo no encontrado"}), 404

    cursor.execute('''
        UPDATE loans SET 
            status = 'Control Mayor',
            verification_status = 'Concluido con Control Mayor',
            control_mayor_notes = ?,
            control_mayor_photo = COALESCE(?, control_mayor_photo),
            return_date = ?,
            verified_by_admin = ?,
            verified_at = ?
        WHERE id = ?
    ''', (notes, photo_path, now_str, admin_user, now_str, loan_id))

    # Guardar en la tabla/colección permanente de registros de Control Mayor
    cursor.execute('''
        INSERT INTO control_mayor_records (loan_id, item_name, borrower_name, registered_by_admin, notes, photo_path)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (loan_id, loan['item_name'], loan['borrower_name'], admin_user, notes, photo_path))

    # Registrar en el Historial de Cambios (Audit Log)
    try:
        cursor.execute('''
            INSERT INTO change_history (user_responsible, action, table_name, record_id, field_name, old_value, new_value)
            VALUES (?, 'CIERRE_CONTROL_MAYOR', 'loans', ?, 'control_mayor_notes', ?, ?)
        ''', (admin_user, loan_id, loan['item_name'], notes))
    except Exception as e:
        print("[HISTORIAL WARN] Error registrando en historial:", str(e))

    conn.commit()
    conn.close()

    return jsonify({
        "status": "success",
        "message": f"Registro #PR-{loan_id} concluido bajo la etiqueta 'Control Mayor'. La solicitud se muestra como entregada bajo resguardo especial."
    })

@loans_bp.route('/control-mayor-records', methods=['GET'])
def get_control_mayor_records():
    """Retorna la colección completa de registros cerrados por Control Mayor."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM control_mayor_records ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    return jsonify({"status": "success", "data": [dict(r) for r in rows]})

@loans_bp.route('/clear-history', methods=['POST', 'DELETE'])
def clear_loans_history():
    """El Administrador borra los registros concluidos (Devueltos o Rechazados) de la lista activa."""
    user_role = get_current_user_role()
    if user_role != 'admin':
        return jsonify({"status": "error", "message": "Solo el administrador puede borrar historiales."}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM loans WHERE status IN ('Devuelto', 'Rechazado')")
    count = cursor.rowcount
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": f"Se limpiaron {count} registros del historial de préstamos devueltos/rechazados."})
