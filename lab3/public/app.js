const API_URL = '/api/tasks';
const AUTH_URL = '/api/auth';

let isAuthenticated = false;

document.addEventListener('DOMContentLoaded', checkAuth);

async function checkAuth() {
    try {
        const response = await fetch(`${AUTH_URL}/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            showApp();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showAuth();
    }
}

function showApp() {
    isAuthenticated = true;
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    loadTasks();
}

function showAuth() {
    isAuthenticated = false;
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
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
            showApp();
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
            showApp();
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

function showMessage(element, message, type = 'error') {
    element.textContent = message;
    element.className = type;
    element.classList.remove('hidden');
}

async function loadTasks() {
    if (!isAuthenticated) return;
    
    try {
        const statusFilter = document.getElementById('statusFilter').value;
        const url = statusFilter ? `${API_URL}?status=${statusFilter}` : API_URL;
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            showAuth();
            return;
        }
        
        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        document.getElementById('tasksList').innerHTML = '<p>Ошибка загрузки задач</p>';
    }
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

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData),
            credentials: 'include'
        });

        if (response.status === 401) {
            showAuth();
            return;
        }

        if (response.ok) {
            titleInput.value = '';
            dueDateInput.value = '';
            loadTasks();
        } else {
            alert('Ошибка при создании задачи');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при создании задачи');
    }
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        const response = await fetch(`${API_URL}/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus }),
            credentials: 'include'
        });

        if (response.status === 401) {
            showAuth();
            return;
        }

        if (!response.ok) {
            alert('Ошибка при обновлении задачи');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при обновлении задачи');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Удалить задачу?')) return;

    try {
        const response = await fetch(`${API_URL}/${taskId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.status === 401) {
            showAuth();
            return;
        }

        if (response.ok) {
            loadTasks();
        } else {
            alert('Ошибка при удалении задачи');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении задачи');
    }
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
        const response = await fetch(`${API_URL}/${taskId}/attachments`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (response.status === 401) {
            showAuth();
            return;
        }

        if (response.ok) {
            fileInput.value = '';
            loadTasks();
        } else {
            alert('Ошибка при загрузке файла');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при загрузке файла');
    }
}