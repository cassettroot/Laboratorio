import sqlite3
import json

data = [
  {
    "numero": 1,
    "nombre_y_caracteristicas": "ARCHIVERO DE MADERA 2 GAVETAS",
    "numero_de_inventario": "115130001I51101000051309GAUAD",
    "numero_sep": "0016023832",
    "marca": "SIN MARCA",
    "modelo": "SIN MODELO",
    "serie": "SIN SERIE",
    "valor": 1850.00
  },
  {
    "numero": 2,
    "nombre_y_caracteristicas": "ESTANTE, ESTANTE ORGANIZADOR ARMABLE MULTIFUNCIONAL DE 5 ENTREPAÑOS, LINEA HOGAR, ACABADO MDF, LARGOXALTURAXPROFUNDIDAD: 90X180X40CM, ESPESOR: 3CM, PESO MAXIMO SOPORTADO 200KG, MATERIAL MDF Y METAL, TIPO DE REPISA ANAQUEL, ESTILO INDUSTRIAL.",
    "numero_de_inventario": "115130001I51101000252409KGITV",
    "numero_sep": "0018015268",
    "marca": "SHOPMALL",
    "modelo": "ESTANTE MADERA",
    "serie": "SIN NUMERO DE SERIE",
    "valor": 700.00
  },
  {
    "numero": 3,
    "nombre_y_caracteristicas": "GABINETE DE METAL CON PUERTAS DE 1.80 M DE ALTO Y 0.85 M DE ANCHO",
    "numero_de_inventario": "115130001I51101000331309EWMBU",
    "numero_sep": "0012936381",
    "marca": "IELSA",
    "modelo": "GU",
    "serie": "SIN NUMERO DE SERIE",
    "valor": 2018.25
  },
  {
    "numero": 4,
    "nombre_y_caracteristicas": "GABINETE PARA ARCHIVO DE MADERA COLOR BLANCO 2 PUERTAS",
    "numero_de_inventario": "115130001I51101000291309GASXH",
    "numero_sep": "0016023082",
    "marca": "SIN MARCA",
    "modelo": "SIN MODELO",
    "serie": "SIN SERIE",
    "valor": 1450.00
  },
  {
    "numero": 5,
    "nombre_y_caracteristicas": "MESA AUXILIAR, MESA PLEGABLE AUXILIAR ESCRITORIO ESTILO INDUSTRIAL, MATERIAL MDF, FORRADA CON MELAMINA ESTRUCTURA DE METAL; FORMA RECTANGULAR, LARGOXANCHOXALTURA 100X50X75 CM; CAPACIDAD DE CARGA: 100KG; PESO DE LA ESTRUCTURA SIN LA MESA 3KG, PESO DEL PRO",
    "numero_de_inventario": "115130001I51101000412409KGITX",
    "numero_sep": "0018015270",
    "marca": "HOUZER",
    "modelo": "MKZ-MESAINDSCAF",
    "serie": "SIN NUMERO DE SERIE",
    "valor": 789.00
  },
  {
    "numero": 6,
    "nombre_y_caracteristicas": "MESA TRAPEZOIDAL",
    "numero_de_inventario": "115130001I51101000511309FSDVX",
    "numero_sep": "0013317372",
    "marca": "MAGOLD",
    "modelo": "MT",
    "serie": "SIN NUMERO DE SERIE",
    "valor": 504.00
  },
  {
    "numero": 7,
    "nombre_y_caracteristicas": "SILLA SECRETARIAL IMITACION PIEL COLOR NEGRO ALTO 88 CM ANCHO 46.5 CM PROFUNIDAD 51.5 CM CON BASE GIRATORIA Y AJUSTE DE ALTURA",
    "numero_de_inventario": "115130001I51101000941309EUKVJ",
    "numero_sep": "0012900397",
    "marca": "MUEBLES EDAR Y/O HUMBERTO RODRIGUEZ MAYA",
    "modelo": "SS3",
    "serie": "SIN NUMERO DE SERIE",
    "valor": 597.00
  },
  {
    "numero": 8,
    "nombre_y_caracteristicas": "SM SM SSARCHIVEROS DE MADERA",
    "numero_de_inventario": "116120055I5110100005021600007",
    "numero_sep": "0010349401",
    "marca": "N/A",
    "modelo": "N/A",
    "serie": "N/A",
    "valor": None
  },
  {
    "numero": 9,
    "nombre_y_caracteristicas": "SM SM SSMODULO ESCRITORIO PARA COMPUTADORA",
    "numero_de_inventario": "116120055I5190100201021600016",
    "numero_sep": "0010349325",
    "marca": "N/A",
    "modelo": "N/A",
    "serie": "N/A",
    "valor": None
  }
]

conn = sqlite3.connect('/home/adrian/Documentos/laboratorio/oficina.db')
cursor = conn.cursor()

for item in data:
    parts = item['nombre_y_caracteristicas'].split(',', 1)
    nombre = parts[0].strip()
    caracteristicas = parts[1].strip() if len(parts) > 1 else ''
    
    no_inventario = item['numero_de_inventario']
    if item['numero_sep']:
        no_inventario += f" (No. SEP:{item['numero_sep']})"
        
    cursor.execute('''
        INSERT INTO equipos (nombre, caracteristicas_bien, no_inventario, marca, modelo, serie, valor)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        nombre,
        caracteristicas,
        no_inventario,
        item['marca'],
        item['modelo'],
        item['serie'],
        str(item['valor']) if item['valor'] is not None else ''
    ))

conn.commit()
conn.close()
print("Data inserted successfully")
