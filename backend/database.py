import sqlite3
import os
import base64
import hashlib

# Directorio raíz del proyecto (donde viven las .db)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Inventarios permitidos y sus archivos de base de datos
_INVENTORY_DB_MAP = {
    'inventario': 'inventario.db',
    'oficina':    'oficina.db',
    'sistemas':   'sistemas.db',
}

# DB_PATH siempre apunta al laboratorio principal (para compatibilidad con tools.py / backup)
DB_PATH = os.path.join(_BASE_DIR, 'inventario.db')


def _get_db_path() -> str:
    """Devuelve la ruta de la BD según el header X-Inventory-Id del request actual."""
    try:
        from flask import request as _req
        inv_id = _req.headers.get('X-Inventory-Id', 'inventario')
    except RuntimeError:
        # Fuera de contexto de Flask (ej. init_db al arrancar)
        inv_id = 'inventario'
    db_file = _INVENTORY_DB_MAP.get(inv_id, 'inventario.db')
    return os.path.join(_BASE_DIR, db_file)

SECRET_CIPHER_KEY = "itma2-super-secret-key-laboratorio"

def encrypt_username(username: str) -> str:
    if not username:
        return ""
    key_hash = hashlib.sha256(SECRET_CIPHER_KEY.encode()).digest()
    data = username.encode('utf-8')
    encrypted = bytes(b ^ key_hash[i % len(key_hash)] for i, b in enumerate(data))
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_username(encrypted_username: str) -> str:
    if not encrypted_username:
        return ""
    try:
        key_hash = hashlib.sha256(SECRET_CIPHER_KEY.encode()).digest()
        data = base64.b64decode(encrypted_username.encode('utf-8'))
        decrypted = bytes(b ^ key_hash[i % len(key_hash)] for i, b in enumerate(data))
        return decrypted.decode('utf-8')
    except Exception:
        return encrypted_username

def get_db_connection():
    """Conecta a la base de datos del inventario indicado en X-Inventory-Id con alta concurrencia WAL."""
    db_path = _get_db_path()
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    except Exception:
        pass
    return conn

def get_users_db_connection():
    """Conecta SIEMPRE a la base de datos principal (inventario.db) donde residen las cuentas de usuario."""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    except Exception:
        pass
    return conn

def get_user_by_username(username):
    """Busca un usuario SIEMPRE en inventario.db (BD principal donde viven los usuarios)."""
    conn = get_users_db_connection()
    cursor = conn.cursor()
    enc_username = encrypt_username(username)
    cursor.execute('SELECT * FROM users WHERE username = ?', (enc_username,))
    user = cursor.fetchone()
    conn.close()
    return user

