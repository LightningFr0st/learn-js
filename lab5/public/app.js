const AUTH_URL = '/api/auth';
const GRAPHQL_URL = '/graphql';

let currentUser = null;

document.addEventListener('DOMContentLoaded', checkAuth);

async function checkAuth() {
    try {
        const response = await fetch(`${AUTH_URL}/me`, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showApp();
        } else {
            showAuth();
        }
    } catch (error) {
        showAuth();
    }
}

function showApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    document.getElementById('user-greeting').textContent = `${currentUser.username}`;
    
    loadTasks();
}

function showAuth() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    currentUser = null;
}

async function graphqlRequest(query, variables = {}) {
    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        credentials: 'include'
    });

    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);
    return result.data;
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (response.ok) {
            checkAuth();
        } else {
            alert('Ошибка входа');
        }
    } catch (error) {
        alert('Ошибка входа');
    }
}

async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (response.ok) {
            checkAuth();
        } else {
            alert('Ошибка регистрации');
        }
    } catch (error) {
        alert('Ошибка регистрации');
    }
}

async function logout() {
    try {
        await fetch(`${AUTH_URL}/logout`, { 
            method: 'POST', 
            credentials: 'include' 
        });
        
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        
        showAuth();
    } catch (error) {
        console.error('Logout error:', error);
        showAuth();
    }
}

async function loadTasks() {
    try {
        const statusFilter = document.getElementById('statusFilter').value;
        const query = `
            query GetTasks($status: String) {
                tasks(status: $status) {
                    id
                    title
                    status
                    dueDate
                    attachments { filename originalName path }
                }
            }
        `;

        const data = await graphqlRequest(query, { status: statusFilter || null });
        renderTasks(data.tasks);
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        
        if (error.message === 'Not authenticated') {
            showAuth();
        } else {
            document.getElementById('tasksList').innerHTML = '<p>Ошибка загрузки задач</p>';
        }
    }
}

function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    
    if (!tasks || tasks.length === 0) {
        tasksList.innerHTML = '<p>Нет задач</p>';
        return;
    }

    tasksList.innerHTML = tasks.map(task => `
        <div class="task ${task.status === 'completed' ? 'completed' : ''}">
            <h3>${task.title}</h3>
            <p>Статус: 
                <select onchange="updateTaskStatus(${task.id}, this.value)">
                    <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>В процессе</option>
                    <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Завершено</option>
                </select>
            </p>
            <p>Дата: ${task.dueDate || 'Не указана'}</p>
            <p>Файлы: ${task.attachments && task.attachments.length > 0 
                ? task.attachments.map(file => `<a href="${file.path}" target="_blank">${file.originalName}</a>`).join(', ') 
                : 'Нет файлов'}
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
    
    if (!titleInput.value) {
        alert('Введите название задачи');
        return;
    }

    try {
        const mutation = `
            mutation CreateTask($input: TaskInput!) {
                createTask(input: $input) { id title status dueDate }
            }
        `;

        await graphqlRequest(mutation, { 
            input: { title: titleInput.value, dueDate: dueDateInput.value || null } 
        });
        
        titleInput.value = '';
        dueDateInput.value = '';
        loadTasks();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        const mutation = `
            mutation UpdateTask($input: TaskUpdateInput!) {
                updateTask(input: $input) { id status }
            }
        `;

        await graphqlRequest(mutation, { 
            input: { id: parseInt(taskId), status: newStatus } 
        });
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Удалить задачу?')) return;

    try {
        const mutation = `
            mutation DeleteTask($id: Int!) {
                deleteTask(id: $id)
            }
        `;

        await graphqlRequest(mutation, { id: parseInt(taskId) });
        loadTasks();
    } catch (error) {
        alert('Ошибка: ' + error.message);
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
        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (response.ok) {
            fileInput.value = '';
            loadTasks();
        } else {
            alert('Ошибка загрузки файла');
        }
    } catch (error) {
        alert('Ошибка загрузки файла');
    }
}