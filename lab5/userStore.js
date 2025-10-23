const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'users.json');

class UserStore {
    constructor() {
        this.users = [];
        this.userIdCounter = 1;
        this.initialized = false;
        this.initPromise = this.init();
    }

    async init() {
        try {
            console.log(`[USERSTORE] Loading users from: ${DATA_FILE}`);
            const data = await fs.readFile(DATA_FILE, 'utf8');
            const parsed = JSON.parse(data);
            this.users = parsed.users || [];
            this.userIdCounter = parsed.userIdCounter || 1;
            this.initialized = true;
            console.log(`[USERSTORE] Successfully loaded ${this.users.length} users`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('[USERSTORE] File not found, creating empty one');
                await this.save();
                this.initialized = true;
            } else {
                console.error('[USERSTORE] Error loading users:', error);
            }
        }
    }

    async save() {
        try {
            const data = JSON.stringify({ 
                users: this.users, 
                userIdCounter: this.userIdCounter 
            }, null, 2);
            await fs.writeFile(DATA_FILE, data);
        } catch (error) {
            console.error('[USERSTORE] Error saving users:', error);
        }
    }

    async createUser(username, hashedPassword) {
        await this.initPromise;
        const newUser = {
            id: this.userIdCounter++,
            username,
            password: hashedPassword
        };
        this.users.push(newUser);
        await this.save();
        return newUser;
    }

    async findUserByUsername(username) {
        await this.initPromise;
        return this.users.find(u => u.username === username);
    }

    async getUserById(id) {
        await this.initPromise;
        return this.users.find(u => u.id === id);
    }

    async getAllUsers() {
        await this.initPromise;
        return this.users;
    }
}

const userStore = new UserStore();

module.exports = userStore;