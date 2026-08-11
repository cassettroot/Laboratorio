import os
import uuid
import base64
import qrcode
from flask import Blueprint, request, jsonify
from backend.utils.auth_helpers import safe_db_error
from backend.database import get_db_connection

tools_bp = Blueprint('tools', __name__)

# Definir directorios locales
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_PHOTOS_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'photos')
UPLOAD_QRS_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'qrs')
UPLOAD_DOCS_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'documents')

# Asegurar que existan los directorios
os.makedirs(UPLOAD_PHOTOS_DIR, exist_ok=True)
os.makedirs(UPLOAD_QRS_DIR, exist_ok=True)
os.makedirs(UPLOAD_DOCS_DIR, exist_ok=True)

def generate_qr(table_name, record_id, custom_content=None):
    """
    Genera un archivo QR de forma local y retorna la ruta relativa y el contenido del QR.
    """
    # Si no hay contenido personalizado, creamos un enlace/código interno estándar
    content = custom_content if custom_content else f"LAB-{table_name.upper()}-{record_id}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(content)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    filename = f"qr_{table_name}_{record_id}.png"
    filepath = os.path.join(UPLOAD_QRS_DIR, filename)
    img.save(filepath)

    return f"/static/uploads/qrs/{filename}", content

@tools_bp.route('/api/upload-photo', methods=['POST'])
def upload_photo():
    """
    Sube una foto al servidor local. Puede ser un archivo binario convencional (multipart/form-data)
    o una imagen en Base64 (capturada por la cámara web).
    """
    try:
        # Caso 1: Captura de cámara web (Base64)
        if request.is_json:
            data = request.get_json()
            image_data = data.get('image')
            if image_data and ',' in image_data:
                # Separar el encabezado 'data:image/jpeg;base64,' del contenido base64
                header, encoded = image_data.split(',', 1)
                img_bytes = base64.b64decode(encoded)
                
                filename = f"photo_{uuid.uuid4().hex}.jpg"
                filepath = os.path.join(UPLOAD_PHOTOS_DIR, filename)
                with open(filepath, 'wb') as f:
                    f.write(img_bytes)
                
                return jsonify({
                    "status": "success",
                    "image_path": f"/static/uploads/photos/{filename}"
                })
        
        # Caso 2: Carga de archivo tradicional
        if 'photo' in request.files:
            file = request.files['photo']
            if file.filename != '':
                ext = os.path.splitext(file.filename)[1]
                filename = f"photo_{uuid.uuid4().hex}{ext}"
                filepath = os.path.join(UPLOAD_PHOTOS_DIR, filename)
                file.save(filepath)
                
                return jsonify({
                    "status": "success",
                    "image_path": f"/static/uploads/photos/{filename}"
                })
                
        return jsonify({"status": "error", "message": "No se recibió ninguna imagen válida"}), 400
    except Exception as e:
        return safe_db_error(e)

@tools_bp.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    """
    Sube un archivo PDF al servidor local.
    """
    try:
        if 'pdf' in request.files:
            file = request.files['pdf']
            if file.filename != '':
                ext = os.path.splitext(file.filename)[1].lower()
                if ext != '.pdf':
                    return jsonify({"status": "error", "message": "El archivo debe ser un PDF"}), 400
                
                filename = f"doc_{uuid.uuid4().hex}{ext}"
                filepath = os.path.join(UPLOAD_DOCS_DIR, filename)
                file.save(filepath)
                
                return jsonify({
                    "status": "success",
                    "pdf_path": f"/static/uploads/documents/{filename}"
                })
                
        return jsonify({"status": "error", "message": "No se recibió ningún archivo PDF válido"}), 400
    except Exception as e:
        return safe_db_error(e)

