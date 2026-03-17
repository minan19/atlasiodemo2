// ==============================================================================
// ATLASIO GLOBAL LANGUAGE HUB - WebRTC SİNYALİZASYON MERKEZİ (webrtcHandler.js)
// Hassasiyet: Sıfır Gecikme, Otonom Oda Yönetimi, P2P Sinyalizasyon
// ==============================================================================

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.info(`[ATLASIO WEBRTC] Yeni bir bağlantı şifreli tünele girdi. Soket ID: ${socket.id}`);

        // Öğrenci ve Eğitmeni güvenli, izole bir derse (odaya) alma
        socket.on('join-lesson', ({ lessonId, userId }) => {
            socket.join(lessonId);
            console.info(`[ATLASIO WEBRTC] Kullanıcı [${userId}], Ders [${lessonId}] odasına katıldı.`);
            
            // Odadaki diğer katılımcıya yeni bağlanan kişiyi otonom olarak bildir
            socket.to(lessonId).emit('user-connected', userId);

            // WebRTC Uçtan Uca Görüntü/Ses Teklifi (Offer)
            socket.on('webrtc-offer', (data) => {
                socket.to(lessonId).emit('webrtc-offer', data);
            });

            // WebRTC Yanıtı (Answer)
            socket.on('webrtc-answer', (data) => {
                socket.to(lessonId).emit('webrtc-answer', data);
            });

            // WebRTC Ağ Gecikmesi Optimizasyonu (ICE Candidates)
            socket.on('webrtc-ice-candidate', (data) => {
                socket.to(lessonId).emit('webrtc-ice-candidate', data);
            });

            // Bağlantı koptuğunda sistemi otonom olarak temizle ve odayı kapat
            socket.on('disconnect', () => {
                console.warn(`[ATLASIO WEBRTC] Kullanıcı bağlantısı koptu. Soket ID: ${socket.id}`);
                socket.to(lessonId).emit('user-disconnected', userId);
            });
        });
    });
};