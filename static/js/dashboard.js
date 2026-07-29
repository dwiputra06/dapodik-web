// ==========================================
// 1. HELPER & KONSTANTA (ANTI-REDEKLARASI)
// ==========================================

// Menggunakan var & fallback window untuk mencegah 'Identifier has already been declared'
var JENJANG_COLORS = window.JENJANG_COLORS || {
    'SD': '#ea580c',      // Orange
    'SMP': '#2563eb',     // Blue
    'SMA': '#64748b',     // Slate
    'SMK': '#9333ea',     // Purple
    'PAUD': '#38bdf8',    // Sky
    'TK': '#06b6d4',      // Cyan
    'KB': '#14b8a6',      // Teal
    'PKBM': '#f59e0b',    // Amber
    'SLB': '#1e293b',     // Dark Slate
    'SPS': '#10b981'      // Emerald
};

// Helper Debounce untuk Input Pencarian
function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Fetch API
async function fetchDapodikData() {
    const response = await fetch('/api/dapodik');
    if (!response.ok) {
        throw new Error(`Gagal mengambil data server: ${response.status}`);
    }
    return await response.json();
}

// Helper pintar untuk ambil properti terlepas dari kapitalisasi / nama key API
function getProp(item, possibleKeys, fallback = '') {
    if (!item || typeof item !== 'object') return fallback;
    for (const key of possibleKeys) {
        if (item[key] !== undefined && item[key] !== null) {
            return item[key];
        }
    }
    return fallback;
}

function getNamaSekolah(item) {
    return String(getProp(item, ['Nama Sekolah', 'nama_sekolah', 'namaSekolah', 'nama', 'sekolah', 'NAMA_SEKOLAH'])).trim();
}

function getNPSN(item) {
    return String(getProp(item, ['NPSN', 'npsn', 'Npsn'])).trim();
}

function getBP(item) {
    return String(getProp(item, ['BP', 'bp', 'Bentuk Pendidikan', 'bentuk_pendidikan', 'bentukPendidikan', 'jenjang'])).trim();
}

function getStatus(item) {
    return String(getProp(item, ['Status', 'status', 'status_sekolah', 'statusSekolah'])).trim();
}

function parseNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9-]/g, '');
    return parseInt(cleaned, 10) || 0;
}

function getSiswaCount(item) {
    return parseNumber(getProp(item, ['PD', 'pd', 'Peserta Didik', 'peserta_didik', 'Siswa', 'siswa']));
}

function getGuruCount(item) {
    return parseNumber(getProp(item, ['Guru', 'guru', 'Jumlah Guru', 'jumlah_guru']));
}

function getRombelCount(item) {
    return parseNumber(getProp(item, ['Rombel', 'rombel', 'Rombongan Belajar', 'rombongan_belajar']));
}

// Helper Warna Badge Per Jenjang
function getJenjangBadgeClass(bp) {
    const val = (bp || '').toUpperCase();
    if (val.includes('TK') || val.includes('PAUD') || val.includes('KB') || val.includes('SPS')) {
        return 'bg-teal-50 text-teal-700 border border-teal-200/60';
    } 
    if (val.includes('SD')) {
        return 'bg-rose-50 text-rose-700 border border-rose-200/60';
    } 
    if (val.includes('SMP')) {
        return 'bg-blue-50 text-blue-700 border border-blue-200/60';
    } 
    if (val.includes('SMA') || val.includes('SMK')) {
        return 'bg-purple-50 text-purple-700 border border-purple-200/60';
    } 
    if (val.includes('SLB') || val.includes('PKBM')) {
        return 'bg-amber-50 text-amber-700 border border-amber-200/60';
    }
    return 'bg-slate-100 text-slate-700 border border-slate-200/60';
}

