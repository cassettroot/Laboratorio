import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'inventario.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Tabla de Sustancias Químicas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS substances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            chemical_formula TEXT,
            cas_number TEXT,
            composition TEXT,
            concentration TEXT,
            physical_state TEXT,
            color TEXT,
            odor TEXT,
            risks_warnings TEXT,
            quantity REAL NOT NULL DEFAULT 0.0,
            unit TEXT NOT NULL,
            location TEXT,
            entry_date TEXT,
            expiration_date TEXT,
            responsible TEXT,
            observations TEXT,
            image_path TEXT,
            qr_path TEXT,
            qr_content TEXT,
            external_links TEXT,
            pdf_path TEXT,
            substance_group TEXT,
            stock_units INTEGER DEFAULT 1,
            container_content TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Tabla de Materiales Químicos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chemical_materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            quantity REAL NOT NULL DEFAULT 0.0,
            unit TEXT NOT NULL DEFAULT 'piezas',
            location TEXT,
            status TEXT,
            responsible TEXT,
            observations TEXT,
            image_path TEXT,
            qr_path TEXT,
            qr_content TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 3. Tabla de Materiales Didácticos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS didactic_materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            quantity INTEGER NOT NULL DEFAULT 0,
            location TEXT,
            status TEXT,
            responsible TEXT,
            observations TEXT,
            image_path TEXT,
            qr_path TEXT,
            qr_content TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 4. Tabla de Historial de Cambios (Audit Log)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS change_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            user_responsible TEXT NOT NULL,
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id INTEGER NOT NULL,
            field_name TEXT,
            old_value TEXT,
            new_value TEXT
        )
    ''')

    # 5. Tabla de Usuarios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migraciones para agregar columnas nuevas si la base de datos ya existía
    try:
        cursor.execute("ALTER TABLE substances ADD COLUMN external_links TEXT")
    except sqlite3.OperationalError:
        pass  # La columna ya existe

    try:
        cursor.execute("ALTER TABLE substances ADD COLUMN pdf_path TEXT")
    except sqlite3.OperationalError:
        pass  # La columna ya existe

    try:
        cursor.execute("ALTER TABLE substances ADD COLUMN substance_group TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE substances ADD COLUMN stock_units INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE substances ADD COLUMN container_content TEXT")
    except sqlite3.OperationalError:
        pass

    # Crear usuario admin por defecto si la tabla está vacía
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        from werkzeug.security import generate_password_hash
        hashed_password = generate_password_hash('admin')
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", ('admin', hashed_password))

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Base de datos inicializada exitosamente.")
