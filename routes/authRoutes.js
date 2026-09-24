const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { requireFields } = require('../middleware/validation');

const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadsDir),
    filename: (req, file, callback) => callback(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

router.post('/login', requireFields(['username', 'password']), authController.login);
router.post('/signup', requireFields(['fullName', 'username', 'password']), authController.signup);
router.post('/forgot-password', requireFields(['username', 'newPassword']), authController.forgotPassword);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, requireFields(['fullName', 'username']), authController.updateProfile);
router.post('/profile/photo', authenticate, upload.single('photo'), authController.updateProfileImage);

module.exports = router;

