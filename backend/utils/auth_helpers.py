"""
backend/utils/auth_helpers.py
─────────────────────────────
Utilidades reutilizables para autenticación, manejo de BD y errores.
"""
import logging
import traceback
from contextlib import contextmanager
from functools import wraps

from flask import jsonify, session

logger = logging.getLogger(__name__)


# ── Decoradores de autenticación ─────────────────────────────────────────────

def require_login(f):
    """Requiere que el usuario haya iniciado sesión."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"status": "error", "message": "No autorizado. Inicie sesión."}), 401
        return f(*args, **kwargs)
    return decorated


def require_role(*roles):
    """
    Requiere que el usuario tenga uno de los roles especificados.
    Uso: @require_role('admin') o @require_role('admin', 'jefe')
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if 'user' not in session:
                return jsonify({"status": "error", "message": "No autorizado. Inicie sesión."}), 401
            from backend.database import get_user_by_username
            user = get_user_by_username(session['user'])
            if not user:
                session.pop('user', None)
                return jsonify({"status": "error", "message": "Sesión inválida."}), 401
            if user['role'] not in roles:
                return jsonify({"status": "error", "message": "No tiene permisos para esta acción."}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def get_current_user():
    """Devuelve los datos del usuario de la sesión actual, o None si no hay sesión."""
    if 'user' not in session:
        return None
    from backend.database import get_user_by_username
    return get_user_by_username(session['user'])


# ── Context managers de base de datos ────────────────────────────────────────

@contextmanager
def db_connection():
    """
    Context manager para conexiones SQLite del inventario.
    Garantiza el cierre y rollback automáticos ante excepciones.

    Uso:
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(...)
            conn.commit()
    """
    from backend.database import get_db_connection
    conn = get_db_connection()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@contextmanager
def users_db_connection():
    """Context manager para la base de datos de usuarios."""
    from backend.database import get_users_db_connection
    conn = get_users_db_connection()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Manejo seguro de errores ──────────────────────────────────────────────────

def safe_error(e: Exception, public_message: str = "Ocurrió un error interno. Intente de nuevo.") -> tuple:
    """
    Registra el error completo en el log del servidor y devuelve una respuesta
    JSON segura para el cliente (sin exponer detalles internos).

    Args:
        e: La excepción capturada.
        public_message: Mensaje genérico a enviar al cliente.

    Returns:
        Tuple (jsonify response, status_code) listo para retornar desde un endpoint.
    """
    logger.error("Internal server error: %s\n%s", str(e), traceback.format_exc())
    return jsonify({"status": "error", "message": public_message}), 500


def safe_db_error(e: Exception) -> tuple:
    """Alias de safe_error específico para errores de base de datos."""
    return safe_error(e, "Error al acceder a la base de datos. Intente de nuevo.")
