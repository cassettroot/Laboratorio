from flask import Blueprint, request, jsonify
from backend.database import get_db_connection

history_bp = Blueprint('history', __name__)

@history_bp.route('/api/history', methods=['GET'])
def get_history():
    table_name = request.args.get('table_name', '').strip()
    record_id = request.args.get('record_id', '').strip()
    action = request.args.get('action', '').strip()
    user_responsible = request.args.get('user_responsible', '').strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    query = 'SELECT * FROM change_history WHERE 1=1'
    params = []

    if table_name:
        query += ' AND table_name = ?'
        params.append(table_name)

    if record_id:
        try:
            rid = int(record_id)
            query += ' AND record_id = ?'
            params.append(rid)
        except ValueError:
            pass

    if action:
        query += ' AND action = ?'
        params.append(action)

    if user_responsible:
        query += ' AND user_responsible LIKE ?'
        params.append(f'%{user_responsible}%')

    query += ' ORDER BY timestamp DESC, id DESC'

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return jsonify({"status": "success", "data": [dict(r) for r in rows]})
