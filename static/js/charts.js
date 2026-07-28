let barChartInstance = null;
let doughnutChartInstance = null;

function renderBarChart(containerId, labels, values) {
    const canvas = document.getElementById(containerId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (barChartInstance) {
        barChartInstance.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#6366f1');

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah',
                data: values,
                backgroundColor: gradient,
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: 38,       // Bikin batang gemuk & pas
                categoryPercentage: 0.65,  // Merapatkan jarak antar kategori (hilangin sosial distancing)
                barPercentage: 0.85
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    padding: 10,
                    cornerRadius: 8,
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 12 },
                    displayColors: false,
                    callbacks: {
                        label: (context) => ` Total: ${context.raw.toLocaleString('id-ID')}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 11, family: 'Inter, sans-serif' },
                        color: '#64748b',
                        maxRotation: 20,
                        minRotation: 0,
                        autoSkip: false
                    }
                },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        font: { size: 11, family: 'Inter, sans-serif' },
                        color: '#64748b',
                        precision: 0,
                        callback: (val) => val.toLocaleString('id-ID')
                    },
                    border: { dash: [4, 4], display: false }
                }
            }
        }
    });
}

function renderDoughnutChart(containerId, legendId, labels, values) {
    const canvas = document.getElementById(containerId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (doughnutChartInstance) {
        doughnutChartInstance.destroy();
    }

    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b', '#14b8a6', '#a855f7'];
    const backgroundColors = labels.map((_, idx) => palette[idx % palette.length]);

    doughnutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (context) => ` ${context.label}: ${context.raw.toLocaleString('id-ID')}`
                    }
                }
            }
        }
    });

    // Custom Legend UI Ringkas
    const legendContainer = document.getElementById(legendId);
    if (legendContainer) {
        legendContainer.innerHTML = labels.map((lbl, idx) => `
            <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${palette[idx % palette.length]}"></span>
                    <span class="text-[11px] font-medium text-slate-600 truncate">${lbl}</span>
                </div>
                <span class="text-[11px] font-bold text-slate-800 ml-1">${values[idx].toLocaleString('id-ID')}</span>
            </div>
        `).join('');
    }
}