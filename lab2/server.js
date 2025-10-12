const express = require('express');
const tasksRouter = require('./routes/tasks');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

app.use('/api/tasks', tasksRouter);

app.all('/{*any}', (req, res, next)  => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});