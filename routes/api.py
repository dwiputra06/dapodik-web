from flask import Blueprint, jsonify
import sqlite3
from config import DB_NAME

api_bp = Blueprint('api', __name__)

@api_bp.route('/dapodik', methods=['GET'])
def get_dapodik():
    try:
        conn = sqlite3.connect(DB_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Query ambil semua data dari tabel sekolah
        cursor.execute("SELECT * FROM sekolah")
        rows = cursor.fetchall()
        conn.close()
        
        # Konversi baris SQLite ke JSON
        data = [dict(row) for row in rows]
        return jsonify(data)
    except Exception as e:
        print(f"Error Database: {e}")
        return jsonify({"error": str(e)}), 500