import os
import secrets
import logging
from datetime import timedelta
from flask import Flask, send_from_directory, request, jsonify, session
from backend.database import init_db
from backend.routes.substances import substances_bp
from backend.routes.chem_materials import chem_materials_bp
from backend.routes.did_materials import did_materials_bp
from backend.routes.history import history_bp
from backend.routes.tools import tools_bp
from backend.routes.auth import auth_bp
from backend.routes.consulta import consulta_bp
from backend.routes.change_requests import change_requests_bp
from backend.routes.loans import loans_bp
from backend.routes.equipos import equipos_bp
from backend.routes.inventory_check import inventory_check_bp

def create_app():
    # Asegurar que la base de datos esté inicializada
    init_db()

    # Directorio de archivos estáticos
    static_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static')
    
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    
    # Configurar secret_key — generar una aleatoria segura si no se provee por entorno
    _secret = os.environ.get('SECRET_KEY')
    if not _secret:
        # Generar y persistir en un archivo local para que sobreviva reinicios
        _key_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.flask_secret')
        if os.path.exists(_key_file):
            with open(_key_file, 'r') as f:
                _secret = f.read().strip()
        else:
            _secret = secrets.token_hex(32)
            with open(_key_file, 'w') as f:
                f.write(_secret)
            os.chmod(_key_file, 0o600)  # solo lectura del propietario
    app.secret_key = _secret

    # Configurar master_app_token para la aplicación móvil
    _app_token_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.app_token')
    if os.path.exists(_app_token_file):
        with open(_app_token_file, 'r') as f:
            app.config['MASTER_APP_TOKEN'] = f.read().strip()
    else:
        app.config['MASTER_APP_TOKEN'] = secrets.token_hex(16)
        with open(_app_token_file, 'w') as f:
            f.write(app.config['MASTER_APP_TOKEN'])
        os.chmod(_app_token_file, 0o600)

    # Sesiones expiran tras 8 horas de inactividad
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)

    
    @app.before_request
    def check_device_approval():
        # 1. Permitir siempre preflight OPTIONS
        if request.method == 'OPTIONS':
            return
            
        # 2. Permitir assets estáticos necesarios para la sala de espera
        if request.path.startswith('/static/'):
            # Impedir cargar los JS sensibles si no está aprobado (opcional, pero buena práctica)
            if request.path.endswith('.js') and not request.path.endswith('waiting_room.js') and 'lucide' not in request.path:
                pass # let's just allow static files for simplicity and focus HTML block
            return
            
        # 3. Permitir localhost sin restricción
        if request.remote_addr in ['127.0.0.1', '::1', 'localhost']:
            return
            
        # 4. Permitir App Móvil si trae el token maestro
        client_token = request.headers.get('X-App-Token')
        if client_token == app.config['MASTER_APP_TOKEN']:
            return
            
        # 5. Lógica de Sala de Espera para navegadores en la red local
        device_token = request.cookies.get('device_token')
        
        from backend.database import get_db_connection
        import sqlite3
        from flask import make_response
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Permitir la ruta de verificación de status para la sala de espera
        if request.path == '/api/auth/device-status':
            if not device_token:
                conn.close()
                return jsonify({"status": "PENDING"})
            try:
                c.execute('SELECT status FROM device_approvals WHERE device_token = ?', (device_token,))
                row = c.fetchone()
                conn.close()
                if row:
                    if row['status'] == 'REJECTED':
                        return jsonify({"status": "REJECTED"}), 403
                    return jsonify({"status": row['status']})
                return jsonify({"status": "PENDING"})
            except sqlite3.OperationalError:
                # Tabla no existe aún
                conn.close()
                return jsonify({"status": "PENDING"})

        # Si no tiene device_token, generarlo y registrarlo en PENDING
        if not device_token:
            device_token = secrets.token_hex(16)
            alias = f"Dispositivo en {request.remote_addr}"
            user_agent = request.headers.get('User-Agent', '')[:50]
            if user_agent:
                alias += f" ({user_agent})"
            try:
                c.execute('INSERT INTO device_approvals (device_token, alias, status) VALUES (?, ?, ?)', (device_token, alias, 'PENDING'))
                conn.commit()
            except sqlite3.OperationalError:
                pass # Ignore if table doesn't exist yet
            conn.close()
            
            # Servir la sala de espera con la nueva cookie
            response = make_response(send_from_directory(static_folder, 'waiting_room.html'))
            response.set_cookie('device_token', device_token, max_age=60*60*24*365, httponly=True)
            return response

        # Si tiene device_token, verificar su estado
        try:
            c.execute('SELECT status FROM device_approvals WHERE device_token = ?', (device_token,))
            row = c.fetchone()
        except sqlite3.OperationalError:
            row = None
            
        if not row:
            # Token existe en cookie pero no en DB (borrado), registrarlo de nuevo
            alias = f"Dispositivo en {request.remote_addr}"
            try:
                c.execute('INSERT INTO device_approvals (device_token, alias, status) VALUES (?, ?, ?)', (device_token, alias, 'PENDING'))
                conn.commit()
            except sqlite3.OperationalError:
                pass
            conn.close()
            return send_from_directory(static_folder, 'waiting_room.html')
            
        conn.close()
        
        if row['status'] == 'APPROVED':
            # Dejar pasar la petición
            return
        elif row['status'] == 'REJECTED':
            if request.path.startswith('/api/'):
                return jsonify({"error": "Acceso denegado"}), 403
            return "<h1>Acceso Denegado</h1><p>El administrador ha bloqueado este dispositivo.</p>", 403
        else:
            # Status es PENDING
            if request.path.startswith('/api/'):
                return jsonify({"error": "Dispositivo en sala de espera"}), 403
            return send_from_directory(static_folder, 'waiting_room.html')


    # Interceptor global para requerir autenticación en peticiones modificadoras y validar roles
    @app.before_request
    def check_auth():
        # Permitir preflight OPTIONS para peticiones desde aplicaciones móviles
        if request.method == 'OPTIONS':
            return

        # Permitir rutas de autenticación sin restricciones de sesión
        if request.path.startswith('/api/auth/login') or request.path.startswith('/api/auth/logout') or request.path.startswith('/api/auth/status'):
            return

        user_logged_in = 'user' in session
        user_role = None
        user_active = 0
        allowed_inventories = []
        requested_inventory = request.headers.get('X-Inventory-Id', 'inventario')

        if user_logged_in:
            from backend.database import get_user_by_username
            user_data = get_user_by_username(session['user'])
            if user_data:
                user_role = user_data['role']
                user_active = user_data['active']
                user_dict = dict(user_data)
                allowed_inv_str = user_dict.get('allowed_inventories')
                if allowed_inv_str is None:
                    allowed_inv_str = 'inventario,oficina,sistemas'
                allowed_inventories = [i.strip() for i in allowed_inv_str.split(',')]
            else:
                session.pop('user', None)
                user_logged_in = False
                
        # 0. Verificar acceso al inventario solicitado (para usuarios logueados)
        if user_logged_in and user_role != 'admin':
            if requested_inventory not in allowed_inventories:
                if request.method not in ['GET', 'OPTIONS']:
                    return jsonify({"status": "error", "message": f"No tiene permisos de escritura en el inventario: {requested_inventory}"}), 403

        # 1. Sesión cerrada:
        if not user_logged_in:
            if request.path.startswith('/api/'):
                allowed_logged_out = (
                    (request.method == 'GET' and (
                        request.path.startswith('/api/substances') or
                        request.path.startswith('/api/chemical-materials') or
                        request.path.startswith('/api/didactic-materials') or
                        request.path.startswith('/api/equipos') or
                        request.path.startswith('/api/loans') or
                        request.path.startswith('/api/inventory-check')
                    )) or
                    (request.method == 'POST' and request.path in ['/api/scan-qr', '/api/loans', '/api/inventory-check/scan', '/api/inventory-check/save-session'])
                )
                if not allowed_logged_out:
                    return jsonify({"status": "error", "message": "No autorizado. Inicie sesión para realizar esta acción."}), 401
            return

        # 2. Usuario Inactivo:
        if user_active == 0:
            if request.method not in ['GET', 'OPTIONS']:
                return jsonify({"status": "error", "message": "Su usuario está inactivo."}), 403
            return

    # Registrar Blueprints de la API
    app.register_blueprint(substances_bp)
    app.register_blueprint(chem_materials_bp)
    app.register_blueprint(did_materials_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(tools_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(consulta_bp)
    app.register_blueprint(change_requests_bp)
    app.register_blueprint(loans_bp)
    app.register_blueprint(equipos_bp)
    app.register_blueprint(inventory_check_bp)

    # Ruta raíz: sirve el archivo index.html del frontend
    @app.route('/')
    def index():
        return send_from_directory(static_folder, 'index.html')

    # Ruta para servir archivos estáticos con prefijo /static/ (ej. imágenes, PDFs, QRs de la BD)
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        return send_from_directory(static_folder, filename)


    # Ruta catch-all para dar soporte al enrutado del cliente (SPA)
    @app.errorhandler(404)
    def page_not_found(e):
        # Si la petición no es para la API, enviamos index.html para que el frontend resuelva la ruta
        if not request.path.startswith('/api/'):
            return send_from_directory(static_folder, 'index.html')
        return jsonify({"status": "error", "message": "Recurso no encontrado"}), 404

    @app.after_request
    def add_cors_headers(response):
        # Lista blanca de orígenes permitidos (red local + loopback)
        allowed_origins = [
            'http://localhost:5000',
            'http://127.0.0.1:5000',
            'http://localhost:8081',   # Expo dev server
            'http://localhost:19006',  # Expo web
        ]
        # En desarrollo se puede ampliar desde variable de entorno
        extra = os.environ.get('CORS_EXTRA_ORIGINS', '')
        if extra:
            allowed_origins += [o.strip() for o in extra.split(',') if o.strip()]

        origin = request.headers.get('Origin', '')
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-Inventory-Id'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'

        # Headers de seguridad HTTP estándar
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'

        return response

    return app


if __name__ == '__main__':
    # Configurar logging básico para el servidor
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )
    app = create_app()
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='127.0.0.1', port=5000, debug=debug_mode)
