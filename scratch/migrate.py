import sqlite3
import os

DB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

tables = {
    'substances': '''
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
            presentation_images TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''',
    'chemical_materials': '''
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
    ''',
    'didactic_materials': '''
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
    ''',
    'change_history': '''
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
    ''',
    'loans': '''
        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_type TEXT NOT NULL DEFAULT 'substance',
            item_id INTEGER DEFAULT 0,
            item_name TEXT NOT NULL,
            items_json TEXT,
            borrower_name TEXT NOT NULL,
            borrower_user_id INTEGER,
            borrower_type TEXT DEFAULT 'Docente',
            quantity_borrowed REAL NOT NULL DEFAULT 1.0,
            loan_date TEXT NOT NULL,
            return_date TEXT,
            return_photo_path TEXT,
            status TEXT NOT NULL DEFAULT 'Prestado',
            verification_status TEXT NOT NULL DEFAULT 'Prestado',
            approved_by TEXT NOT NULL,
            verified_by_admin TEXT,
            verified_at TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''',
    'change_requests': '''
        CREATE TABLE IF NOT EXISTS change_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requester_username TEXT NOT NULL,
            type TEXT NOT NULL,
            action TEXT NOT NULL,
            target_id TEXT,
            target_name TEXT,
            data TEXT,
            status TEXT DEFAULT 'PENDIENTE',
            feedback TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    '''
}

for db_name in ['inventario.db', 'oficina.db', 'sistemas.db']:
    conn = sqlite3.connect(os.path.join(DB_DIR, db_name))
    cursor = conn.cursor()
    for table_name, create_sql in tables.items():
        cursor.execute(create_sql)
    
    # Try migrations just in case
    try:
        cursor.execute("ALTER TABLE change_requests ADD COLUMN approved_by TEXT")
    except sqlite3.OperationalError:
        pass
    
    conn.commit()
    conn.close()
