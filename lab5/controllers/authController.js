const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userStore = require('../userStore');

const JWT_SECRET = 'your-secret-key';

exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existingUser = await userStore.findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await userStore.createUser(username, hashedPassword);

        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username },
            JWT_SECRET
        );

        res.cookie('token', token, { httpOnly: true });
        res.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await userStore.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET
        );

        res.cookie('token', token, { httpOnly: true });
        res.json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
};

exports.getMe = (req, res) => {
    res.json({ user: req.user });
};