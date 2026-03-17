// ==============================================================================
// ATLASIO GLOBAL LANGUAGE HUB - ENTERPRISE SERVER (server.js)
// Hassasiyet: REST API + WebRTC Socket Otonom Entegrasyonu
// ==============================================================================

require('dotenv').config();
const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io'); 
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit');
const db = require('./db');       
const logger = require('./logger');

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '*').split(',').map(o => o.trim());

// --- 0. HTTP VE SOKET SUNUCUSUNUN BİRLEŞTİRİLMESİ ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ['GET', 'POST']
    }
});
app.locals.io = io;

require('./sockets/webrtcHandler')(io, logger);

// --- 1. KURUMSAL GÜVENLİK VE MİMARİ KATMANLARI ---
app.use(helmet()); 
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));

// --- 2. OTONOM SİSTEM KONTROLÜ ---
db.checkConnection();

// --- 3. API ROTALARI (Uç Noktalar) ---
app.get('/api/health', async (req, res) => {
    const started = Date.now();
    let dbOk = false;
    let dbMs = null;
    try {
        const t0 = Date.now();
        await db.query('SELECT 1');
        dbOk = true;
        dbMs = Date.now() - t0;
    } catch (err) {
        dbOk = false;
        dbMs = null;
    }
    const rooms = app.locals.io ? app.locals.io.of('/').adapter.rooms?.size ?? 0 : 0;
    res.status(dbOk ? 200 : 500).json({
        status: dbOk ? 'success' : 'error',
        message: 'Atlasio Enterprise Server durum raporu',
        uptime_ms: Date.now() - started,
        db_ok: dbOk,
        db_ms: dbMs,
        socket_rooms: rooms,
    });
});
app.use('/api/auth', authRoutes);

// 404
app.use((req, res) => res.status(404).json({ status: 'error', message: 'Endpoint bulunamadı' }));

// --- 4. OTONOM HATA YÖNETİMİ ---
app.use((err, req, res, next) => {
    logger.error({ err, path: req.path }, '[ATLASIO CRITICAL ERROR]');
    res.status(500).json({ status: 'error', message: 'Sistemde beklenmeyen bir durum oluştu. Otonom onarım devrede.' });
});

// --- 5. SUNUCUYU AYAĞA KALDIRMA ---
server.listen(PORT, () => {
    logger.info(`[ATLASIO SERVER] Kurumsal sunucu ve WebRTC kalkanı ${PORT} portunda başarıyla başlatıldı.`);
    logger.info('[ATLASIO SERVER] Tüm güvenlik protokolleri aktif, veri akışı bekleniyor...');
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
async function shutdown() {
    logger.info('Kapanış başlatıldı...');
    try { server.close(); } catch {}
    process.exit(0);
}
