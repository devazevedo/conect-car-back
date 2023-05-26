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
  database: 'conect_car'
};

app.use(cors());

(async () => {
  // Conexão com o banco de dados
  const connection = await mysql.createConnection(dbConfig);

  // Código do servidor
  app.listen(port, () => {
    console.log(`Toc toc na porta ${port}`);
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

  app.post('/api/users', async (req, res) => {
    const { username, cpf, email, password } = req.body;
  
    // Lógica para processar e manipular os dados enviados
    const [rows, fields] = await connection.execute(
      'INSERT INTO users (username, cpf, email, password) VALUES (?,?,?,?)',
      [
        username,
        cpf,
        email,
        password
      ]
    );

    if(rows.affectedRows > 0){
      res.status(200).json({ message: 'Usuario cadastrado com sucesso' });
    }else{
      res.status(401).json({ message: 'Não foi possivel cadastrar o usuario' });
    }
  });

  app.get('/api/users', async (req, res) => {
    // Lógica para recuperar dados de usuários do banco de dados
    const users = await connection.execute('SELECT * FROM users');
    
    if(users && users[0]){
      res.status(200).json({ conteudo: users[0] });
    }else{
      res.status(401).json({ message: 'Nenhum usuario encontrado' });
    }
  });

  app.get('/api/users', async (req, res) => {
    // Lógica para recuperar dados de usuários do banco de dados
    const users = await connection.execute('SELECT * FROM users');
    
    if(users && users[0]){
      res.status(200).json({ conteudo: users[0] });
    }else{
      res.status(401).json({ message: 'Nenhum usuario encontrado' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    
    // Lógica para recuperar os detalhes do usuário com o ID fornecido
    
    // Exemplo: consulta no banco de dados
    const [rows, fields] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (rows.length > 0) {
      const user = rows[0];      
      // Envia a resposta com os detalhes do usuário como JSON
      res.status(200).json({ conteudo: user });
    } else {
      // Caso o usuário com o ID fornecido não seja encontrado
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  });
  
  
  
})();
