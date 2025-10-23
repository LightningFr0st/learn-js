const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'tasks.json');

class TaskStore {
    constructor() {
        this.tasks = [];
        this.idCounter = 1;
        this.initialized = false;
        this.initPromise = this.init();
    }

    async init() {
        try {
            console.log(`[TASKSTORE] Loading tasks from: ${DATA_FILE}`);
            const data = await fs.readFile(DATA_FILE, 'utf8');
            const parsed = JSON.parse(data);
            this.tasks = parsed.tasks || [];
            this.idCounter = parsed.idCounter || 1;
            this.initialized = true;
            console.log(`[TASKSTORE] Successfully loaded ${this.tasks.length} tasks`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('[TASKSTORE] File not found, creating empty one');
                await this.save();
                this.initialized = true;
            } else {
                console.error('[TASKSTORE] Error loading tasks:', error);
            }
        }
    }

    async save() {
        try {
            const data = JSON.stringify({ 
                tasks: this.tasks, 
                idCounter: this.idCounter 
            }, null, 2);
            await fs.writeFile(DATA_FILE, data);
        } catch (error) {
            console.error('[TASKSTORE] Error saving tasks:', error);
        }
    }

    async createTask(taskData) {
        await this.initPromise;
        const newTask = {
            id: this.idCounter++,
            title: taskData.title,
            status: 'pending',
            dueDate: taskData.dueDate || null,
            attachments: [],
            userId: taskData.userId
        };
        this.tasks.push(newTask);
        await this.save();
        return newTask;
    }

    async findTaskById(id) {
        await this.initPromise;
        return this.tasks.find(t => t.id === id);
    }

    async findTasksByUserId(userId, status = null) {
        await this.initPromise;
        let userTasks = this.tasks.filter(task => task.userId === userId);
        if (status) {
            userTasks = userTasks.filter(task => task.status === status);
        }
        return userTasks;
    }

    async updateTask(taskId, updates) {
        await this.initPromise;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return null;

        Object.assign(task, updates);
        await this.save();
        return task;
    }

    async deleteTask(taskId) {
        await this.initPromise;
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index === -1) return false;

        this.tasks.splice(index, 1);
        await this.save();
        return true;
    }

    async addAttachment(taskId, attachment) {
        await this.initPromise;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return null;

        if (!task.attachments) {
            task.attachments = [];
        }
        task.attachments.push(attachment);
        await this.save();
        return attachment;
    }
}

const taskStore = new TaskStore();

module.exports = taskStore;