// Pembersih Nama Kabupaten / Kota
function cleanKabupatenName(item) {
    let raw = getProp(item, ['Kabupaten', 'kabupaten', 'Kabupaten/Kota', 'kabupaten_kota', 'Kab_Kota', 'kab_kota', 'Kab/Kota', 'Kabupaten_Kota', 'kota']);
    
    if (!raw) return 'Lainnya';
    let str = String(raw).trim();

    str = str.replace(/_x[0-9a-fA-F]{4}_/gi, '');
    str = str.replace(/\s+/g, ' ').trim();

    const junkWords = ['lembar', 'sekolah darat', 'total', 'data', 'rekap'];
    if (junkWords.some(junk => str.toLowerCase().includes(junk)) || str.length < 3) {
        return 'Lainnya';
    }

    return str.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Deduplikasi Sekolah
function removeDuplicateSchools(dataList) {
    const seen = new Map();

    return dataList.filter(item => {
        const npsn = getNPSN(item);
        const nama = getNamaSekolah(item);
        const kab = item.CleanKabupaten || '';

        const uniqueKey = (npsn && npsn !== '-' && npsn !== '0') 
            ? `NPSN_${npsn}` 
            : `NAME_${nama.toLowerCase()}_${kab.toLowerCase()}`;

        if (seen.has(uniqueKey)) {
            return false;
        }

        seen.set(uniqueKey, true);
        return true;
    });
}

// ==========================================
// 2. STATE & INITIALIZATION
// ==========================================
var rawData = [];
var filteredData = [];
var currentChartTab = 'wilayah';
var mainChartInstance = null;

var currentPage = 1;
var rowsPerPage = 10;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    setupEventListeners();

    try {
        const rawResponse = await fetchDapodikData();

        const dataArray = Array.isArray(rawResponse) 
            ? rawResponse 
            : (rawResponse?.data || rawResponse?.rows || rawResponse?.result || []);

        // Formatting awal data
        const mappedData = dataArray.map(item => {
            return {
                ...item,
                CleanKabupaten: cleanKabupatenName(item)
            };
        }).filter(item => {
            const nama = getNamaSekolah(item);
            return nama !== '' && nama !== 'Total' && nama !== '-' && !nama.toLowerCase().includes('data ');
        });

        rawData = removeDuplicateSchools(mappedData);
        filteredData = [...rawData];

        updateStatusBadge(true, rawData.length);
        
        // 🔒 Update Ringkasan Kartu Atas sekali saja memakai RAW DATA (Statis Global)
        updateCards();

        populateFilters();
        applyFilters(); 
    } catch (err) {
        console.error("Error memuat data:", err);
        updateStatusBadge(false, 0);
    }
});

function setupEventListeners() {
    document.getElementById('filter-kecamatan')?.addEventListener('change', applyFilters);
    document.getElementById('filter-bp')?.addEventListener('change', applyFilters);
    document.getElementById('filter-status')?.addEventListener('change', applyFilters);
    document.getElementById('filter-metric')?.addEventListener('change', applyFilters);
    
    // Menggunakan debounce untuk input search
    document.getElementById('search-input')?.addEventListener('input', debounce(applyFilters, 300));

    document.getElementById('tab-btn-wilayah')?.addEventListener('click', () => switchChartTab('wilayah'));
    document.getElementById('tab-btn-jenjang')?.addEventListener('click', () => switchChartTab('jenjang'));

    document.getElementById('btn-prev')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
}

function updateStatusBadge(isSuccess, count) {
    let badge = document.getElementById('status-badge');

    if (!badge) {
        const allSpans = Array.from(document.querySelectorAll('span, button, div'));
        badge = allSpans.find(el => el.textContent.includes('Memuat status...'));
    }

    if (!badge) return;

    if (isSuccess) {
        badge.className = "inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100/80 text-emerald-700 text-xs font-bold border border-emerald-200/50 shadow-sm backdrop-blur-md transition-all";
        badge.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i> <span>${count.toLocaleString('id-ID')} Sekolah Terhubung</span>`;
    } else {
        badge.className = "inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/80 text-rose-700 text-xs font-bold border border-rose-200/50 shadow-sm backdrop-blur-md transition-all";
        badge.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-rose-600"></i> <span>Gagal Memuat Data</span>`;
    }

    if (window.lucide) lucide.createIcons();
}

function populateFilters() {
    const kabSet = new Set(rawData.map(i => i.CleanKabupaten).filter(Boolean));
    const bpSet = new Set(rawData.map(i => getBP(i)).filter(Boolean));

    const kabSelect = document.getElementById('filter-kecamatan');
    if (kabSelect) {
        kabSelect.innerHTML = '<option value="ALL">Semua Kabupaten/Kota</option>';
        Array.from(kabSet).sort().forEach(k => {
            kabSelect.innerHTML += `<option value="${k}">${k}</option>`;
        });
    }

    const bpSelect = document.getElementById('filter-bp');
    if (bpSelect) {
        bpSelect.innerHTML = '<option value="ALL">Semua Jenjang (BP)</option>';
        Array.from(bpSet).sort().forEach(b => {
            bpSelect.innerHTML += `<option value="${b}">${b}</option>`;
        });
    }
}

