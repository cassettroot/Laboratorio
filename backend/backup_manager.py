import os
import json
import zipfile
from datetime import datetime, timedelta
import shutil
import glob

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, 'config_backup.json')

DEFAULT_CONFIG = {
    "enabled": False,
    "directory": os.path.join(BASE_DIR, "backups"),
    "frequency_type": "startup", # "startup", "days", "months"
    "frequency_value": 1,
    "last_backup_date": None
}

DB_FILES = ['inventario.db', 'oficina.db', 'sistemas.db']

def get_config():
    if not os.path.exists(CONFIG_PATH):
        return DEFAULT_CONFIG
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
            # Merge with default to ensure all keys exist
            for k, v in DEFAULT_CONFIG.items():
                if k not in cfg:
                    cfg[k] = v
            return cfg
    except Exception:
        return DEFAULT_CONFIG

def save_config(config):
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=4)

def ensure_backup_dir(dir_path):
    if not os.path.exists(dir_path):
        try:
            os.makedirs(dir_path)
        except Exception as e:
            print(f"Error creating backup directory {dir_path}: {e}")
            return False
    return True

def create_backup(prefix="backup"):
    cfg = get_config()
    backup_dir = cfg.get("directory", DEFAULT_CONFIG["directory"])
    if not ensure_backup_dir(backup_dir):
        return False, "No se pudo crear o acceder al directorio de respaldos."
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"{prefix}_{timestamp}.zip"
    zip_path = os.path.join(backup_dir, zip_filename)
    
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for db in DB_FILES:
                db_path = os.path.join(BASE_DIR, db)
                if os.path.exists(db_path):
                    zipf.write(db_path, db)
        return True, zip_path
    except Exception as e:
        return False, str(e)

def list_backups():
    cfg = get_config()
    backup_dir = cfg.get("directory", DEFAULT_CONFIG["directory"])
    if not os.path.exists(backup_dir):
        return []
    
    files = []
    for f in os.listdir(backup_dir):
        if f.endswith('.zip'):
            full_path = os.path.join(backup_dir, f)
            size = os.path.getsize(full_path)
            ctime = os.path.getctime(full_path)
            files.append({
                "filename": f,
                "size_bytes": size,
                "created_at": datetime.fromtimestamp(ctime).isoformat()
            })
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return files

def delete_backups(filenames):
    cfg = get_config()
    backup_dir = cfg.get("directory", DEFAULT_CONFIG["directory"])
    deleted = []
    errors = []
    for f in filenames:
        path = os.path.join(backup_dir, f)
        if os.path.exists(path) and path.startswith(backup_dir):
            try:
                os.remove(path)
                deleted.append(f)
            except Exception as e:
                errors.append(f"{f}: {str(e)}")
    return deleted, errors

import sqlite3

def wipe_tables(tables_to_wipe, inventory_id):
    """Hace backup y vacía las tablas indicadas en el inventario especificado."""
    # 1. Hacer backup primero siempre (obligatorio)
    success, result = create_backup(prefix="pre_wipe_backup")
    if not success:
        return False, f"Falló el respaldo preventivo: {result}"
    
    # 2. Mapear inventory_id a archivo DB
    db_file = f"{inventory_id}.db"
    db_path = os.path.join(BASE_DIR, db_file)
    if not os.path.exists(db_path):
        return False, f"La base de datos {db_file} no existe."
        
    # 3. Vaciar las tablas seleccionadas
    wiped = []
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        for table in tables_to_wipe:
            try:
                # Nos aseguramos de que no borre tablas de sistema
                if table not in ['users', 'user_devices', 'sqlite_sequence']:
                    cursor.execute(f"DELETE FROM {table}")
                    wiped.append(table)
            except Exception as e:
                print(f"Error vaciando tabla {table}: {e}")
        conn.commit()
        conn.close()
    except Exception as e:
        return False, f"Error accediendo a la base de datos: {str(e)}"
        
    return True, f"Secciones vaciadas: {', '.join(wiped)}. Respaldo guardado como {os.path.basename(result)}"

def check_and_run_auto_backup():
    cfg = get_config()
    if not cfg.get("enabled"):
        return
    
    freq_type = cfg.get("frequency_type", "startup")
    freq_val = cfg.get("frequency_value", 1)
    last_date_str = cfg.get("last_backup_date")
    
    should_run = False
    now = datetime.now()
    
    if freq_type == "startup":
        should_run = True
    elif last_date_str:
        try:
            last_date = datetime.fromisoformat(last_date_str)
            if freq_type == "days":
                if now >= last_date + timedelta(days=freq_val):
                    should_run = True
            elif freq_type == "months":
                # Aproximacion de meses
                if now >= last_date + timedelta(days=freq_val * 30):
                    should_run = True
        except ValueError:
            should_run = True
    else:
        should_run = True

    if should_run:
        success, path = create_backup(prefix="autobackup")
        if success:
            cfg["last_backup_date"] = now.isoformat()
            save_config(cfg)
            print(f"Auto-backup completado exitosamente: {path}")
        else:
            print(f"Fallo en el auto-backup: {path}")

