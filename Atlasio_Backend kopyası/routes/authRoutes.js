// ==============================================================================
// ATLASIO GLOBAL LANGUAGE HUB - KİMLİK DOĞRULAMA ROTALARI (authRoutes.js)
// Hassasiyet: Uç nokta güvenliği, doğrudan controller entegrasyonu.
// ==============================================================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// İlgili modülleri otonom olarak sisteme dahil ediyoruz
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const { handleValidation } = require('../utils/validation');

// 1. Herkese Açık Rotalar (Kayıt ve Giriş)
// Kullanıcılar bu uç noktalara token olmadan, güvenli bir şekilde erişebilir.
router.post(
    '/register',
    [
        body('first_name').trim().isLength({ min: 2 }).withMessage('İsim gerekli'),
        body('last_name').trim().isLength({ min: 2 }).withMessage('Soyisim gerekli'),
        body('email').isEmail().withMessage('Geçerli e-posta gerekli'),
        body('password').isLength({ min: 8 }).withMessage('Parola en az 8 karakter olmalı'),
        body('role').isIn(['admin', 'instructor', 'student', 'guardian', 'head-instructor']).withMessage('Geçersiz rol'),
    ],
    handleValidation,
    authController.register,
);
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Geçerli e-posta gerekli'),
        body('password').isLength({ min: 6 }).withMessage('Parola gerekli'),
    ],
    handleValidation,
    authController.login,
);

// 2. Korumalı Rotalar (Sistemin Kalbi)
// Otonom Kalkan (authMiddleware) devrede. Sadece geçerli JWT Token'ı olanlar girebilir.
router.get('/profile', authMiddleware, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Güvenli profil verisine başarıyla erişildi.',
        user_id: req.user.id,
        role: req.user.role,
    });
});

// Örnek korumalı rota: sadece admin ve baş eğitmen
router.get('/admin/ping', authMiddleware, requireRole(['admin', 'head-instructor']), (req, res) => {
    res.status(200).json({ status: 'success', message: 'Admin erişimi onaylandı.' });
});

module.exports = router;
