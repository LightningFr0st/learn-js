const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const methodOverride = require('method-override');

const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const app = express();
const PORT = process.env.PORT || 3000;

const ensureUploads = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error('Could not create uploads directory', err);
  }
};
ensureUploads();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = uuidv4() + ext;
    cb(null, name);
  }
});
const upload = multer({ storage });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

async function readTasks() {
  try {
    const text = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(text || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
async function saveTasks(tasks) {
  await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8');
}

app.get('/', async (req, res) => {
  const filter = req.query.filter || 'all';
  const tasks = await readTasks();
  let filtered = tasks;
  if (filter === 'active') filtered = tasks.filter(t => !t.completed);
  if (filter === 'completed') filtered = tasks.filter(t => t.completed);
  res.render('index', { tasks: filtered, filter });
});

app.post('/tasks', upload.array('attachments'), async (req, res) => {
  const { title, description, dueDate } = req.body;
  const files = (req.files || []).map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    url: `/uploads/${f.filename}`
  }));

  const tasks = await readTasks();
  const newTask = {
    id: uuidv4(),
    title: title || 'Без названия',
    description: description || '',
    completed: false,
    dueDate: dueDate || null,
    attachments: files
  };
  tasks.unshift(newTask);
  await saveTasks(tasks);

  res.redirect('/');
});

app.get('/tasks/:id/edit', async (req, res) => {
  const tasks = await readTasks();
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).send('Task not found');
  res.render('edit-task', { task });
});

app.put('/tasks/:id', upload.array('attachments'), async (req, res) => {
  const tasks = await readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).send('Task not found');

  const task = tasks[idx];
  const { title, description, dueDate, completed } = req.body;
  task.title = title || task.title;
  task.description = description || task.description;
  task.dueDate = dueDate || null;
  task.completed = completed === 'on';

  const newFiles = (req.files || []).map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    url: `/uploads/${f.filename}`
  }));
  task.attachments = task.attachments.concat(newFiles);

  tasks[idx] = task;
  await saveTasks(tasks);
  res.redirect('/');
});

app.delete('/tasks/:id', async (req, res) => {
  let tasks = await readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).send('Task not found');

  const removed = tasks.splice(idx, 1)[0];
  for (const f of removed.attachments || []) {
    try {
      await fs.unlink(path.join(UPLOADS_DIR, f.filename));
    } catch (e) {
    }
  }
  await saveTasks(tasks);

  res.redirect('/');
});


app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
