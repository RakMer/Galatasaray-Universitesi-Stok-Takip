// API Base URL
const API_URL = '/api';

// State
let kategoriler = [];
let ekipmanlar = [];
let hareketler = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

// Initialize App
async function initApp() {
    await loadKategoriler();
    populateKategoriSelects();
    await loadIstatistikler();
    await loadEkipmanlar();
    await loadHareketler();
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab; 
            switchTab(tabName);
        });
    });

    // Forms
    document.getElementById('ekipman-form').addEventListener('submit', handleEkipmanSubmit);
    document.getElementById('hareket-form').addEventListener('submit', handleHareketSubmit);

    // Filters
    document.getElementById('search-input').addEventListener('input', filterEkipman);
    document.getElementById('kategori-filter').addEventListener('change', filterEkipman);
    document.getElementById('durum-filter').addEventListener('change', filterEkipman);

    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });
}

// Tab Switching
function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Refresh data if needed
    if (tabName === 'dashboard') {
        loadIstatistikler();
    } else if (tabName === 'ekipman') {
        loadEkipmanlar();
    } else if (tabName === 'hareketler') {
        loadHareketler();
    }
}

// Load Kategoriler
async function loadKategoriler() {
    try {
        console.log('Kategoriler yükleniyor...');
        const response = await fetch(`${API_URL}/kategoriler`);
        console.log('API Response status:', response.status);
        kategoriler = await response.json();
        console.log('Yüklenen kategoriler:', kategoriler);
    } catch (error) {
        console.error('Kategoriler yüklenemedi:', error);
        showAlert('Kategoriler yüklenemedi!', 'error');
    }
}

// Populate Kategori Selects
function populateKategoriSelects() {
    console.log('populateKategoriSelects çağrıldı, kategoriler:', kategoriler);
    
    // Normal select için (filter dropdown)
    const filterSelect = document.getElementById('kategori-filter');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Tüm Kategoriler</option>';
        kategoriler.forEach(kat => {
            const option = document.createElement('option');
            option.value = kat.ad;
            option.textContent = kat.ad;
            filterSelect.appendChild(option);
        });
        console.log('Filter select dolduruldu:', filterSelect.options.length);
    }
    
    // Searchable dropdown için
    setupSearchableDropdown();
}

// Setup Searchable Dropdown
function setupSearchableDropdown() {
    const input = document.getElementById('kategori');
    const list = document.getElementById('kategori-list');
    
    if (!input || !list) {
        console.error('Dropdown elementleri bulunamadı');
        return;
    }
    
    console.log('Searchable dropdown kuruluyor...');
    
    // Levenshtein Distance - benzerlik hesaplama
    function levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = [];
        
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[len1][len2];
    }
    
    // Benzerlik yüzdesi hesapla
    function similarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        const longerLength = longer.length;
        if (longerLength === 0) return 1.0;
        return (longerLength - levenshteinDistance(longer, shorter)) / longerLength;
    }
    
    // En benzer kategoriyi bul
    function findSimilarCategory(inputValue) {
        if (!inputValue || inputValue.length < 2) return null;
        
        const inputLower = inputValue.toLowerCase();
        let bestMatch = null;
        let bestScore = 0;
        
        kategoriler.forEach(kat => {
            const score = similarity(inputLower, kat.ad.toLowerCase());
            if (score > bestScore && score < 1.0) { // Tam eşleşme değilse
                bestScore = score;
                bestMatch = kat.ad;
            }
        });
        
        // %70'den fazla benzerlik varsa öner
        return bestScore >= 0.7 ? { name: bestMatch, score: bestScore } : null;
    }
    
    // Listeyi doldur
    function populateList(filter = '') {
        list.innerHTML = '';
        const filtered = kategoriler.filter(kat => 
            kat.ad.toLowerCase().includes(filter.toLowerCase())
        );
        
        filtered.forEach(kat => {
            const div = document.createElement('div');
            div.textContent = kat.ad;
            div.onclick = () => {
                input.value = kat.ad;
                list.classList.remove('show');
            };
            list.appendChild(div);
        });
        
        // Eğer filtrelenmiş sonuç yoksa ve benzer kategori varsa öner
        if (filtered.length === 0 && filter.length >= 2) {
            const similar = findSimilarCategory(filter);
            if (similar) {
                const suggestionDiv = document.createElement('div');
                suggestionDiv.style.background = '#fff3cd';
                suggestionDiv.style.borderLeft = '3px solid #ffc107';
                suggestionDiv.innerHTML = `
                    <div style="font-weight: 500; color: #856404;">
                        <span style="font-size: 0.9em;">💡 Şunu mu demek istediniz?</span>
                    </div>
                    <div style="font-size: 1.1em; margin-top: 0.3rem; color: #000;">
                        ${similar.name}
                    </div>
                `;
                suggestionDiv.onclick = () => {
                    input.value = similar.name;
                    list.classList.remove('show');
                };
                list.appendChild(suggestionDiv);
                
                // "Yine de yeni ekle" seçeneği
                const newDiv = document.createElement('div');
                newDiv.style.borderTop = '1px solid #ddd';
                newDiv.style.fontWeight = '500';
                newDiv.innerHTML = `➕ Yeni kategori: "${filter}"`;
                newDiv.onclick = () => {
                    list.classList.remove('show');
                };
                list.appendChild(newDiv);
            }
        }
        
        console.log('Liste dolduruldu:', filtered.length, 'item');
    }
    
    // İlk yükleme
    populateList();
    
    // Input focus - listeyi aç
    input.addEventListener('focus', () => {
        console.log('Input focus');
        populateList(input.value);
        list.classList.add('show');
    });
    
    // Input değişikliği - filtrele
    input.addEventListener('input', () => {
        console.log('Input değişti:', input.value);
        populateList(input.value);
        list.classList.add('show');
    });
    
    // Dışarı tıklama - kapat
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.searchable-dropdown')) {
            list.classList.remove('show');
        }
    });
}

