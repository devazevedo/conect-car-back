const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const cors = require('cors');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conecta com o banco de dados
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'main_project'
};

app.use(cors());

(async () => {
  // Conexão com o banco de dados
  const connection = await mysql.createConnection(dbConfig);

  // Código do servidor
  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });

  // Rotas do servidor
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(username, password);

    // Procura o usuário no banco de dados
    const [rows, fields] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length > 0) {
      const user = rows[0];

      // Verifica se a senha está correta
      if (password === user.password) {
        const token = jwt.sign({ username }, 'secret');
        res.json({ token });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });
})();
