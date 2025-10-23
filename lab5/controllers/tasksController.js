const taskStore = require('../taskStore');

exports.uploadFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await taskStore.findTaskById(parseInt(id));
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

    await taskStore.addAttachment(parseInt(id), attachment);

    res.json(attachment);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};