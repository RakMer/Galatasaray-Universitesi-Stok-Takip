from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """Kullanıcı tablosu"""
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    ad_soyad = db.Column(db.String(200))
    rol = db.Column(db.String(20), default='kullanici')  # admin, kullanici
    aktif = db.Column(db.Boolean, default=True)
    olusturma_tarihi = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'ad_soyad': self.ad_soyad,
            'rol': self.rol,
            'aktif': self.aktif,
            'olusturma_tarihi': self.olusturma_tarihi.isoformat() if self.olusturma_tarihi else None
        }


class Ekipman(db.Model):
    """Ekipman/Envanter tablosu"""
    __tablename__ = 'ekipman'
    
    id = db.Column(db.Integer, primary_key=True)
    kategori = db.Column(db.String(50), nullable=False)  # Monitör, Klavye, Modem, vs.
    marka = db.Column(db.String(100))
    model = db.Column(db.String(100))
    seri_no = db.Column(db.String(100), unique=True)
    barkod = db.Column(db.String(100), unique=True)
    durum = db.Column(db.String(50), default='Depoda')  # Depoda, Kullanımda, Arızalı, Hurda
    notlar = db.Column(db.Text)
    temin_tarihi = db.Column(db.DateTime)
    temin_fiyati = db.Column(db.Float)
    tedarikci = db.Column(db.String(200))
    depo_id = db.Column(db.Integer, db.ForeignKey('depo.id'))
    olusturma_tarihi = db.Column(db.DateTime, default=datetime.utcnow)
    guncelleme_tarihi = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    hareketler = db.relationship('EkipmanHareket', backref='ekipman', lazy=True, cascade='all, delete-orphan')
    depo = db.relationship('Depo', backref='ekipmanlar', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'kategori': self.kategori,
            'marka': self.marka,
            'model': self.model,
            'seri_no': self.seri_no,
            'barkod': self.barkod,
            'durum': self.durum,
            'notlar': self.notlar,
            'temin_tarihi': self.temin_tarihi.isoformat() if self.temin_tarihi else None,
            'temin_fiyati': self.temin_fiyati,
            'tedarikci': self.tedarikci,
            'depo_id': self.depo_id,
            'depo_adi': self.depo.ad if self.depo else None,
            'olusturma_tarihi': self.olusturma_tarihi.isoformat() if self.olusturma_tarihi else None,
            'guncelleme_tarihi': self.guncelleme_tarihi.isoformat() if self.guncelleme_tarihi else None
        }


class Depo(db.Model):
    """Depo tablosu"""
    __tablename__ = 'depo'

    id = db.Column(db.Integer, primary_key=True)
    ad = db.Column(db.String(120), unique=True, nullable=False)
    lokasyon = db.Column(db.String(200))
    aciklama = db.Column(db.Text)
    aktif = db.Column(db.Boolean, default=True)
    olusturma_tarihi = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ad': self.ad,
            'lokasyon': self.lokasyon,
            'aciklama': self.aciklama,
            'aktif': self.aktif,
            'olusturma_tarihi': self.olusturma_tarihi.isoformat() if self.olusturma_tarihi else None
        }


class EkipmanHareket(db.Model):
    """Ekipman giriş/çıkış hareketleri tablosu"""
    __tablename__ = 'ekipman_hareket'
    
    id = db.Column(db.Integer, primary_key=True)
    ekipman_id = db.Column(db.Integer, db.ForeignKey('ekipman.id'), nullable=False)
    hareket_tipi = db.Column(db.String(20), nullable=False)  # Giriş, Çıkış, Transfer, İade
    tarih = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Zimmet bilgileri
    kullanici_adi = db.Column(db.String(200))
    kullanici_personel_no = db.Column(db.String(50))
    birim = db.Column(db.String(200))  # Hangi birim/departman
    lokasyon = db.Column(db.String(300))  # Oda/bina bilgisi
    
    # Ek bilgiler
    aciklama = db.Column(db.Text)
    teslim_alan = db.Column(db.String(200))  # İşlemi yapan kişi
    onaylayan = db.Column(db.String(200))  # Onaylayan yönetici
    
    def to_dict(self):
        return {
            'id': self.id,
            'ekipman_id': self.ekipman_id,
            'hareket_tipi': self.hareket_tipi,
            'tarih': self.tarih.isoformat() if self.tarih else None,
            'kullanici_adi': self.kullanici_adi,
            'kullanici_personel_no': self.kullanici_personel_no,
            'birim': self.birim,
            'lokasyon': self.lokasyon,
            'aciklama': self.aciklama,
            'teslim_alan': self.teslim_alan,
            'onaylayan': self.onaylayan
        }


class Kategori(db.Model):
    """Ekipman kategorileri tablosu"""
    __tablename__ = 'kategori'
    
    id = db.Column(db.Integer, primary_key=True)
    ad = db.Column(db.String(100), unique=True, nullable=False)
    aciklama = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'ad': self.ad,
            'aciklama': self.aciklama
        }
