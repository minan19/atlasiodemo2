"use strict";

// Basit rol kısıtlama helper'ı. authMiddleware sonrası kullanılmalı.
// Örnek: router.get('/admin', authMiddleware, requireRole(['admin']), handler)

function requireRole(allowed = []) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || (allowed.length && !allowed.includes(role))) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }
    next();
  };
}

module.exports = { requireRole };
