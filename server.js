const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');

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
  
    // Verificar se já existe um usuário com o mesmo login, email ou CPF
    const [existingUserRows] = await connection.execute(
      'SELECT * FROM users WHERE username = ? OR email = ? OR cpf = ?',
      [username, email, cpf]
    );
  
    if (existingUserRows.length > 0) {
      const conflicts = {};
  
      existingUserRows.forEach(user => {
        if (user.username === username) {
          conflicts.username = true;
        }
        if (user.email === email) {
          conflicts.email = true;
        }
        if (user.cpf === cpf) {
          conflicts.cpf = true;
        }
      });
  
      let message = 'Já existe um cadastro com essas informações.';
  
      if (conflicts.username) {
        message = 'Já existe um cadastro com esse login.';
      } else if (conflicts.email) {
        message = 'Já existe um cadastro com esse email.';
      } else if (conflicts.cpf) {
        message = 'Já existe um cadastro com esse CPF.';
      }
  
      // Enviar a resposta com a mensagem de conflito
      res.status(409).json({ message, conflicts });
      return;
    }
  
    // Se não houver nenhum usuário com os mesmos valores, inserir o novo usuário
    const [insertUserRows] = await connection.execute(
      'INSERT INTO users (username, cpf, email, password) VALUES (?,?,?,?)',
      [
        username,
        cpf,
        email,
        password
      ]
    );
  
    if (insertUserRows.affectedRows > 0) {
      const userId = insertUserRows.insertId;
      // Gerar um código de validação (por exemplo, um código aleatório)
      const validationCode = generateValidationCode();
  
      // Enviar o e-mail com o código de validação
      const transporter = nodemailer.createTransport({
        host: 'smtp.elasticemail.com',
        port: 2525,
        secure: false, // Use SSL/TLS
        auth: {
          user: 'azevedoafc23@gmail.com', // Seu endereço de e-mail
          pass: '75BFCCEBCAAFC8C74C6217362DB9BA4B846F' // Sua senha de e-mail
        }
      });
  
      const mailOptions = {
        from: 'azevedoafc23@gmail.com', // Endereço de e-mail remetente
        to: email, // Endereço de e-mail destinatário
        subject: 'Código de validação', // Assunto do e-mail
        text: `Seu código de validação é: ${validationCode}` // Corpo do e-mail
      };
  
      let enviado = 0;
  
      // Envolva a função sendMail em uma Promise
      const sendMailPromise = new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Erro ao enviar o e-mail:', error);
            reject(error);
          } else {
            console.log('E-mail enviado:', info.response);
            enviado = 1;
            resolve();
          }
        });
      });
  
      try {
        await sendMailPromise; // Aguarde o envio do e-mail
  
        const [rows, fields] = await connection.execute(
          'INSERT INTO codigo_validacao (codigo, id_usuario, email_enviado) VALUES (?,?,?)',
          [
            validationCode,
            userId,
            enviado // Define o valor padrão de email_enviado como 0
          ]
        );
  
        res.status(200).json({ message: 'Usuário cadastrado com sucesso.' });
      } catch (error) {
        res.status(500).json({ message: 'Erro ao enviar o e-mail de validação.' });
      }
    } else {
      res.status(401).json({ message: 'Não foi possível cadastrar o usuário.' });
    }
  });
  
  function generateValidationCode() {
    const codeLength = 6; // Comprimento do código de validação
    let code = '';
  
    for (let i = 0; i < codeLength; i++) {
      const randomDigit = Math.floor(Math.random() * 10);
      code += randomDigit;
    }
  
    return code;
  }
  

  app.get('/api/users', async (req, res) => {
    // Lógica para recuperar dados de usuários do banco de dados
    const users = await connection.execute('SELECT * FROM users');

    if (users && users[0]) {
      res.status(200).json({ conteudo: users[0] });
    } else {
      res.status(401).json({ message: 'Nenhum usuario encontrado' });
    }
  });

  app.get('/api/users', async (req, res) => {
    // Lógica para recuperar dados de usuários do banco de dados
    const users = await connection.execute('SELECT * FROM users');

    if (users && users[0]) {
      res.status(200).json({ conteudo: users[0] });
    } else {
      res.status(401).json({ message: 'Nenhum usuario encontrado' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;

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

  app.put('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const body = req.body;

    const [rowsVerifica, fieldsVerifica] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (rowsVerifica.length <= 0) {
      const user = rowsVerifica[0];
      res.status(404).json({ message: 'Usuário não encontrado' });
    } else {
      const [rows, fields] = await connection.execute(
        'UPDATE users SET username = ?, cpf = ?, email = ?, password = ? WHERE id = ?',
        [
          body.username,
          body.cpf,
          body.email,
          body.password,
          userId
        ]
      );

      if (rows.affectedRows > 0) {
        res.status(200).json({ message: 'Usuario alterado com sucesso' });
      } else {
        res.status(401).json({ message: 'Não foi possivel alterar o usuario' });
      }
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    const userId = req.params.id;

    const [rows, fields] = await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    if (rows.affectedRows > 0) {
      res.status(200).json({ message: 'Usuario excluido com sucesso' });
    } else {
      res.status(401).json({ message: 'Não foi possivel excluir o usuario' });
    }
  });



})();
