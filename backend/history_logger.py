from datetime import datetime

def log_creation(conn, user_responsible, table_name, record_id):
    """
    Registra la creación de un nuevo elemento en el historial.
    """
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO change_history (user_responsible, action, table_name, record_id, timestamp)
        VALUES (?, 'CREACION', ?, ?, ?)
    ''', (user_responsible, table_name, record_id, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))

def log_deletion(conn, user_responsible, table_name, record_id):
    """
    Registra la eliminación de un elemento en el historial.
    """
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO change_history (user_responsible, action, table_name, record_id, timestamp)
        VALUES (?, 'ELIMINACION', ?, ?, ?)
    ''', (user_responsible, table_name, record_id, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))

def log_updates(conn, user_responsible, table_name, record_id, old_row, new_data):
    """
    Compara los datos antiguos de una fila (sqlite3.Row) con los nuevos datos (dict)
    y registra una entrada en el historial por cada campo modificado.
    """
    cursor = conn.cursor()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Lista de campos que no se auditan en detalle (metadatos internos)
    ignored_fields = {'id', 'created_at', 'updated_at', 'qr_path', 'qr_content'}
    
    for key, new_val in new_data.items():
        if key in ignored_fields:
            continue
            
        # Convertir a string para almacenar en el historial
        old_val = old_row[key]
        
        # Normalizar valores para la comparación (por ejemplo, None vs cadena vacía)
        old_val_str = str(old_val) if old_val is not None else ""
        new_val_str = str(new_val) if new_val is not None else ""
        
        # Si el valor cambió, lo registramos en el historial
        if old_val_str != new_val_str:
            cursor.execute('''
                INSERT INTO change_history (
                    user_responsible, action, table_name, record_id, field_name, old_value, new_value, timestamp
                )
                VALUES (?, 'EDICION', ?, ?, ?, ?, ?, ?)
            ''', (user_responsible, table_name, record_id, key, old_val_str, new_val_str, timestamp))
