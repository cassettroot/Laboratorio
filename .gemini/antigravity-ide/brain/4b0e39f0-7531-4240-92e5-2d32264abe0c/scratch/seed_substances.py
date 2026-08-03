import os
import sys
import sqlite3

# Import DB and generate_qr from backend
BASE_DIR = r"c:\Users\marte\Documents\TecNM\Laboratorio"
sys.path.append(BASE_DIR)

from backend.database import get_db_connection, init_db
from backend.routes.tools import generate_qr

init_db()

substances_data = [
    {
        "name": "Acetaldehído (o Etanal)",
        "substance_group": "Aldehídos / Orgánicos",
        "chemical_formula": "CH₃CHO",
        "cas_number": "75-07-0",
        "composition": "Para síntesis / Grado analítico",
        "concentration": "≥99%",
        "physical_state": "Líquido",
        "color": "Incoloro",
        "odor": "",
        "risks_warnings": "Peligro, Líquido y vapores extremadamente inflamables, Provoca irritación ocular grave, Susceptible de provocar cáncer (SGA: GHS02, GHS07, GHS08)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-3004-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": "Mencionado 2 veces"
    },
    {
        "name": "Dimetilsulfóxido (DMSO)",
        "substance_group": "Sulfóxidos / Solventes orgánicos",
        "chemical_formula": "(CH₃)₂SO",
        "cas_number": "67-68-0",
        "composition": "Grado analítico (ACS)",
        "concentration": "≥99.5%",
        "physical_state": "Líquido",
        "color": "Incoloro",
        "odor": "",
        "risks_warnings": "Sin clasificación de peligro grave según SGA. Evitar contacto directo con piel por su alta absorción (No clasificado)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-4720-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "n-Hexano",
        "substance_group": "Hidrocarburos alifáticos / Solventes",
        "chemical_formula": "C₆H₁₄",
        "cas_number": "142-82-5",
        "composition": "Grado analítico o para cromatografía",
        "concentration": "≥99%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Peligro, Líquido inflamable, Tóxico para la reproducción, Provoca daños en el sistema nervioso, Tóxico para el medio ambiente acuático (SGA: GHS02, GHS07, GHS08, GHS09)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-CP03-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Fenolftaleína",
        "substance_group": "Indicadores de pH / Compuestos orgánicos",
        "chemical_formula": "C₂₀H₁₄O₄",
        "cas_number": "77-09-8",
        "composition": "Polvo indicador puro (o solución al 1% en alcohol)",
        "concentration": "98% - 100%",
        "physical_state": "Sólido",
        "color": "Blanco o amarillento",
        "odor": "",
        "risks_warnings": "Peligro, Puede provocar cáncer, Se sospecha que provoca defectos genéticos, Sospecha de dañar la fertilidad (SGA: GHS08)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-T126-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "g",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Hierro metálico (Limaduras / Polvo)",
        "substance_group": "Metales de transición",
        "chemical_formula": "Fe",
        "cas_number": "7439-89-6",
        "composition": "Limaduras o polvo de metal puro",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "color": "Gris/negro",
        "odor": "",
        "risks_warnings": "Atención, Sólido inflamable (sólo en formato de polvo muy fino o espontáneamente inflamable si es pirofórico) (SGA: GHS02)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-9454-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "g",
        "location": "",
        "responsible": "",
        "observations": "Mencionado 3 veces"
    },
    {
        "name": "Óxido de Cobre (II) (u Óxido cúprico)",
        "substance_group": "Óxidos metálicos inorgánicos",
        "chemical_formula": "CuO",
        "cas_number": "1317-38-0",
        "composition": "Polvo negro grado analítico",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "color": "Negro",
        "odor": "",
        "risks_warnings": "Atención, Muy tóxico para los organismos acuáticos con efectos duraderos (SGA: GHS09)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-4441-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "g",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Metanol (o Alcohol metílico)",
        "substance_group": "Alcoholes alifáticos / Solventes",
        "chemical_formula": "CH₃OH",
        "cas_number": "67-56-1",
        "composition": "Grado ACS / HPLC",
        "concentration": "≥99.8%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Peligro, Líquido muy inflamable, Tóxico en caso de ingestión, contacto con la piel o inhalación, Provoca daños en el nervio óptico (SGA: GHS02, GHS06, GHS08)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-4627-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Cloruro de Hierro (III) hexahidratado (o Cloruro férrico)",
        "substance_group": "Sales de hierro inorgánicas",
        "chemical_formula": "FeCl₃ · 6H₂O",
        "cas_number": "10025-77-1",
        "composition": "Grado analítico (ACS)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "color": "Amarillo/marrón amarillento",
        "odor": "",
        "risks_warnings": "Peligro, Nocivo por ingestión, Provoca lesiones oculares graves, Irritante cutáneo (SGA: GHS05, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-P742-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "g",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Éter de petróleo (Rango de ebullición 40-60 °C)",
        "substance_group": "Mezcla de hidrocarburos alifáticos",
        "chemical_formula": "Mezcla de alcanos (principalmente pentanos y hexanos)",
        "cas_number": "8032-32-4",
        "composition": "Mezcla de solventes ligeros",
        "concentration": "100% hidrocarburos",
        "physical_state": "Líquido",
        "color": "Incoloro",
        "odor": "",
        "risks_warnings": "Peligro, Líquido y vapores extremadamente inflamables, Puede ser mortal en caso de ingestión y penetración en las vías respiratorias, Tóxico acuático (SGA: GHS02, GHS07, GHS08, GHS09)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-T173-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": "Mencionado 2 veces"
    },
    {
        "name": "1-Propanol (o n-Propanol / Alcohol propílico)",
        "substance_group": "Alcoholes alifáticos",
        "chemical_formula": "CH₃CH₂CH₂OH",
        "cas_number": "71-23-8",
        "composition": "Grado analítico",
        "concentration": "≥99.5%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Peligro, Líquido inflamable, Provoca lesiones oculares graves, Puede provocar somnolencia o vértigo (SGA: GHS02, GHS05, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-9141-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Petróleo Crudo (o Aceite mineral crudo)",
        "substance_group": "Mezclas complejas de hidrocarburos orgánicos",
        "chemical_formula": "Mezcla compleja (Alcanos, cicloalcanos y aromáticos)",
        "cas_number": "8002-05-9",
        "composition": "Petróleo natural sin refinar",
        "concentration": "100% Crudo natural",
        "physical_state": "Líquido",
        "color": "Marrón oscuro o negro",
        "odor": "",
        "risks_warnings": "Peligro, Líquido inflamable, Puede provocar cáncer por exposición crónica, Peligro por aspiración, Tóxico acuático (SGA: GHS02, GHS07, GHS08)",
        "external_links": "https://www.google.com/search?q=https://www.pemex.com/servicios/productos/hojas_seguridad/HDS_petroleo_crudo.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "2-Metilpropan-1-ol (Isobutanol / Alcohol isobutílico)",
        "substance_group": "Alcoholes ramificados",
        "chemical_formula": "(CH₃)₂CHCH₂OH",
        "cas_number": "78-83-1",
        "composition": "Para síntesis o análisis",
        "concentration": "≥99%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Peligro, Líquido inflamable, Provoca lesiones oculares graves, Irritación cutánea y respiratoria (SGA: GHS02, GHS05, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-KL44-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Hidróxido de Bario octahidratado",
        "substance_group": "Bases inorgánicas / Alcalinotérreos",
        "chemical_formula": "Ba(OH)₂ · 8H₂O",
        "cas_number": "12230-71-6",
        "composition": "Grado analítico ACS",
        "concentration": "≥98%",
        "physical_state": "Sólido",
        "color": "Blanco",
        "odor": "",
        "risks_warnings": "Peligro, Provoca quemaduras graves en la piel, Nocivo en caso de ingestión o inhalación (SGA: GHS05, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-P716-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "g",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Azul de Metileno en solución alcohólica",
        "substance_group": "Colorantes de tiazina en solución orgánica",
        "chemical_formula": "C₁₆H₁₈ClN₃S + C₂H₅OH",
        "cas_number": "61-73-4 / 64-17-5",
        "composition": "Solución de tinción analítica",
        "concentration": "1% - 2% en etanol metilado",
        "physical_state": "Líquido",
        "color": "Azul oscuro",
        "odor": "",
        "risks_warnings": "Peligro, Líquido muy inflamable, Irritación ocular (SGA: GHS02, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-A149-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Magnesio metálico (Virutas / Varillas / Cinta)",
        "substance_group": "Metales alcalinotérreos",
        "chemical_formula": "Mg",
        "cas_number": "7439-95-4",
        "composition": "Metal puro elemental",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "color": "Plateado",
        "odor": "",
        "risks_warnings": "Peligro, Sólido inflamable, En contacto con el agua desprende gases inflamables (SGA: GHS02)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-4468-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "g",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Etanol (o Alcohol etílico)",
        "substance_group": "Alcoholes alifáticos",
        "chemical_formula": "CH₃CH₂OH",
        "cas_number": "64-17-5",
        "composition": "Absoluto o desnaturalizado",
        "concentration": "96% - 99.9%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Peligro, Líquido y vapores muy inflamables, Provoca irritación ocular grave (SGA: GHS02, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-T171-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "2-Propanol (Isopropanol / Alcohol Isopropílico)",
        "substance_group": "Alcoholes secundarios",
        "chemical_formula": "(CH₃)₂CHOH",
        "cas_number": "67-63-0",
        "composition": "Grado reactivo ACS",
        "concentration": "≥99.5%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Peligro, Líquido muy inflamable, Provoca irritación ocular grave, Puede provocar somnolencia (SGA: GHS02, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-6752-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "1-Pentanol (o Alcohol n-amílico / Pentan-1-ol)",
        "substance_group": "Alcoholes alifáticos",
        "chemical_formula": "CH₃(CH₂)₄OH",
        "cas_number": "71-41-0",
        "composition": "Para síntesis",
        "concentration": "≥99%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Atención, Líquido y vapores inflamables, Provoca irritación cutánea y ocular grave, Nocivo por inhalación (SGA: GHS02, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-4444-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Bromoetano (o Bromuro de etilo)",
        "substance_group": "Halogenuros de alquilo",
        "chemical_formula": "CH₃CH₂Br",
        "cas_number": "74-96-4",
        "composition": "Para síntesis",
        "concentration": "≥99%",
        "physical_state": "Líquido",
        "color": "Incoloro a amarillento",
        "odor": "",
        "risks_warnings": "Peligro, Líquido y vapores muy inflamables, Nocivo por ingestión, Se sospecha que provoca cáncer (SGA: GHS02, GHS07, GHS08)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-4828-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Ácido Propiónico",
        "substance_group": "Ácidos orgánicos",
        "chemical_formula": "CH₃CH₂COOH",
        "cas_number": "79-09-4",
        "composition": "",
        "concentration": "≥99%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Corrosivo e inflamable (SGA: GHS02, GHS05)",
        "external_links": "",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Carbón activado en polvo (Carbón vegetal)",
        "substance_group": "Carbono elemental / Adsorbentes",
        "chemical_formula": "C",
        "cas_number": "7440-44-0",
        "composition": "Carbón purificado para laboratorio",
        "concentration": "100% Carbón",
        "physical_state": "Sólido",
        "color": "Negro",
        "odor": "",
        "risks_warnings": "Sin clasificación de riesgo grave. Sólido combustible pero no autoinflamable en condiciones normales (No clasificado)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-5966-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "g",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Acetona (o Propan-2-ona)",
        "substance_group": "Cetonas alifáticas / Solventes",
        "chemical_formula": "CH₃COCH₃",
        "cas_number": "67-64-1",
        "composition": "Grado analítico ACS / ISO",
        "concentration": "≥99.5%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Peligro, Líquido muy inflamable, Provoca irritación ocular grave, La exposición repetida puede resecar la piel (SGA: GHS02, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-9372-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "1-Butanol (o n-Butanol / Alcohol butílico)",
        "substance_group": "Alcoholes alifáticos",
        "chemical_formula": "CH₃(CH₂)₃OH",
        "cas_number": "71-36-3",
        "composition": "Grado analítico",
        "concentration": "≥99.5%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "",
        "risks_warnings": "Peligro, Líquido inflamable, Nocivo en caso de ingestión, Provoca lesiones oculares graves, Irritación respiratoria (SGA: GHS02, GHS05, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-7724-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Acetato de Etilo",
        "substance_group": "Ésteres / Solventes orgánicos",
        "chemical_formula": "CH₃COOCH₂CH₃",
        "cas_number": "141-78-6",
        "composition": "Grado analítico ACS",
        "concentration": "≥99.5%",
        "physical_state": "Líquido",
        "color": "",
        "odor": "Afrutado característico",
        "risks_warnings": "Peligro, Líquido y vapores muy inflamables, Provoca irritación ocular grave, Puede provocar somnolencia o vértigo (SGA: GHS02, GHS07)",
        "external_links": "https://www.google.com/search?q=https://www.carlroth.com/medias/SDB-7338-ES-ES.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    },
    {
        "name": "Sudán III en solución alcohólica",
        "substance_group": "Colorantes azoicos / Soluciones orgánicas",
        "chemical_formula": "C₂₂H₁₆N₄O + C₂H₅OH",
        "cas_number": "85-86-9 / 64-17-5",
        "composition": "Reactivo para tinción de grasas",
        "concentration": "0.5% - 1% en etanol o isopropanol",
        "physical_state": "Líquido",
        "color": "Rojo intenso",
        "odor": "",
        "risks_warnings": "Peligro, Líquido muy inflamable, Irritación ocular (SGA: GHS02, GHS07)",
        "external_links": "https://www.google.com/search?q=https%3A%2F%2Fsds.aquaphoenixsci.com%2FSDS%2FS25586.pdf",
        "quantity": 0.0,
        "unit": "ml",
        "location": "",
        "responsible": "",
        "observations": ""
    }
]

conn = get_db_connection()
cursor = conn.cursor()

inserted_count = 0
for sub in substances_data:
    # Check if substance already exists by CAS or Name
    cursor.execute('SELECT id FROM substances WHERE name = ? OR (cas_number != "" AND cas_number = ?)', (sub['name'], sub['cas_number']))
    existing = cursor.fetchone()
    
    if existing:
        record_id = existing['id']
        cursor.execute('''
            UPDATE substances SET
                chemical_formula = ?,
                cas_number = ?,
                substance_group = ?,
                composition = ?,
                concentration = ?,
                physical_state = ?,
                color = ?,
                odor = ?,
                risks_warnings = ?,
                external_links = ?,
                observations = ?
            WHERE id = ?
        ''', (
            sub['chemical_formula'], sub['cas_number'], sub['substance_group'],
            sub['composition'], sub['concentration'], sub['physical_state'],
            sub['color'], sub['odor'], sub['risks_warnings'],
            sub['external_links'], sub['observations'], record_id
        ))
        print(f"Updated: {sub['name']} (ID: {record_id})")
    else:
        cursor.execute('''
            INSERT INTO substances (
                name, chemical_formula, cas_number, composition, concentration,
                physical_state, color, odor, risks_warnings, quantity, unit,
                location, entry_date, expiration_date, responsible, observations,
                external_links, substance_group, stock_units
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            sub['name'], sub['chemical_formula'], sub['cas_number'],
            sub['composition'], sub['concentration'], sub['physical_state'],
            sub['color'], sub['odor'], sub['risks_warnings'],
            sub['quantity'], sub['unit'], sub['location'],
            sub['entry_date'], sub['expiration_date'], sub['responsible'],
            sub['observations'], sub['external_links'], sub['substance_group'], 1
        ))
        record_id = cursor.lastrowid
        
        # Generate QR code
        qr_path, qr_content = generate_qr('substances', record_id)
        cursor.execute('UPDATE substances SET qr_path = ?, qr_content = ? WHERE id = ?', (qr_path, qr_content, record_id))
        
        inserted_count += 1
        print(f"Inserted: {sub['name']} (ID: {record_id})")

conn.commit()
conn.close()
print(f"Successfully processed {len(substances_data)} substances ({inserted_count} new inserted).")
