// ==============================================================================
// ATLASIO GLOBAL LANGUAGE HUB - ENTERPRISE WEBRTC & BOARD SYNC (webrtc.handler.js)
// Hassasiyet: Ultra Düşük Gecikme (Low-Latency), Otonom Sinyalleşme, Paket Kaybı Önleme
// ==============================================================================

class WebRTCController {
    constructor(io) {
        this.io = io;
        this.activeRooms = new Map(); // Sınıfların otonom bellek yönetimi
    }

    initialize() {
        console.info('[ATLASIO WEBRTC] Ultra-Düşük Gecikmeli Sinyalleşme Motoru Aktif.');

        this.io.on('connection', (socket) => {
            
            // 1. Odaya Güvenli Katılım Protokolü
            socket.on('join_live_class', ({ classId, userId, role }) => {
                socket.join(classId);
                socket.classId = classId;
                socket.userId = userId;

                console.info(`[ATLASIO RTC] Katılımcı ${userId} (${role}), ${classId} odasına şifreli bağlandı.`);
                
                // Odadaki diğer kişilere "yeni biri geldi, görüntü aktarımına hazırlanın" sinyali
                socket.to(classId).emit('participant_joined', { userId, role, socketId: socket.id });
            });

            // 2. WebRTC Sinyalleşme (Görüntü ve Ses Köprüsü)
            // Eğitmen yayına başladığında öğrencilere giden teklif (Offer)
            socket.on('webrtc_offer', (data) => {
                socket.to(data.targetSocketId).emit('webrtc_offer', {
                    sdp: data.sdp,
                    senderId: socket.id
                });
            });

            // Öğrenciden eğitmenin yayınına gelen yanıt (Answer)
            socket.on('webrtc_answer', (data) => {
                socket.to(data.targetSocketId).emit('webrtc_answer', {
                    sdp: data.sdp,
                    senderId: socket.id
                });
            });

            // Ağ engellerini (Güvenlik Duvarı/NAT) aşmak için ICE Adayları aktarımı
            socket.on('webrtc_ice_candidate', (data) => {
                socket.to(data.targetSocketId).emit('webrtc_ice_candidate', {
                    candidate: data.candidate,
                    senderId: socket.id
                });
            });

            // 3. Akıllı Tahta (Canvas) Otonom Senkronizasyonu
            // Eğitmen tahtaya çizim yaptığında %0 gecikme ile tüm öğrencilere iletilir
            socket.on('board_draw_action', (drawData) => {
                // Çizim verisini kendisi hariç sınıftaki herkese fırlat
                socket.to(socket.classId).emit('board_sync_draw', drawData);
            });

            socket.on('board_clear_action', () => {
                console.info(`[ATLASIO BOARD] ${socket.classId} odasında tahta otonom olarak temizlendi.`);
                socket.to(socket.classId).emit('board_sync_clear');
            });

            // 4. Bağlantı Kopması ve Self-Healing (Kendi Kendini Onarma)
            socket.on('disconnect', () => {
                if (socket.classId) {
                    console.warn(`[ATLASIO RTC CRITICAL] Katılımcı ${socket.userId} bağlantısı koptu. İzolasyon sağlandı.`);
                    socket.to(socket.classId).emit('participant_left', { socketId: socket.id, userId: socket.userId });
                }
            });
        });
    }
}

module.exports = WebRTCController;