function applyFilters() {
    const selectedKab = (document.getElementById('filter-kecamatan')?.value || 'ALL').toUpperCase();
    const selectedBP = (document.getElementById('filter-bp')?.value || 'ALL').toUpperCase();
    const selectedStatus = (document.getElementById('filter-status')?.value || 'ALL').toUpperCase();
    const selectedMetric = (document.getElementById('filter-metric')?.value || 'DEFAULT').toUpperCase();
    const searchQuery = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

    // 1. FILTER KHUSUS TABEL SAJA
    filteredData = rawData.filter(item => {
        const itemKab = (item.CleanKabupaten || '').toUpperCase();
        const itemBP = getBP(item).toUpperCase();
        const itemStatus = getStatus(item).toUpperCase();
        const itemNama = getNamaSekolah(item).toLowerCase();
        const itemNpsn = getNPSN(item).toLowerCase();

        const matchKab = ['ALL', '', 'SEMUA'].includes(selectedKab) || itemKab === selectedKab;
        const matchBP = ['ALL', '', 'SEMUA'].includes(selectedBP) || itemBP === selectedBP;
        const matchStatus = ['ALL', '', 'SEMUA'].includes(selectedStatus) || itemStatus === selectedStatus;
        const matchSearch = !searchQuery || itemNama.includes(searchQuery) || itemNpsn.includes(searchQuery);

        return matchKab && matchBP && matchStatus && matchSearch;
    });

    // 2. SORTING UNTUK TABEL
    if (['SISWA_DESC', 'SISWA', 'PD'].includes(selectedMetric)) {
        filteredData.sort((a, b) => getSiswaCount(b) - getSiswaCount(a));
    } else if (['GURU_DESC', 'GURU'].includes(selectedMetric)) {
        filteredData.sort((a, b) => getGuruCount(b) - getGuruCount(a));
    } else if (['ROMBEL_DESC', 'ROMBEL'].includes(selectedMetric)) {
        filteredData.sort((a, b) => getRombelCount(b) - getRombelCount(a));
    } else if (['NAMA_ASC', 'NAMA_AZ', 'NAMA'].includes(selectedMetric)) {
        filteredData.sort((a, b) => {
            const nameA = getNamaSekolah(a);
            const nameB = getNamaSekolah(b);
            return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
        });
    }

    currentPage = 1;

    renderTable();
    updateCharts();
}

// 🔒 LOGIKA KARTU RINGKASAN: Menggunakan rawData agar nilainya STATIS & GLOBAL
function updateCards() {
    const elSekolah = document.getElementById('card-sekolah');
    const elSiswa = document.getElementById('card-siswa');
    const elGuru = document.getElementById('card-guru');
    const elRombel = document.getElementById('card-rombel');

    if (elSekolah) elSekolah.innerText = rawData.length.toLocaleString('id-ID');
    if (elSiswa) elSiswa.innerText = rawData.reduce((a, b) => a + getSiswaCount(b), 0).toLocaleString('id-ID');
    if (elGuru) elGuru.innerText = rawData.reduce((a, b) => a + getGuruCount(b), 0).toLocaleString('id-ID');
    if (elRombel) elRombel.innerText = rawData.reduce((a, b) => a + getRombelCount(b), 0).toLocaleString('id-ID');
}

