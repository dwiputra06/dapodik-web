import re
import sqlite3
from flask import Blueprint, jsonify, request
from config import DB_NAME

api_bp = Blueprint('api', __name__)


def get_db_connection():
    """Koneksi ke SQLite DB dengan Row Factory"""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def get_nama_sekolah_map(cursor):
    """Mencari pemetaan NPSN -> Nama Sekolah asli dari tabel sekolah_meta atau sekolah"""
    npsn_map = {}

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row['name'] for row in cursor.fetchall()]

    target_tables = [t for t in ['sekolah_meta', 'sekolah'] if t in tables]

    for table in target_tables:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [r['name'].lower() for r in cursor.fetchall()]

        col_npsn = next((c for c in ['npsn', 'id'] if c in columns), None)
        col_nama = next((c for c in ['nama_sekolah', 'nama_satuan_pendidikan', 'sekolah', 'nama', 'nama_sp'] if c in columns), None)

        if col_npsn and col_nama:
            cursor.execute(f"SELECT DISTINCT `{col_npsn}` AS npsn, `{col_nama}` AS nama FROM `{table}` WHERE `{col_nama}` IS NOT NULL AND `{col_nama}` != ''")
            for row in cursor.fetchall():
                npsn_str = str(row['npsn'])
                nama_str = str(row['nama']).strip()
                if nama_str and not nama_str.isdigit():
                    npsn_map[npsn_str] = nama_str

            if npsn_map:
                break

    return npsn_map


