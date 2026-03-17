// ==============================================================================
// ATLASIO GLOBAL LANGUAGE HUB - KİMLİK DOĞRULAMA ROTALARI (authRoutes.js)
// Hassasiyet: Uç nokta güvenliği, doğrudan controller entegrasyonu.
// ==============================================================================

const express = require('express');
const router = express.Router();

// İlgili modülleri otonom olarak sisteme dahil ediyoruz
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// 1. Herkese Açık Rotalar (Kayıt ve Giriş)
// Kullanıcılar bu uç noktalara token olmadan, güvenli bir şekilde erişebilir.
router.post('/register', authController.register);
router.post('/login', authController.login);

// 2. Korumalı Rotalar (Sistemin Kalbi)
// Otonom Kalkan (authMiddleware) devrede. Sadece geçerli JWT Token'ı olanlar girebilir.
router.get('/profile', authMiddleware, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Güvenli profil verisine başarıyla erişildi.',
        user_id: req.user.id
    });
});

module.exports = router;