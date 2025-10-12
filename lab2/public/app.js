const API_URL = '/api/tasks';

document.addEventListener('DOMContentLoaded', loadTasks);

async function loadTasks() {
    try {
        const statusFilter = document.getElementById('statusFilter').value;
        const url = statusFilter ? `${API_URL}?status=${statusFilter}` : API_URL;
        
        const response = await fetch(url);
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
            body: JSON.stringify(taskData)
        });

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
            body: JSON.stringify({ status: newStatus })
        });

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
            method: 'DELETE'
        });

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
            body: formData
        });

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