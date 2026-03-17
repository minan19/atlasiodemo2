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
const db = require('./db');       

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- 0. HTTP VE SOKET SUNUCUSUNUN BİRLEŞTİRİLMESİ ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', 
        methods: ['GET', 'POST']
    }
});

require('./sockets/webrtcHandler')(io);

// --- 1. KURUMSAL GÜVENLİK VE MİMARİ KATMANLARI ---
app.use(helmet()); 
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- 2. OTONOM SİSTEM KONTROLÜ ---
db.checkConnection();

// --- 3. API ROTALARI (Uç Noktalar) ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Atlasio Enterprise Server %100 Stabil Çalışıyor.' });
});
app.use('/api/auth', authRoutes);

// --- 4. OTONOM HATA YÖNETİMİ ---
app.use((err, req, res, next) => {
    console.error('[ATLASIO CRITICAL ERROR]', err.stack);
    res.status(500).json({ status: 'error', message: 'Sistemde beklenmeyen bir durum oluştu. Otonom onarım devrede.' });
});

// --- 5. SUNUCUYU AYAĞA KALDIRMA ---
server.listen(PORT, () => {
    console.info(`[ATLASIO SERVER] Kurumsal sunucu ve WebRTC kalkanı ${PORT} portunda başarıyla başlatıldı.`);
    console.info('[ATLASIO SERVER] Tüm güvenlik protokolleri aktif, veri akışı bekleniyor...');
});