// Load İstatistikler
async function loadIstatistikler() {
    try {
        const response = await fetch(`${API_URL}/istatistikler`);
        const data = await response.json();

        document.getElementById('stat-toplam').textContent = data.toplam_ekipman;
        document.getElementById('stat-depoda').textContent = data.depodaki;
        document.getElementById('stat-kullanimda').textContent = data.kullanimda;
        document.getElementById('stat-arizali').textContent = data.arizali;

        // Kategori dağılımı
        const dagilimDiv = document.getElementById('kategori-dagilim');
        dagilimDiv.innerHTML = '';

        Object.entries(data.kategori_dagilim).forEach(([kategori, adet]) => {
            const item = document.createElement('div');
            item.className = 'kategori-item';
            item.innerHTML = `
                <span>${kategori}</span>
                <span>${adet}</span>
            `;
            dagilimDiv.appendChild(item);
        });
    } catch (error) {
        console.error('İstatistikler yüklenemedi:', error);
    }
}

// Load Ekipmanlar
async function loadEkipmanlar(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_URL}/ekipman?${params}`);
        ekipmanlar = await response.json();
        displayEkipmanlar();
    } catch (error) {
        console.error('Ekipmanlar yüklenemedi:', error);
        showAlert('Ekipmanlar yüklenemedi!', 'error');
    }
}

// Display Ekipmanlar
function displayEkipmanlar() {
    const tbody = document.getElementById('ekipman-tbody');
    
    if (ekipmanlar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Ekipman bulunamadı.</td></tr>';
        return;
    }

    tbody.innerHTML = ekipmanlar.map(ekipman => `
        <tr>
            <td>${ekipman.id}</td>
            <td>${ekipman.kategori}</td>
            <td>${ekipman.marka || '-'}</td>
            <td>${ekipman.model || '-'}</td>
            <td>${ekipman.seri_no || '-'}</td>
            <td><span class="status-badge status-${ekipman.durum.toLowerCase().replace('ı', 'i')}">${ekipman.durum}</span></td>
            <td>
                <button class="btn btn-info btn-small" onclick="showEkipmanDetail(${ekipman.id})">Detay</button>
                <button class="btn btn-small btn-secondary" onclick="editEkipman(${ekipman.id})">Düzenle</button>
                <button class="btn btn-danger btn-small" onclick="deleteEkipman(${ekipman.id})">Sil</button>
            </td>
        </tr>
    `).join('');
}

// Filter Ekipman
function filterEkipman() {
    const search = document.getElementById('search-input').value;
    const kategori = document.getElementById('kategori-filter').value;
    const durum = document.getElementById('durum-filter').value;

    const filters = {};
    if (search) filters.arama = search;
    if (kategori) filters.kategori = kategori;
    if (durum) filters.durum = durum;

    loadEkipmanlar(filters);
}

// Handle Ekipman Submit
async function handleEkipmanSubmit(e) {
    e.preventDefault();

    const formData = {
        kategori: document.getElementById('kategori').value,
        marka: document.getElementById('marka').value,
        model: document.getElementById('model').value,
        seri_no: document.getElementById('seri_no').value,
        durum: document.getElementById('durum').value,
        temin_tarihi: document.getElementById('temin_tarihi').value || null,
        temin_fiyati: parseFloat(document.getElementById('temin_fiyati').value) || null,
        tedarikci: document.getElementById('tedarikci').value,
        notlar: document.getElementById('notlar').value
    };

    try {
        const response = await fetch(`${API_URL}/ekipman`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Ekipman başarıyla eklendi!', 'success');
            document.getElementById('ekipman-form').reset();
            
            // Kategori listesini yeniden yükle
            await loadKategoriler();
            populateKategoriSelects();
            
            await loadEkipmanlar();
            await loadIstatistikler();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ekipman eklenemedi:', error);
        showAlert('Ekipman eklenirken bir hata oluştu!', 'error');
    }
}

// Show Ekipman Detail
async function showEkipmanDetail(id) {
    try {
        const response = await fetch(`${API_URL}/ekipman/${id}`);
        const ekipman = await response.json();

        // Get hareketler for this ekipman
        const hareketResponse = await fetch(`${API_URL}/hareket?ekipman_id=${id}`);
        const ekipmanHareketler = await hareketResponse.json();

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h4>Ekipman Bilgileri</h4>
                <table style="width: 100%; margin-top: 1rem;">
                    <tr><td><strong>ID:</strong></td><td>${ekipman.id}</td></tr>
                    <tr><td><strong>Kategori:</strong></td><td>${ekipman.kategori}</td></tr>
                    <tr><td><strong>Marka:</strong></td><td>${ekipman.marka || '-'}</td></tr>
                    <tr><td><strong>Model:</strong></td><td>${ekipman.model || '-'}</td></tr>
                    <tr><td><strong>Seri No:</strong></td><td>${ekipman.seri_no || '-'}</td></tr>
                    <tr><td><strong>Durum:</strong></td><td><span class="status-badge status-${ekipman.durum.toLowerCase().replace('ı', 'i')}">${ekipman.durum}</span></td></tr>
                    <tr><td><strong>Temin Tarihi:</strong></td><td>${ekipman.temin_tarihi ? new Date(ekipman.temin_tarihi).toLocaleDateString('tr-TR') : '-'}</td></tr>
                    <tr><td><strong>Temin Fiyatı:</strong></td><td>${ekipman.temin_fiyati ? ekipman.temin_fiyati + ' ₺' : '-'}</td></tr>
                    <tr><td><strong>Tedarikçi:</strong></td><td>${ekipman.tedarikci || '-'}</td></tr>
                    <tr><td><strong>Notlar:</strong></td><td>${ekipman.notlar || '-'}</td></tr>
                </table>
            </div>
            
            <div>
                <h4>Hareket Geçmişi</h4>
                ${ekipmanHareketler.length > 0 ? `
                    <table style="width: 100%; margin-top: 1rem;">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Tip</th>
                                <th>Kullanıcı</th>
                                <th>Lokasyon</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ekipmanHareketler.map(h => `
                                <tr>
                                    <td>${new Date(h.tarih).toLocaleString('tr-TR')}</td>
                                    <td>${h.hareket_tipi}</td>
                                    <td>${h.kullanici_adi || '-'}</td>
                                    <td>${h.lokasyon || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="margin-top: 1rem; color: #999;">Henüz hareket kaydı yok.</p>'}
            </div>
        `;

        document.getElementById('modal-title').textContent = `Ekipman Detayı - ${ekipman.kategori} #${ekipman.id}`;
        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        console.error('Detay yüklenemedi:', error);
        showAlert('Detay yüklenirken hata oluştu!', 'error');
    }
}

