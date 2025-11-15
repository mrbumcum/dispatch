const multer = require('multer');
const path = require('path');

// Configure multer for audio file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept audio files
  const allowedMimes = [
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/x-m4a',
    'audio/mp3',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Validation middleware
const validateAudioUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }
  next();
};

const validateSessionId = (req, res, next) => {
  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Valid sessionId is required' });
  }
  next();
};

module.exports = {
  upload,
  validateAudioUpload,
  validateSessionId,
};

