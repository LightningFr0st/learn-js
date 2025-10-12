const fs = require('fs').promises;
const path = require('path');

// Временное хранилище в памяти (заменится на БД в будущем)
let tasks = [];
let idCounter = 1;

// Получение всех задач с фильтрацией
exports.getTasks = (req, res) => {
    const { status } = req.query;
    let filteredTasks = tasks;
    
    if (status) {
        filteredTasks = tasks.filter(task => task.status === status);
    }
    
    res.json(filteredTasks);
};

// Создание новой задачи
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
        attachments: []
    };

    tasks.push(newTask);
    res.status(201).json(newTask);
};

// Обновление задачи
exports.updateTask = (req, res) => {
    const { id } = req.params;
    const { title, status, dueDate } = req.body;
    
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    if (title) task.title = title;
    if (status) task.status = status;
    if (dueDate) task.dueDate = dueDate;

    res.json(task);
};

// Удаление задачи
exports.deleteTask = async (req, res) => { // Добавьте async
    const { id } = req.params;
    const taskId = parseInt(id);
    const index = tasks.findIndex(t => t.id === taskId);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[index];

    // Удаляем прикрепленные файлы
    if (task.attachments && task.attachments.length > 0) {
        for (const attachment of task.attachments) {
            const filePath = path.join('uploads', attachment.filename); // Используйте path.join
            console.log(filePath);
            try {
                await fs.unlink(filePath); // Удаляем файл
                console.log(`File ${filePath} deleted`);
            } catch (err) {
                // Если файла нет на диске, не прерываем выполнение
                if (err.code !== 'ENOENT') {
                    console.error(`Error deleting file ${filePath}:`, err);
                }
            }
        }
    }

    // Удаляем задачу из массива
    tasks.splice(index, 1);
    res.status(204).send();
};

// Добавление файла к задаче
exports.uploadFile = (req, res) => {
    const { id } = req.params;
    
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
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