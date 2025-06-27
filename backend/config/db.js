
const mysql2 = require('mysql2');

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
    console.log("Connected to MySQL");
  }
});

module.exports = db;
