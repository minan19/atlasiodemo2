// ==============================================================================
// ATLASIO GLOBAL LANGUAGE HUB - OTONOM GÜVENLİK KALKANI (authMiddleware.js)
// Hassasiyet: Geçersiz veya süresi dolmuş istekleri %100 oranında engeller.
// ==============================================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = async (req, res, next) => {
    try {
        const jwtToken = req.header("Authorization");

        if (!jwtToken) {
            console.warn('[ATLASIO SECURITY] Yetkisiz erişim girişimi engellendi.');
            return res.status(403).json({ error: "Erişim Reddedildi. Güvenlik doğrulaması başarısız." });
        }

        const tokenString = jwtToken.split(" ")[1] || jwtToken;
        const payload = jwt.verify(tokenString, process.env.JWT_SECRET);
        
        req.user = payload.user;
        next();
    } catch (err) {
        console.error('[ATLASIO SECURITY WARNING] Geçersiz Token tespiti:', err.message);
        return res.status(401).json({ error: "Geçersiz veya süresi dolmuş oturum." });
    }
};