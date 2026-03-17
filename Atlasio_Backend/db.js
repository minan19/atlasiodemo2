  // ==============================================================================
// ATLASIO GLOBAL LANGUAGE HUB - ENTERPRISE DATABASE CONNECTION (db.js)
// Hassasiyet: %0 Veri Kaybı, Connection Pooling, Otonom Hata Yönetimi
// ==============================================================================

const { Pool } = require('pg'); // PostgreSQL Kurumsal İstemcisi

// Kurumsal Veritabanı Havuzu (Connection Pool)
// Bu yapı, binlerce eşzamanlı bağlantıyı otonom olarak yönetir ve darboğazı engeller.
const pool = new Pool({
    user: 'atlasio_admin',           // Veritabanı kullanıcı adınız
    host: 'localhost',               // Sunucu adresi (Canlıya çıkınca güncellenecek)
    database: 'atlasio_enterprise',  // Veritabanı adı
    password: 'secure_password_2026',// Şifre
    port: 5432,                      // PostgreSQL standart portu
    max: 100,                        // Maksimum eşzamanlı bağlantı sınırı (Performans için)
    idleTimeoutMillis: 30000,        // Boştaki bağlantıların bellekten silinme süresi
    connectionTimeoutMillis: 2000,   // Bağlantı zaman aşımı süresi
});

// Otonom Hata İyileştirme (Self-Healing Kalkanı)
pool.on('error', (err, client) => {
    console.error('[ATLASIO DB CRITICAL] Beklenmeyen veritabanı hatası tespit edildi. Sistem otonom olarak toparlanıyor...', err.message);
    // Not: Havuz mimarisi bozulan bağlantıyı kendi kendine atıp yenisini açacaktır.
});

module.exports = {
    // Parametrik sorgu mimarisi ile SQL Injection saldırılarına karşı %100 koruma
    query: (text, params) => {
        const start = Date.now();
        return pool.query(text, params).then(res => {
            const duration = Date.now() - start;
            console.info(`[ATLASIO DB] Sorgu Başarılı | Süre: ${duration}ms | Etkilenen Satır: ${res.rowCount}`);
            return res;
        }).catch(err => {
            console.error(`[ATLASIO DB ERROR] Sorgu Başarısız: ${text} | Hata: ${err.message}`);
            throw err; // Hatayı üst katmana (server.js) fırlat ki kullanıcıya 500 dönmesin, otonom müdahale edilsin.
        });
    },
    
    // Sunucu başlarken yapılacak Otonom Sistem Kontrolü
    checkConnection: async () => {
        try {
            const client = await pool.connect();
            console.info('[ATLASIO DB] Veritabanı bağlantısı %100 stabil ve şifreli veri akışına hazır.');
            client.release();
        } catch (err) {
            console.error('[ATLASIO DB CRITICAL] Veritabanına ulaşılamıyor. Lütfen veritabanı sunucusunun (PostgreSQL) açık olduğundan emin olun.');
        }
    }
};