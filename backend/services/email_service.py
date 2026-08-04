import os
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.database import get_db_connection, decrypt_username

def get_smtp_config():
    return {
        'server': os.environ.get('SMTP_SERVER', 'smtp.gmail.com'),
        'port': int(os.environ.get('SMTP_PORT', 587)),
        'user': os.environ.get('SMTP_USER', ''),
        'password': os.environ.get('SMTP_PASSWORD', ''),
        'sender_name': os.environ.get('SMTP_SENDER_NAME', 'Sistema de Inventario de Laboratorio TecNM'),
        'enabled': os.environ.get('ENABLE_EMAIL_NOTIFICATIONS', 'true').lower() in ['true', '1', 'yes']
    }

def _send_email_thread(to_addresses, subject, body_html):
    config = get_smtp_config()
    if not config['enabled']:
        print("[EMAIL] Notificaciones por correo desactivadas por configuración.")
        return

    if not config['user'] or not config['password']:
        print("[EMAIL] SMTP_USER o SMTP_PASSWORD no configurados. Omitiendo envío de correo.")
        return

    if isinstance(to_addresses, str):
        to_addresses = [to_addresses]

    to_addresses = [addr.strip() for addr in to_addresses if addr and addr.strip()]
    if not to_addresses:
        print("[EMAIL] No hay destinatarios válidos para enviar el correo.")
        return

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{config['sender_name']} <{config['user']}>"
        msg['To'] = ", ".join(to_addresses)

        html_part = MIMEText(body_html, 'html', 'utf-8')
        msg.attach(html_part)

        # Enviar vía SMTP con TLS
        with smtplib.SMTP(config['server'], config['port'], timeout=10) as server:
            server.starttls()
            server.login(config['user'], config['password'])
            server.sendmail(config['user'], to_addresses, msg.as_string())

        print(f"[EMAIL SUCCESS] Correo '{subject}' enviado exitosamente a: {', '.join(to_addresses)}")
    except Exception as e:
        print(f"[EMAIL ERROR] Error al enviar correo por SMTP: {str(e)}")

def send_email_async(to_addresses, subject, body_html):
    """Ejecuta el envío de correo en un hilo secundario para no bloquear las peticiones HTTP."""
    thread = threading.Thread(target=_send_email_thread, args=(to_addresses, subject, body_html))
    thread.daemon = True
    thread.start()

def get_admin_emails():
    """Obtiene la lista de correos de todos los usuarios administradores activos."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email FROM users WHERE role = 'admin' AND active = 1 AND email IS NOT NULL AND email != ''")
    rows = cursor.fetchall()
    conn.close()
    return [r['email'] for r in rows if r['email']]

def get_user_email(username):
    """Obtiene el correo de un usuario por su nombre de usuario."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT username, email FROM users WHERE active = 1 AND email IS NOT NULL AND email != ''")
    rows = cursor.fetchall()
    conn.close()
    for r in rows:
        dec_name = decrypt_username(r['username'])
        if dec_name == username:
            return r['email']
    return None

