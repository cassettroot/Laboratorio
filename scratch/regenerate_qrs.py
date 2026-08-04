import sqlite3
import os
import qrcode

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'inventario.db')
UPLOAD_QRS_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'qrs')

os.makedirs(UPLOAD_QRS_DIR, exist_ok=True)

def generate_substance_qr(record):
    record_id = record['id']
    name = record['name'] or ''
    cas = record['cas_number'] or 'N/A'
    formula = record['chemical_formula'] or 'N/A'
    location = record['location'] or 'Sin ubicación'

    # Contenido del QR con información legible de la sustancia
    content = f"Sustancia: {name} | CAS: {cas} | Fórmula: {formula} | Ubicación: {location} | LAB-SUB-{record_id}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(content)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    filename = f"qr_substances_{record_id}.png"
    filepath = os.path.join(UPLOAD_QRS_DIR, filename)
    img.save(filepath)

    return f"/static/uploads/qrs/{filename}", content

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM substances")
    rows = cursor.fetchall()

    count = 0
    for r in rows:
        qr_path, qr_content = generate_substance_qr(dict(r))
        cursor.execute("UPDATE substances SET qr_path = ?, qr_content = ? WHERE id = ?", (qr_path, qr_content, r['id']))
        count += 1

    conn.commit()
    conn.close()
    print(f"Se actualizaron {count} codigos QR con informacion legible y completa de la sustancia.")

if __name__ == '__main__':
    main()
