import sqlite3
import os
import qrcode
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'inventario.db')
UPLOAD_QRS_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'qrs')

os.makedirs(UPLOAD_QRS_DIR, exist_ok=True)

# Lista completa de los 57 compuestos proporcionados por el usuario
substances_data = [
    {
        "name": "Cloruro de Bario",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "BaCl₂",
        "cas_number": "10361-37-2",
        "composition": "Grado analítico",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Tóxico en caso de ingestión, Nocivo por inhalación (SGA: GHS06)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-4443-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Sulfato de Estroncio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "SrSO₄",
        "cas_number": "7759-02-6",
        "composition": "Sal inorgánica",
        "concentration": "≥98%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-1300-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Ferrocianuro de Potasio",
        "substance_group": "Cianuros complejos / Sales inorgánicas",
        "chemical_formula": "K₄[Fe(CN)₆]",
        "cas_number": "14459-95-1",
        "composition": "Grado analítico (Trihidratado)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Nocivo para organismos acuáticos con efectos duraderos (SGA: GHS09)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-P745-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Tetraborato de Sodio",
        "substance_group": "Boratos",
        "chemical_formula": "Na₂B₄O₇",
        "cas_number": "1303-96-4",
        "composition": "Grado analítico (Bórax Decahidratado)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Puede dañar la fertilidad o al feto, Provoca irritación ocular grave (SGA: GHS08, GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-6740-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Mármol en pedazos",
        "substance_group": "Carbonatos / Minerales",
        "chemical_formula": "CaCO₃",
        "cas_number": "471-34-1",
        "composition": "Mineral natural en trozos (Carbonato de Calcio)",
        "concentration": "N/A",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 2,
        "pdf": "https://www.carlroth.com/medias/SDB-4171-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "1000 g"
    },
    {
        "name": "Almidón soluble",
        "substance_group": "Carbohidratos / Polisacáridos",
        "chemical_formula": "(C₆H₁₀O₅)n",
        "cas_number": "9005-84-9",
        "composition": "Polvo para análisis",
        "concentration": "100%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-4701-ES-ES.pdf",
        "expiration_date": "2027-12-31",
        "unit": "g",
        "container_content": "250 g"
    },
    {
        "name": "Ácido Esteárico",
        "substance_group": "Ácidos grasos orgánicos",
        "chemical_formula": "C₁₈H₃₆O₂",
        "cas_number": "57-11-4",
        "composition": "Para síntesis (Escamas o polvo blanco)",
        "concentration": "≥98%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-7074-ES-ES.pdf",
        "expiration_date": "2028-12-31",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Óxido de Magnesio",
        "substance_group": "Óxidos metálicos",
        "chemical_formula": "MgO",
        "cas_number": "1309-48-4",
        "composition": "Grado analítico",
        "concentration": "≥98%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave. Evitar inhalación de polvo",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-3286-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Tornasol",
        "substance_group": "Indicadores de pH orgánicos",
        "chemical_formula": "Mezcla compleja (colorantes de líquenes)",
        "cas_number": "1393-92-6",
        "composition": "Extracto natural indicador (Polvo o granulado)",
        "concentration": "N/A",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-0322-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "100 g"
    },
    {
        "name": "Sulfato de Sodio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "Na₂SO₄",
        "cas_number": "7757-82-6",
        "composition": "Anhidro Grado analítico",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-8560-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Tiosulfato de Sodio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "Na₂S₂O₃",
        "cas_number": "10102-17-7",
        "composition": "Grado analítico (Pentahidratado)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-8650-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Glucosa Anhidra",
        "substance_group": "Carbohidratos / Monosacáridos",
        "chemical_formula": "C₆H₁₂O₆",
        "cas_number": "50-99-7",
        "composition": "Grado bioquímico (D-Glucosa)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-X997-ES-ES.pdf",
        "expiration_date": "2027-12-31",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Óxido de Aluminio en polvo",
        "substance_group": "Óxidos metálicos",
        "chemical_formula": "Al₂O₃",
        "cas_number": "1344-28-1",
        "composition": "Polvo analítico / Adsorbente (Alúmina)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-P093-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Aceite de Oliva / Estaño",
        "substance_group": "Lípidos naturales / Metales de post-transición",
        "chemical_formula": "Mezcla orgánica / Sn",
        "cas_number": "8001-25-0 / 7440-31-5",
        "composition": "Reactivos puros",
        "concentration": "100%",
        "physical_state": "Líquido / Sólido",
        "risks_warnings": "Sin clasificación de peligro grave para ambos en condiciones normales",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-0500-ES-ES.pdf",
        "expiration_date": "2027-12-31",
        "unit": "piezas",
        "container_content": "1 frasco / 1 trozo"
    },
    {
        "name": "Aceite de Inmersión",
        "substance_group": "Mezcla de aceites minerales/sintéticos",
        "chemical_formula": "Mezcla de hidrocarburos",
        "cas_number": "8002-74-2",
        "composition": "Aceite óptico para microscopía",
        "concentration": "N/A",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Tóxico para los organismos acuáticos, Puede ser nocivo en caso de ingestión (SGA: GHS09)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-X899-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "ml",
        "container_content": "100 ml"
    },
    {
        "name": "Sulfato de Aluminio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "Al₂(SO₄)₃",
        "cas_number": "10043-01-3",
        "composition": "Sal grado reactivo",
        "concentration": "≥98%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Provoca lesiones oculares graves (SGA: GHS05)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-4348-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Diclorofluoresceína",
        "substance_group": "Colorantes indicadores / Fluoróforos",
        "chemical_formula": "C₂₀H₁₀Cl₂O₅",
        "cas_number": "76-54-0",
        "composition": "Indicador analítico (Dichlorofluorescein)",
        "concentration": "≥95%",
        "physical_state": "Sólido",
        "risks_warnings": "Atención, Provoca irritación ocular y cutánea (SGA: GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-F244-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "25 g"
    },
    {
        "name": "Acetato de Sodio",
        "substance_group": "Sales orgánicas",
        "chemical_formula": "CH₃COONa",
        "cas_number": "127-09-3",
        "composition": "Grado analítico (Anhidro / Trihidratado)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-6779-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Carbonato de Sodio",
        "substance_group": "Carbonatos / Sales inorgánicas",
        "chemical_formula": "Na₂CO₃",
        "cas_number": "497-19-8",
        "composition": "Anhidro para análisis",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Atención, Provoca irritación ocular grave (SGA: GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-A135-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Urea",
        "substance_group": "Amidas orgánicas",
        "chemical_formula": "CO(NH₂)₂",
        "cas_number": "57-13-6",
        "composition": "Grado reactivo",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-X999-ES-ES.pdf",
        "expiration_date": "2028-12-31",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Caseína Soluble",
        "substance_group": "Proteínas biológicas",
        "chemical_formula": "Mezcla de fosfoproteínas",
        "cas_number": "9000-71-9",
        "composition": "Grado bioquímico (Polvo ambarino)",
        "concentration": "N/A",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-7534-ES-ES.pdf",
        "expiration_date": "2027-12-31",
        "unit": "g",
        "container_content": "250 g"
    },
    {
        "name": "Tartrato de Sodio",
        "substance_group": "Sales orgánicas",
        "chemical_formula": "Na₂C₄H₄O₆ · 2H₂O",
        "cas_number": "6106-24-7",
        "composition": "Dihidrato Para análisis",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-T113-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Ácido Tartárico",
        "substance_group": "Ácidos orgánicos",
        "chemical_formula": "C₄H₆O₆",
        "cas_number": "87-69-4",
        "composition": "Grado analítico (L-+)",
        "concentration": "≥99.5%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Provoca lesiones oculares graves (SGA: GHS05)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-K302-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Parafina p/Histología",
        "substance_group": "Mezcla de hidrocarburos sólidos",
        "chemical_formula": "Mezcla de alcanos superiores",
        "cas_number": "8002-74-2",
        "composition": "Parafina purificada P.F. 56-58°C (Lentejas o bloques)",
        "concentration": "N/A",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-CN92-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "kg",
        "container_content": "1 kg"
    },
    {
        "name": "Naftalina Blanca",
        "substance_group": "Hidrocarburos aromáticos",
        "chemical_formula": "C₁₀H₈",
        "cas_number": "91-20-3",
        "composition": "Grado reactivo (Naftaleno)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Sólido inflamable, Nocivo por ingestión, Se sospecha que provoca cáncer, Muy tóxico para acuáticos (SGA: GHS02, GHS07, GHS08, GHS09)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-6714-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "250 g"
    },
    {
        "name": "Cloruro de Aluminio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "AlCl₃",
        "cas_number": "7446-70-0",
        "composition": "Grado analítico (Anhidro / Hexahidratado)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Provoca quemaduras graves en la piel y lesiones oculares graves (SGA: GHS05)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-CN85-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Hidróxido de Calcio",
        "substance_group": "Bases inorgánicas",
        "chemical_formula": "Ca(OH)₂",
        "cas_number": "1305-62-0",
        "composition": "Grado analítico",
        "concentration": "≥95%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Provoca lesiones oculares graves, Irritación cutánea y respiratoria (SGA: GHS05, GHS07)",
        "stock": 2,
        "pdf": "https://www.carlroth.com/medias/SDB-3305-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Óxido de Hierro",
        "substance_group": "Óxidos metálicos",
        "chemical_formula": "Fe₂O₃",
        "cas_number": "1309-37-1",
        "composition": "Polvo rojo (Óxido de Hierro III)",
        "concentration": "≥98%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-4462-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Sulfato de Aluminio y Potasio",
        "substance_group": "Sales inorgánicas dobles",
        "chemical_formula": "KAl(SO₄)₂ · 12H₂O",
        "cas_number": "7784-24-9",
        "composition": "Grado analítico (Alumbre)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-X871-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Carbón Activado Granulado",
        "substance_group": "Carbono elemental / Adsorbentes",
        "chemical_formula": "C",
        "cas_number": "7440-44-0",
        "composition": "Carbón purificado",
        "concentration": "100%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-0997-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Cloruro de Litio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "LiCl",
        "cas_number": "7447-41-8",
        "composition": "Grado reactivo",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Atención, Nocivo por ingestión, Provoca irritación cutánea y ocular grave (SGA: GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-3739-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "250 g"
    },
    {
        "name": "Cloruro de Estroncio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "SrCl₂ · 6H₂O",
        "cas_number": "10025-70-4",
        "composition": "Hexahidratado para análisis",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Provoca lesiones oculares graves (SGA: GHS05)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-4389-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "250 g"
    },
    {
        "name": "Carburo de Calcio",
        "substance_group": "Carburos metálicos",
        "chemical_formula": "CaC₂",
        "cas_number": "75-20-7",
        "composition": "Técnico o puro",
        "concentration": "≥80%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, En contacto con el agua desprende gases extremadamente inflamables (acetileno), Provoca lesiones oculares graves (SGA: GHS02, GHS05)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-6043-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Bromuro de Sodio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "NaBr",
        "cas_number": "7647-15-6",
        "composition": "Grado reactivo",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-HN15-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Azul de Bromotimol",
        "substance_group": "Indicadores de pH orgánicos",
        "chemical_formula": "C₂₇H₂₈Br₂O₅S",
        "cas_number": "76-59-5",
        "composition": "Polvo indicador (Azul de brotimol)",
        "concentration": "99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-0309-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "25 g"
    },
    {
        "name": "Aluminio en Polvo",
        "substance_group": "Metales",
        "chemical_formula": "Al",
        "cas_number": "7429-90-5",
        "composition": "Metal puro elemental",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Peligro, Sólido inflamable, En contacto con el agua desprende gases inflamables (SGA: GHS02)",
        "stock": 3,
        "pdf": "https://www.carlroth.com/medias/SDB-1702-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "250 g"
    },
    {
        "name": "Carbonato de Potasio",
        "substance_group": "Carbonatos / Sales inorgánicas",
        "chemical_formula": "K₂CO₃",
        "cas_number": "584-08-7",
        "composition": "Anhidro para análisis",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Atención, Provoca irritación cutánea y ocular grave (SGA: GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-X874-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Sulfato de Magnesio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "MgSO₄",
        "cas_number": "7487-88-9",
        "composition": "Grado analítico (Anhidro / Heptahidratado)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-0260-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Sacarosa",
        "substance_group": "Carbohidratos / Disacáridos",
        "chemical_formula": "C₁₂H₂₂O₁₁",
        "cas_number": "57-50-1",
        "composition": "Reactivo bioquímico (Azúcar de mesa)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-4621-ES-ES.pdf",
        "expiration_date": "2028-12-31",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Sal Granular",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "NaCl",
        "cas_number": "7647-14-5",
        "composition": "Reactivo o estándar (Cloruro de Sodio)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-3957-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "1000 g"
    },
    {
        "name": "Formiato de Sodio / Cloruro de Sodio",
        "substance_group": "Sal orgánica / Sal inorgánica",
        "chemical_formula": "HCOONa / NaCl",
        "cas_number": "141-53-7 / 7647-14-5",
        "composition": "Reactivos puros",
        "concentration": "N/A",
        "physical_state": "Sólidos",
        "risks_warnings": "Sin clasificación de peligro grave para ambos",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-4404-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Agua Destilada",
        "substance_group": "Óxidos inorgánicos / Solventes",
        "chemical_formula": "H₂O",
        "cas_number": "7732-18-5",
        "composition": "Agua desmineralizada pura",
        "concentration": "100%",
        "physical_state": "Líquido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 2,
        "pdf": "",
        "expiration_date": "Sin caducidad",
        "unit": "L",
        "container_content": "5 L"
    },
    {
        "name": "Naranja de Metilo en solución",
        "substance_group": "Indicadores azoicos",
        "chemical_formula": "C₁₄H₁₄N₃NaO₃S",
        "cas_number": "547-58-0",
        "composition": "Solución indicadora analítica (Naranja/Rojizo)",
        "concentration": "Aprox. 0.1% a 0.5%",
        "physical_state": "Líquido",
        "risks_warnings": "Sin clasificación de peligro grave (a estas concentraciones)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-T118-ES-ES.pdf",
        "expiration_date": "2027-12-31",
        "unit": "ml",
        "container_content": "100 ml"
    },
    {
        "name": "Solución de Cobre",
        "substance_group": "Soluciones de metales de transición",
        "chemical_formula": "CuSO₄ (aq)",
        "cas_number": "7758-99-8",
        "composition": "Solución analítica o estándar (Sulfato de Cobre acuoso)",
        "concentration": "1 M",
        "physical_state": "Líquido",
        "risks_warnings": "Tóxico para organismos acuáticos",
        "stock": 1,
        "pdf": "",
        "expiration_date": "Sin caducidad",
        "unit": "ml",
        "container_content": "250 ml"
    },
    {
        "name": "Agua Oxigenada",
        "substance_group": "Peróxidos inorgánicos",
        "chemical_formula": "H₂O₂",
        "cas_number": "7722-84-1",
        "composition": "Solución acuosa (Peróxido de Hidrógeno)",
        "concentration": "3% - 30%",
        "physical_state": "Líquido",
        "risks_warnings": "Atención/Peligro, Corrosivo/Irritante, Comburente (SGA: GHS03, GHS05)",
        "stock": 2,
        "pdf": "https://www.carlroth.com/medias/SDB-8070-ES-ES.pdf",
        "expiration_date": "2027-06-30",
        "unit": "ml",
        "container_content": "500 ml"
    },
    {
        "name": "Solución de Jabón",
        "substance_group": "Tensoactivos / Sales de ácidos grasos",
        "chemical_formula": "Mezcla acuosa",
        "cas_number": "N/A",
        "composition": "Reactivo preparado para pruebas de dureza o limpieza",
        "concentration": "Varía",
        "physical_state": "Líquido",
        "risks_warnings": "Atención, Puede provocar irritación ocular",
        "stock": 1,
        "pdf": "",
        "expiration_date": "2027-12-31",
        "unit": "ml",
        "container_content": "250 ml"
    },
    {
        "name": "Yeso",
        "substance_group": "Sulfatos inorgánicos / Minerales",
        "chemical_formula": "CaSO₄ · ½H₂O",
        "cas_number": "10034-76-1",
        "composition": "Sulfato de Calcio hemihidratado (Polvo)",
        "concentration": "N/A",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-0256-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "kg",
        "container_content": "1 kg"
    },
    {
        "name": "Cloruro de Magnesio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "MgCl₂",
        "cas_number": "7791-18-6",
        "composition": "Hexahidratado Para análisis",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-A122-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Solución Amoniacal",
        "substance_group": "Bases inorgánicas",
        "chemical_formula": "NH₄OH",
        "cas_number": "1336-21-6",
        "composition": "Amoníaco en solución acuosa",
        "concentration": "10% - 25%",
        "physical_state": "Líquido",
        "risks_warnings": "Peligro, Provoca quemaduras graves en la piel, Tóxico para organismos acuáticos (SGA: GHS05, GHS09)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-X796-ES-ES.pdf",
        "expiration_date": "2027-12-31",
        "unit": "ml",
        "container_content": "500 ml"
    },
    {
        "name": "Cloruro de Potasio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "KCl",
        "cas_number": "7447-40-7",
        "composition": "Para análisis",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-6781-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Acetato de Calcio",
        "substance_group": "Sales orgánicas",
        "chemical_formula": "Ca(CH₃COO)₂",
        "cas_number": "62-54-4",
        "composition": "Para análisis (a menudo hidrato)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-7170-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Glicerina / Bisulfato de Sodio",
        "substance_group": "Polioles orgánicos / Sales inorgánicas ácidas",
        "chemical_formula": "C₃H₈O₃ / NaHSO₄",
        "cas_number": "56-81-5 / 7681-38-1",
        "composition": "Reactivos puros",
        "concentration": "N/A",
        "physical_state": "Líquido / Sólido",
        "risks_warnings": "Peligro (Bisulfato: Provoca lesiones oculares graves GHS05). Glicerina no es peligrosa.",
        "stock": 1,
        "pdf": "",
        "expiration_date": "Sin caducidad",
        "unit": "piezas",
        "container_content": "1 frasco / 1 envase"
    },
    {
        "name": "Cloruro de Amonio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "NH₄Cl",
        "cas_number": "12125-02-9",
        "composition": "Para análisis",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Atención, Nocivo por ingestión, Provoca irritación ocular grave (SGA: GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-K298-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Fosfato de Calcio Tribásico",
        "substance_group": "Fosfatos inorgánicos",
        "chemical_formula": "Ca₃(PO₄)₂",
        "cas_number": "7758-87-4",
        "composition": "Polvo purificado",
        "concentration": "≥98%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-0624-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Ácido Cítrico",
        "substance_group": "Ácidos orgánicos / Carboxílicos",
        "chemical_formula": "C₆H₈O₇",
        "cas_number": "77-92-9",
        "composition": "Grado analítico (Anhidro)",
        "concentration": "≥99.5%",
        "physical_state": "Sólido",
        "risks_warnings": "Atención, Provoca irritación ocular grave (SGA: GHS07)",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-X863-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Sulfato de Amonio",
        "substance_group": "Sales inorgánicas",
        "chemical_formula": "(NH₄)₂SO₄",
        "cas_number": "7783-20-2",
        "composition": "Para análisis",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-3746-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
    },
    {
        "name": "Carbonato de Calcio",
        "substance_group": "Carbonatos / Sales inorgánicas",
        "chemical_formula": "CaCO₃",
        "cas_number": "471-34-1",
        "composition": "Precipitado analítico (Polvo fino)",
        "concentration": "≥99%",
        "physical_state": "Sólido",
        "risks_warnings": "Sin clasificación de peligro grave",
        "stock": 1,
        "pdf": "https://www.carlroth.com/medias/SDB-P011-ES-ES.pdf",
        "expiration_date": "Sin caducidad",
        "unit": "g",
        "container_content": "500 g"
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
    default_location = "Estante A / Almacén de Reactivos"
    default_responsible = "Laboratorio de Química"

    inserted_count = 0
    updated_count = 0

    for item in substances_data:
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

        # Verificar si ya existe en la base de datos por CAS o Nombre exacto
        cursor.execute("SELECT id, stock_units FROM substances WHERE (cas_number = ? AND cas_number != '') OR lower(name) = lower(?)", (cas, name))
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
            cursor.execute('''
                INSERT INTO substances (
                    name, chemical_formula, cas_number, composition, concentration,
                    physical_state, risks_warnings, quantity, unit, location,
                    entry_date, expiration_date, responsible, external_links, pdf_path,
                    substance_group, stock_units, container_content
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                name, formula, cas, comp, conc, pstate, risks, float(stock), unit,
                default_location, today, exp, default_responsible, pdf, pdf, group, stock, container
            ))
            rec_id = cursor.lastrowid
            inserted_count += 1

        # Generar o asegurar el QR estático LAB-SUB-id
        qp, qc = generate_static_qr(rec_id)
        cursor.execute("UPDATE substances SET qr_path = ?, qr_content = ? WHERE id = ?", (qp, qc, rec_id))

    conn.commit()
    conn.close()
    print(f"Importacion finalizada. Insertados nuevos: {inserted_count}, Actualizados: {updated_count}, Total procesados: {len(substances_data)}")

if __name__ == '__main__':
    main()
