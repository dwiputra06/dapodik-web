import os
import glob
import sqlite3
import pandas as pd
from config import EXCEL_FOLDER, DB_NAME

def get_kabupaten_from_filename(file_name):
    """Fungsi pembaca Nama Kabupaten / Kota berdasarkan nama file Excel"""
    fn = file_name.lower()
    if "kutai kartanegara" in fn or "kukar" in fn:
        return "Kab. Kutai Kartanegara"
    elif "kutai barat" in fn:
        return "Kab. Kutai Barat"
    elif "kutai timur" in fn:
        return "Kab. Kutai Timur"
    elif "mahakam ulu" in fn:
        return "Kab. Mahakam Ulu"
    elif "panajam" in fn or "penajam" in fn:
        return "Kab. Penajam Paser Utara"
    elif "samarinda" in fn:
        return "Kota Samarinda"
    elif "balikpapan" in fn:
        return "Kota Balikpapan"
    elif "bontang" in fn:
        return "Kota Bontang"
    elif "parser" in fn or "paser" in fn:
        return "Kab. Paser"
    elif "berau" in fn:
        return "Kab. Berau"
    return "Lainnya"

def clean_num(val):
    """
    Fungsi pembersih angka.
    Mengubah format '2.367' (float desimal akibat pemisah ribuan titik) menjadi 2367.
    """
    if pd.isna(val) or val is None:
        return 0
    s = str(val).strip()
    
    # Jika terbaca sebagai float desimal dari Excel (misal: 2.367)
    if isinstance(val, float):
        if s.endswith('.0'):
            s = s[:-2]
        elif '.' in s:
            s = s.replace('.', '')
            
    # Hapus sisa titik, koma, atau spasi yang tersisa
    s = s.replace('.', '').replace(',', '').replace(' ', '')
    try:
        return int(float(s))
    except Exception:
        return 0

def normalize_columns(df):
    """Standardisasi nama kolom utama agar fleksibel terhadap huruf kapital/kecil"""
    if df is None or df.empty:
        return df, False
    
    df.columns = [str(c).strip() for c in df.columns]
    
    col_map = {}
    for c in df.columns:
        c_clean = str(c).strip().lower()
        if c_clean in ['nama sekolah', 'nama_sekolah', 'sekolah']:
            col_map[c] = 'Nama Sekolah'
        elif c_clean == 'npsn':
            col_map[c] = 'NPSN'
    
    if col_map:
        df = df.rename(columns=col_map)
        
    has_required = 'Nama Sekolah' in df.columns and 'NPSN' in df.columns
    return df, has_required

def read_sheet_smart(xls, sheet_name):
    """Mencari letak header tabel secara otomatis"""
    for skip in [1, 0, 2, 3]:
        try:
            df = pd.read_excel(xls, sheet_name=sheet_name, skiprows=skip)
            df, valid = normalize_columns(df)
            if valid:
                return df
        except Exception:
            continue

    try:
        df_raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)
        for idx, row in df_raw.head(10).iterrows():
            row_vals = [str(val).strip().lower() for val in row.values]
            if any('nama' in v and 'sekolah' in v for v in row_vals) or 'npsn' in row_vals:
                df = pd.read_excel(xls, sheet_name=sheet_name, skiprows=idx+1)
                df, valid = normalize_columns(df)
                if valid:
                    return df
    except Exception:
        pass

    return None

def process_excel_files():
    print("🔄 Memulai proses membaca file Excel & ODS...\n")
    semua_sekolah = []
    
    file_list = (
        glob.glob(os.path.join(EXCEL_FOLDER, "*.xlsx")) +
        glob.glob(os.path.join(EXCEL_FOLDER, "*.xls")) +
        glob.glob(os.path.join(EXCEL_FOLDER, "*.ods"))
    )
    
    if not file_list:
        print("⚠️ Warning: Belum ada file Excel/ODS di folder 'data_excel'!")
        return

    for file_path in file_list:
        file_name = os.path.basename(file_path)
        kab_name = get_kabupaten_from_filename(file_name)
        total_sekolah_file = 0
        
        try:
            engine = 'odf' if file_path.endswith('.ods') else None
            xls = pd.ExcelFile(file_path, engine=engine)
            
            for sheet_name in xls.sheet_names:
                df = read_sheet_smart(xls, sheet_name)
                
                if df is not None and not df.empty:
                    valid_cols = [c for c in df.columns if str(c).strip() != "" and not str(c).startswith("Unnamed:") and str(c).lower() != "nan"]
                    df = df[valid_cols]
                    
                    kec_name = sheet_name.replace("KEC.", "").replace("Kec.", "").replace("Data Kec", "").replace("Dat Kec", "").strip()
                    if not kec_name:
                        kec_name = "Utama"
                        
                    df['Kecamatan'] = kec_name
                    df['Kabupaten'] = kab_name
                    df['File_Sumber'] = file_name
                    
                    semua_sekolah.append(df)
                    total_sekolah_file += len(df)

            print(f"📖 [{kab_name}] {file_name} -> {total_sekolah_file} sekolah terbaca")

        except Exception as e:
            print(f"❌ Gagal membaca {file_name}: {e}")

    if semua_sekolah:
        df_master = pd.concat(semua_sekolah, ignore_index=True)
        
        clean_cols = [c for c in df_master.columns if str(c).strip() != "" and not str(c).startswith("Unnamed:")]
        df_master = df_master[clean_cols]
        df_master = df_master.loc[:, ~df_master.columns.duplicated()]

        # Clean NPSN (pastikan string/bersih dari spasi)
        if 'NPSN' in df_master.columns:
            df_master['NPSN'] = df_master['NPSN'].astype(str).str.strip().str.replace('.0', '', regex=False)

        # Konversi tipe data angka menggunakan pembersih ribuan 'clean_num'
        num_cols = ['PD', 'Rombel', 'Guru', 'Pegawai', 'R. Kelas', 'R. Lab', 'R. Perpus']
        for col in num_cols:
            if col in df_master.columns:
                df_master[col] = df_master[col].apply(clean_num)

        # 💡 PENGGABUNGAN CERDAS KAN DATA MULTI-FILE BERDASARKAN NPSN:
        # Jika sekolah muncul di file Guru dan file PD, ambil angka terbesar untuk masing-masing kolom.
        agg_rules = {}
        for col in df_master.columns:
            if col == 'NPSN':
                continue
            if col in num_cols:
                agg_rules[col] = 'max'  # Ambil nilai angka terbesar (misal: PD 2367 vs 0 -> ambil 2367)
            else:
                agg_rules[col] = 'first' # Ambil teks/nama sekolah pertama

        df_master = df_master.groupby('NPSN', as_index=False).agg(agg_rules)

        # 💡 KONVERSI TIPE DATETIME / TIMESTAMP KE STRING AGAR SQLITE TIDAK ERROR
        for col in df_master.columns:
            if pd.api.types.is_datetime64_any_dtype(df_master[col]):
                df_master[col] = df_master[col].astype(str)

        df_master = df_master.map(lambda x: str(x) if isinstance(x, pd.Timestamp) else x)

        conn = sqlite3.connect(DB_NAME)
        df_master.to_sql("sekolah", conn, if_exists="replace", index=False)
        conn.close()
        
        print("\n" + "="*60)
        print(f"✅ Selesai! Data tersimpan di database '{DB_NAME}'. Total: {len(df_master)} sekolah unik.")
        print("="*60)
        print("📊 REKAP JUMLAH SEKOLAH PER KABUPATEN / KOTA:")
        print(df_master['Kabupaten'].value_counts())
        print("="*60)

if __name__ == "__main__":
    process_excel_files()