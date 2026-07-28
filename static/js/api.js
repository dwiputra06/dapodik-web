async function fetchDapodikData() {
    try {
        // Disesuaikan dengan endpoint Flask: /api/dapodik
        const response = await fetch('/api/dapodik'); 
        
        if (!response.ok) {
            throw new Error(`Gagal mengambil data dari server (Status: ${response.status})`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Error pada fetchDapodikData:", error);
        throw error; // Re-throw agar bisa ditangani oleh fungsi pemanggil
    }
}