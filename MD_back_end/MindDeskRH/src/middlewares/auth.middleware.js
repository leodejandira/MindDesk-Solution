const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // pega o token do "Bearer <token>"

    if (!token)
        return res.status(401).json({ error: 'Token não fornecido.'})

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded // Anexa os dados do usuário na requisição
        next()
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido ou expirado.'})
    }
}

function adminMiddleware(req, res, next) {
    if (req.user.role !=='admin')
        return res.status(403).json({ error: 'Acesso restrito a admins.'})
    next()
}

module.exports = {authMiddleware, adminMiddleware}