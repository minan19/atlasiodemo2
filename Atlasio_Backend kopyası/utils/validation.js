const { validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(400).json({ error: first.msg, field: first.param });
  }
  return next();
}

module.exports = { handleValidation };