// RENDER TABEL BARU DENGAN ZEBRA STRIPING & ANTI-GESER
function renderTable() {
    const tbody = document.getElementById('table-body');
    const tableCount = document.getElementById('table-count');
    if (tableCount) tableCount.innerText = filteredData.length.toLocaleString('id-ID');

    if (!tbody) return;

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-slate-400 font-medium">Tidak ada data sekolah yang ditemukan.</td></tr>`;
        updatePaginationUI();
        return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = filteredData.slice(start, end);

    tbody.innerHTML = paginatedItems.map((s, index) => {
        const bpVal = getBP(s) || '-';
        const statusVal = getStatus(s);
        const isNegeri = statusVal.toLowerCase() === 'negeri';
        const namaSekolah = getNamaSekolah(s) || '-';
        const kabupaten = s.CleanKabupaten || '-';
        
        const badgeStatusClass = isNegeri 
            ? 'bg-blue-50 text-blue-700 border border-blue-200/60' 
            : 'bg-amber-50 text-amber-700 border border-amber-200/60';

        const jenjangBadgeClass = getJenjangBadgeClass(bpVal);

        // 🎨 Zebra Striping: Baris genap putih, baris ganjil abu-abu sangat muda
        const zebraBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';

        return `
            <tr class="${zebraBg} hover:bg-blue-50/50 transition-colors border-b border-slate-100">
                <td class="px-5 py-3.5 font-bold text-slate-800 max-w-[260px] truncate" title="${namaSekolah}">
                    ${namaSekolah}
                </td>
                <td class="px-4 py-3.5">
                    <span class="font-mono text-[11px] font-bold text-slate-600 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200/50">
                        ${getNPSN(s) || '-'}
                    </span>
                </td>
                <td class="px-4 py-3.5">
                    <span class="px-2.5 py-1 ${jenjangBadgeClass} text-[11px] font-extrabold rounded-lg">
                        ${bpVal}
                    </span>
                </td>
                <td class="px-4 py-3.5">
                    <span class="px-2.5 py-1 ${badgeStatusClass} text-[11px] font-extrabold rounded-lg">
                        ${statusVal || '-'}
                    </span>
                </td>
                <td class="px-4 py-3.5 text-slate-600 font-medium max-w-[180px] truncate" title="${kabupaten}">
                    ${kabupaten}
                </td>
                <td class="px-4 py-3.5 text-center font-extrabold text-slate-800">${getSiswaCount(s).toLocaleString('id-ID')}</td>
                <td class="px-4 py-3.5 text-center font-extrabold text-slate-800">${getGuruCount(s).toLocaleString('id-ID')}</td>
                <td class="px-4 py-3.5 text-center font-extrabold text-slate-800">${getRombelCount(s).toLocaleString('id-ID')}</td>
            </tr>
        `;
    }).join('');

    updatePaginationUI();
    if (window.lucide) lucide.createIcons();
}

function updatePaginationUI() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
        const start = filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0;
        const end = Math.min(currentPage * rowsPerPage, filteredData.length);
        infoEl.innerText = `Menampilkan ${start} - ${end} dari ${filteredData.length.toLocaleString('id-ID')} sekolah`;
    }

    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// ==========================================
// 3. LOGIKA GRAFIK (HORIZONTAL BAR CHART)
// ==========================================
function switchChartTab(tab) {
    currentChartTab = tab;

    const btnWilayah = document.getElementById('tab-btn-wilayah');
    const btnJenjang = document.getElementById('tab-btn-jenjang');
    const chartTitle = document.getElementById('chart-title');
    const chartSubtitle = document.getElementById('chart-subtitle');

    if (tab === 'wilayah') {
        if (btnWilayah) btnWilayah.className = "px-4 py-2 rounded-xl text-xs font-extrabold bg-white text-blue-600 shadow-sm transition-all flex items-center gap-2";
        if (btnJenjang) btnJenjang.className = "px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600 hover:text-slate-900 transition-all flex items-center gap-2";
        if (chartTitle) chartTitle.innerText = "Distribusi Total Sekolah Per Kabupaten / Kota";
        if (chartSubtitle) chartSubtitle.innerText = "Ringkasan jumlah keseluruhan sekolah per wilayah kabupaten / kota";
    } else {
        if (btnJenjang) btnJenjang.className = "px-4 py-2 rounded-xl text-xs font-extrabold bg-white text-blue-600 shadow-sm transition-all flex items-center gap-2";
        if (btnWilayah) btnWilayah.className = "px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600 hover:text-slate-900 transition-all flex items-center gap-2";
        if (chartTitle) chartTitle.innerText = "Detail Per Jenjang Sekolah Per Kabupaten / Kota";
        if (chartSubtitle) chartSubtitle.innerText = "Rincian bertumpuk jenjang sekolah (SD, SMP, SMA, dll) di setiap kabupaten / kota";
    }

    updateCharts();
}

