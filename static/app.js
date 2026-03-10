// API Base URL
const API_URL = '/api';

// State
let kategoriler = [];
let ekipmanlar = [];
let hareketler = [];
let currentUser = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

// Initialize App
async function initApp() {
    await loadCurrentUser();
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
    document.getElementById('kategori-form').addEventListener('submit', handleKategoriSubmit);

    // Filters
    document.getElementById('search-input').addEventListener('input', filterEkipman);
    document.getElementById('kategori-filter').addEventListener('change', filterEkipman);
    document.getElementById('durum-filter').addEventListener('change', filterEkipman);

    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });

    // Select All Checkbox
    const selectAll = document.getElementById('select-all');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.ekipman-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
            });
            updateBulkBar();
        });
    }

    // Advanced Filter Toggle
    const toggleBtn = document.getElementById('toggle-advanced-filter');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const panel = document.getElementById('advanced-filters');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            toggleBtn.classList.toggle('active');
        });
    }

    // Advanced filter inputs - trigger on Enter
    ['tedarikci-filter', 'fiyat-min-filter', 'fiyat-max-filter', 'tarih-min-filter', 'tarih-max-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', filterEkipman);
    });

    // Sortable column headers
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (currentSort.column === col) {
                currentSort.asc = !currentSort.asc;
            } else {
                currentSort.column = col;
                currentSort.asc = true;
            }
            displayEkipmanlar();
        });
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
    } else if (tabName === 'kategoriler') {
        loadKategorilerTab();
    } else if (tabName === 'kullanicilar') {
        loadKullanicilar();
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
let chartDurum = null;
let chartKategori = null;

async function loadIstatistikler() {
    try {
        const response = await fetch(`${API_URL}/istatistikler`);
        const data = await response.json();

        document.getElementById('stat-toplam').textContent = data.toplam_ekipman;
        document.getElementById('stat-depoda').textContent = data.depodaki;
        document.getElementById('stat-kullanimda').textContent = data.kullanimda;
        document.getElementById('stat-arizali').textContent = data.arizali;

        // Kategori dağılımı liste
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

        // --- CHART.JS GRAFİKLER ---
        renderCharts(data);
    } catch (error) {
        console.error('İstatistikler yüklenemedi:', error);
    }
}

function renderCharts(data) {
    // Durum Dağılımı - Doughnut
    const durumCtx = document.getElementById('chart-durum');
    if (durumCtx) {
        if (chartDurum) chartDurum.destroy();

        const durumLabels = ['Depoda', 'Kullanımda', 'Arızalı'];
        const durumValues = [data.depodaki, data.kullanimda, data.arizali];
        const hurda = data.toplam_ekipman - data.depodaki - data.kullanimda - data.arizali;
        if (hurda > 0) {
            durumLabels.push('Hurda');
            durumValues.push(hurda);
        }

        chartDurum = new Chart(durumCtx, {
            type: 'doughnut',
            data: {
                labels: durumLabels,
                datasets: [{
                    data: durumValues,
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#9ca3af'],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 16,
                            usePointStyle: true,
                            pointStyleWidth: 12,
                            font: { family: 'Inter', size: 12 }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // Kategori Dağılımı - Bar
    const katCtx = document.getElementById('chart-kategori');
    if (katCtx) {
        if (chartKategori) chartKategori.destroy();

        const entries = Object.entries(data.kategori_dagilim).sort((a, b) => b[1] - a[1]);
        const katLabels = entries.map(e => e[0]);
        const katValues = entries.map(e => e[1]);

        // Renk paleti
        const palette = [
            '#8B0000', '#B22222', '#DC143C', '#E74C3C', '#FF6B6B',
            '#FFD700', '#FFA500', '#FF8C00', '#3b82f6', '#10b981',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
            '#84cc16'
        ];
        const bgColors = katLabels.map((_, i) => palette[i % palette.length]);

        chartKategori = new Chart(katCtx, {
            type: 'bar',
            data: {
                labels: katLabels,
                datasets: [{
                    label: 'Ekipman Sayısı',
                    data: katValues,
                    backgroundColor: bgColors.map(c => c + 'CC'),
                    borderColor: bgColors,
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: katLabels.length > 8 ? 'y' : 'x',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Inter', size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { family: 'Inter', size: 11 }
                        },
                        grid: { color: 'rgba(0,0,0,0.04)' }
                    }
                }
            }
        });
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

// Sort Header Icons
function updateSortHeaders() {
    document.querySelectorAll('.sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (!icon) return;
        if (th.dataset.sort === currentSort.column) {
            icon.textContent = currentSort.asc ? ' ▲' : ' ▼';
            th.classList.add('sorted');
        } else {
            icon.textContent = '';
            th.classList.remove('sorted');
        }
    });
}

// Display Ekipmanlar
let currentSort = { column: null, asc: true };

function displayEkipmanlar() {
    const tbody = document.getElementById('ekipman-tbody');
    
    if (ekipmanlar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Ekipman bulunamadı.</td></tr>';
        updateSortHeaders();
        return;
    }

    // Reset select-all
    const selectAll = document.getElementById('select-all');
    if (selectAll) selectAll.checked = false;
    updateBulkBar();

    // Sıralama uygula
    let sorted = [...ekipmanlar];
    if (currentSort.column) {
        sorted.sort((a, b) => {
            let valA = a[currentSort.column] || '';
            let valB = b[currentSort.column] || '';
            if (typeof valA === 'number' && typeof valB === 'number') {
                return currentSort.asc ? valA - valB : valB - valA;
            }
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            if (valA < valB) return currentSort.asc ? -1 : 1;
            if (valA > valB) return currentSort.asc ? 1 : -1;
            return 0;
        });
    }

    updateSortHeaders();

    tbody.innerHTML = sorted.map(ekipman => `
        <tr>
            <td><input type="checkbox" class="ekipman-checkbox" value="${ekipman.id}" onchange="updateBulkBar()"></td>
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

    // Gelişmiş filtreler
    const tedarikci = document.getElementById('tedarikci-filter');
    const fiyatMin = document.getElementById('fiyat-min-filter');
    const fiyatMax = document.getElementById('fiyat-max-filter');
    const tarihMin = document.getElementById('tarih-min-filter');
    const tarihMax = document.getElementById('tarih-max-filter');

    if (tedarikci && tedarikci.value) filters.tedarikci = tedarikci.value;
    if (fiyatMin && fiyatMin.value) filters.fiyat_min = fiyatMin.value;
    if (fiyatMax && fiyatMax.value) filters.fiyat_max = fiyatMax.value;
    if (tarihMin && tarihMin.value) filters.tarih_min = tarihMin.value;
    if (tarihMax && tarihMax.value) filters.tarih_max = tarihMax.value;

    loadEkipmanlar(filters);
}

// Clear all filters
function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('kategori-filter').value = '';
    document.getElementById('durum-filter').value = '';
    const ids = ['tedarikci-filter', 'fiyat-min-filter', 'fiyat-max-filter', 'tarih-min-filter', 'tarih-max-filter'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    loadEkipmanlar();
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

// Edit Ekipman
async function editEkipman(id) {
    try {
        const response = await fetch(`${API_URL}/ekipman/${id}`);
        const ekipman = await response.json();

        // Formu doldur
        document.getElementById('edit-id').value = ekipman.id;
        document.getElementById('edit-kategori').value = ekipman.kategori || '';
        document.getElementById('edit-marka').value = ekipman.marka || '';
        document.getElementById('edit-model').value = ekipman.model || '';
        document.getElementById('edit-seri_no').value = ekipman.seri_no || '';
        document.getElementById('edit-durum').value = ekipman.durum || 'Depoda';
        document.getElementById('edit-tedarikci').value = ekipman.tedarikci || '';
        document.getElementById('edit-notlar').value = ekipman.notlar || '';

        // Temin tarihi formatla
        if (ekipman.temin_tarihi) {
            document.getElementById('edit-temin_tarihi').value = ekipman.temin_tarihi.split('T')[0];
        } else {
            document.getElementById('edit-temin_tarihi').value = '';
        }
        document.getElementById('edit-temin_fiyati').value = ekipman.temin_fiyati || '';

        // Kategori dropdown kur
        setupEditDropdown();

        // Modalı aç
        document.getElementById('edit-modal').style.display = 'block';
    } catch (error) {
        console.error('Ekipman bilgileri alınamadı:', error);
        showAlert('Ekipman bilgileri alınamadı!', 'error');
    }
}

// Edit Modal Dropdown
function setupEditDropdown() {
    const input = document.getElementById('edit-kategori');
    const list = document.getElementById('edit-kategori-list');
    if (!input || !list) return;

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
    }

    input.addEventListener('focus', () => { populateList(input.value); list.classList.add('show'); });
    input.addEventListener('input', () => { populateList(input.value); list.classList.add('show'); });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#edit-modal .searchable-dropdown')) list.classList.remove('show');
    });
}

// Close Edit Modal
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('edit-form').reset();
}

// Handle Edit Submit
async function handleEditSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('edit-id').value;
    const formData = {
        kategori: document.getElementById('edit-kategori').value,
        marka: document.getElementById('edit-marka').value,
        model: document.getElementById('edit-model').value,
        seri_no: document.getElementById('edit-seri_no').value,
        durum: document.getElementById('edit-durum').value,
        temin_tarihi: document.getElementById('edit-temin_tarihi').value || null,
        temin_fiyati: parseFloat(document.getElementById('edit-temin_fiyati').value) || null,
        tedarikci: document.getElementById('edit-tedarikci').value,
        notlar: document.getElementById('edit-notlar').value
    };

    try {
        const response = await fetch(`${API_URL}/ekipman/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Ekipman başarıyla güncellendi!', 'success');
            closeEditModal();
            await loadEkipmanlar();
            await loadIstatistikler();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ekipman güncellenemedi:', error);
        showAlert('Güncelleme sırasında hata oluştu!', 'error');
    }
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

// ---- KATEGORİ YÖNETİMİ ----

// Kategoriler sekmesi yükle
async function loadKategorilerTab() {
    try {
        const [katRes, ekpRes] = await Promise.all([
            fetch(`${API_URL}/kategoriler`),
            fetch(`${API_URL}/ekipman`)
        ]);
        const katList = await katRes.json();
        const ekpList = await ekpRes.json();

        // Her kategoride kaç ekipman var say
        const sayac = {};
        ekpList.forEach(e => {
            sayac[e.kategori] = (sayac[e.kategori] || 0) + 1;
        });

        const tbody = document.getElementById('kategoriler-tbody');
        if (!tbody) return;

        if (katList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">Kategori bulunamadı.</td></tr>';
            return;
        }

        tbody.innerHTML = katList.map(kat => `
            <tr>
                <td>${kat.id}</td>
                <td><strong>${kat.ad}</strong></td>
                <td>${kat.aciklama || '-'}</td>
                <td><span class="status-badge" style="background:#e9ecef;color:#333;">${sayac[kat.ad] || 0} adet</span></td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteKategori(${kat.id}, '${kat.ad}', ${sayac[kat.ad] || 0})">Sil</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Kategoriler yüklenemedi:', error);
    }
}

// Yeni Kategori Ekle
async function handleKategoriSubmit(e) {
    e.preventDefault();
    const ad = document.getElementById('yeni-kategori-ad').value.trim();
    const aciklama = document.getElementById('yeni-kategori-aciklama').value.trim();

    if (!ad) return;

    try {
        const response = await fetch(`${API_URL}/kategoriler`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ad, aciklama })
        });
        const result = await response.json();

        if (result.success) {
            showAlert(`"${ad}" kategorisi eklendi!`, 'success');
            document.getElementById('kategori-form').reset();
            await loadKategoriler();
            populateKategoriSelects();
            loadKategorilerTab();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        showAlert('Kategori eklenirken hata oluştu!', 'error');
    }
}

// Kategori Sil
async function deleteKategori(id, ad, ekipmanSayisi) {
    if (ekipmanSayisi > 0) {
        showAlert(`"${ad}" kategorisinde ${ekipmanSayisi} ekipman var. Önce ekipmanları başka kategoriye taşıyın.`, 'error');
        return;
    }
    if (!confirm(`"${ad}" kategorisini silmek istediğinizden emin misiniz?`)) return;

    try {
        const response = await fetch(`${API_URL}/kategoriler/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            showAlert(`"${ad}" kategorisi silindi!`, 'success');
            await loadKategoriler();
            populateKategoriSelects();
            loadKategorilerTab();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        showAlert('Silme sırasında hata oluştu!', 'error');
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
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Hareket kaydı bulunamadı.</td></tr>';
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
            <td><a href="/api/zimmet-belgesi/${hareket.id}" class="btn btn-primary btn-small" title="Zimmet belgesi indir">📄 Zimmet</a></td>
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

// ---- TOPLU İŞLEM FONKSİYONLARI ----

// Seçili ekipman ID'lerini al
function getSelectedIds() {
    return Array.from(document.querySelectorAll('.ekipman-checkbox:checked')).map(cb => parseInt(cb.value));
}

// Toplu işlem barını güncelle
function updateBulkBar() {
    const selected = getSelectedIds();
    const bar = document.getElementById('bulk-action-bar');
    const countEl = document.getElementById('bulk-count');
    if (!bar) return;

    if (selected.length > 0) {
        bar.style.display = 'flex';
        countEl.textContent = `${selected.length} ekipman seçildi`;
    } else {
        bar.style.display = 'none';
    }
}

// Seçimi temizle
function clearSelection() {
    document.querySelectorAll('.ekipman-checkbox').forEach(cb => cb.checked = false);
    const selectAll = document.getElementById('select-all');
    if (selectAll) selectAll.checked = false;
    updateBulkBar();
}

// Toplu durum güncelleme
async function bulkUpdateDurum() {
    const ids = getSelectedIds();
    const durum = document.getElementById('bulk-durum-select').value;

    if (ids.length === 0) {
        showAlert('Lütfen en az bir ekipman seçin.', 'error');
        return;
    }
    if (!durum) {
        showAlert('Lütfen bir durum seçin.', 'error');
        return;
    }
    if (!confirm(`${ids.length} ekipmanın durumu "${durum}" olarak güncellenecek. Onaylıyor musunuz?`)) return;

    try {
        const response = await fetch(`${API_URL}/ekipman/toplu-durum`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, durum })
        });
        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            clearSelection();
            await loadEkipmanlar();
            await loadIstatistikler();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        showAlert('Toplu güncelleme sırasında hata oluştu!', 'error');
    }
}

// Toplu silme
async function bulkDelete() {
    const ids = getSelectedIds();

    if (ids.length === 0) {
        showAlert('Lütfen en az bir ekipman seçin.', 'error');
        return;
    }
    if (!confirm(`${ids.length} ekipman kalıcı olarak silinecek! Bu işlem geri alınamaz. Onaylıyor musunuz?`)) return;

    try {
        const response = await fetch(`${API_URL}/ekipman/toplu-sil`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            clearSelection();
            await loadEkipmanlar();
            await loadIstatistikler();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        showAlert('Toplu silme sırasında hata oluştu!', 'error');
    }
}

// ===== KULLANICI YÖNETİMİ =====

async function loadCurrentUser() {
    try {
        const response = await fetch(`${API_URL}/kullanici/bilgi`);
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            document.getElementById('user-name').textContent = currentUser.ad_soyad || currentUser.username;
            
            // Admin ise Kullanıcılar tabını göster
            if (currentUser.rol === 'admin') {
                const tabBtn = document.getElementById('tab-kullanicilar');
                if (tabBtn) tabBtn.style.display = '';
            }
        }
    } catch (error) {
        console.error('Kullanıcı bilgisi yüklenemedi:', error);
    }
}

function sifreDegistirModal() {
    document.getElementById('sifre-modal').style.display = 'flex';
    document.getElementById('eski-sifre').value = '';
    document.getElementById('yeni-sifre').value = '';
    document.getElementById('yeni-sifre-tekrar').value = '';
}

function closeSifreModal() {
    document.getElementById('sifre-modal').style.display = 'none';
}

async function handleSifreDegistir(e) {
    e.preventDefault();
    const eskiSifre = document.getElementById('eski-sifre').value;
    const yeniSifre = document.getElementById('yeni-sifre').value;
    const yeniSifreTekrar = document.getElementById('yeni-sifre-tekrar').value;

    if (yeniSifre !== yeniSifreTekrar) {
        showAlert('Yeni şifreler eşleşmiyor!', 'error');
        return;
    }
    if (yeniSifre.length < 4) {
        showAlert('Yeni şifre en az 4 karakter olmalı!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/sifre-degistir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eski_sifre: eskiSifre, yeni_sifre: yeniSifre })
        });
        const result = await response.json();
        if (result.success) {
            showAlert('Şifre başarıyla değiştirildi!', 'success');
            closeSifreModal();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        showAlert('Şifre değiştirme sırasında hata oluştu!', 'error');
    }
}

async function loadKullanicilar() {
    try {
        const response = await fetch(`${API_URL}/kullanicilar`);
        const users = await response.json();
        const tbody = document.getElementById('kullanicilar-tbody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Kullanıcı bulunamadı</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.ad_soyad || '-'}</td>
                <td><span class="badge badge-${u.rol === 'admin' ? 'warning' : 'info'}">${u.rol === 'admin' ? '👑 Admin' : '👤 Kullanıcı'}</span></td>
                <td><span class="badge badge-${u.aktif ? 'success' : 'danger'}">${u.aktif ? 'Aktif' : 'Pasif'}</span></td>
                <td>${u.olusturma_tarihi ? new Date(u.olusturma_tarihi).toLocaleDateString('tr-TR') : '-'}</td>
                <td>
                    ${u.id !== currentUser.id ? `<button class="btn btn-danger btn-sm" onclick="deleteKullanici(${u.id}, '${u.username}')">🗑️ Sil</button>` : '<span style="color:#999">—</span>'}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Kullanıcılar yüklenemedi:', error);
    }
}

async function handleKullaniciEkle(e) {
    e.preventDefault();
    const username = document.getElementById('yeni-kul-username').value.trim();
    const ad_soyad = document.getElementById('yeni-kul-adsoyad').value.trim();
    const password = document.getElementById('yeni-kul-sifre').value;
    const rol = document.getElementById('yeni-kul-rol').value;

    try {
        const response = await fetch(`${API_URL}/kullanicilar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, ad_soyad, password, rol })
        });
        const result = await response.json();
        if (result.success) {
            showAlert(`${username} kullanıcısı eklendi!`, 'success');
            document.getElementById('yeni-kul-username').value = '';
            document.getElementById('yeni-kul-adsoyad').value = '';
            document.getElementById('yeni-kul-sifre').value = '';
            document.getElementById('yeni-kul-rol').value = 'kullanici';
            await loadKullanicilar();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        showAlert('Kullanıcı ekleme sırasında hata oluştu!', 'error');
    }
}

async function deleteKullanici(id, username) {
    if (!confirm(`"${username}" kullanıcısını silmek istediğinize emin misiniz?`)) return;

    try {
        const response = await fetch(`${API_URL}/kullanicilar/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            showAlert(result.message, 'success');
            await loadKullanicilar();
        } else {
            showAlert('Hata: ' + result.error, 'error');
        }
    } catch (error) {
        showAlert('Kullanıcı silme sırasında hata oluştu!', 'error');
    }
}
