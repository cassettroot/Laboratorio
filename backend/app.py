import os
from flask import Flask, send_from_directory
from backend.database import init_db
from backend.routes.substances import substances_bp
from backend.routes.chem_materials import chem_materials_bp
from backend.routes.did_materials import did_materials_bp
from backend.routes.history import history_bp
from backend.routes.tools import tools_bp
from backend.routes.auth import auth_bp

def create_app():
    # Asegurar que la base de datos esté inicializada
    init_db()

    # Directorio de archivos estáticos
    static_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static')
    
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    
    # Configurar secret_key para sesiones de Flask
    app.secret_key = os.environ.get('SECRET_KEY', 'labkeep-secret-key-1823791283')
    
    # Interceptor global para requerir autenticación en peticiones modificadoras
    @app.before_request
    def check_auth():
        # Permitir métodos de lectura
        if request.method in ['GET', 'OPTIONS']:
            return
        # Permitir rutas de autenticación y consulta de escaneo de código QR
        if request.path.startswith('/api/auth/') or request.path == '/api/scan-qr':
            return
        # Restringir el resto de las rutas API de escritura si no hay sesión iniciada
        if request.path.startswith('/api/'):
            if 'user' not in session:
                return jsonify({"status": "error", "message": "No autorizado. Inicie sesión para realizar cambios."}), 401

    # Registrar Blueprints de la API
    app.register_blueprint(substances_bp)
    app.register_blueprint(chem_materials_bp)
    app.register_blueprint(did_materials_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(tools_bp)
    app.register_blueprint(auth_bp)

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

    return app

# Importación local para evitar problemas de contexto en errorhandler
from flask import request, jsonify, session

if __name__ == '__main__':
    app = create_app()
    app.run(host='127.0.0.1', port=5000, debug=True)