// Edit Ekipman (Simplified version - opens modal with edit form)
function editEkipman(id) {
    showAlert('Düzenleme özelliği yakında eklenecek!', 'info');
}

// Delete Ekipman
async function deleteEkipman(id) {
    if (!confirm('Bu ekipmanı silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/ekipman/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Ekipman başarıyla silindi!', 'success');
            await loadEkipmanlar();
            await loadIstatistikler();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ekipman silinemedi:', error);
        showAlert('Ekipman silinirken bir hata oluştu!', 'error');
    }
}

// Load Hareketler
async function loadHareketler() {
    try {
        const response = await fetch(`${API_URL}/hareket`);
        hareketler = await response.json();
        displayHareketler();
    } catch (error) {
        console.error('Hareketler yüklenemedi:', error);
    }
}

// Display Hareketler
function displayHareketler() {
    const tbody = document.getElementById('hareketler-tbody');
    
    if (hareketler.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Hareket kaydı bulunamadı.</td></tr>';
        return;
    }

    tbody.innerHTML = hareketler.slice(0, 50).map(hareket => `
        <tr>
            <td>${new Date(hareket.tarih).toLocaleString('tr-TR')}</td>
            <td>${hareket.ekipman_id}</td>
            <td>${hareket.hareket_tipi}</td>
            <td>${hareket.kullanici_adi || '-'}</td>
            <td>${hareket.birim || '-'}</td>
            <td>${hareket.lokasyon || '-'}</td>
        </tr>
    `).join('');
}

// Handle Hareket Submit
async function handleHareketSubmit(e) {
    e.preventDefault();

    const formData = {
        ekipman_id: parseInt(document.getElementById('hareket-ekipman-id').value),
        hareket_tipi: document.getElementById('hareket-tipi').value,
        kullanici_adi: document.getElementById('kullanici-adi').value,
        kullanici_personel_no: document.getElementById('personel-no').value,
        birim: document.getElementById('birim').value,
        lokasyon: document.getElementById('lokasyon').value,
        teslim_alan: document.getElementById('teslim-alan').value,
        onaylayan: document.getElementById('onaylayan').value,
        aciklama: document.getElementById('hareket-aciklama').value
    };

    try {
        const response = await fetch(`${API_URL}/hareket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Hareket başarıyla kaydedildi!', 'success');
            document.getElementById('hareket-form').reset();
            await loadHareketler();
            await loadEkipmanlar();
            await loadIstatistikler();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Hareket kaydedilemedi:', error);
        showAlert('Hareket kaydedilirken bir hata oluştu!', 'error');
    }
}

// Modal Functions
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Alert Function
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const main = document.querySelector('main');
    main.insertBefore(alertDiv, main.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}
