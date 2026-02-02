const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const selfsigned = require('selfsigned');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = 3443;

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Routes
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    res.json({ 
        success: true, 
        file: {
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`
        }
    });
});

// Generate self-signed certs
const attrs = [{ name: 'commonName', value: '192.168.3.42' }];
const pems = selfsigned.generate(attrs, { days: 365 });

// Start HTTP Server
app.listen(PORT, () => {
    console.log(`HTTP Server running at http://localhost:${PORT}`);
});

// Start HTTPS Server
https.createServer({
    key: pems.private,
    cert: pems.cert
}, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`HTTPS Server running at https://localhost:${HTTPS_PORT}`);
    console.log(`To access from phone use: https://192.168.3.42:${HTTPS_PORT}`);
});