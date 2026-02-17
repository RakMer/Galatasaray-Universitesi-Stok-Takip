# Galatasaray Üniversitesi Stok Takip Sistemi

Bilgi İşlem departmanı için geliştirilmiş envanter ve stok takip sistemi.

## Özellikler

- ✅ Ekipman ekleme, düzenleme, silme
- ✅ Monitör, klavye, modem ve diğer IT ekipmanları için kategori desteği
- ✅ Ekipman giriş/çıkış takibi
- ✅ Kullanıcı ve lokasyon bazlı takip
- ✅ Arama ve filtreleme
- ✅ Raporlama

## Kurulum

1. Sanal ortam oluştur:
```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
```

2. Bağımlılıkları yükle:
```bash
pip install -r requirements.txt
```

3. Ortam değişkenlerini ayarla:
```bash
cp .env.example .env
```

4. Veritabanını başlat:
```bash
python init_db.py
```

5. Uygulamayı çalıştır:
```bash
python app.py
```

6. Tarayıcıda aç: `http://localhost:5000`

## Kullanım

- Ana sayfadan yeni ekipman ekleyebilirsiniz
- Envanter listesini görüntüleyebilir ve düzenleyebilirsiniz
- Ekipman çıkış/giriş işlemlerini takip edebilirsiniz
