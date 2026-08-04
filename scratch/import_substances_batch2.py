import sqlite3
import os
import qrcode
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'inventario.db')
UPLOAD_QRS_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'qrs')

os.makedirs(UPLOAD_QRS_DIR, exist_ok=True)

new_substances = [
    {
        "name": "Cal Sodada granulada",
        "substance_group": "Bases inorgánicas / Absorbentes",
        "chemical_formula": "Ca(OH)₂ + NaOH + KOH",
        "cas_number": "8006-28-8",
        "composition": "Mezcla alcalina granulada absorbente de CO₂ (con indicador)",
        "concentration": ">75% Ca(OH)₂ / approx 3% NaOH",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Corrosivo, Provoca quemaduras graves en la piel y lesiones oculares graves, Irritante de las vías respiratorias (SGA: GHS05, GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/downloads/sdb/es/8/SDB_8652_ES_ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Ácido Propiónico",
        "substance_group": "Ácidos orgánicos / Carboxílicos",
        "chemical_formula": "CH₃CH₂COOH",
        "cas_number": "79-09-4",
        "composition": "Grado analítico (p.a.)",
        "concentration": ">99%",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Líquido y vapores inflamables, Provoca quemaduras graves en la piel y lesiones oculares graves, Irritante de vías respiratorias (SGA: GHS02, GHS05, GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-6026-ES-ES.pdf",
        "expiration_date": "2028-12-31",
        "unit": "ml",
        "container_content": "500 ml"
    },
    {
        "name": "Ácido Sulfúrico",
        "substance_group": "Ácidos inorgánicos fuertes / Corrosivos",
        "chemical_formula": "H₂SO₄",
        "cas_number": "7664-93-9",
        "composition": "Ácido mineral concentrado",
        "concentration": "95% - 98%",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Puede ser corrosivo para los metales, Provoca quemaduras graves en la piel y lesiones oculares graves (SGA: GHS05)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/downloads/sdb/es/2/SDB_2609_ES_ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "L",
        "container_content": "1 L"
    },
    {
        "name": "Fehling Solución B",
        "substance_group": "Bases inorgánicas / Sales orgánicas",
        "chemical_formula": "C₄H₄KNaO₆ + NaOH + H₂O",
        "cas_number": "6381-59-5",
        "composition": "Mezcla acuosa analítica (Solución alcalina de tartrato)",
        "concentration": "approx 35% Tartrato potásico-sódico en NaOH 10-15%",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Corrosivo para los metales, Provoca quemaduras graves en la piel y lesiones oculares graves (SGA: GHS05)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/downloads/sdb/es/N/SDB_N056_ES_ES.pdf",
        "expiration_date": "2027-12-31",
        "unit": "ml",
        "container_content": "500 ml"
    },
    {
        "name": "Ácido Clorhídrico",
        "substance_group": "Ácidos inorgánicos / Corrosivos",
        "chemical_formula": "HCl",
        "cas_number": "7647-01-0",
        "composition": "Solución acuosa de cloruro de hidrógeno fumante",
        "concentration": "37%",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Corrosivo para metales, Provoca quemaduras graves cutáneas y oculares, Tóxico e irritante de las vías respiratorias (SGA: GHS05, GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-9277-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "L",
        "container_content": "1 L"
    },
    {
        "name": "Peróxido de Manganeso",
        "substance_group": "Óxidos metálicos inorgánicos / Comburentes",
        "chemical_formula": "MnO₂",
        "cas_number": "1313-13-9",
        "composition": "Polvo o sólido extra puro (Dióxido de Manganeso)",
        "concentration": ">98%",
        "physical_state": "Sólido",
        "risks_warnings": "Atención, Nocivo en caso de ingestión o inhalación, Tóxico en caso de exposición prolongada por inhalación (SGA: GHS07, GHS08)",
        "stock": 1,
        "pdf": "https://www.itm.edu.co/wp-content/uploads/Laboratorios/materiales-polimericos/Dioxido-de-manganeso-Roth.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Reactivo de Schiff",
        "substance_group": "Mezclas analíticas / Soluciones de tinción",
        "chemical_formula": "Mezcla acuosa (Fucsina decolorada con SO₂ y HCl)",
        "cas_number": "7647-01-0 / 569-61-9",
        "composition": "Reactivo en solución acuosa para detección de aldehídos",
        "concentration": "<5% HCl / <0.5% Fucsina",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Corrosivo para metales, Provoca cáncer, Provoca quemaduras graves en la piel (SGA: GHS05, GHS08)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-N057-ES-ES.pdf",
        "expiration_date": "2027-12-31",
        "unit": "ml",
        "container_content": "250 ml"
    },
    {
        "name": "Ácido Butírico",
        "substance_group": "Ácidos orgánicos / Carboxílicos",
        "chemical_formula": "CH₃CH₂CH₂COOH",
        "cas_number": "107-92-6",
        "composition": "Para síntesis o análisis (Ácido butanoico)",
        "concentration": "≥99%",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Provoca quemaduras graves en la piel y lesiones oculares graves, Nocivo por ingestión (SGA: GHS05, GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-3277-ES-ES.pdf",
        "expiration_date": "2028-12-31",
        "unit": "ml",
        "container_content": "500 ml"
    },
    {
        "name": "Ácido Fórmico",
        "substance_group": "Ácidos orgánicos / Carboxílicos",
        "chemical_formula": "HCOOH",
        "cas_number": "64-18-6",
        "composition": "Grado analítico (Ácido metanoico)",
        "concentration": "≥85%",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Corrosivo para los metales, Provoca quemaduras graves en la piel, Tóxico por inhalación, Nocivo por ingestión (SGA: GHS05, GHS06)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-CP16-ES-ES.pdf",
        "expiration_date": "2028-12-31",
        "unit": "ml",
        "container_content": "500 ml"
    },
    {
        "name": "Ácido Fosfórico A.C.S.",
        "substance_group": "Ácidos inorgánicos minerales",
        "chemical_formula": "H₃PO₄",
        "cas_number": "7664-38-2",
        "composition": "Grado analítico A.C.S. (Ácido orto-Fosfórico)",
        "concentration": "85%",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Corrosivo para los metales, Provoca quemaduras graves en la piel y lesiones oculares graves (SGA: GHS05)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/downloads/sdb/es/2/SDB_2614_ES_ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "L",
        "container_content": "1 L"
    }
]

def generate_static_qr(record_id):
    content = f"LAB-SUB-{record_id}"
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

    today = datetime.now().strftime('%Y-%m-%d')
    default_location = "Estante A - Nivel 2 / Almacén de Reactivos Líquidos"
    default_responsible = "Laboratorio de Química"

    inserted_count = 0
    updated_count = 0

    for item in new_substances:
        name = item["name"]
        cas = item["cas_number"]
        formula = item["chemical_formula"]
        group = item["substance_group"]
        comp = item["composition"]
        conc = item["concentration"]
        pstate = item["physical_state"]
        risks = item["risks_warnings"]
        stock = item["stock"]
        pdf = item["pdf"]
        exp = item["expiration_date"]
        unit = item["unit"]
        container = item["container_content"]

        # Buscar existencia previa
        cursor.execute("SELECT id FROM substances WHERE (cas_number = ? AND cas_number != '') OR lower(name) = lower(?)", (cas, name))
        existing = cursor.fetchone()

        if existing:
            rec_id = existing['id']
            cursor.execute('''
                UPDATE substances SET
                    substance_group = ?, chemical_formula = ?, composition = ?, concentration = ?,
                    physical_state = ?, risks_warnings = ?, quantity = ?, unit = ?,
                    expiration_date = ?, external_links = ?, pdf_path = ?, stock_units = ?,
                    container_content = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (group, formula, comp, conc, pstate, risks, float(stock), unit, exp, pdf, pdf, stock, container, rec_id))
            updated_count += 1
        else:
            loc = default_location if pstate == 'Líquido' else "Estante A - Nivel 4 / Almacén de Reactivos"
            cursor.execute('''
                INSERT INTO substances (
                    name, chemical_formula, cas_number, composition, concentration,
                    physical_state, risks_warnings, quantity, unit, location,
                    entry_date, expiration_date, responsible, external_links, pdf_path,
                    substance_group, stock_units, container_content
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                name, formula, cas, comp, conc, pstate, risks, float(stock), unit,
                loc, today, exp, default_responsible, pdf, pdf, group, stock, container
            ))
            rec_id = cursor.lastrowid
            inserted_count += 1

        qp, qc = generate_static_qr(rec_id)
        cursor.execute("UPDATE substances SET qr_path = ?, qr_content = ? WHERE id = ?", (qp, qc, rec_id))

    conn.commit()
    conn.close()
    print(f"Lote 2 importado. Insertados nuevos: {inserted_count}, Actualizados: {updated_count}, Total procesados: {len(new_substances)}")

if __name__ == '__main__':
    main()
