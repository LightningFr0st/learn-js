import React, { useEffect, useState } from "react";
import "./App.css"; 

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("http://localhost:3000/api/tasks")
      .then((res) => res.json())
      .then(setTasks);
  }, []);

  const addTask = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const res = await fetch("http://localhost:3000/api/tasks", {
      method: "POST",
      body: formData,
    });
    const newTask = await res.json();
    setTasks((prev) => [...prev, newTask]);
    e.target.reset();
  };

  const deleteTask = async (id) => {
    await fetch(`http://localhost:3000/api/tasks/${id}`, {
      method: "DELETE",
    });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const processTasks = (tasks) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updated = tasks.map((task) => {
      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        deadlineDate.setHours(0, 0, 0, 0);

        if (deadlineDate < today) {
          return { ...task, status: "done" };
        }
      }
      return task;
    });

    updated.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });

    return updated;
  };

  const processedTasks = processTasks(tasks);

  const filtered =
    filter === "all"
      ? processedTasks
      : processedTasks.filter((t) => t.status === filter);

  return (
    <div className="app-container">
      <header>
        <h1 className="title">Task Manager</h1>
      </header>

      <main className="layout">
        {/* Левая колонка: форма + фильтры */}
        <aside className="sidebar">
          <form onSubmit={addTask} encType="multipart/form-data" className="task-form">
            <input type="text" name="title" placeholder="Task title" required />
            <select name="status">
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <input type="date" name="deadline" />
            <input type="file" name="file" />
            <button type="submit">+ Add</button>
          </form>

          <div className="filter-buttons">
            <button onClick={() => setFilter("all")}>All</button>
            <button onClick={() => setFilter("todo")}>To Do</button>
            <button onClick={() => setFilter("in-progress")}>In Progress</button>
            <button onClick={() => setFilter("done")}>Done</button>
          </div>
        </aside>

        <section className="task-section">
          <ul className="task-list">
            {filtered.map((t) => (
              <li key={t.id} className={`task-card ${t.status}`}>
                <div className="task-header">
                  <b>{t.title}</b>
                  <span className={`status ${t.status}`}>{t.status}</span>
                </div>
                <div className="task-body">
                  <p>Deadline: {t.deadline || "—"}</p>
                  {t.file && (
                    <a
                      href={`http://localhost:3000/uploads/${t.file.path}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📎 {t.file.name}
                    </a>
                  )}
                </div>
                <button className="delete-btn" onClick={() => deleteTask(t.id)}>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
