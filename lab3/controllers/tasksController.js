const fs = require('fs').promises;
const path = require('path');

// Временное хранилище в памяти
let tasks = [];
let idCounter = 1;

// Получение всех задач с фильтрацией (только для текущего пользователя)
exports.getTasks = (req, res) => {
    const { status } = req.query;
    
    // Фильтруем задачи по userId из JWT токена
    let userTasks = tasks.filter(task => task.userId === req.user.userId);
    
    if (status) {
        userTasks = userTasks.filter(task => task.status === status);
    }
    
    res.json(userTasks); // Исправлено: было filteredTasks, должно быть userTasks
};

// Создание новой задачи (привязывается к текущему пользователю)
exports.createTask = (req, res) => {
    const { title, dueDate } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const newTask = {
        id: idCounter++,
        title,
        status: 'pending',
        dueDate: dueDate || null,
        attachments: [],
        userId: req.user.userId // ДОБАВЛЕНО: привязываем задачу к пользователю
    };

    tasks.push(newTask);
    res.status(201).json(newTask);
};

// Обновление задачи (только если принадлежит пользователю)
exports.updateTask = (req, res) => {
    const { id } = req.params;
    const { title, status, dueDate } = req.body;
    
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    // Проверяем, что задача принадлежит текущему пользователю
    if (task.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (title) task.title = title;
    if (status) task.status = status;
    if (dueDate) task.dueDate = dueDate;

    res.json(task);
};

// Удаление задачи (только если принадлежит пользователю)
exports.deleteTask = async (req, res) => {
    const { id } = req.params;
    const taskId = parseInt(id);
    const index = tasks.findIndex(t => t.id === taskId);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[index];

    // Проверяем, что задача принадлежит текущему пользователю
    if (task.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Удаляем прикрепленные файлы
    if (task.attachments && task.attachments.length > 0) {
        for (const attachment of task.attachments) {
            const filePath = path.join('uploads', attachment.filename);
            console.log(filePath);
            try {
                await fs.unlink(filePath);
                console.log(`File ${filePath} deleted`);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error(`Error deleting file ${filePath}:`, err);
                }
            }
        }
    }

    tasks.splice(index, 1);
    res.status(204).send();
};

// Добавление файла к задаче (только если принадлежит пользователю)
exports.uploadFile = (req, res) => {
    const { id } = req.params;
    
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    // Проверяем, что задача принадлежит текущему пользователю
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

    task.attachments.push(attachment);
    res.json(attachment);
};