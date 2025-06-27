
const fs = require('fs');
const crypto = require('crypto');

function encryptFile(filePath) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const fileBuffer = fs.readFileSync(filePath);
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encryptedData = Buffer.concat([iv, authTag, encrypted]);

  return {
    encryptedData,
    key: key.toString('hex')
  };
}

function decryptFile(buffer, hexKey) {
  const keyBuffer = Buffer.from(hexKey, 'hex');
  const iv = buffer.slice(0, 12);
  const authTag = buffer.slice(12, 28);
  const encryptedContent = buffer.slice(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
}

module.exports = { encryptFile, decryptFile };
