const express = require('express');
const tasksRouter = require('./routes/tasks');
const authRouter = require('./routes/auth'); // Добавьте эту строку
const cookieParser = require('cookie-parser'); // Добавьте эту строку
const authenticateToken = require('./middleware/auth'); // Добавьте эту строку
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cookieParser()); // Добавьте эту строку
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Маршруты аутентификации (публичные)
app.use('/api/auth', authRouter); // Добавьте эту строку

// Защищенные маршруты (требуют аутентификации) :cite[5]
app.use('/api/tasks', authenticateToken, tasksRouter); // Добавьте authenticateToken

app.all('/{*any}', (req, res, next)  => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});