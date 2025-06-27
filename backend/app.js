
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "../frontend"));

const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');

app.use('/', authRoutes);
app.use('/', fileRoutes);

const port = 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
