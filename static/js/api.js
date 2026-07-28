async function fetchDapodikData() {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error("Gagal mengambil data dari server");
    return await response.json();
}