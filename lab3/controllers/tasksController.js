const fs = require('fs').promises;
const path = require('path');

const TASKS_FILE = path.join(__dirname, 'tasks.json');

async function loadTasks() {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return {
            tasks: parsed.tasks || [],
            idCounter: parsed.idCounter || 1
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { tasks: [], idCounter: 1 };
        }
        throw error;
    }
}

async function saveTasks(tasks, idCounter) {
    await fs.writeFile(TASKS_FILE, JSON.stringify({ tasks, idCounter }, null, 2), 'utf8');
}

let tasks = [];
let idCounter = 1;

loadTasks().then(loadedData => {
    tasks = loadedData.tasks;
    idCounter = loadedData.idCounter;
    console.log(`Loaded ${tasks.length} tasks from storage`);
}).catch(error => {
    console.error('Error loading tasks:', error);
});

async function persistTasks() {
    try {
        await saveTasks(tasks, idCounter);
    } catch (error) {
        console.error('Error saving tasks:', error);
    }
}

exports.getTasks = async (req, res) => {
    const { status } = req.query;
    
    let userTasks = tasks.filter(task => task.userId === req.user.userId);
    
    if (status) {
        userTasks = userTasks.filter(task => task.status === status);
    }
    
    res.json(userTasks);
};

exports.createTask = async (req, res) => {
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
        userId: req.user.userId
    };

    tasks.push(newTask);
    await persistTasks();

    res.status(201).json(newTask);
};

exports.updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, status, dueDate } = req.body;
    
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (title) task.title = title;
    if (status) task.status = status;
    if (dueDate) task.dueDate = dueDate;

    await persistTasks();
    res.json(task);
};

exports.deleteTask = async (req, res) => {
    const { id } = req.params;
    const taskId = parseInt(id);
    const index = tasks.findIndex(t => t.id === taskId);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[index];

    if (task.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
    }

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
    await persistTasks();
    res.status(204).send();
};

exports.uploadFile = async (req, res) => {
    const { id } = req.params;
    
    const task = tasks.find(t => t.id === parseInt(id));
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

    task.attachments.push(attachment);
    await persistTasks();
    res.json(attachment);
};