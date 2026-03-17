// ==============================================================================
// ATLASIO GLOBAL LANGUAGE HUB - OTONOM KİMLİK DOĞRULAMA (authController.js)
// Hassasiyet: Kriptografik Şifreleme, JWT Otorizasyonu, SQL Injection Koruması
// ==============================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

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

        const token = jwt.sign({ user: { id: newUser.rows[0].id } }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        res.status(201).json({ status: 'success', message: 'Kullanıcı başarıyla Atlasio ağına eklendi.', token, user: newUser.rows[0] });
    } catch (err) {
        console.error('[ATLASIO AUTH ERROR]', err.message);
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

        const token = jwt.sign({ user: { id: user.rows[0].id } }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        delete user.rows[0].password_hash;

        res.status(200).json({ status: 'success', message: 'Oturum başarıyla açıldı.', token, user: user.rows[0] });
    } catch (err) {
        console.error('[ATLASIO AUTH ERROR]', err.message);
        res.status(500).json({ error: 'Sistem hatası. Lütfen daha sonra tekrar deneyin.' });
    }
};