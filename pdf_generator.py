import io
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_rapor(sekolah, rapor_list):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=30, 
        leftMargin=30, 
        topMargin=30, 
        bottomMargin=30
    )
    elements = []
    
    styles = getSampleStyleSheet()
    
    # 1. Header Nama Sekolah
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=4
    )
    elements.append(Paragraph(f"<b>{sekolah['nama_sekolah']}</b>", title_style))
    
    # 2. Metadata Subtitle
    meta_text = f"NPSN: {sekolah['npsn']} | Bentuk: {sekolah['jenis_sekolah']} ({sekolah['status_sekolah']}) | Kec: {sekolah['kecamatan']} | Kab/Kota: {sekolah['kabupaten_kota']}"
    meta_style = ParagraphStyle('MetaStyle', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#64748B'))
    elements.append(Paragraph(meta_text, meta_style))
    elements.append(Spacer(1, 12))
    
    # Style khusus untuk teks di dalam sel tabel (Didefinisikan 1x di luar loop)
    cell_style = ParagraphStyle('CellText', parent=styles['Normal'], fontSize=8, leading=10)
    
    # 3. Table Header & Data
    table_data = [
        ['Kode', 'Nama Indikator', 'Capaian 2025', 'Perubahan \'25', 'Capaian 2026', 'Perubahan \'26']
    ]
    
    for r in rapor_list:
        table_data.append([
            r['kode_indikator'],
            Paragraph(str(r['nama_indikator'] or ''), cell_style),
            r['capaian_2025'] or '-',
            r['perubahan_2025'] or '-',
            r['capaian_2026'] or '-',
            r['perubahan_2026'] or '-'
        ])
        
    # Lebar Kolom Total = 535pt (A4 width 595pt - margin 60pt)
    t = Table(table_data, colWidths=[35, 200, 75, 75, 75, 75])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('ALIGN', (2,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    
    elements.append(t)
    doc.build(elements)
    
    buffer.seek(0)
    return buffer