@tools_bp.route('/api/scan-qr', methods=['POST'])
def scan_qr():
    """
    Busca en las tres tablas un registro que coincida con el contenido del código QR escaneado.
    """
    import re
    data = request.get_json() or {}
    qr_code = str(data.get('qr_code') or data.get('qr_content') or '').strip()

    if not qr_code:
        return jsonify({"status": "error", "message": "Falta el código QR"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Extraer ID numérico si existe un patrón como LAB-SUB-15, sustancias/15 o es solo números
    sub_match = re.search(r'substance[s]?/(\d+)', qr_code, re.IGNORECASE) or re.search(r'LAB-SUB(?:STANCES)?-(\d+)', qr_code, re.IGNORECASE)
    int_id = int(sub_match.group(1)) if sub_match else (int(qr_code) if qr_code.isdigit() else -1)

    # Buscar por ID primero en sustancias
    if int_id > 0:
        cursor.execute('SELECT * FROM substances WHERE id = ?', (int_id,))
        substance = cursor.fetchone()
        if substance:
            conn.close()
            return jsonify({"status": "success", "type": "substance", "data": dict(substance)})

    # Buscar por coincidencia de qr_content, CAS o Nombre en sustancias
    cursor.execute('SELECT * FROM substances')
    substances = cursor.fetchall()
    for s in substances:
        s_dict = dict(s)
        # Coincidencia por qr_content o ID dentro del texto
        if s_dict.get('qr_content') and (s_dict['qr_content'].strip() == qr_code or f"LAB-SUB-{s_dict['id']}" in qr_code):
            conn.close()
            return jsonify({"status": "success", "type": "substance", "data": s_dict})
        # Coincidencia por CAS number
        if s_dict.get('cas_number') and len(s_dict['cas_number'].strip()) >= 4 and s_dict['cas_number'].strip() in qr_code:
            conn.close()
            return jsonify({"status": "success", "type": "substance", "data": s_dict})
        # Coincidencia por Nombre
        if s_dict.get('name') and len(s_dict['name'].strip()) >= 3 and s_dict['name'].strip().lower() in qr_code.lower():
            conn.close()
            return jsonify({"status": "success", "type": "substance", "data": s_dict})

    # 4. Buscar en materiales químicos
    chem_match = re.search(r'chemical_materials/(\d+)', qr_code, re.IGNORECASE) or re.search(r'LAB-CHM-(\d+)', qr_code, re.IGNORECASE)
    chem_id = int(chem_match.group(1)) if (chem_match and chem_match.group(1).isdigit()) else int_id

    cursor.execute('''
        SELECT * FROM chemical_materials 
        WHERE id = ? OR qr_content = ? OR ('LAB-CHEMICAL_MATERIALS-' || id) = ? OR ('LAB-CHM-' || id) = ? OR barcode = ? OR inventory_number = ? OR serial_number = ?
    ''', (chem_id, qr_code, qr_code, qr_code, qr_code, qr_code, qr_code))
    chem_material = cursor.fetchone()
    if chem_material:
        conn.close()
        return jsonify({
            "status": "success",
            "type": "chemical_material",
            "data": dict(chem_material)
        })

    # 5. Buscar en materiales didácticos
    did_match = re.search(r'didactic_materials/(\d+)', qr_code, re.IGNORECASE) or re.search(r'LAB-DID-(\d+)', qr_code, re.IGNORECASE)
    did_id = int(did_match.group(1)) if (did_match and did_match.group(1).isdigit()) else int_id

    cursor.execute('''
        SELECT * FROM didactic_materials 
        WHERE id = ? OR qr_content = ? OR ('LAB-DIDACTIC_MATERIALS-' || id) = ? OR ('LAB-DID-' || id) = ?
    ''', (did_id, qr_code, qr_code, qr_code))
    did_material = cursor.fetchone()
    if did_material:
        conn.close()
        return jsonify({
            "status": "success",
            "type": "didactic_material",
            "data": dict(did_material)
        })

    conn.close()
    return jsonify({
        "status": "error",
        "message": f"No se encontró ningún reactivo o material con el código QR: {qr_code}"
    }), 404

@tools_bp.route('/api/database/export', methods=['GET'])
def export_database():
    from flask import session, send_from_directory
    from backend.database import DB_PATH
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado. Inicie sesión."}), 401
    
    try:
        return send_from_directory(os.path.dirname(DB_PATH), os.path.basename(DB_PATH), as_attachment=True, download_name='inventario_backup.db')
    except Exception as e:
        return safe_db_error(e)

@tools_bp.route('/api/database/import', methods=['POST'])
def import_database():
    import sqlite3
    from flask import session
    from backend.database import DB_PATH
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado. Inicie sesión."}), 401
    
    try:
        if 'database' not in request.files:
            return jsonify({"status": "error", "message": "No se recibió ningún archivo"}), 400
        
        file = request.files['database']
        if file.filename == '':
            return jsonify({"status": "error", "message": "Nombre de archivo vacío"}), 400
        
        # Guardar en archivo temporal
        temp_path = DB_PATH + '.temp'
        file.save(temp_path)
        
        # Validar base de datos SQLite y tablas requeridas
        try:
            conn = sqlite3.connect(temp_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            conn.close()
            
            # Validación simple del esquema
            if 'substances' not in tables or 'users' not in tables:
                os.remove(temp_path)
                return jsonify({"status": "error", "message": "El archivo de base de datos no es válido o no tiene la estructura de LabKeep"}), 400
                
        except Exception as db_err:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return jsonify({"status": "error", "message": f"Archivo de base de datos corrupto o inválido: {str(db_err)}"}), 400
        
        # Respaldar base de datos actual
        backup_path = DB_PATH + '.bak'
        if os.path.exists(DB_PATH):
            if os.path.exists(backup_path):
                os.remove(backup_path)
            os.rename(DB_PATH, backup_path)
            
        # Reemplazar la base de datos
        os.rename(temp_path, DB_PATH)
        
        # Re-inicializar para aplicar migraciones de ser necesario
        from backend.database import init_db
        init_db()
        
        return jsonify({"status": "success", "message": "Base de datos importada exitosamente"})
    except Exception as e:
        return safe_db_error(e)
