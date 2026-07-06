# AI Handoff - Galatasaray Universitesi Stok Takip

## 1) Proje Ozeti
Bu proje, Flask tabanli bir stok/envanter takip uygulamasidir.
Temel amac: Bilgi Islem tarafinda ekipman kaydi, durum takibi, zimmet/hareket takibi, kategori ve depo yonetimi.

Ana ozellikler:
- Kimlik dogrulama (Flask-Login)
- Ekipman CRUD
- Hareket kaydi (Giris, Cikis, Iade, Transfer)
- Kategori yonetimi
- Depo yonetimi ve depolar arasi transfer
- Dashboard istatistikleri
- Excel/PDF export + zimmet belgesi PDF
- Frontend: Vanilla JS + HTML/CSS + Chart.js

## 2) Teknoloji Stack
- Python + Flask
- Flask-SQLAlchemy
- Flask-Login
- Flask-CORS
- SQLite (varsayilan: instance/stok_takip.db)
- OpenPyXL (Excel export)
- ReportLab (PDF export)
- Frontend: templates + static dosyalari

## 3) Onemli Dosyalar
- app.py: Flask uygulamasi, tum route'lar, auth, export fonksiyonlari, schema migration benzeri guvenlik adimi.
- models.py: SQLAlchemy modelleri (User, Ekipman, EkipmanHareket, Kategori, Depo).
- init_db.py: Ilk veritabani olusumu + varsayilan kategoriler.
- templates/index.html: Ana uygulama arayuzu.
- templates/login.html: Giris ekrani.
- static/app.js: Tum istemci tarafi akislar ve API cagrilari.
- static/style.css: Stil.
- README.md: Kurulum dokumani (port bilgisi guncel olmayabilir, asagida not var).
- TOODO.MD: Is listesi (depo/kategori/lokasyon odakli maddeler var).

## 4) Calistirma Notlari
1. Sanal ortam aktif et.
2. Bagimliliklari yukle: pip install -r requirements.txt
3. Veritabani olustur: python init_db.py
4. Uygulamayi baslat: python app.py

Dikkat:
- app.py uygulamayi 5001 portunda kaldiriyor.
- README.md 5000 portuna yonlendiriyor.
- Dogru adres su an: http://localhost:5001

## 5) Auth ve Varsayilan Kullanici
- Uygulama acilisinda varsayilan admin otomatik olusturulur (yoksa):
  - kullanici adi: admin
  - sifre: admin
- API route'larinin cogu login_required ile korunuyor.
- Kullanici yetkisi (rol=admin) gereken endpoint'ler var (kullanici yonetimi gibi).

## 6) Veri Modeli (Kisa)
- User: username, password_hash, rol, aktif
- Ekipman: kategori, marka, model, seri_no, barkod, durum, temin bilgileri, depo_id
- EkipmanHareket: ekipman_id, hareket_tipi, kullanici/birim/lokasyon/aciklama/onay
- Kategori: ad, aciklama
- Depo: ad, lokasyon, aciklama, aktif

Not:
- app.py icindeki ensure_schema_updates() fonksiyonu, eski DB'lerde eksik olabilecek depo tablosu ve ekipman.depo_id kolonunu tamamlamayi hedefliyor.

## 7) API Yapisinin Ozet Haritasi
Auth/Kullanici:
- POST/GET /login
- GET /logout
- GET /api/kullanici/bilgi
- GET/POST /api/kullanicilar (admin)
- DELETE /api/kullanicilar/<id> (admin)
- POST /api/sifre-degistir

Kategori:
- GET /api/kategoriler
- POST /api/kategoriler
- DELETE /api/kategoriler/<id>

Ekipman:
- GET /api/ekipman (filtreler var)
- GET /api/ekipman/<id>
- POST /api/ekipman
- PUT /api/ekipman/<id>
- DELETE /api/ekipman/<id>
- PUT /api/ekipman/toplu-durum
- DELETE /api/ekipman/toplu-sil

Hareket:
- GET /api/hareket
- POST /api/hareket

Depo:
- GET /api/depolar
- POST /api/depolar
- DELETE /api/depolar/<id>
- POST /api/depolar/transfer

Rapor/Export:
- GET /api/istatistikler
- GET /api/export/excel
- GET /api/export/pdf
- GET /api/zimmet-belgesi/<hareket_id>

## 8) Frontend Akisi (static/app.js)
- DOMContentLoaded -> initApp()
- initApp sirasiyla su verileri ceker:
  - mevcut kullanici
  - depolar
  - kategoriler
  - istatistikler
  - ekipmanlar
  - hareketler
- Sekmeli arayuz var: dashboard, ekipman, ekle, hareketler, depolar, kategoriler, kullanicilar
- Kategori seciminde searchable dropdown + benzerlik onerisi (Levenshtein tabanli) uygulanmis.

## 9) Bilinen Tutarsizliklar ve Riskler
- Port tutarsizligi:
  - README 5000 derken app.py 5001 kullaniyor.
- Dokuman tutarsizligi:
  - DEGISIKLIKLER.md icinde bazi maddeler birbiriyle celisiyor (ozellik hem yapildi hem yapilmadi gibi).
- Guvenlik:
  - Varsayilan admin sifresi sabit (admin/admin), uretim icin mutlaka degistirilmeli.
- DB migration:
  - Tam migration araci yok; ensure_schema_updates() kismi/manuel uyumluluk sagliyor.

## 10) Sonraki AI/Developer icin Oncelikli Isler
1. README port bilgisini app.py ile hizala (5001 veya config tabanli hale getir).
2. Varsayilan admin sifresini zorunlu degistirme akisi ekle.
3. DEGISIKLIKLER.md ve TOODO.MD dosyalarini gercek durumla senkronize et.
4. Basit migration stratejisi ekle (Alembic onerilir).
5. Kritik endpoint'ler icin test ekle:
   - auth akisi
   - ekipman CRUD
   - depo transfer
   - export endpoint'leri

## 11) Hizli Dogrulama Checklist'i
- Giris yapilabiliyor mu? (/login)
- Dashboard istatistikleri geliyor mu?
- Yeni ekipman ekleme + listede gorunme calisiyor mu?
- Hareket eklenince ekipman durumu dogru guncelleniyor mu?
- Depolar arasi transfer hareket kaydi uretiyor mu?
- Excel/PDF export dosyalari indirilebiliyor mu?
- Zimmet belgesi PDF olusuyor mu?

## 12) Operasyonel Notlar
- Veritabani dosyasi instance/ altinda.
- Uygulama debug modda calisiyor.
- CORS /api/* icin acik.
- Uretime geciste SECRET_KEY, debug, CORS ve varsayilan kullanici politikalari sertlestirilmeli.

---
Bu dosya bir sonraki AI ajanin hizli onboarding'i icin hazirlandi.