@api_bp.route('/dapodik', methods=['GET'])
def get_dapodik():
    """Mengambil seluruh data sekolah dari tabel sekolah"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sekolah")
        rows = cursor.fetchall()
        return jsonify([dict(row) for row in rows])
    except Exception as e:
        print(f"❌ Error (/dapodik): {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@api_bp.route('/sekolah-list', methods=['GET'])
def get_sekolah_list():
    """Mengambil daftar seluruh sekolah yang tersedia, mendukung pencarian via ?q= & ?limit="""
    q = (request.args.get('q') or '').strip().lower()
    limit = request.args.get('limit', default=50, type=int) or 50
    limit = max(1, min(limit, 200))

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        npsn_map = get_nama_sekolah_map(cursor)

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row['name'] for row in cursor.fetchall()]

        all_npsn = []
        if 'rapor_komparasi' in tables:
            cursor.execute("SELECT DISTINCT npsn FROM rapor_komparasi WHERE npsn IS NOT NULL AND npsn != ''")
            all_npsn = [str(r['npsn']) for r in cursor.fetchall()]
        elif 'sekolah' in tables:
            cursor.execute("SELECT DISTINCT npsn FROM sekolah WHERE npsn IS NOT NULL AND npsn != ''")
            all_npsn = [str(r['npsn']) for r in cursor.fetchall()]

        sekolah_list = []
        if all_npsn:
            for npsn in all_npsn:
                nama = npsn_map.get(npsn, f"Sekolah NPSN {npsn}")
                sekolah_list.append({'npsn': npsn, 'nama': nama})
        else:
            sekolah_list = [{'npsn': k, 'nama': v} for k, v in npsn_map.items()]

        sekolah_list.sort(key=lambda x: x['nama'])

        if q:
            sekolah_list = [
                s for s in sekolah_list
                if q in s['nama'].lower() or q in s['npsn'].lower()
            ]

        sekolah_list = sekolah_list[:limit]
        return jsonify(sekolah_list)

    except Exception as e:
        print(f"❌ Error API /sekolah-list: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


def _rank_capaian(val):
    """Konversi capaian kualitatif menjadi angka untuk perbandingan tren (Baik=3, Sedang=2, Kurang=1)"""
    v = str(val or '').strip().lower()
    if 'baik' in v:
        return 3
    if 'sedang' in v:
        return 2
    if 'kurang' in v:
        return 1
    return None


def _is_numeric_perubahan(val):
    """Cek apakah nilai perubahan berupa angka (mis. '6,67', '-2,5', '0')"""
    v = str(val or '').strip()
    if not v or v == '-':
        return False
    return bool(re.fullmatch(r'-?\d[\d.,]*', v))


def _parse_persen(val):
    """Parse nilai perubahan '6,67' atau '-2,5' menjadi float"""
    s = str(val or '').strip().replace(',', '.').replace(' ', '')
    try:
        return float(s)
    except ValueError:
        return None


@api_bp.route('/sekolah-trend', methods=['GET'])
def get_sekolah_trend():
    """Mengambil data tren & komparasi 2025 vs 2026 per Indikator Rapor Pendidikan (data real dari DB)"""
    npsn = request.args.get('npsn')

    if not npsn:
        return jsonify({"error": "NPSN wajib diisi"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Ambil Metadata Sekolah (real dari tabel sekolah_meta / sekolah)
        nama_sekolah = f"Sekolah ({npsn})"
        kabupaten = '-'
        jenis_sekolah = '-'
        status_sekolah = '-'
        kecamatan = '-'

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row['name'] for row in cursor.fetchall()]
        meta_table = 'sekolah_meta' if 'sekolah_meta' in tables else ('sekolah' if 'sekolah' in tables else None)

        if meta_table:
            cursor.execute(f"PRAGMA table_info({meta_table})")
            m_cols = [r['name'].lower() for r in cursor.fetchall()]
            c_npsn = next((c for c in ['npsn', 'id'] if c in m_cols), None)
            if c_npsn:
                cursor.execute(f"SELECT * FROM `{meta_table}` WHERE `{c_npsn}` = ? LIMIT 1", (npsn,))
                row = cursor.fetchone()
                if row:
                    d = dict(row)
                    nama_sekolah = (d.get('nama_sekolah') or d.get('nama_satuan_pendidikan') or d.get('sekolah') or d.get('nama') or nama_sekolah)
                    kabupaten = d.get('kabupaten_kota') or d.get('kabupaten') or d.get('kab_kota') or '-'
                    jenis_sekolah = d.get('jenis_sekolah') or d.get('bentuk') or '-'
                    status_sekolah = d.get('status_sekolah') or d.get('status') or '-'
                    kecamatan = d.get('kecamatan') or '-'

        # 3. Indikator Rapor Pendidikan (real dari tabel rapor_komparasi)
        indikator_list = []
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row['name'] for row in cursor.fetchall()]
        if 'rapor_komparasi' in tables:
            cursor.execute("""
                SELECT kode_indikator, nama_indikator, capaian_2025, perubahan_2025, capaian_2026, perubahan_2026
                FROM rapor_komparasi
                WHERE npsn = ?
                ORDER BY kode_indikator
            """, (npsn,))
            for row in cursor.fetchall():
                capaian_2025 = str(row['capaian_2025'] or '-').strip()
                capaian_2026 = str(row['capaian_2026'] or '-').strip()
                perubahan_2025 = str(row['perubahan_2025'] or '-').strip()
                perubahan_2026 = str(row['perubahan_2026'] or '-').strip()

                # Hanya tampilkan indikator yang punya data angka perubahan (2025 atau 2026)
                if not (_is_numeric_perubahan(perubahan_2025) or _is_numeric_perubahan(perubahan_2026)):
                    continue

                rank_25 = _rank_capaian(capaian_2025)
                rank_26 = _rank_capaian(capaian_2026)

                if rank_25 is not None and rank_26 is not None:
                    status_tren = 'Naik' if rank_26 > rank_25 else ('Turun' if rank_26 < rank_25 else 'Tetap')
                elif rank_26 is not None:
                    status_tren = 'Naik'
                elif rank_25 is not None:
                    status_tren = 'Turun'
                else:
                    status_tren = 'Tidak Tersedia'

                indikator_list.append({
                    'kode': str(row['kode_indikator'] or '-').strip(),
                    'nama': str(row['nama_indikator'] or '').strip(),
                    'capaian_2025': capaian_2025,
                    'perubahan_2025': perubahan_2025,
                    'capaian_2026': capaian_2026,
                    'perubahan_2026': perubahan_2026,
                    'status_tren': status_tren
                })

        # 4. Rata-rata Perubahan 2026 (data real dari indikator yang punya angka)
        perubahan_vals = [_parse_persen(i['perubahan_2026']) for i in indikator_list]
        perubahan_vals = [p for p in perubahan_vals if p is not None]
        avg_perubahan = round(sum(perubahan_vals) / len(perubahan_vals), 2) if perubahan_vals else None

        # 5. Data Grafik: perubahan nilai (%) 2025 vs 2026 per indikator
        chart_labels = [i['kode'] for i in indikator_list]
        chart_2025 = [_parse_persen(i['perubahan_2025']) for i in indikator_list]
        chart_2026 = [_parse_persen(i['perubahan_2026']) for i in indikator_list]

        return jsonify({
            'info': {
                'npsn': str(npsn),
                'nama_sekolah': str(nama_sekolah),
                'kabupaten_kota': str(kabupaten),
                'jenis_sekolah': str(jenis_sekolah),
                'status_sekolah': str(status_sekolah),
                'kecamatan': str(kecamatan)
            },
            'avg_perubahan': avg_perubahan,
            'indikator_terisi': len(indikator_list),
            'indikator_list': indikator_list,
            'chart': {
                'labels': chart_labels,
                'capaian_2025': chart_2025,
                'capaian_2026': chart_2026
            }
        })

    except Exception as e:
        print(f"❌ Error API /sekolah-trend: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()