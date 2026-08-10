from flask import Blueprint, render_template

# Inisialisasi Blueprint khusus untuk halaman UI (Tampilan)
views_bp = Blueprint('views', __name__)

@views_bp.route('/')
def home():
    """Halaman Utama / Dashboard Analytics"""
    return render_template('index.html')

@views_bp.route('/komparasi')
def komparasi():
    """Halaman Analisis Komparasi Data Wilayah"""
    return render_template('komparasi.html')