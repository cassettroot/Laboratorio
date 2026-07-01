import os
import uuid
import base64
import qrcode
from flask import Blueprint, request, jsonify, current_app
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
        return jsonify({"status": "error", "message": str(e)}), 500

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
        return jsonify({"status": "error", "message": str(e)}), 500

@tools_bp.route('/api/scan-qr', methods=['POST'])
def scan_qr():
    """
    Busca en las tres tablas un registro que coincida con el contenido del código QR escaneado.
    """
    data = request.get_json() or {}
    qr_code = data.get('qr_code')

    if not qr_code:
        return jsonify({"status": "error", "message": "Falta el código QR"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Buscar en sustancias
    cursor.execute('''
        SELECT * FROM substances 
        WHERE qr_content = ? OR id = ? OR ('LAB-SUBSTANCES-' || id) = ?
    ''', (qr_code, qr_code, qr_code))
    substance = cursor.fetchone()
    if substance:
        conn.close()
        return jsonify({
            "status": "success",
            "type": "substance",
            "data": dict(substance)
        })

    # Buscar en materiales químicos
    cursor.execute('''
        SELECT * FROM chemical_materials 
        WHERE qr_content = ? OR id = ? OR ('LAB-CHEMICAL_MATERIALS-' || id) = ?
    ''', (qr_code, qr_code, qr_code))
    chem_material = cursor.fetchone()
    if chem_material:
        conn.close()
        return jsonify({
            "status": "success",
            "type": "chemical_material",
            "data": dict(chem_material)
        })

    # Buscar en materiales didácticos
    cursor.execute('''
        SELECT * FROM didactic_materials 
        WHERE qr_content = ? OR id = ? OR ('LAB-DIDACTIC_MATERIALS-' || id) = ?
    ''', (qr_code, qr_code, qr_code))
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
