import os
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

def create_app():
    # Asegurar que la base de datos esté inicializada
    init_db()

    # Directorio de archivos estáticos
    static_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static')
    
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    
    # Configurar secret_key para sesiones de Flask
    app.secret_key = os.environ.get('SECRET_KEY', 'labkeep-secret-key-1823791283')
    
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
                        request.path.startswith('/api/loans')
                    )) or
                    (request.method == 'POST' and request.path in ['/api/scan-qr', '/api/loans'])
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
        origin = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return response

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='127.0.0.1', port=5000, debug=True)
