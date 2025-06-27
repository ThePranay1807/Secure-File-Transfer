const db = require('../config/db');
const fs = require('fs');
const { encryptFile, decryptFile } = require('../utils/encryptor');

const uploadFile = (req, res) => {
  const downloadLimit = parseInt(req.body.limit);
  if (!req.file || isNaN(downloadLimit)) return res.status(400).send("Invalid input");

  const { encryptedData, key } = encryptFile(req.file.path);
  fs.unlinkSync(req.file.path);

  const sql = `INSERT INTO encrypted_files (filename, file_data, security_key, download_count) VALUES (?, ?, ?, ?)`;
  db.query(sql, [req.file.originalname, encryptedData, key, downloadLimit], (err, result) => {
    if (err) return res.status(500).send("Database error");

    res.send(`
      <h2>File uploaded securely!</h2>
      <p><strong>Your Secret Key:</strong></p>
      <code>${key}</code><br><br>
      <a href="/layout">⬅ Back to Dashboard</a>
    `);
  });
};

const downloadFile = (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).send("Key required");

  const sql = "SELECT * FROM encrypted_files WHERE security_key = ? AND download_count > 0";
  db.query(sql, [key], (err, results) => {
    if (err || results.length === 0) return res.status(404).send("Invalid key");

    const file = results[0];
    try {
      const decrypted = decryptFile(file.file_data, key);
      const updateSQL = "UPDATE encrypted_files SET download_count = download_count - 1 WHERE id = ?";
      db.query(updateSQL, [file.id]);

      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(decrypted);
    } catch (err) {
      res.status(500).send("Decryption failed");
    }
  });
};

module.exports = {
  uploadFile,
  downloadFile
};
