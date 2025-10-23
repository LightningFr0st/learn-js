const taskStore = require('../taskStore');

let io = null;

exports.setIO = (socketIO) => {
    io = socketIO;
};

exports.uploadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const task = taskStore.tasks.find(t => t.id === parseInt(id));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/uploads/${req.file.filename}`
    };

    if (!task.attachments) {
      task.attachments = [];
    }
    task.attachments.push(attachment);

    if (io) {
      const userTasks = taskStore.tasks.filter(t => t.userId === req.user.userId);
      const userSockets = getSocketsByUserId(io, req.user.userId);
      userSockets.forEach(socket => socket.emit('tasks:load', userTasks));
    }

    res.json(attachment);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function getSocketsByUserId(io, userId) {
  const sockets = [];
  io.sockets.sockets.forEach(socket => {
    if (socket.user && socket.user.userId === userId) {
      sockets.push(socket);
    }
  });
  return sockets;
}