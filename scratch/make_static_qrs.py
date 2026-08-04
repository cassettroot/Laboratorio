import sqlite3
import os
import qrcode

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'inventario.db')
UPLOAD_QRS_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'qrs')

os.makedirs(UPLOAD_QRS_DIR, exist_ok=True)

def generate_static_qr(table_name, prefix, record_id):
    content = f"LAB-{prefix}-{record_id}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(content)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    filename = f"qr_{table_name}_{record_id}.png"
    filepath = os.path.join(UPLOAD_QRS_DIR, filename)
    img.save(filepath)

    return f"/static/uploads/qrs/{filename}", content

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Sustancias -> LAB-SUB-X
    cursor.execute("SELECT id FROM substances")
    rows = cursor.fetchall()
    for r in rows:
        qp, qc = generate_static_qr('substances', 'SUB', r['id'])
        cursor.execute("UPDATE substances SET qr_path = ?, qr_content = ? WHERE id = ?", (qp, qc, r['id']))

    # 2. Materiales Químicos -> LAB-CHM-X
    cursor.execute("SELECT id FROM chemical_materials")
    rows = cursor.fetchall()
    for r in rows:
        qp, qc = generate_static_qr('chemical_materials', 'CHM', r['id'])
        cursor.execute("UPDATE chemical_materials SET qr_path = ?, qr_content = ? WHERE id = ?", (qp, qc, r['id']))

    # 3. Materiales Didácticos -> LAB-DID-X
    cursor.execute("SELECT id FROM didactic_materials")
    rows = cursor.fetchall()
    for r in rows:
        qp, qc = generate_static_qr('didactic_materials', 'DID', r['id'])
        cursor.execute("UPDATE didactic_materials SET qr_path = ?, qr_content = ? WHERE id = ?", (qp, qc, r['id']))

    conn.commit()
    conn.close()
    print("Codigos QR estaticos regenerados exitosamente: LAB-SUB-X, LAB-CHM-X, LAB-DID-X")

if __name__ == '__main__':
    main()
