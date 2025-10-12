const express = require('express');
const tasksRouter = require('./routes/tasks');
const authRouter = require('./routes/auth');
const cookieParser = require('cookie-parser');
const authenticateToken = require('./middleware/auth');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

app.use('/api/auth', authRouter);

app.use('/api/tasks', authenticateToken, tasksRouter);

app.all('/{*any}', (req, res, next)  => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});