def init_db():
    """Inicializa SIEMPRE inventario.db (BD principal) y habilita WAL en todos los inventarios."""
    for inv_name, db_file in _INVENTORY_DB_MAP.items():
        try:
            target_path = os.path.join(_BASE_DIR, db_file)
            c_target = sqlite3.connect(target_path, timeout=30.0)
            c_target.execute("PRAGMA journal_mode=WAL;")
            c_target.execute("PRAGMA synchronous=NORMAL;")
            c_target.close()
        except Exception as e:
            print(f"WAL init warning for {db_file}:", e)

    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
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
            presentation_images TEXT,
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
            barcode TEXT,
            inventory_number TEXT,
            serial_number TEXT,
            no_sep TEXT,
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

    # 5. Tabla de Préstamos y Devoluciones con Evidencia de Foto y Verificación Admin
    cursor.execute('''
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
    ''')

    # 6. Tabla de Solicitudes de Cambio (change_requests)
    cursor.execute('''
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
    ''')

    # 7. Tabla de Equipos y Bienes Muebles
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS equipos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            caracteristicas_bien TEXT,
            no_inventario TEXT,
            marca TEXT,
            modelo TEXT,
            serie TEXT,
            valor TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migraciones para agregar columnas nuevas si la base de datos ya existía
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
        cursor.execute("ALTER TABLE change_requests ADD COLUMN approved_by TEXT")
    except sqlite3.OperationalError:
        pass

    # Migrar usuarios existentes para cifrar sus nombres de usuario si es necesario
    cursor.execute("SELECT id, username, role FROM users")
    existing_users = cursor.fetchall()
    for row in existing_users:
        user_id = row['id']
        raw_username = row['username']
        decrypted = decrypt_username(raw_username)
        # Si decrypt_username retorna el mismo valor, significa que no estaba encriptado (o falló el descifrado)
        if decrypted == raw_username:
            encrypted = encrypt_username(raw_username)
            # Si era el usuario "admin" previo, asegurar que su rol sea admin
            new_role = 'admin' if raw_username == 'admin' else row['role']
            cursor.execute("UPDATE users SET username = ?, role = ? WHERE id = ?", (encrypted, new_role, user_id))

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

    try:
        cursor.execute("ALTER TABLE substances ADD COLUMN presentation_images TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE chemical_materials ADD COLUMN barcode TEXT")
    except sqlite3.OperationalError:
        pass

    # Migraciones para la tabla loans
    loans_cols = [
        "ALTER TABLE loans ADD COLUMN items_json TEXT",
        "ALTER TABLE loans ADD COLUMN borrower_user_id INTEGER DEFAULT 0",
        "ALTER TABLE loans ADD COLUMN return_photo_path TEXT",
        "ALTER TABLE loans ADD COLUMN return_notes TEXT",
        "ALTER TABLE loans ADD COLUMN verification_status TEXT DEFAULT 'Pendiente Aprobación Admin'",
        "ALTER TABLE loans ADD COLUMN approved_by TEXT DEFAULT ''",
        "ALTER TABLE loans ADD COLUMN verified_by_admin TEXT",
        "ALTER TABLE loans ADD COLUMN verified_at TEXT",
        "ALTER TABLE loans ADD COLUMN quantity_borrowed REAL DEFAULT 1.0"
    ]
    for stmt in loans_cols:
        try:
            cursor.execute(stmt)
        except sqlite3.OperationalError:
            pass

    # Crear usuario admin por defecto si la tabla está vacía
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        from werkzeug.security import generate_password_hash
        # Usamos credenciales seguras definidas
        username_plain = "admin_lab_2026"
        password_plain = "PasswordLabKeep2026!"
        
        hashed_password = generate_password_hash(password_plain)
        encrypted_username = encrypt_username(username_plain)
        cursor.execute(
            "INSERT INTO users (username, password, role, active) VALUES (?, ?, ?, ?)", 
            (encrypted_username, hashed_password, 'admin', 1)
        )

    # Inicializar y sembrar datos de la sección consulta
    import json
    
    # 1. GHS Pictograms
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consulta_ghs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            meaning TEXT NOT NULL,
            examples TEXT NOT NULL,
            recommendations TEXT NOT NULL,
            image_path TEXT
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM consulta_ghs")
    if cursor.fetchone()[0] == 0:
        ghs_items = [
            ("toxic", "Toxicidad aguda", "Puede causar intoxicaciones graves o incluso la muerte con pequeñas cantidades.", json.dumps(["Cianuros", "Metanol", "Arsénico"]), json.dumps(["Usar guantes", "Evitar inhalación", "Trabajar bajo campana"]), ""),
            ("flammable", "Inflamable", "Puede incendiarse fácilmente en contacto con fuentes de ignición.", json.dumps(["Etanol", "Acetona", "Hexano"]), json.dumps(["Alejar de fuentes de calor", "No fumar", "Mantener cerrado"]), ""),
            ("oxidizer", "Comburente / Oxidante", "Puede provocar o agravar incendios y explosiones en presencia de materiales combustibles.", json.dumps(["Peróxido de hidrógeno", "Nitrato de potasio", "Ácido nítrico concentrado"]), json.dumps(["Alejar de materiales combustibles", "Almacenar en lugar fresco", "No mezclar con reductores"]), ""),
            ("corrosive", "Corrosivo", "Puede destruir tejidos vivos y materiales al contacto.", json.dumps(["Ácido sulfúrico", "Hidróxido de sodio", "Hipoclorito de sodio"]), json.dumps(["Usar guantes y gafas", "Mantener en envases adecuados", "Trabajar con ventilación"]), ""),
            ("acute", "Peligro para la salud / Irritante", "Puede causar irritación en piel, ojos o vías respiratorias, o efectos nocivos por ingestión.", json.dumps(["Cloroformo", "Amoníaco diluido", "Formaldehído"]), json.dumps(["Evitar contacto con piel y ojos", "Usar mascarilla", "Lavar manos después de usar"]), ""),
            ("health", "Peligro grave para la salud", "Puede causar daños permanentes a la salud, cáncer, mutagenicidad o toxicidad reproductiva.", json.dumps(["Benceno", "Cromo hexavalente", "Amianto"]), json.dumps(["Usar EPP completo", "Trabajar en campana extractora", "Capacitación obligatoria"]), ""),
            ("gas", "Gas a presión", "Puede explotar con el calor si está comprimido, o causar quemaduras por frío extremo.", json.dumps(["Oxígeno comprimido", "Nitrógeno líquido", "Gas propano"]), json.dumps(["Mantener en posición vertical", "Alejar de fuentes de calor", "No perforar ni incinerar"]), ""),
            ("explosive", "Explosivo", "Puede explotar por impacto, fricción, chispa o calor.", json.dumps(["Ácido pícrico", "Nitroglicerina", "Peróxidos orgánicos"]), json.dumps(["Evitar golpes y fricción", "Almacenar en lugar seguro", "No exponer al calor"]), ""),
            ("environmental", "Peligro para el medio ambiente", "Puede causar daños graves a ecosistemas acuáticos o terrestres.", json.dumps(["Plaguicidas", "Mercurio", "Hidrocarburos clorados"]), json.dumps(["No verter al drenaje", "Desechar como residuo peligroso", "Contener derrames"]), "")
        ]
        cursor.executemany("INSERT INTO consulta_ghs (id, title, meaning, examples, recommendations, image_path) VALUES (?, ?, ?, ?, ?, ?)", ghs_items)

    # 2. Lab Materials
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consulta_lab_materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            desc TEXT NOT NULL,
            image_path TEXT
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM consulta_lab_materials")
    if cursor.fetchone()[0] == 0:
        materials = [
            ("Vaso de precipitados", "Recipiente cilíndrico utilizado para mezclar, calentar y contener líquidos. No debe utilizarse para medir con precisión.", ""),
            ("Probeta", "Sirve para medir volúmenes de líquidos con mayor precisión que un vaso de precipitados.", ""),
            ("Bureta", "Se utiliza en titulaciones para agregar volúmenes precisos de una solución. Cuenta con una llave de paso en la parte inferior.", ""),
            ("Matraz Erlenmeyer", "Matraz de forma cónica ideal para mezclar líquidos por agitación. Su forma permite evitar salpicaduras.", ""),
            ("Matraz aforado", "Diseñado para contener o medir un volumen exacto de líquido. Se usa en preparación de soluciones.", ""),
            ("Pipeta", "Tubo delgado que permite transferir volúmenes precisos de líquidos. Puede ser volumétrica o graduada.", ""),
            ("Tubo de ensayo", "Recipiente cilíndrico pequeño usado para realizar pruebas químicas a pequeña escala.", ""),
            ("Crisol", "Recipiente resistente a altas temperaturas usado para calcinar o fundir sustancias sólidas.", ""),
            ("Embudo de decantación", "Permite separar líquidos inmiscibles de diferente densidad mediante la llave de paso inferior.", ""),
            ("Mortero y pistilo", "Utensilio para triturar y moler sólidos hasta obtener un polvo fino.", "")
        ]
        cursor.executemany("INSERT INTO consulta_lab_materials (name, desc, image_path) VALUES (?, ?, ?)", materials)

    # 3. PPE
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consulta_ppe (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            purpose TEXT NOT NULL,
            when_use TEXT NOT NULL,
            limits TEXT NOT NULL,
            image_path TEXT
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM consulta_ppe")
    if cursor.fetchone()[0] == 0:
        ppe = [
            ("Guantes de nitrilo", "Protegen las manos contra sustancias químicas, ácidos y solventes.", "Siempre que exista contacto directo con reactivos, muestras biológicas o materiales peligrosos.", "No protegen frente a todos los solventes orgánicos. Verificar la ficha técnica del fabricante.", ""),
            ("Gafas de seguridad", "Protegen los ojos de salpicaduras químicas, proyecciones de partículas y radiación UV.", "Obligatorias en todo momento dentro del laboratorio, incluso si no se está manipulando reactivos.", "No protegen contra impactos de alta energía. Usar careta facial si hay riesgo de explosión.", ""),
            ("Bata de laboratorio", "Protege la piel y la ropa de salpicaduras químicas y materiales biológicos.", "Debe usarse siempre al ingresar al laboratorio. Preferiblemente de manga larga y algodón.", "No es impermeable. Retirar inmediatamente si se contamina con una sustancia peligrosa.", ""),
            ("Campana extractora", "Elimina humos, gases tóxicos y vapores inflamables del área de trabajo.", "Siempre que se manipulen compuestos volátiles, tóxicos o con olores fuertes.", "No protege contra explosiones. Mantener la silla a una altura adecuada para su funcionamiento.", ""),
            ("Careta facial", "Protege toda la cara contra salpicaduras químicas y proyecciones.", "Al manipular grandes volúmenes de ácidos concentrados, bases fuertes o sustancias corrosivas.", "No reemplaza a las gafas de seguridad. Usar en combinación con otros EPP.", ""),
            ("Zapatos cerrados", "Protegen los pies de derrames químicos, caída de objetos y rotura de vidrio.", "Obligatorios en todo el laboratorio. No usar sandalias, chanclas ni zapatos abiertos.", "Los zapatos de tela absorben líquidos. Preferir zapatos de cuero o material impermeable.", "")
        ]
        cursor.executemany("INSERT INTO consulta_ppe (title, purpose, when_use, limits, image_path) VALUES (?, ?, ?, ?, ?)", ppe)

    # 4. Safety Signs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consulta_safety_signs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            desc TEXT NOT NULL,
            image_path TEXT
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM consulta_safety_signs")
    if cursor.fetchone()[0] == 0:
        signs = [
            ("Prohibido fumar", "No introducir llamas abiertas ni encendedores.", ""),
            ("Material inflamable", "Presencia de sustancias que pueden arder fácilmente.", ""),
            ("Tóxico", "Sustancias que pueden causar daños graves a la salud.", ""),
            ("Corrosivo", "Materiales que pueden quemar la piel o corroer metales.", ""),
            ("Radiación", "Presencia de fuentes radiactivas o equipos que emiten radiación ionizante.", ""),
            ("Riesgo biológico", "Materiales que contienen microorganismos patógenos.", ""),
            ("Salida de emergencia", "Dirección hacia la salida más cercana en caso de emergencia.", ""),
            ("Peligro general", "Advertencia general de riesgos no especificados en el área.", ""),
            ("Protección obligatoria", "Es obligatorio el uso de gafas de seguridad en esta área.", ""),
            ("Uso de guantes obligatorio", "Deben usarse guantes de protección para manipular materiales.", ""),
            ("Ducha de emergencia", "Ubicación de la ducha de seguridad para lavado corporal urgente.", ""),
            ("Lavaojos", "Estación de lavado de ojos para emergencias con salpicaduras.", "")
        ]
        cursor.executemany("INSERT INTO consulta_safety_signs (label, desc, image_path) VALUES (?, ?, ?)", signs)

    # 5. First Aid
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consulta_first_aid (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            steps TEXT NOT NULL,
            image_path TEXT
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM consulta_first_aid")
    if cursor.fetchone()[0] == 0:
        first_aid = [
            ("Contacto con la piel", json.dumps([
                "Retirar inmediatamente la ropa y calzado contaminados.",
                "Lavar la zona afectada con abundante agua durante al menos 15 minutos.",
                "No usar jabones ni neutralizantes sin indicación médica.",
                "Cubrir la zona con gasa estéril y buscar atención médica."
            ]), ""),
            ("Contacto con los ojos", json.dumps([
                "Lavar inmediatamente con agua corriente o solución salina durante 15 minutos.",
                "Mantener los párpados abiertos con los dedos durante el lavado.",
                "No frotar los ojos ni aplicar colirios sin prescripción.",
                "Acudir de inmediato al médico oftalmólogo."
            ]), ""),
            ("Inhalación de gases", json.dumps([
                "Trasladar a la víctima al aire libre inmediatamente.",
                "Si no respira, iniciar reanimación cardiopulmonar (RCP).",
                "Aflojar la ropa ajustada.",
                "Buscar atención médica urgente. Llevar la etiqueta del producto si es posible."
            ]), ""),
            ("Ingestión de sustancias", json.dumps([
                "No inducir el vómito a menos que lo indique un médico.",
                "Enjuagar la boca con agua (no tragar).",
                "Identificar la sustancia ingerida y contactar al centro de toxicología.",
                "Acudir inmediatamente a urgencias con la ficha de seguridad (SDS)."
            ]), ""),
            ("Quemaduras térmicas o químicas", json.dumps([
                "Enfriar la zona con agua corriente durante al menos 10 minutos.",
                "No aplicar hielo directamente, cremas ni pomadas.",
                "Cubrir con gasa húmeda estéril o paño limpio.",
                "No romper ampollas. Buscar atención médica."
            ]), ""),
            ("Descarga eléctrica", json.dumps([
                "NO tocar a la víctima si aún está en contacto con la fuente eléctrica.",
                "Desconectar la corriente o separar a la víctima con un objeto no conductor (madera, plástico).",
                "Verificar si respira y tiene pulso. Iniciar RCP si es necesario.",
                "Llamar a emergencias inmediatamente."
            ]), "")
        ]
        cursor.executemany("INSERT INTO consulta_first_aid (title, steps, image_path) VALUES (?, ?, ?)", first_aid)

    # 6. Glossary
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consulta_glossary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term TEXT NOT NULL,
            def TEXT NOT NULL,
            image_path TEXT
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM consulta_glossary")
    if cursor.fetchone()[0] == 0:
        glossary = [
            ("CAS", "Número único asignado por el Chemical Abstracts Service a cada sustancia química. Permite identificar inequívocamente un compuesto.", ""),
            ("SDS / MSDS", "Hoja de Datos de Seguridad (Safety Data Sheet). Documento que describe los peligros, manejo y emergencias de una sustancia química.", ""),
            ("pH", "Medida de acidez o alcalinidad de una solución acuosa. Escala de 0 (ácido) a 14 (base), siendo 7 neutro.", ""),
            ("Molaridad (M)", "Unidad de concentración que expresa el número de moles de soluto por litro de solución.", ""),
            ("Punto de inflamación", "Temperatura mínima a la que una sustancia libera vapores suficientes para formar una mezcla inflamable con el aire.", ""),
            ("DL50", "Dosis letal 50. Cantidad de una sustancia necesaria para matar al 50% de una población de prueba. Indica toxicidad aguda.", ""),
            ("GHS", "Sistema Globalmente Armonizado de clasificación y etiquetado de productos químicos. Define pictogramas, palabras de advertencia y frases de riesgo.", ""),
            ("NFPA 704", "Norma del National Fire Protection Association que usa un diamante con código de colores y números para indicar los peligros de una sustancia.", ""),
            ("ppm", "Partes por millón. Unidad de concentración usada para cantidades muy pequeñas de una sustancia en aire o agua.", ""),
            ("CAMPANA", "Campana extractora de gases. Sistema de ventilacion localizada que protege al usuario de inhalar vapores toxicos.", ""),
            ("Reactivo limitante", "Sustancia que se consume completamente en una reacción química y determina la cantidad máxima de producto formado.", ""),
            ("Catalizador", "Sustancia que acelera una reacción química sin consumirse en el proceso. No altera el equilibrio termodinámico.", "")
        ]
        cursor.executemany("INSERT INTO consulta_glossary (term, def, image_path) VALUES (?, ?, ?)", glossary)

    # 7. Compatibility
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consulta_compatibility (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group1 TEXT NOT NULL,
            group2 TEXT NOT NULL,
            risk TEXT NOT NULL,
            severity TEXT NOT NULL
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM consulta_compatibility")
    if cursor.fetchone()[0] == 0:
        compatibility = [
            ("Ácidos", "Bases", "Reacción violenta con liberación de calor.", "alta"),
            ("Ácidos", "Metales", "Puede producir gases inflamables (hidrógeno).", "alta"),
            ("Oxidantes", "Alcoholes", "Puede provocar incendios o explosiones.", "alta"),
            ("Oxidantes", "Reductores", "Reacción violenta inmediata.", "alta"),
            ("Peróxidos", "Metales", "Reacción peligrosa con posibilidad de explosión.", "alta"),
            ("Agua", "Metales alcalinos", "Liberación de hidrógeno con posible explosión.", "alta"),
            ("Ácidos", "Cianuros", "Liberación de gas cianhídrico altamente tóxico.", "crítica"),
            ("Ácidos", "Sulfuros", "Liberación de gas sulfhídrico tóxico.", "crítica"),
            ("Alcoholes", "Halógenos", "Reacción violenta.", "media"),
            ("Amoníaco", "Halógenos", "Puede formar explosivos sensibles.", "alta"),
            ("Ácidos", "Permanganatos", "Reacción violenta, posible explosión.", "alta"),
            ("Hidróxidos", "Metales", "Puede generar gases inflamables.", "media")
        ]
        cursor.executemany("INSERT INTO consulta_compatibility (group1, group2, risk, severity) VALUES (?, ?, ?, ?)", compatibility)

    # 8. NFPA
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consulta_nfpa (
            quad TEXT NOT NULL,
            level TEXT NOT NULL,
            label TEXT,
            desc TEXT NOT NULL,
            PRIMARY KEY (quad, level)
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM consulta_nfpa")
    if cursor.fetchone()[0] == 0:
        nfpa = [
            # Azul (Salud)
            ("blue", "0", "Sin riesgo", "No representa un riesgo significativo para la salud."),
            ("blue", "1", "Ligero", "Exposición breve puede causar irritación leve. Ej: acetona."),
            ("blue", "2", "Moderado", "Exposición intensa o continua puede causar incapacidad temporal o daños residuales. Ej: cloroformo."),
            ("blue", "3", "Severo", "Exposición breve puede causar daños graves temporales o residuales. Ej: ácido clorhídrico."),
            ("blue", "4", "Extremo", "Exposición muy breve puede causar la muerte o daños permanentes. Ej: ácido fluorhídrico."),
            # Rojo (Inflamabilidad)
            ("red", "0", "No inflamable", "No se quema. Ej: agua."),
            ("red", "1", "Ligeramente inflamable", "Requiere precalentamiento para ignición. Punto de inflamación > 93 °C. Ej: aceite mineral."),
            ("red", "2", "Moderadamente inflamable", "Se inflama con calor moderado. Punto de inflamación entre 38 °C y 93 °C. Ej: diésel."),
            ("red", "3", "Altamente inflamable", "Se inflama a temperatura ambiente. Punto de inflamación entre 23 °C y 38 °C. Ej: etanol."),
            ("red", "4", "Extremadamente inflamable", "Se inflama fácilmente a temperatura ambiente. Punto de inflamación < 23 °C. Ej: éter dietílico."),
            # Amarillo (Reactividad)
            ("yellow", "0", "Estable", "Normalmente estable. No reacciona con agua. Ej: nitrógeno."),
            ("yellow", "1", "Inestable si se calienta", "Normalmente estable pero puede volverse inestable a temperaturas elevadas. Ej: ácido acético."),
            ("yellow", "2", "Reacción violenta", "Puede sufrir cambio químico violento a temperatura y presión elevadas. Ej: ácido nítrico."),
            ("yellow", "3", "Peligro de explosión", "Puede explotar por choque o calor intenso. Ej: peróxido de benzoilo."),
            ("yellow", "4", "Puede explotar fácilmente", "Material extremadamente sensible a calor o impacto. Ej: nitroglicerina."),
            # Blanco (Especial)
            ("white", "W", "Reacciona con agua", "Reacciona violentamente con agua liberando gases inflamables o tóxicos."),
            ("white", "OX", "Oxidante", "Puede provocar combustión en materiales combustibles sin fuente de ignición externa."),
            ("white", "SA", "Gas asfixiante simple", "Desplaza el oxígeno en espacios cerrados."),
            ("white", "COR", "Corrosivo", "Causa daños a piel, ojos o metales."),
            ("white", "ACID", "Ácido fuerte", "Puede causar quemaduras químicas graves."),
            ("white", "ALK", "Base fuerte", "Puede causar quemaduras químicas graves.")
        ]
        cursor.executemany("INSERT INTO consulta_nfpa (quad, level, label, desc) VALUES (?, ?, ?, ?)", nfpa)

    # Migraciones para chemical_materials
    for col in ['inventory_number', 'serial_number', 'no_sep']:
        try:
            cursor.execute(f"ALTER TABLE chemical_materials ADD COLUMN {col} TEXT")
        except sqlite3.OperationalError:
            pass

    # Migración de columna assigned_labs en la tabla users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN assigned_labs TEXT DEFAULT 'all'")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Base de datos inicializada exitosamente.")
