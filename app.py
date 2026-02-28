from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from models import db, Ekipman, EkipmanHareket, Kategori
from datetime import datetime
import os
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Türkçe karakter desteği için Arial Unicode font kaydı
_ARIAL_UNICODE = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
pdfmetrics.registerFont(TTFont('ArialUnicode', _ARIAL_UNICODE))

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///stok_takip.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Ana sayfa
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test')
def test():
    return render_template('test.html')

# Kategori endpoints
@app.route('/api/kategoriler', methods=['GET'])
def get_kategoriler():
    """Tüm kategorileri getir"""
    kategoriler = Kategori.query.all()
    return jsonify([k.to_dict() for k in kategoriler])

@app.route('/api/kategoriler', methods=['POST'])
def add_kategori():
    """Yeni kategori ekle"""
    data = request.json
    try:
        ad = data.get('ad', '').strip()
        if not ad:
            return jsonify({'success': False, 'error': 'Kategori adı boş olamaz.'}), 400
        
        if Kategori.query.filter_by(ad=ad).first():
            return jsonify({'success': False, 'error': f'"{ad}" kategorisi zaten mevcut.'}), 400
        
        kategori = Kategori(ad=ad, aciklama=data.get('aciklama', ''))
        db.session.add(kategori)
        db.session.commit()
        return jsonify({'success': True, 'data': kategori.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/kategoriler/<int:id>', methods=['DELETE'])
def delete_kategori(id):
    """Kategori sil"""
    try:
        kategori = Kategori.query.get_or_404(id)
        
        # Bu kategoride ekipman var mı kontrol et
        ekipman_sayisi = Ekipman.query.filter_by(kategori=kategori.ad).count()
        if ekipman_sayisi > 0:
            return jsonify({
                'success': False, 
                'error': f'Bu kategoride {ekipman_sayisi} adet ekipman var. Önce ekipmanları silin veya başka kategoriye taşıyın.'
            }), 400
        
        kategori_adi = kategori.ad
        db.session.delete(kategori)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'"{kategori_adi}" kategorisi silindi.'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# Ekipman endpoints
@app.route('/api/ekipman', methods=['GET'])
def get_ekipman():
    """Tüm ekipmanları getir (filtreleme destekli)"""
    kategori = request.args.get('kategori')
    durum = request.args.get('durum')
    arama = request.args.get('arama')
    
    query = Ekipman.query
    
    if kategori:
        query = query.filter_by(kategori=kategori)
    if durum:
        query = query.filter_by(durum=durum)
    if arama:
        search_pattern = f'%{arama}%'
        query = query.filter(
            db.or_(
                Ekipman.marka.like(search_pattern),
                Ekipman.model.like(search_pattern),
                Ekipman.seri_no.like(search_pattern),
                Ekipman.barkod.like(search_pattern)
            )
        )
    
    ekipmanlar = query.order_by(Ekipman.olusturma_tarihi.desc()).all()
    return jsonify([e.to_dict() for e in ekipmanlar])

@app.route('/api/ekipman/<int:id>', methods=['GET'])
def get_ekipman_detay(id):
    """Belirli bir ekipmanın detaylarını getir"""
    ekipman = Ekipman.query.get_or_404(id)
    return jsonify(ekipman.to_dict())

@app.route('/api/ekipman', methods=['POST'])
def ekipman_ekle():
    """Yeni ekipman ekle"""
    data = request.json
    
    try:
        # Kategori kontrolü - eğer veritabanında yoksa ekle
        kategori_adi = data['kategori']
        kategori = Kategori.query.filter_by(ad=kategori_adi).first()
        
        if not kategori:
            # Yeni kategori oluştur
            yeni_kategori = Kategori(ad=kategori_adi, aciklama='Kullanıcı tanımlı')
            db.session.add(yeni_kategori)
            db.session.commit()
            print(f"Yeni kategori eklendi: {kategori_adi}")
        
        # Tarih dönüşümü
        temin_tarihi = None
        if data.get('temin_tarihi'):
            temin_tarihi = datetime.fromisoformat(data['temin_tarihi'].replace('Z', '+00:00'))
        
        ekipman = Ekipman(
            kategori=data['kategori'],
            marka=data.get('marka'),
            model=data.get('model'),
            seri_no=data.get('seri_no'),
            barkod=data.get('barkod'),
            durum=data.get('durum', 'Depoda'),
            notlar=data.get('notlar'),
            temin_tarihi=temin_tarihi,
            temin_fiyati=data.get('temin_fiyati'),
            tedarikci=data.get('tedarikci')
        )
        
        db.session.add(ekipman)
        db.session.commit()
        
        return jsonify({'success': True, 'id': ekipman.id, 'data': ekipman.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/ekipman/<int:id>', methods=['PUT'])
def ekipman_guncelle(id):
    """Ekipman bilgilerini güncelle"""
    ekipman = Ekipman.query.get_or_404(id)
    data = request.json
    
    try:
        if 'kategori' in data:
            ekipman.kategori = data['kategori']
        if 'marka' in data:
            ekipman.marka = data['marka']
        if 'model' in data:
            ekipman.model = data['model']
        if 'seri_no' in data:
            ekipman.seri_no = data['seri_no']
        if 'barkod' in data:
            ekipman.barkod = data['barkod']
        if 'durum' in data:
            ekipman.durum = data['durum']
        if 'notlar' in data:
            ekipman.notlar = data['notlar']
        if 'temin_tarihi' in data and data['temin_tarihi']:
            ekipman.temin_tarihi = datetime.fromisoformat(data['temin_tarihi'].replace('Z', '+00:00'))
        if 'temin_fiyati' in data:
            ekipman.temin_fiyati = data['temin_fiyati']
        if 'tedarikci' in data:
            ekipman.tedarikci = data['tedarikci']
        
        db.session.commit()
        return jsonify({'success': True, 'data': ekipman.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/ekipman/<int:id>', methods=['DELETE'])
def ekipman_sil(id):
    """Ekipman sil"""
    ekipman = Ekipman.query.get_or_404(id)
    
    try:
        db.session.delete(ekipman)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Ekipman başarıyla silindi'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# Hareket endpoints
@app.route('/api/hareket', methods=['GET'])
def get_hareketler():
    """Tüm hareketleri getir"""
    ekipman_id = request.args.get('ekipman_id', type=int)
    
    query = EkipmanHareket.query
    if ekipman_id:
        query = query.filter_by(ekipman_id=ekipman_id)
    
    hareketler = query.order_by(EkipmanHareket.tarih.desc()).all()
    return jsonify([h.to_dict() for h in hareketler])

@app.route('/api/hareket', methods=['POST'])
def hareket_ekle():
    """Yeni hareket ekle (giriş/çıkış)"""
    data = request.json
    
    try:
        hareket = EkipmanHareket(
            ekipman_id=data['ekipman_id'],
            hareket_tipi=data['hareket_tipi'],
            kullanici_adi=data.get('kullanici_adi'),
            kullanici_personel_no=data.get('kullanici_personel_no'),
            birim=data.get('birim'),
            lokasyon=data.get('lokasyon'),
            aciklama=data.get('aciklama'),
            teslim_alan=data.get('teslim_alan'),
            onaylayan=data.get('onaylayan')
        )
        
        # Ekipman durumunu güncelle
        ekipman = Ekipman.query.get(data['ekipman_id'])
        if hareket.hareket_tipi == 'Çıkış':
            ekipman.durum = 'Kullanımda'
        elif hareket.hareket_tipi == 'İade':
            ekipman.durum = 'Depoda'
        
        db.session.add(hareket)
        db.session.commit()
        
        return jsonify({'success': True, 'id': hareket.id, 'data': hareket.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# İstatistik endpoints
@app.route('/api/istatistikler', methods=['GET'])
def get_istatistikler():
    """Genel istatistikleri getir"""
    toplam_ekipman = Ekipman.query.count()
    depodaki = Ekipman.query.filter_by(durum='Depoda').count()
    kullanimda = Ekipman.query.filter_by(durum='Kullanımda').count()
    arizali = Ekipman.query.filter_by(durum='Arızalı').count()
    
    # Kategoriye göre dağılım
    kategori_dagilim = db.session.query(
        Ekipman.kategori, 
        db.func.count(Ekipman.id)
    ).group_by(Ekipman.kategori).all()
    
    return jsonify({
        'toplam_ekipman': toplam_ekipman,
        'depodaki': depodaki,
        'kullanimda': kullanimda,
        'arizali': arizali,
        'kategori_dagilim': {k: v for k, v in kategori_dagilim}
    })

@app.route('/api/export/excel')
def export_excel():
    """Envanteri Excel olarak dışa aktar"""
    ekipmanlar = Ekipman.query.order_by(Ekipman.id).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Envanter"

    # Başlık satırı stilleri
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="8B0000", end_color="8B0000", fill_type="solid")
    header_align = Alignment(horizontal="center", vertical="center")

    headers = ["ID", "Kategori", "Marka", "Model", "Seri No", "Durum",
               "Temin Tarihi", "Temin Fiyatı (₺)", "Tedarikçi", "Notlar", "Eklenme Tarihi"]
    col_widths = [6, 15, 15, 20, 20, 12, 15, 18, 20, 30, 20]

    for col_idx, (header, width) in enumerate(zip(headers, col_widths), start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        ws.column_dimensions[cell.column_letter].width = width

    ws.row_dimensions[1].height = 25

    # Durum renk kodları
    durum_renk = {
        "Depoda":     "D4EDDA",
        "Kullanımda": "CCE5FF",
        "Arızalı":    "FFF3CD",
        "Hurda":      "F8D7DA",
    }

    for row_idx, e in enumerate(ekipmanlar, start=2):
        row_data = [
            e.id, e.kategori, e.marka or '', e.model or '',
            e.seri_no or '', e.durum,
            e.temin_tarihi.strftime('%d.%m.%Y') if e.temin_tarihi else '',
            e.temin_fiyati or '',
            e.tedarikci or '', e.notlar or '',
            e.olusturma_tarihi.strftime('%d.%m.%Y') if e.olusturma_tarihi else ''
        ]
        for col_idx, value in enumerate(row_data, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.alignment = Alignment(vertical="center")
            if col_idx == 6:  # Durum sütunu renklendir
                renk = durum_renk.get(e.durum, "FFFFFF")
                cell.fill = PatternFill(start_color=renk, end_color=renk, fill_type="solid")
        if row_idx % 2 == 0:
            for col_idx in range(1, len(headers) + 1):
                cell = ws.cell(row=row_idx, column=col_idx)
                if col_idx != 6:
                    cell.fill = PatternFill(start_color="F9F9F9", end_color="F9F9F9", fill_type="solid")

    # Dondur
    ws.freeze_panes = "A2"

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    tarih = datetime.now().strftime('%Y%m%d_%H%M')
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'envanter_{tarih}.xlsx'
    )


@app.route('/api/export/pdf')
def export_pdf():
    """Envanteri PDF olarak dışa aktar"""
    ekipmanlar = Ekipman.query.order_by(Ekipman.id).all()

    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(A4),
                            leftMargin=1*cm, rightMargin=1*cm,
                            topMargin=1.5*cm, bottomMargin=1.5*cm)

    styles = getSampleStyleSheet()
    elements = []

    # Başlık
    title_style = ParagraphStyle('title', parent=styles['Title'],
                                  fontName='ArialUnicode',
                                  fontSize=14, textColor=colors.HexColor('#8B0000'),
                                  spaceAfter=6)
    sub_style = ParagraphStyle('sub', parent=styles['Normal'],
                                fontName='ArialUnicode',
                                fontSize=9, textColor=colors.grey, spaceAfter=12)

    elements.append(Paragraph('Galatasaray Üniversitesi - Bilgi İşlem', title_style))
    elements.append(Paragraph(f'Envanter Listesi  |  {datetime.now().strftime("%d.%m.%Y %H:%M")}  |  Toplam: {len(ekipmanlar)} ekipman', sub_style))

    # Tablo verisi
    table_data = [['ID', 'Kategori', 'Marka', 'Model', 'Seri No', 'Durum', 'Temin Tarihi', 'Fiyat (₺)']]
    for e in ekipmanlar:
        table_data.append([
            str(e.id),
            e.kategori or '',
            e.marka or '',
            e.model or '',
            e.seri_no or '',
            e.durum or '',
            e.temin_tarihi.strftime('%d.%m.%Y') if e.temin_tarihi else '',
            f'{e.temin_fiyati:,.0f}' if e.temin_fiyati else ''
        ])

    col_widths_pdf = [1.2*cm, 3.5*cm, 3*cm, 4*cm, 4*cm, 2.8*cm, 3*cm, 2.5*cm]

    tbl = Table(table_data, colWidths=col_widths_pdf, repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',     (0, 0), (-1, 0),  colors.HexColor('#8B0000')),
        ('TEXTCOLOR',      (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',       (0, 0), (-1, -1), 'ArialUnicode'),
        ('FONTSIZE',       (0, 0), (-1, 0),  9),
        ('FONTSIZE',       (0, 1), (-1, -1), 8),
        ('ALIGN',          (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',         (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FFF8F8')]),
        ('GRID',           (0, 0), (-1, -1), 0.4, colors.HexColor('#DDDDDD')),
        ('ROWHEIGHT',      (0, 0), (-1, -1), 18),
    ]))
    elements.append(tbl)

    doc.build(elements)
    output.seek(0)

    tarih = datetime.now().strftime('%Y%m%d_%H%M')
    return send_file(
        output,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'envanter_{tarih}.pdf'
    )


if __name__ == '__main__':
    app.run(debug=True, port=5000)
