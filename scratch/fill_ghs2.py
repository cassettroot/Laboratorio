import sqlite3
import os

DB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dbs = ['inventario.db', 'oficina.db', 'sistemas.db']

rules = [
    (['óxido', 'oxido', 'polvo', 'magnesio', 'aluminio', 'hierro', 'cobre', 'plata', 'zinc', 'azufre', 'sodio', 'potasio'], 'Irritante (GHS07)'),
]

for db_name in dbs:
    db_path = os.path.join(DB_DIR, db_name)
    if not os.path.exists(db_path):
        continue
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id, name, risks_warnings FROM substances")
        rows = cursor.fetchall()
        
        updated_count = 0
        for row in rows:
            sub_id, name, current_risks = row
            name_lower = name.lower()
            current_risks = current_risks or ''
            
            new_risks = set([r.strip() for r in current_risks.split(',') if r.strip()])
            
            for keywords, label in rules:
                if any(kw in name_lower for kw in keywords):
                    new_risks.add(label)
                    
            new_risks_str = ', '.join(sorted(new_risks))
            
            if new_risks_str != current_risks:
                cursor.execute("UPDATE substances SET risks_warnings = ? WHERE id = ?", (new_risks_str, sub_id))
                updated_count += 1
                
        conn.commit()
        print(f"Updated {updated_count} substances in {db_name}")
    except sqlite3.OperationalError as e:
        print(f"Error in {db_name}: {e}")
    finally:
        conn.close()
