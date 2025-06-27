
const bcrypt = require('bcrypt');
const db = require('../config/db');

exports.signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO credentials (username, email, password) VALUES (?, ?, ?)";
    db.query(sql, [username, email, hashedPassword], (err) => {
      if (err) return res.status(500).send("Database error");
      res.redirect("/");
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM credentials WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err || results.length === 0) return res.send("Invalid email or password");
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) return res.redirect("/layout");
    else return res.send("Invalid email or password");
  });
};
