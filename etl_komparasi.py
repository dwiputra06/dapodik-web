import os
import sqlite3
import pandas as pd

# 1. Tentukan Path File Excel & Database SQLite
EXCEL_PATH = os.path.join('data_excel', 'Kompresi.xlsx')
if not os.path.exists(EXCEL_PATH):
    # Fallback jika Kompresi.xlsx berada di root folder
    EXCEL_PATH = 'Kompresi.xlsx'

DB_PATH = 'dapodik.db'

print(f"📦 Menggunakan file Excel: {EXCEL_PATH}")
print(f"🗄️ Menggunakan database SQLite: {DB_PATH}")

def run_etl():
    if not os.path.exists(EXCEL_PATH):
        print(f"❌ Error: File {EXCEL_PATH} tidak ditemukan!")
        return

    xls = pd.ExcelFile(EXCEL_PATH)
    sheet_2025 = xls.sheet_names[0]
    sheet_2026 = xls.sheet_names[1]

    print(f"📄 Membaca Sheet 2025 ({sheet_2025}) dan Sheet 2026 ({sheet_2026})...")
    df_2025 = pd.read_excel(xls, sheet_name=sheet_2025, header=None)
    df_2026 = pd.read_excel(xls, sheet_name=sheet_2026, header=None)

    # 2. Pemetaan Kolom Indikator
    def get_indicator_cols(df):
        ind_cols = {}
        row3 = df.iloc[3].values
        row4 = df.iloc[4].values
        row5 = df.iloc[5].values

        for c in range(df.shape[1]):
            r3_v = str(row3[c]).strip() if pd.notna(row3[c]) else ""
            r4_v = str(row4[c]).strip() if pd.notna(row4[c]) else ""
            r5_v = str(row5[c]).strip() if pd.notna(row5[c]) else ""

            code, name = None, None
            if r3_v.startswith(('A.', 'B.', 'C.', 'D.', 'E.')):
                code = r3_v
                name = r4_v
            elif r4_v.startswith(('A.', 'B.', 'C.', 'D.', 'E.')) and ' ' in r4_v and len(r4_v.split()[0]) <= 4:
                code = r4_v.split()[0]
                name = r4_v

            if code and r5_v == 'Label Capaian':
                # Cari kolom Perubahan Nilai jika ada di offset +2
                p_val_c = None
                if c + 2 < df.shape[1] and str(df.iloc[5, c + 2]).strip() == 'Perubahan Nilai':
                    p_val_c = c + 2
                ind_cols[code] = {'nama': name, 'capaian_col': c, 'perubahan_col': p_val_c}
        return ind_cols

    map_2025 = get_indicator_cols(df_2025)
    map_2026 = get_indicator_cols(df_2026)

    # Indikator unik gabungan
    all_codes = sorted(list(set(map_2025.keys()) | set(map_2026.keys())))

    # 3. Peta Baris Sekolah berdasarkan NPSN
    schools_2025 = {}
    for r in range(6, df_2025.shape[0]):
        npsn = str(df_2025.iloc[r, 0]).strip()
        if npsn and npsn != 'nan':
            schools_2025[npsn] = r

    schools_2026 = {}
    for r in range(6, df_2026.shape[0]):
        npsn = str(df_2026.iloc[r, 0]).strip()
        if npsn and npsn != 'nan':
            schools_2026[npsn] = r

    all_npsns = sorted(list(set(schools_2025.keys()) | set(schools_2026.keys())))
    print(f"🏫 Terdeteksi {len(all_npsns)} sekolah (NPSN) unik.")

    # 4. Olah Data Metadata & Komparasi Rapor
    sekolah_rows = []
    komparasi_rows = []

    for npsn in all_npsns:
        r25 = schools_2025.get(npsn)
        r26 = schools_2026.get(npsn)

        # Ambil Metadata dari 2026 (atau 2025 jika di 2026 tidak ada)
        ref_df = df_2026 if r26 is not None else df_2025
        ref_r = r26 if r26 is not None else r25

        nama = str(ref_df.iloc[ref_r, 1]).strip() if pd.notna(ref_df.iloc[ref_r, 1]) else '-'
        jenis = str(ref_df.iloc[ref_r, 2]).strip() if pd.notna(ref_df.iloc[ref_r, 2]) else '-'
        status = str(ref_df.iloc[ref_r, 3]).strip() if pd.notna(ref_df.iloc[ref_r, 3]) else '-'
        kab = str(ref_df.iloc[ref_r, 4]).strip() if pd.notna(ref_df.iloc[ref_r, 4]) else '-'
        kec = str(ref_df.iloc[ref_r, 5]).strip() if pd.notna(ref_df.iloc[ref_r, 5]) else '-'

        sekolah_rows.append((npsn, nama, jenis, status, kab, kec))

        # Loop setiap indikator
        for code in all_codes:
            # Ambil Nilai 2025
            capaian_25, ubah_25 = '-', '-'
            if r25 is not None and code in map_2025:
                info25 = map_2025[code]
                c_idx = info25['capaian_col']
                p_idx = info25['perubahan_col']
                capaian_25 = str(df_2025.iloc[r25, c_idx]).strip() if pd.notna(df_2025.iloc[r25, c_idx]) else '-'
                if p_idx is not None and pd.notna(df_2025.iloc[r25, p_idx]):
                    ubah_25 = str(df_2025.iloc[r25, p_idx]).strip()

            # Ambil Nilai 2026
            capaian_26, ubah_26 = '-', '-'
            if r26 is not None and code in map_2026:
                info26 = map_2026[code]
                c_idx = info26['capaian_col']
                p_idx = info26['perubahan_col']
                capaian_26 = str(df_2026.iloc[r26, c_idx]).strip() if pd.notna(df_2026.iloc[r26, c_idx]) else '-'
                if p_idx is not None and pd.notna(df_2026.iloc[r26, p_idx]):
                    ubah_26 = str(df_2026.iloc[r26, p_idx]).strip()

            # Nama indikator
            ind_nama = map_2026[code]['nama'] if code in map_2026 else map_2025[code]['nama']

            komparasi_rows.append((
                npsn, code, ind_nama,
                capaian_25, ubah_25,
                capaian_26, ubah_26
            ))

    # 5. Simpan ke SQLite Database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Buat tabel sekolah_meta jika belum ada
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sekolah_meta (
            npsn TEXT PRIMARY KEY,
            nama_sekolah TEXT,
            jenis_sekolah TEXT,
            status_sekolah TEXT,
            kabupaten_kota TEXT,
            kecamatan TEXT
        )
    ''')

    # Buat tabel rapor_komparasi
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rapor_komparasi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            npsn TEXT,
            kode_indikator TEXT,
            nama_indikator TEXT,
            capaian_2025 TEXT,
            perubahan_2025 TEXT,
            capaian_2026 TEXT,
            perubahan_2026 TEXT,
            FOREIGN KEY (npsn) REFERENCES sekolah_meta(npsn)
        )
    ''')

    # Bersihkan data lama jika ada
    cursor.execute("DELETE FROM sekolah_meta")
    cursor.execute("DELETE FROM rapor_komparasi")

    # Insert Batch Data
    cursor.executemany('''
        INSERT INTO sekolah_meta VALUES (?, ?, ?, ?, ?, ?)
    ''', sekolah_rows)

    cursor.executemany('''
        INSERT INTO rapor_komparasi 
        (npsn, kode_indikator, nama_indikator, capaian_2025, perubahan_2025, capaian_2026, perubahan_2026)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', komparasi_rows)

    conn.commit()
    conn.close()

    print(f"✅ ETL Sukses! Dimasukkan {len(sekolah_rows)} data sekolah dan {len(komparasi_rows)} baris komparasi indikator.")

if __name__ == '__main__':
    run_etl()