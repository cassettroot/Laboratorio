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
    # Evita la doble apertura del navegador causada por el recargador automático de Flask (debug=True)
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        threading.Thread(target=open_browser, daemon=True).start()
        
    print("=============================================================")
    print("  Iniciando Laboratorio ITMA II - Inventario de Laboratorio  ")
    print("  Por favor, mantén esta ventana abierta mientras lo usas.  ")
    print("  Dirección local: http://127.0.0.1:5000                     ")
    print("=============================================================")
    
    app.run(host='127.0.0.1', port=5000, debug=True)
