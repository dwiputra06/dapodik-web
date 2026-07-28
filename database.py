import sqlite3
from config import DB_NAME

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def get_all_sekolah():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sekolah")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]