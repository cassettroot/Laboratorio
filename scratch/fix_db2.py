import re

with open('backend/database.py', 'r') as f:
    content = f.read()

# Find the start of init_db
start_idx = content.find('def init_db():')

if start_idx != -1:
    old_init = content[start_idx:]
    
    new_init = '''def init_db():
    inventories = ['inventario', 'oficina', 'sistemas']
    for inv in inventories:
        db_file = f"{inv}.db"
        db_path = DB_PATH if inv == 'inventario' else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), db_file)
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 0. Equipos
        cursor.execute(\'\'\'
        CREATE TABLE IF NOT EXISTS equipos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            caracteristicas_bien TEXT,
            no_inventario TEXT,
            marca TEXT,
            modelo TEXT,
            serie TEXT,
            valor TEXT,
            inventory_id TEXT DEFAULT 'inventario',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        \'\'\')
        
        # 1. Substances
        cursor.execute(\'\'\'
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
            inventory_id TEXT DEFAULT 'inventario',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        \'\'\')
        
        # 2. Chemical Materials
        cursor.execute(\'\'\'
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
            inventory_id TEXT DEFAULT 'inventario',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        \'\'\')
        
        # 3. Didactic Materials
        cursor.execute(\'\'\'
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
            inventory_id TEXT DEFAULT 'inventario',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        \'\'\')
        
        # 4. Change History
        cursor.execute(\'\'\'
        CREATE TABLE IF NOT EXISTS change_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            user_responsible TEXT NOT NULL,
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id INTEGER NOT NULL,
            field_name TEXT,
            old_value TEXT,
            new_value TEXT,
            inventory_id TEXT DEFAULT 'inventario'
        )
        \'\'\')
        
        # 5. Loans
        cursor.execute(\'\'\'
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
            inventory_id TEXT DEFAULT 'inventario',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        \'\'\')
        
        # 6. Change requests
        cursor.execute(\'\'\'
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
            inventory_id TEXT DEFAULT 'inventario',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        \'\'\')
        
        try:
            cursor.execute("ALTER TABLE change_requests ADD COLUMN approved_by TEXT")
        except sqlite3.OperationalError:
            pass

        conn.commit()
        conn.close()

    # 7. Users (ONLY IN INVENTARIO DB)
    conn = get_users_connection()
    cursor = conn.cursor()
    cursor.execute(\'\'\'
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'responsable',
            active INTEGER DEFAULT 1,
            email TEXT,
            allowed_inventories TEXT DEFAULT 'inventario,oficina,sistemas'
        )
    \'\'\')
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'responsable'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN allowed_inventories TEXT DEFAULT 'inventario,oficina,sistemas'")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()
'''
    
    with open('backend/database.py', 'w') as f:
        f.write(content.replace(old_init, new_init))
