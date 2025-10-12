const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const JWT_SECRET = 'your-secret-key';
const JWT_EXPIRES_IN = '1h';
const USERS_FILE = path.join(__dirname, 'users.json');

async function loadUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function saveUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function getNextUserId() {
    const users = await loadUsers();
    if (users.length === 0) return 1;
    return Math.max(...users.map(user => user.id)) + 1;
}

let users = [];
let userIdCounter = 1;

loadUsers().then(loadedUsers => {
    users = loadedUsers;
    if (users.length > 0) {
        userIdCounter = Math.max(...users.map(user => user.id)) + 1;
    }
    console.log(`Loaded ${users.length} users from storage`);
}).catch(error => {
    console.error('Error loading users:', error);
});

exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existingUser = users.find(user => user.username === username);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: userIdCounter++,
            username,
            password: hashedPassword
        };

        users.push(newUser);
        await saveUsers(users);

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

        const user = users.find(user => user.username === username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
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