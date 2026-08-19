import os
import sys
import time
import socket
import threading
import urllib.request
from backend.app import create_app

def find_available_port(start_port=5000):
    """Verifica si el puerto está libre o encuentra el siguiente disponible."""
    port = start_port
    while port < start_port + 50:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
            port += 1
    return start_port

def run_flask(app, port):
    """Ejecuta el servidor Flask en un hilo independiente."""
    # Desactivar el auto-reloader en modo escritorio para evitar subprocesos duplicados
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)

def wait_for_server(port, timeout=15):
    """Espera a que Flask responda peticiones antes de mostrar la ventana."""
    start_time = time.time()
    url = f"http://127.0.0.1:{port}/"
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(url) as response:
                if response.status in [200, 302]:
                    return True
        except Exception:
            time.sleep(0.2)
    return False

def main():
    try:
        import webview
    except ImportError:
        print("\n[ERROR] 'pywebview' no está instalado.")
        print("Instálalo ejecutando: pip install pywebview\n")
        sys.exit(1)

    # Inicializar la aplicación Flask
    app = create_app()
    port = find_available_port(5000)

    # Iniciar servidor Flask en segundo plano
    flask_thread = threading.Thread(target=run_flask, args=(app, port), daemon=True)
    flask_thread.start()

    # Esperar que el servidor esté listo
    server_ready = wait_for_server(port)
    if not server_ready:
        print(f"[ADVERTENCIA] El servidor tardó más de lo esperado en iniciar en el puerto {port}")

    app_url = f"http://127.0.0.1:{port}/"

    # Obtener IP local de red para mostrarla en consola
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = '127.0.0.1'

    print("=============================================================")
    print("  Iniciando Aplicación de Escritorio - ITMA II Laboratorio   ")
    print(f"  Ventana Local:     {app_url}                              ")
    print(f"  Acceso Móvil/Red:  http://{local_ip}:{port}               ")
    print("=============================================================")

    # Crear ventana nativa de escritorio
    window = webview.create_window(
        title='Sistema de Gestión de Laboratorio - ITMA II',
        url=app_url,
        width=1320,
        height=840,
        min_size=(960, 620),
        resizable=True,
        background_color='#090e17'
    )

    # Iniciar el bucle de eventos de la ventana nativa
    # En Linux usa WebKitGTK, en Windows usa WebView2/Edge
    webview.start(private_mode=False)

if __name__ == '__main__':
    main()
