from flask import Blueprint, render_template, redirect, url_for

# Inisialisasi Blueprint khusus untuk halaman UI (Tampilan)
views_bp = Blueprint('views', __name__)

@views_bp.route('/')
def home():
    """Halaman Utama / Dashboard Analytics"""
    return render_template('index.html')

@views_bp.route('/komparasi')
def komparasi():
    """Redirect ke Halaman Utama"""
    return redirect(url_for('views.home'))