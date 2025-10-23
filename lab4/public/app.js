const AUTH_URL = '/api/auth';

let isAuthenticated = false;
let socket;
let currentTasks = [];
let currentFilter = '';

document.addEventListener('DOMContentLoaded', checkAuth);

async function checkAuth() {
    try {
        const response = await fetch(`${AUTH_URL}/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            showApp(data.user);
        } else {
            showAuth();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showAuth();
    }
}

function showApp(user) {
    isAuthenticated = true;
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    const userInfo = document.createElement('div');
    userInfo.innerHTML = `
        <div style="position: absolute; top: 10px; right: 10px; background: #f5f5f5; padding: 10px; border-radius: 5px;">
            ${user.username}
            <button onclick="logout()" style="margin-left: 10px;">Выйти</button>
        </div>
    `;
    document.body.prepend(userInfo);
    
    socket = io();
    
    socket.on('tasks:load', (tasks) => {
        currentTasks = tasks;
        applyFilter();
    });
}

function showAuth() {
    isAuthenticated = false;
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    
    const userInfo = document.querySelector('div[style*="position: absolute; top: 10px; right: 10px;"]');
    if (userInfo) {
        userInfo.remove();
    }
}

function applyFilter() {
    const filterValue = document.getElementById('statusFilter').value;
    currentFilter = filterValue;
    
    let filteredTasks = currentTasks;
    
    if (filterValue) {
        filteredTasks = currentTasks.filter(task => task.status === filterValue);
    }
    
    renderTasks(filteredTasks);
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('auth-message');

    if (!username || !password) {
        showMessage(messageDiv, 'Введите имя пользователя и пароль');
        return;
    }

    try {
        const response = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            showApp(data.user);
            showMessage(messageDiv, 'Вход выполнен успешно', 'success');
        } else {
            const error = await response.json();
            showMessage(messageDiv, error.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage(messageDiv, 'Ошибка при входе');
    }
}

async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('auth-message');

    if (!username || !password) {
        showMessage(messageDiv, 'Введите имя пользователя и пароль');
        return;
    }

    try {
        const response = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            showApp(data.user);
            showMessage(messageDiv, 'Регистрация успешна', 'success');
        } else {
            const error = await response.json();
            showMessage(messageDiv, error.error);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage(messageDiv, 'Ошибка при регистрации');
    }
}

async function logout() {
    try {
        await fetch(`${AUTH_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        showAuth();
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showMessage(element, message, type = 'error') {
    element.textContent = message;
    element.className = type;
    element.classList.remove('hidden');
}

function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p>Нет задач</p>';
        return;
    }

    tasksList.innerHTML = tasks.map(task => `
        <div class="task ${task.status === 'completed' ? 'completed' : ''}" id="task-${task.id}">
            <h3>${task.title}</h3>
            <p>Статус: 
                <select onchange="updateTaskStatus(${task.id}, this.value)">
                    <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>В процессе</option>
                    <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Завершено</option>
                </select>
            </p>
            <p>Дата завершения: ${task.dueDate || 'Не указана'}</p>
            <p>
                Прикрепленные файлы: 
                ${task.attachments && task.attachments.length > 0 
                    ? task.attachments.map(file => 
                        `<a href="${file.path}" target="_blank">${file.originalName}</a>`
                      ).join(', ') 
                    : 'Нет файлов'
                }
            </p>
            <div>
                <input type="file" id="file-${task.id}">
                <button onclick="uploadFile(${task.id})">Прикрепить файл</button>
                <button onclick="deleteTask(${task.id})">Удалить</button>
            </div>
        </div>
    `).join('');
}

async function addTask() {
    const titleInput = document.getElementById('taskTitle');
    const dueDateInput = document.getElementById('taskDueDate');
    
    const taskData = {
        title: titleInput.value,
        dueDate: dueDateInput.value
    };

    if (!taskData.title) {
        alert('Введите название задачи');
        return;
    }

    socket.emit('task:create', taskData, (response) => {
        if (response.success) {
            titleInput.value = '';
            dueDateInput.value = '';
        } else {
            alert('Ошибка при создании задачи: ' + response.error);
        }
    });
}

async function updateTaskStatus(taskId, newStatus) {
    socket.emit('task:update', { id: taskId, status: newStatus }, (response) => {
        if (!response.success) {
            alert('Ошибка при обновлении задачи: ' + response.error);
        }
    });
}

async function deleteTask(taskId) {
    if (!confirm('Удалить задачу?')) return;

    socket.emit('task:delete', taskId, (response) => {
        if (!response.success) {
            alert('Ошибка при удалении задачи: ' + response.error);
        }
    });
}

async function uploadFile(taskId) {
    const fileInput = document.getElementById(`file-${taskId}`);
    const file = fileInput.files[0];

    if (!file) {
        alert('Выберите файл');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (response.ok) {
            fileInput.value = '';
            if (socket) {
                const userTasks = currentTasks;
            }
        } else {
            const error = await response.json();
            alert('Ошибка при загрузке файла: ' + error.error);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при загрузке файла');
    }
}