const express = require('express');
const multer = require('multer');
const controller = require('../controllers/tasksController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

router.post('/:id/attachments', authenticateToken, upload.single('file'), controller.uploadFile);

module.exports = router;