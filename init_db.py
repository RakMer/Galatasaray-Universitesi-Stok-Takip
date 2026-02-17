from models import db, Kategori

def init_kategoriler():
    """Varsayılan kategorileri ekle"""
    kategoriler = [
        {'ad': 'Monitör', 'aciklama': 'LCD, LED monitörler'},
        {'ad': 'Klavye', 'aciklama': 'Klavyeler ve tuş takımları'},
        {'ad': 'Mouse', 'aciklama': 'Fare ve trackball cihazları'},
        {'ad': 'Modem', 'aciklama': 'DSL ve fiber modemler'},
        {'ad': 'Router', 'aciklama': 'Ağ yönlendiricileri'},
        {'ad': 'Switch', 'aciklama': 'Ağ anahtarları'},
        {'ad': 'Bilgisayar', 'aciklama': 'Masaüstü bilgisayarlar'},
        {'ad': 'Laptop', 'aciklama': 'Dizüstü bilgisayarlar'},
        {'ad': 'Yazıcı', 'aciklama': 'Lazer ve mürekkep püskürtmeli yazıcılar'},
        {'ad': 'Tarayıcı', 'aciklama': 'Belge tarayıcıları'},
        {'ad': 'Projeksiyon', 'aciklama': 'Projeksiyon cihazları'},
        {'ad': 'Kamera', 'aciklama': 'Web kameraları ve güvenlik kameraları'},
        {'ad': 'Harici Disk', 'aciklama': 'Harici sabit diskler'},
        {'ad': 'UPS', 'aciklama': 'Kesintisiz güç kaynakları'},
        {'ad': 'Kablo', 'aciklama': 'Ağ ve güç kabloları'},
        {'ad': 'Diğer', 'aciklama': 'Diğer IT ekipmanları'}
    ]
    
    for kat in kategoriler:
        existing = Kategori.query.filter_by(ad=kat['ad']).first()
        if not existing:
            kategori = Kategori(**kat)
            db.session.add(kategori)
    
    db.session.commit()
    print("Kategoriler başarıyla eklendi!")

if __name__ == '__main__':
    from app import app
    with app.app_context():
        db.create_all()
        init_kategoriler()
        print("Veritabanı başarıyla oluşturuldu!")
