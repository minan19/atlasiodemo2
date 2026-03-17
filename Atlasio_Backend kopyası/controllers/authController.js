// ==============================================================================
// ATLASIO GLOBAL LANGUAGE HUB - OTONOM KİMLİK DOĞRULAMA (authController.js)
// Hassasiyet: Kriptografik Şifreleme, JWT Otorizasyonu, SQL Injection Koruması
// ==============================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const logger = require('../logger');

exports.register = async (req, res) => {
    try {
        const { first_name, last_name, email, password, role } = req.body;
        if (!first_name || !last_name || !email || !password || !role) {
            return res.status(400).json({ error: 'Kritik hata: Tüm alanların doldurulması zorunludur.' });
        }

        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ error: 'Bu e-posta adresi sistemde zaten kayıtlı.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await db.query(
            'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, email, role',
            [first_name, last_name, email, password_hash, role]
        );

        const token = jwt.sign(
            { user: { id: newUser.rows[0].id, role: newUser.rows[0].role } },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '12h' },
        );

        res.status(201).json({ status: 'success', message: 'Kullanıcı başarıyla Atlasio ağına eklendi.', token, user: newUser.rows[0] });
    } catch (err) {
        logger.error({ err }, '[ATLASIO AUTH ERROR] register failed');
        res.status(500).json({ error: 'Sistem hatası. Lütfen daha sonra tekrar deneyin.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
        }

        const token = jwt.sign(
            { user: { id: user.rows[0].id, role: user.rows[0].role } },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '12h' },
        );
        delete user.rows[0].password_hash;

        res.status(200).json({ status: 'success', message: 'Oturum başarıyla açıldı.', token, user: user.rows[0] });
    } catch (err) {
        logger.error({ err }, '[ATLASIO AUTH ERROR] login failed');
        res.status(500).json({ error: 'Sistem hatası. Lütfen daha sonra tekrar deneyin.' });
    }
};
