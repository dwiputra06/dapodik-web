document.addEventListener("DOMContentLoaded", function () {
  // -------------------------------------------------------------
  // 1. Inisialisasi Elemen DOM
  // -------------------------------------------------------------
  const metaNpsn = document.getElementById("meta-npsn");
  const metaWilayah = document.getElementById("meta-wilayah");

  const valLitScore = document.getElementById("val-literasi-score");
  const valLitPct = document.getElementById("val-literasi-pct");
  const badgeLit = document.getElementById("badge-literasi");

  const valNumScore = document.getElementById("val-numerasi-score");
  const valNumPct = document.getElementById("val-numerasi-pct");
  const badgeNum = document.getElementById("badge-numerasi");

  const valSiswaTotal = document.getElementById("val-siswa-total");
  const valSiswaPct = document.getElementById("val-siswa-pct");
  const badgeSiswa = document.getElementById("badge-siswa");

  const tbodyIndikator = document.getElementById("indikator-table-body");
  const countNaikEl = document.getElementById("count-naik");
  const countTurunEl = document.getElementById("count-turun");
  const countStabilEl = document.getElementById("count-stabil");
  const btnToggleText = document.getElementById("btn-toggle-text");
  const btnToggleIcon = document.getElementById("btn-toggle-icon");
  const btnToggle = document.getElementById("btn-toggle-indikator");

  let currentIndikatorData = [];
  let showAllIndikator = false;

  const formatNumber = (num) => (num || 0).toLocaleString("id-ID");

  // 📖 Kamus Nama Indikator Rapor Pendidikan
  const KAMUS_INDIKATOR = {
    "A.1": "Kemampuan Literasi",
    "A.2": "Kemampuan Numerasi",
    "A.3": "Karakter",
    "A.4": "Penyerapan Lulusan SMK",
    "A.5": "Opsi Pembelajaran SMK",
    "A.6": "Kualitas Pembelajaran",
    "B.1": "Iklim Keamanan Sekolah",
    "B.2": "Iklim Kebinekaan",
    "B.3": "Iklim Inklusivitas",
    "B.4": "Pencegahan Kekerasan",
    "C.1": "Kepemimpinan Instruksional",
    "C.2": "Pengelolaan Kurikulum Sekolah",
    "C.3": "Pemanfaatan TIK untuk Pembelajaran",
    "C.4": "Pemanfaatan Anggaran Mutu",
    "D.1": "Kualitas Pembelajaran",
    "D.2": "Refleksi & Perbaikan Pembelajaran"
  };

  // -------------------------------------------------------------
  // 2. Helper Tampilan Capaian (Data Real dari DB)
  // -------------------------------------------------------------
  function capaianBadgeHtml(val) {
    const v = String(val || "-").trim();
    const vLower = v.toLowerCase();
    let cls = "bg-slate-100 text-slate-600 border-slate-200";
    if (vLower.includes("baik")) cls = "bg-emerald-100 text-emerald-700 border-emerald-200";
    else if (vLower.includes("sedang")) cls = "bg-amber-100 text-amber-700 border-amber-200";
    else if (vLower.includes("kurang")) cls = "bg-rose-100 text-rose-700 border-rose-200";
    else if (vLower.includes("tidak tersedia")) cls = "bg-slate-100 text-slate-400 border-slate-200";
    return `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${cls} whitespace-nowrap">${v}</span>`;
  }

  function perubahanHtml(val, statusTren) {
    const v = String(val || "-").trim();
    const vLower = v.toLowerCase();
    if (vLower.includes("tidak tersedia") || v === "-") {
      return `<span class="text-[10px] font-semibold text-slate-400">Tidak tersedia</span>`;
    }
    const trend = String(statusTren || "");
    let icon, color;
    if (trend === "Naik") {
      icon = "arrow-up-right";
      color = "text-emerald-600";
    } else if (trend === "Turun") {
      icon = "arrow-down-right";
      color = "text-rose-600";
    } else if (trend === "Tetap") {
      icon = "minus";
      color = "text-amber-600";
    } else if (v.startsWith("-")) {
      icon = "arrow-down-right";
      color = "text-rose-600";
    } else {
      icon = "arrow-up-right";
      color = "text-emerald-600";
    }
    return `<span class="inline-flex items-center gap-1 text-xs font-extrabold ${color}"><i data-lucide="${icon}" class="w-3 h-3"></i> ${v}%</span>`;
  }

  function trenHtml(status) {
    const s = String(status || "Tidak Tersedia");
    if (s === "Naik") {
      return `<span class="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full"><i data-lucide="trending-up" class="w-3 h-3"></i> Naik</span>`;
    }
    if (s === "Turun") {
      return `<span class="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full"><i data-lucide="trending-down" class="w-3 h-3"></i> Turun</span>`;
    }
    if (s === "Tetap") {
      return `<span class="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full"><i data-lucide="minus" class="w-3 h-3"></i> Tetap</span>`;
    }
    return `<span class="text-[10px] font-semibold text-slate-400">—</span>`;
  }

  function setCapaianCard(scoreEl, badgeEl, badgeTextEl, capaian, perubahan, statusTren) {
    const v = String(capaian || "").toLowerCase();
    const p = String(perubahan || "-");

    let colorText = "text-slate-800";
    let cls = "bg-slate-100 text-slate-600 border border-slate-200";
    if (v.includes("baik")) {
      cls = "bg-emerald-100 text-emerald-700 border border-emerald-200";
      colorText = "text-emerald-600";
    } else if (v.includes("sedang")) {
      cls = "bg-amber-100 text-amber-700 border border-amber-200";
      colorText = "text-amber-600";
    } else if (v.includes("kurang")) {
      cls = "bg-rose-100 text-rose-700 border border-rose-200";
      colorText = "text-rose-600";
    }

    if (scoreEl) {
      scoreEl.innerText = capaian || "Tidak Tersedia";
      scoreEl.className = "text-3xl font-extrabold " + colorText;
    }
    if (!badgeEl || !badgeTextEl) return;

    badgeEl.className = "px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 " + cls;

    if (p.includes("tidak tersedia") || p === "-") {
      badgeTextEl.innerText = "Tidak ada data";
      return;
    }

    const trend = String(statusTren || "");
    let arrow, color;
    if (trend === "Naik") {
      arrow = "▲";
      color = "text-emerald-700";
    } else if (trend === "Turun") {
      arrow = "▼";
      color = "text-rose-700";
    } else if (trend === "Tetap") {
      arrow = "●";
      color = "text-amber-700";
    } else {
      arrow = p.startsWith("-") ? "▼" : "▲";
      color = "text-slate-700";
    }

    badgeEl.className = "px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 " + color + " " + cls;
    badgeTextEl.innerText = `${arrow} ${p}%`;
  }

  // -------------------------------------------------------------
  // 3. Chart.js Grafik Utama
  // -------------------------------------------------------------
  const canvas = document.getElementById("trendChart");
  let trendChart = null;

  if (canvas) {
    const ctx = canvas.getContext("2d");
    trendChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Perubahan 2025 (%)",
            data: [],
            backgroundColor: "#94a3b8",
            borderRadius: 5,
            maxBarThickness: 22
          },
          {
            label: "Perubahan 2026 (%)",
            data: [],
            backgroundColor: "#2563eb",
            borderRadius: 5,
            maxBarThickness: 22
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  }

  // -------------------------------------------------------------
  // 4. Render Tabel Indikator Dynamically
  // -------------------------------------------------------------
  function renderIndikatorList(list) {
    currentIndikatorData = list || [];

    let countNaik = 0;
    let countTurun = 0;
    let countStabil = 0;

    currentIndikatorData.forEach((item) => {
      const status = item.status_tren || "";
      if (status === "Naik") countNaik++;
      else if (status === "Turun") countTurun++;
      else if (status === "Tetap") countStabil++;
    });

    if (countNaikEl) countNaikEl.innerText = countNaik;
    if (countTurunEl) countTurunEl.innerText = countTurun;
    if (countStabilEl) countStabilEl.innerText = countStabil;

    if (btnToggleText) {
      btnToggleText.innerText = showAllIndikator
        ? `Sembunyikan Indikator`
        : `Lihat Semua Indikator (${currentIndikatorData.length})`;
    }

    // Sembunyikan tombol toggle bila semua indikator sudah tampil
    if (btnToggle) {
      btnToggle.classList.toggle("hidden", currentIndikatorData.length <= 7);
    }

    if (!tbodyIndikator) return;
    tbodyIndikator.innerHTML = "";

    if (currentIndikatorData.length === 0) {
      tbodyIndikator.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400 font-medium">
            Tidak ada data indikator Rapor Pendidikan.
          </td>
        </tr>
      `;
      return;
    }

    const displayList = showAllIndikator
      ? currentIndikatorData
      : currentIndikatorData.slice(0, 7);

    displayList.forEach((item) => {
      let rawKode = item.kode || "";
      let rawNama = item.nama || item.nama_indikator || "";

      if (/^\d+$/.test(rawKode)) {
        rawKode = rawNama;
        rawNama = "";
      }

      const kodeFix = rawKode && rawKode.length <= 5 ? rawKode : "A.1";
      let namaFix = KAMUS_INDIKATOR[kodeFix] || rawNama;
      if (namaFix === kodeFix || !namaFix) {
        namaFix = KAMUS_INDIKATOR[kodeFix] || `Indikator ${kodeFix}`;
      }

      const rowHtml = `
        <tr class="hover:bg-slate-50/80 transition-all">
          <td class="py-3.5 px-5 font-bold text-slate-800">
            <div class="flex items-center gap-3">
              <span class="px-2 py-1 rounded-md bg-blue-50 text-blue-600 font-mono text-[11px] font-extrabold border border-blue-100 shrink-0">
                ${kodeFix}
              </span>
              <span class="text-slate-800 font-extrabold leading-snug">${namaFix}</span>
            </div>
          </td>
          <td class="py-3.5 px-5">${capaianBadgeHtml(item.capaian_2025)}</td>
          <td class="py-3.5 px-5">${capaianBadgeHtml(item.capaian_2026)}</td>
          <td class="py-3.5 px-5">${perubahanHtml(item.perubahan_2026, item.status_tren)}</td>
          <td class="py-3.5 px-5">${trenHtml(item.status_tren)}</td>
          <td class="py-3.5 px-5 text-right text-slate-300">
            <i data-lucide="chevron-right" class="w-4 h-4 inline-block"></i>
          </td>
        </tr>
      `;

      tbodyIndikator.insertAdjacentHTML("beforeend", rowHtml);
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  // -------------------------------------------------------------
  // 5. Expand Button Listener
  // -------------------------------------------------------------
  function handleToggleClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    showAllIndikator = !showAllIndikator;

    if (btnToggleIcon) {
      btnToggleIcon.style.transform = showAllIndikator ? "rotate(180deg)" : "rotate(0deg)";
    }

    renderIndikatorList(currentIndikatorData);
  }

  if (btnToggle) {
    btnToggle.onclick = handleToggleClick;
  }
  window.toggleIndikatorView = handleToggleClick;

  // -------------------------------------------------------------
  // 6. Pencarian Sekolah (Search + Autocomplete)
  // -------------------------------------------------------------
  const searchInput = document.getElementById("search-sekolah");
  const searchResults = document.getElementById("search-results");
  const metaSekolah = document.getElementById("meta-sekolah");
  const btnClearSearch = document.getElementById("btn-clear-search");
  const metaKecamatan = document.getElementById("meta-kecamatan");

  let searchResultsData = [];
  let highlightIndex = -1;
  let searchDebounce = null;

  function debounce(fn, delay) {
    return function (...args) {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function renderSearchResults(list) {
    searchResultsData = list || [];
    highlightIndex = -1;

    if (!searchResultsData.length) {
      searchResults.innerHTML = `
        <div class="px-4 py-6 text-center text-xs font-medium text-slate-400">
          Tidak ditemukan sekolah yang cocok.
        </div>`;
      searchResults.classList.remove("hidden");
      return;
    }

    searchResults.innerHTML = "";
    searchResultsData.forEach((item, idx) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors " + (idx === 0 ? "bg-blue-50/40" : "hover:bg-blue-50/70");
      row.innerHTML = `
        <i data-lucide="school" class="w-4 h-4 text-blue-500 shrink-0"></i>
        <span class="flex-1 min-w-0">
          <span class="block text-xs font-extrabold text-slate-800 truncate">${item.nama}</span>
          <span class="block text-[10px] font-mono font-semibold text-slate-400">NPSN: ${item.npsn}</span>
        </span>
        <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-300 shrink-0"></i>
      `;
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectSekolah(item);
      });
      searchResults.appendChild(row);
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
    searchResults.classList.remove("hidden");
  }

  function updateHighlight() {
    const rows = searchResults.querySelectorAll("button");
    rows.forEach((r, i) => {
      r.className = "w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors " +
        (i === highlightIndex ? "bg-blue-50" : "hover:bg-blue-50/70");
    });
    const active = rows[highlightIndex];
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }

  async function searchSekolah(query) {
    const q = (query || "").trim();
    if (!q) {
      searchResults.classList.add("hidden");
      return;
    }
    try {
      const res = await fetch(`/api/sekolah-list?q=${encodeURIComponent(q)}&limit=50`);
      if (!res.ok) throw new Error("Gagal mencari sekolah");
      const list = await res.json();
      renderSearchResults(list);
    } catch (err) {
      console.error("❌ Error Search Sekolah:", err);
    }
  }

  function selectSekolah(item) {
    if (!item) return;
    searchInput.value = `${item.nama} (${item.npsn})`;
    if (metaSekolah) metaSekolah.innerText = item.nama;
    if (btnClearSearch) btnClearSearch.classList.remove("hidden");
    searchResults.classList.add("hidden");
    fetchSekolahTrend(item.npsn);
  }

  if (searchInput) {
    searchInput.addEventListener("input", debounce(function () {
      if (btnClearSearch) {
        btnClearSearch.classList.toggle("hidden", !searchInput.value.trim());
      }
      searchSekolah(searchInput.value);
    }, 300));

    searchInput.addEventListener("keydown", function (e) {
      if (searchResults.classList.contains("hidden")) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightIndex = Math.min(highlightIndex + 1, searchResultsData.length - 1);
        updateHighlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightIndex = Math.max(highlightIndex - 1, 0);
        updateHighlight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = searchResultsData[highlightIndex >= 0 ? highlightIndex : 0];
        if (selected) selectSekolah(selected);
      } else if (e.key === "Escape") {
        searchResults.classList.add("hidden");
      }
    });

    document.addEventListener("click", function (e) {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add("hidden");
      }
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener("click", function () {
      searchInput.value = "";
      btnClearSearch.classList.add("hidden");
      searchResults.classList.add("hidden");
      searchInput.focus();
    });
  }

  // Pilih sekolah pertama saat halaman pertama kali dibuka
  (async function initFirstSchool() {
    try {
      const res = await fetch("/api/sekolah-list?limit=1");
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list) && list.length) {
        searchInput.value = `${list[0].nama} (${list[0].npsn})`;
        if (metaSekolah) metaSekolah.innerText = list[0].nama;
        if (btnClearSearch) btnClearSearch.classList.remove("hidden");
        await fetchSekolahTrend(list[0].npsn);
      }
    } catch (err) {
      console.error("❌ Error Init Sekolah:", err);
    }
  })();

  async function fetchSekolahTrend(npsn) {
    if (!npsn) return;

    try {
      const res = await fetch(`/api/sekolah-trend?npsn=${encodeURIComponent(npsn)}`);
      if (!res.ok) throw new Error("Gagal mengambil data tren sekolah");

      const data = await res.json();
      const info = data.info || {};
      const indikatorList = data.indikator_list || [];
      const chart = data.chart || { labels: [], capaian_2025: [], capaian_2026: [] };

      if (metaNpsn) metaNpsn.innerText = `NPSN: ${info.npsn || "-"}`;
      if (metaWilayah) metaWilayah.innerText = `Kabupaten/Kota: ${info.kabupaten_kota || "-"}`;
      if (metaKecamatan) metaKecamatan.innerText = `Kecamatan: ${info.kecamatan || "-"}`;

      // Card Literasi (A.1) & Numerasi (A.2) - data real dari DB
      const litItem = indikatorList.find((i) => String(i.kode).startsWith("A.1")) || {};
      const numItem = indikatorList.find((i) => String(i.kode).startsWith("A.2")) || {};

      setCapaianCard(valLitScore, badgeLit, valLitPct, litItem.capaian_2026, litItem.perubahan_2026, litItem.status_tren);
      setCapaianCard(valNumScore, badgeNum, valNumPct, numItem.capaian_2026, numItem.perubahan_2026, numItem.status_tren);

      // Card Rata-rata Perubahan - dihitung dari data real DB
      if (valSiswaTotal) {
        if (data.avg_perubahan != null) {
          const sign = data.avg_perubahan > 0 ? "+" : "";
          valSiswaTotal.innerText = `${sign}${String(data.avg_perubahan).replace(".", ",")}%`;
        } else {
          valSiswaTotal.innerText = "Tidak Tersedia";
        }
      }
      if (badgeSiswa && valSiswaPct) {
        badgeSiswa.className = "px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200";
        valSiswaPct.innerText = `Dari ${data.indikator_terisi || 0} indikator`;
      }

      if (trendChart) {
        trendChart.data.labels = chart.labels || [];
        trendChart.data.datasets[0].data = chart.capaian_2025 || [];
        trendChart.data.datasets[1].data = chart.capaian_2026 || [];
        trendChart.update();
      }

      renderIndikatorList(indikatorList);

    } catch (err) {
      console.error("❌ Error Fetch Trend:", err);
    }
  }
});