def notify_admins_new_request(request_data):
    """Notifica a todos los administradores cuando se genera una nueva solicitud de cambio."""
    admin_emails = get_admin_emails()
    if not admin_emails:
        print("[EMAIL] No hay administradores con correo registrado para notificar.")
        return

    subject = f"[NUEVA SOLICITUD DE CAMBIO] ID #{request_data.get('id', 'N/A')} - {request_data.get('action')} {request_data.get('type')}"
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #0d6efd; margin-top: 0;">Nueva Solicitud de Cambio Registrada</h2>
        <p>Se ha registrado una nueva solicitud pendiente de aprobación en el Sistema de Inventario de Laboratorio:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; font-weight: bold; width: 35%;">ID Solicitud:</td>
                <td style="padding: 10px;">#{request_data.get('id', 'N/A')}</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">Solicitante:</td>
                <td style="padding: 10px;">{request_data.get('requester_username', 'N/A')}</td>
            </tr>
            <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; font-weight: bold;">Tipo de Elemento:</td>
                <td style="padding: 10px;">{request_data.get('type', 'N/A')}</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">Acción Solicitada:</td>
                <td style="padding: 10px;"><strong>{request_data.get('action', 'N/A')}</strong></td>
            </tr>
            <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; font-weight: bold;">Elemento Afectado:</td>
                <td style="padding: 10px;">{request_data.get('target_name', 'Nuevo elemento')}</td>
            </tr>
        </table>
        
        <p>Por favor, ingrese al sistema para revisar y aprobar o rechazar esta solicitud.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6c757d;">Este es un mensaje automático del Sistema de Inventario de Laboratorio TecNM.</p>
    </div>
    """
    send_email_async(admin_emails, subject, html)

def notify_user_request_status(requester_username, request_data, new_status, feedback=""):
    """Notifica al usuario solicitante cuando su solicitud cambia de estado (APROBADO/RECHAZADO)."""
    user_email = get_user_email(requester_username)
    if not user_email:
        print(f"[EMAIL] El usuario {requester_username} no tiene un correo registrado.")
        return

    status_color = "#198754" if new_status == "APROBADO" else "#dc3545"
    subject = f"[SOLICITUD {new_status}] ID #{request_data.get('id', 'N/A')} - {request_data.get('action')} {request_data.get('type')}"

    feedback_html = ""
    if feedback:
        feedback_html = f"""
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0;">
            <strong>Retroalimentación del Administrador:</strong> {feedback}
        </div>
        """

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
        <h2 style="color: {status_color}; margin-top: 0;">Solicitud {new_status}</h2>
        <p>Estimado/a <strong>{requester_username}</strong>,</p>
        <p>Su solicitud de cambio ID <strong>#{request_data.get('id', 'N/A')}</strong> ha sido procesada.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; font-weight: bold; width: 35%;">Estado Actual:</td>
                <td style="padding: 10px; font-weight: bold; color: {status_color};">{new_status}</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">Acción:</td>
                <td style="padding: 10px;">{request_data.get('action', 'N/A')}</td>
            </tr>
            <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; font-weight: bold;">Elemento:</td>
                <td style="padding: 10px;">{request_data.get('target_name', 'N/A')}</td>
            </tr>
        </table>
        
        {feedback_html}
        
        <p>Puede consultar el historial completo de solicitudes dentro del sistema.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6c757d;">Este es un mensaje automático del Sistema de Inventario de Laboratorio TecNM.</p>
    </div>
    """
    send_email_async(user_email, subject, html)

def notify_admins_loan_request(loan_data):
    """Notifica a todos los administradores cuando se registra o solicita un préstamo de sustancia/material."""
    admin_emails = get_admin_emails()
    if not admin_emails:
        print("[EMAIL] No hay administradores con correo registrado para notificar el préstamo.")
        return

    subject = f"[SOLICITUD DE PRÉSTAMO DE SUSTANCIA] Folio #PR-{loan_data.get('id', 'N/A')} - {loan_data.get('item_name')}"
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <h2 style="color: #d97706; margin-top: 0;">🧪 Nueva Solicitud de Préstamo de Sustancia</h2>
        <p style="color: #334155; font-size: 14px;">Se ha registrado una nueva solicitud de préstamo en el Sistema de Inventario de Laboratorio:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px;">
            <tr style="background-color: #f8fafc;">
                <td style="padding: 10px 14px; font-weight: bold; width: 38%; border-bottom: 1px solid #e2e8f0; color: #475569;">Folio de Préstamo:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">#PR-{loan_data.get('id', 'N/A')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Sustancia / Elementos:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">{loan_data.get('item_name', 'N/A')}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
                <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Solicitante / Prestatario:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{loan_data.get('borrower_name', 'N/A')} ({loan_data.get('borrower_type', 'Docente')})</td>
            </tr>
            <tr>
                <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Solicitado por:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{loan_data.get('approved_by', 'Usuario')}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
                <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Fecha y Hora:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{loan_data.get('loan_date', 'N/A')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Motivo / Observaciones:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">{loan_data.get('notes', 'Sin observaciones')}</td>
            </tr>
        </table>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 18px 0; border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
                <strong>Nota:</strong> Puede consultar y dar seguimiento a este préstamo en la sección de <strong>Control de Préstamos</strong> dentro del sistema.
            </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Este es un mensaje automático del Sistema de Inventario de Laboratorio TecNM.</p>
    </div>
    """
    send_email_async(admin_emails, subject, html)

