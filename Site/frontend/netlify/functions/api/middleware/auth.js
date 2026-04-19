const jwt = require('jsonwebtoken');

const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // superdev tem acesso apenas às rotas /api/dev
    if (decoded.role === 'superdev') {
      return res.status(403).json({ error: 'Superdev não tem acesso a esta rota' });
    }
    req.usuario = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// Suporta ambos os estilos de import:
// const auth = require('./auth')          → função direta
// const { autenticar } = require('./auth') → nomeado
module.exports = autenticar;
module.exports.autenticar = autenticar;
