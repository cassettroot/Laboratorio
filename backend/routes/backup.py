from flask import Blueprint, jsonify, request, send_file, session
import os
import shutil
import zipfile
from backend.backup_manager import (
    get_config, save_config, create_backup, list_backups, 
    delete_backups, wipe_tables, ensure_backup_dir, BASE_DIR
)
from backend.database import get_user_by_username

backup_bp = Blueprint('backup', __name__, url_prefix='/api/backup')

@backup_bp.before_request
def restrict_to_admin():
    if request.method == 'OPTIONS':
        return
        
    user_name = session.get('user')
    if not user_name:
        return jsonify({"status": "error", "message": "No autenticado"}), 401
        
    user_data = get_user_by_username(user_name)
    if not user_data or user_data['role'] != 'admin':
        return jsonify({"status": "error", "message": "Acceso denegado. Requiere privilegios de administrador."}), 403

@backup_bp.route('/config', methods=['GET'])
def get_backup_config():
    return jsonify({"status": "success", "data": get_config()})

@backup_bp.route('/config', methods=['POST'])
def update_backup_config():
    data = request.json
    cfg = get_config()
    cfg["enabled"] = data.get("enabled", False)
    
    # Validar que sea absoluta
    req_dir = data.get("directory", "")
    if req_dir and not os.path.isabs(req_dir):
        return jsonify({"status": "error", "message": "La ruta debe ser absoluta"}), 400
        
    cfg["directory"] = req_dir
    cfg["frequency_type"] = data.get("frequency_type", "startup")
    cfg["frequency_value"] = int(data.get("frequency_value", 1))
    
    save_config(cfg)
    return jsonify({"status": "success", "message": "Configuración guardada exitosamente."})

@backup_bp.route('/create', methods=['POST'])
def trigger_backup():
    success, result = create_backup(prefix="manual_backup")
    if success:
        return jsonify({"status": "success", "message": f"Respaldo creado: {os.path.basename(result)}"})
    else:
        return jsonify({"status": "error", "message": result}), 500

@backup_bp.route('/list', methods=['GET'])
def list_all_backups():
    return jsonify({"status": "success", "data": list_backups()})

@backup_bp.route('/delete', methods=['POST'])
def delete_selected_backups():
    filenames = request.json.get("filenames", [])
    if not filenames:
        return jsonify({"status": "error", "message": "Ningún archivo seleccionado"}), 400
    
    deleted, errors = delete_backups(filenames)
    msg = f"Archivos eliminados: {len(deleted)}."
    if errors:
        msg += f" Errores: {len(errors)}."
    
    return jsonify({"status": "success", "message": msg})

@backup_bp.route('/download/<filename>', methods=['GET'])
def download_backup(filename):
    cfg = get_config()
    backup_dir = cfg.get("directory")
    file_path = os.path.join(backup_dir, filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({"status": "error", "message": "Archivo no encontrado"}), 404

@backup_bp.route('/restore', methods=['POST'])
def restore_backup():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No se envió ningún archivo."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "Archivo vacío."}), 400
        
    if not file.filename.endswith('.zip'):
        return jsonify({"status": "error", "message": "Formato inválido. Debe ser un archivo .zip."}), 400

    temp_path = os.path.join(BASE_DIR, "temp_restore.zip")
    try:
        file.save(temp_path)
        with zipfile.ZipFile(temp_path, 'r') as zipf:
            files_in_zip = zipf.namelist()
            restored = []
            for db in ['inventario.db', 'oficina.db', 'sistemas.db']:
                if db in files_in_zip:
                    zipf.extract(db, BASE_DIR)
                    restored.append(db)
        os.remove(temp_path)
        return jsonify({"status": "success", "message": f"Bases de datos restauradas: {', '.join(restored)}. Reinicia el servidor si ves comportamientos inusuales."})
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"status": "error", "message": str(e)}), 500

@backup_bp.route('/wipe', methods=['POST'])
def wipe_current_tables():
    tables = request.json.get("tables", [])
    if not tables:
        return jsonify({"status": "error", "message": "Ninguna sección seleccionada para vaciar."}), 400
        
    inventory_id = request.headers.get('X-Inventory-Id', 'inventario')
    
    success, msg = wipe_tables(tables, inventory_id)
    if success:
        return jsonify({"status": "success", "message": msg})
    else:
        return jsonify({"status": "error", "message": msg}), 500
