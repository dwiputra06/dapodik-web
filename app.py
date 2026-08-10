import os
from flask import Flask
from config import DB_NAME
from etl import process_excel_files
from routes.views import views_bp
from routes.api import api_bp

# Inisialisasi Aplikasi Flask
app = Flask(__name__)

# Konfigurasi Opsional (Opsional: berguna jika nantinya menggunakan session/flash message)
app.config['SECRET_KEY'] = 'dapodik-analytics-secret-2026'

# pendaftaran (Register) Blueprints
app.register_blueprint(views_bp)
app.register_blueprint(api_bp, url_prefix='/api')


def init_db():
    """Fungsi untuk memeriksa dan menjalankan ETL jika database belum ada."""
    if not os.path.exists(DB_NAME):
        print("⚙️ Database belum ditemukan. Memulai proses ETL dari file Excel...")
        process_excel_files()
        print("✅ Proses ETL selesai! Database berhasil dibuat.")
    else:
        print("📊 Database ditemukan dan siap digunakan.")


if __name__ == '__main__':
    # Jalankan pengecekan database sebelum server aktif
    init_db()
    
    print("🚀 Server berjalan di http://127.0.0.1:5000")
    app.run(debug=True, port=5000)