function updateCharts() {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('mainChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Hancurkan instance chart lama untuk menghindari glitched/overlapping render
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    if (mainChartInstance) mainChartInstance.destroy();

    const kabupatenMap = {};
    const jenjangSet = new Set();

    // 🔒 DI-LOCK KE rawData: Grafik selalu membaca SELURUH data Kabupaten/Kota!
    rawData.forEach(item => {
        const kab = item.CleanKabupaten || 'Lainnya';
        const bp = getBP(item) || 'Lainnya';

        if (!kabupatenMap[kab]) {
            kabupatenMap[kab] = { total: 0, bpCounts: {} };
        }
        kabupatenMap[kab].total += 1;
        kabupatenMap[kab].bpCounts[bp] = (kabupatenMap[kab].bpCounts[bp] || 0) + 1;

        if (bp && bp !== '-' && !bp.toLowerCase().includes('total')) {
            jenjangSet.add(bp);
        }
    });

    // Urutkan dari jumlah terbanyak (paling atas) ke paling sedikit
    const sortedKabupatenList = Object.keys(kabupatenMap)
        .sort((a, b) => kabupatenMap[b].total - kabupatenMap[a].total);

    const allJenjangList = Array.from(jenjangSet).sort();
    const legendContainer = document.getElementById('chart-legend');

    if (currentChartTab === 'wilayah') {
        const totalsData = sortedKabupatenList.map(kab => kabupatenMap[kab].total);

        mainChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedKabupatenList,
                datasets: [{
                    label: 'Total Sekolah',
                    data: totalsData,
                    backgroundColor: '#2563eb',
                    borderRadius: 6,
                    maxBarThickness: 28
                }]
            },
            options: {
                indexAxis: 'y', // 👈 HORIZONTAL BAR CHART (Teks Lurus)
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 10,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return ` Total Sekolah: ${context.raw.toLocaleString('id-ID')}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        grid: { color: '#f1f5f9' }, 
                        ticks: { font: { size: 11 } } 
                    },
                    y: { 
                        grid: { display: false }, 
                        ticks: { font: { size: 12, weight: '600' }, color: '#334155' } 
                    }
                }
            }
        });

        if (legendContainer) {
            legendContainer.innerHTML = `
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Total Sekolah Per Kabupaten / Kota
                </span>
            `;
        }

    } else {
        const datasets = allJenjangList.map((bp, index) => {
            const bpColor = JENJANG_COLORS[bp.toUpperCase()] || `hsl(${(index * 55) % 360}, 70%, 50%)`;

            return {
                label: bp,
                data: sortedKabupatenList.map(kab => kabupatenMap[kab].bpCounts[bp] || 0),
                backgroundColor: bpColor,
                borderRadius: 4,
                maxBarThickness: 28
            };
        });

        mainChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedKabupatenList,
                datasets: datasets
            },
            options: {
                indexAxis: 'y', // 👈 HORIZONTAL STACKED BAR CHART
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#ffffff',
                        titleColor: '#0f172a',
                        bodyColor: '#334155',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 14,
                        cornerRadius: 14,
                        boxPadding: 6,
                        usePointStyle: true,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 11, weight: '600' },
                        footerFont: { size: 12, weight: 'bold' },
                        footerColor: '#0f172a',
                        callbacks: {
                            title: function(items) {
                                return `🏛️ ${items[0].label}`;
                            },
                            filter: function(tooltipItem) {
                                return tooltipItem.raw > 0;
                            },
                            label: function(context) {
                                return ` ${context.dataset.label}: ${context.raw.toLocaleString('id-ID')}`;
                            },
                            footer: function(tooltipItems) {
                                let total = 0;
                                tooltipItems.forEach(item => { total += item.raw || 0; });
                                return `--------------------\nTotal : ${total.toLocaleString('id-ID')} Sekolah`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: '600' }, color: '#334155' }
                    }
                }
            }
        });

        if (legendContainer) {
            legendContainer.innerHTML = allJenjangList.map((bp, i) => {
                const color = JENJANG_COLORS[bp.toUpperCase()] || `hsl(${(i * 55) % 360}, 70%, 50%)`;
                return `
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200/80 shadow-sm">
                        <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></span> ${bp}
                    </span>
                `;
            }).join('');
        }
    }
}

// Global Scope Exports
window.switchChartTab = switchChartTab;
window.applyFilters = applyFilters;
window.updateCards = updateCards;