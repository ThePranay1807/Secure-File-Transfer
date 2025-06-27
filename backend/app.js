//page loading
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql2 = require('mysql2')
const cors = require('cors')
const multer = require('multer');
const crypto = require('crypto'); // built‑in, no separate install
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

app.set('view engine' , 'ejs');
app.set('views', path.join(__dirname, '../frontend'));

app.use(express.static(path.join(__dirname, "../frontend")));
app.use(express.urlencoded({ extended: true }));

app.get("/" , (req , res) =>{
    res.render("login");
})

app.get("/signup" , (req , res) =>{
    res.render("signup");
})


app.get("/layout" , (req , res) =>{
    res.render("layout");
    
})

app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into 'credentials' table
        const sql = "INSERT INTO credentials (username, email, password) VALUES (?, ?, ?)";
        db.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) {
                console.error(" Error inserting data:", err);
                return res.status(500).send("Database error");
            }
            console.log(" User registered:", result);
            res.redirect("/"); // Redirect to login page after signup
        });
    } catch (error) {
        console.error(" Error:", error);
        res.status(500).send("Server error");
    }
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Query the user from credentials table
    const sql = "SELECT * FROM credentials WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error(" DB error:", err);
            return res.status(500).send("Database error");
        }

        if (results.length === 0) {
            // No user with that email
            return res.send(" Invalid email or password");
        }

        const user = results[0];

        // Compare passwords using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            console.log(" Login successful for:", user.username);
            res.redirect("/layout"); // Redirect to homepage/dashboard
        } else {
            res.send(" Invalid email or password");
        }
    });
});

const upload = multer({ dest: 'uploads/' });
// AES-256-GCM encryption helper
function encryptFile(filePath) {
    const key = crypto.randomBytes(32); // 256-bit key
    const iv = crypto.randomBytes(12);  // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const fileBuffer = fs.readFileSync(filePath);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Structure: [IV | AuthTag | EncryptedData]
    const encryptedData = Buffer.concat([iv, authTag, encrypted]);

    return {
        encryptedData,
        key: key.toString('hex') // return hex string
    };
}

// POST /upload route
app.post('/upload', upload.single('file'), (req, res) => {
    const downloadLimit = parseInt(req.body.limit);
    if (!req.file || isNaN(downloadLimit)) {
        return res.status(400).send("Invalid file or download limit");
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const { encryptedData, key } = encryptFile(filePath);

    // Save to MySQL
    const sql = `
        INSERT INTO encrypted_files (filename, file_data, security_key, download_count)
        VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [originalName, encryptedData, key, downloadLimit], (err, result) => {
        fs.unlinkSync(filePath); // clean up temp file

        if (err) {
            console.error(" DB Insert Error:", err);
            return res.status(500).send("Database error");
        }

        console.log(" File stored with ID:", result.insertId);
        res.send(`
            <h2> File uploaded securely!</h2>
            <p><strong> Your Secret Key:</strong></p>
            <code>${key}</code><br><br>
            <a href="/layout">⬅ Back to Dashboard</a>
        `);
    });
});

app.post('/download', (req, res) => {
    const { key } = req.body;

    if (!key) {
        return res.status(400).send("Secret key is required");
    }

    // Find the file with matching key and with download_count > 0
    const sql = "SELECT * FROM encrypted_files WHERE security_key = ? AND download_count > 0";
    db.query(sql, [key], (err, results) => {
        if (err) {
            console.error("DB fetch error:", err);
            return res.status(500).send("Database error");
        }

        if (results.length === 0) {
            return res.status(404).send("Invalid key or download limit reached");
        }

        const file = results[0];

        // Decrypt the file
        const encryptedBuffer = file.file_data;
        const keyBuffer = Buffer.from(key, 'hex');
        const iv = encryptedBuffer.slice(0, 12);
        const authTag = encryptedBuffer.slice(12, 28);
        const encryptedContent = encryptedBuffer.slice(28);

        try {
            const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

            // Decrement the download count
            const updateSQL = "UPDATE encrypted_files SET download_count = download_count - 1 WHERE id = ?";
            db.query(updateSQL, [file.id], (updateErr) => {
                if (updateErr) {
                    console.error("Download count update error:", updateErr);
                    return res.status(500).send("Could not update download count");
                }

                res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
                res.setHeader('Content-Type', 'application/octet-stream');
                res.send(decrypted);
            });
        } catch (decryptionError) {
            console.error("Decryption error:", decryptionError);
            return res.status(500).send("Failed to decrypt the file. Possibly incorrect key.");
        }
    });
});


const db = mysql2.createConnection({
    host: "localhost",
    user: "root",
    password: "Pass@12345",
    database: "login"
});

db.connect(err => {
    if (err) {
        console.error("DB connection error:", err);
    } else {
        console.log(" Connected to MySQL");
    }
});




const port = 3000;
app.listen(port , ()=>{
    console.log(`server is running on port${port}`);
})