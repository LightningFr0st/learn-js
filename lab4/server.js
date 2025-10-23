const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const path = require('path');
const taskStore = require('./taskStore');
const userStore = require('./userStore');
const tasksController = require('./controllers/tasksController');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;
const JWT_SECRET = 'your-secret-key';

tasksController.setIO(io);

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

app.use('/api/auth', authRouter);
app.use('/api/tasks', require('./middleware/auth'), tasksRouter);

app.get('/{*any}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.use((socket, next) => {
  const handshake = socket.request;
  cookieParser()(handshake, {}, (err) => {
    if (err) return next(err);
    
    const token = handshake.cookies.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.username} connected`);

  const userTasks = taskStore.tasks.filter(task => task.userId === socket.user.userId);
  socket.emit('tasks:load', userTasks);

  socket.on('task:create', async (taskData, callback) => {
    const { title, dueDate } = taskData;
    
    if (!title) {
      return callback({ error: 'Title is required' });
    }

    const newTask = {
      id: taskStore.idCounter++,
      title,
      status: 'pending',
      dueDate: dueDate || null,
      attachments: [],
      userId: socket.user.userId
    };

    taskStore.tasks.push(newTask);
    
    const userTasks = taskStore.tasks.filter(task => task.userId === socket.user.userId);
    const userSockets = getSocketsByUserId(socket.user.userId);
    userSockets.forEach(sock => sock.emit('tasks:load', userTasks));
    
    callback({ success: true });
  });

  socket.on('task:update', async (updateData, callback) => {
    const task = taskStore.tasks.find(t => t.id === updateData.id && t.userId === socket.user.userId);
    
    if (!task) {
      return callback({ error: 'Task not found or access denied' });
    }

    Object.assign(task, updateData);
    
    const userTasks = taskStore.tasks.filter(task => task.userId === socket.user.userId);
    const userSockets = getSocketsByUserId(socket.user.userId);
    userSockets.forEach(sock => sock.emit('tasks:load', userTasks));
    
    callback({ success: true });
  });

  socket.on('task:delete', async (taskId, callback) => {
    const index = taskStore.tasks.findIndex(t => t.id === taskId && t.userId === socket.user.userId);
    
    if (index === -1) {
      return callback({ error: 'Task not found or access denied' });
    }

    const task = taskStore.tasks[index];
    
    if (task.attachments && task.attachments.length > 0) {
      for (const attachment of task.attachments) {
        const filePath = path.join('uploads', attachment.filename);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`Error deleting file ${filePath}:`, err);
          }
        }
      }
    }

    taskStore.tasks.splice(index, 1);
    
    const userTasks = taskStore.tasks.filter(task => task.userId === socket.user.userId);
    const userSockets = getSocketsByUserId(socket.user.userId);
    userSockets.forEach(sock => sock.emit('tasks:load', userTasks));
    
    callback({ success: true });
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.user.username} disconnected`);
  });
});

function getSocketsByUserId(userId) {
  const sockets = [];
  io.sockets.sockets.forEach(socket => {
    if (socket.user && socket.user.userId === userId) {
      sockets.push(socket);
    }
  });
  return sockets;
}

server.listen(PORT, () => {
  console.log(`Server running with WebSocket support on port ${PORT}`);
});