const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key'; // В реальном приложении используйте process.env.JWT_SECRET

const authenticateToken = (req, res, next) => {
    // Получаем токен из httpOnly cookie :cite[1]:cite[6]
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Добавляем информацию о пользователе в запрос
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = authenticateToken;