const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userStore = require('../userStore');

const JWT_SECRET = 'your-secret-key';
const JWT_EXPIRES_IN = '1h';

exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.log(`[REGISTER] Checking if user exists: ${username}`);
        console.log(`[REGISTER] Current users:`, userStore.users.map(u => u.username));

        const existingUser = userStore.users.find(user => user.username === username);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: userStore.userIdCounter++,
            username,
            password: hashedPassword
        };

        userStore.users.push(newUser);

        console.log(`[REGISTER] Created user: ${username} with ID: ${newUser.id}`);

        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000
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

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.log(`[LOGIN] Attempt for user: ${username}`);
        console.log(`[LOGIN] Available users:`, userStore.users.map(u => ({ username: u.username, id: u.id })));

        const user = userStore.users.find(user => user.username === username);
        if (!user) {
            console.log(`[LOGIN] User ${username} not found in userStore`);
            console.log(`[LOGIN] userStore.users:`, userStore.users);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log(`[LOGIN] Found user:`, { id: user.id, username: user.username });
        console.log(`[LOGIN] Stored password hash: ${user.password}`);

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log(`[LOGIN] Password validation result: ${isPasswordValid}`);

        if (!isPasswordValid) {
            console.log(`[LOGIN] Password invalid for user: ${username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000
        });

        console.log(`[LOGIN] Successfully logged in user: ${username}`);

        res.json({ 
            message: 'Login successful',
            user: { id: user.id, username: user.username }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
};

exports.getMe = (req, res) => {
    res.json({ user: req.user });
};