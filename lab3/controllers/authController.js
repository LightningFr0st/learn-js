const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key';
const JWT_EXPIRES_IN = '1h';

// Временное хранилище пользователей :cite[9]
let users = [];
let userIdCounter = 1;

// Регистрация нового пользователя
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Проверяем, существует ли пользователь
        const existingUser = users.find(user => user.username === username);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Хешируем пароль :cite[3]
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создаем пользователя
        const newUser = {
            id: userIdCounter++,
            username,
            password: hashedPassword
        };

        users.push(newUser);

        // Генерируем JWT токен :cite[1]:cite[5]
        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Устанавливаем токен в httpOnly cookie :cite[1]:cite[6]
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // В production установите true для HTTPS
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 час
        });

        res.status(201).json({ 
            message: 'User registered successfully',
            user: { id: newUser.id, username: newUser.username }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Вход пользователя
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Ищем пользователя
        const user = users.find(user => user.username === username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Проверяем пароль :cite[3]
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Генерируем JWT токен :cite[1]
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Устанавливаем токен в httpOnly cookie :cite[1]:cite[6]
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 час
        });

        res.json({ 
            message: 'Login successful',
            user: { id: user.id, username: user.username }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Выход пользователя :cite[1]
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
};

// Получение информации о текущем пользователе
exports.getMe = (req, res) => {
    res.json({ user: req.user });
};