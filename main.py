import os
import time
import threading
import webbrowser
from backend.app import create_app

app = create_app()

def open_browser():
    """
    Espera un breve momento a que Flask inicie y abre el navegador por defecto.
    """
    time.sleep(1.5)
    webbrowser.open('http://127.0.0.1:5000/')

if __name__ == '__main__':
    # Evita la múltiple apertura del navegador causada por el recargador automático de Flask
    if not os.environ.get('BROWSER_OPENED'):
        os.environ['BROWSER_OPENED'] = 'true'
        threading.Thread(target=open_browser, daemon=True).start()
        
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = '127.0.0.1'

    print("=============================================================")
    print("  Iniciando Laboratorio ITMA II - Inventario de Laboratorio  ")
    print("  Por favor, mantén esta ventana abierta mientras lo usas.  ")
    print(f"  Acceso en esta PC:   http://localhost:5000                 ")
    print(f"  Acceso en la Red:    http://{local_ip}:5000                 ")
    print("=============================================================")
    
    # En producción FLASK_DEBUG debe estar vacío o ausente (nunca 'true')
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
