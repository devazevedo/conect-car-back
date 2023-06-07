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
  
    // Procura o usuário no banco de dados
    const [rows, fields] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length > 0) {
      const user = rows[0];  
      // Verifica se a senha está correta
      if (password === user.password) {
        if (user.email_verificado.readInt8(0) === 1) { // Verifica se o email está verificado
          const token = jwt.sign({ username }, 'secret');
          res.json({ token });
        } else {
          res.status(401).json({ message: 'Email não verificado' });
        }
      } else {
        res.status(401).json({ message: 'Login ou senha inválidos' });
      }
    } else {
      res.status(401).json({ message: 'Login ou senha inválidos' });
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

      const encodedUserId = encodeURIComponent(userId)
      
      // Enviar o e-mail com o código de validação
      const transporter = nodemailer.createTransport({
        host: 'smtp.elasticemail.com',
        port: 2525,
        secure: false, // Use SSL/TLS
        auth: {
          user: 'contato.makesolution@gmail.com', // Seu endereço de e-mail
          pass: 'BDEAE44EB15CC5FEB0F2DD5521D943FB4FB7' // Sua senha de e-mail
        }
      });
  
      const mailOptions = {
        from: 'contato.makesolution@gmail.com', // Endereço de e-mail remetente
        to: email, // Endereço de e-mail destinatário
        subject: 'Confirmação de email', // Assunto do e-mail
        html: `Parabéns você está a um passo de acessar nossa plataforma, <a href="http://localhost:5173/email-validation/${encodedUserId}">Clique aqui</a> para prosseguir.` // Corpo do e-mail
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
          'INSERT INTO email_validacao (id_usuario, email_enviado) VALUES (?,?)',
          [
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

  app.post('/api/reenviar_email', async (req, res) => {
    const { username } = req.body;
  
    // Verificar se o usuário existe no banco de dados
    const [rows, fields] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
  
    if (rows.length > 0) {
      const user = rows[0];
      const userId = user.id;
      
      // const token = jwt.sign({ userId }, 'secret');
      const encodedUserId = encodeURIComponent(userId)

      // Verificar se o email do usuário está verificado
      if (user.email_verificado.readInt8(0) === 1) {
        res.status(400).json({ message: 'O email já está verificado.' });
      } else {
        const transporter = nodemailer.createTransport({
          host: 'smtp.elasticemail.com',
          port: 2525,
          secure: false, // Use SSL/TLS
          auth: {
            user: 'contato.makesolution@gmail.com', // Seu endereço de e-mail
            pass: 'BDEAE44EB15CC5FEB0F2DD5521D943FB4FB7' // Sua senha de e-mail
          }
        });
    
        const mailOptions = {
          from: 'contato.makesolution@gmail.com', // Endereço de e-mail remetente
          to: user.email, // Endereço de e-mail destinatário
          subject: 'Confirmação de email', // Assunto do e-mail
          html: `Parabéns você está a um passo de acessar nossa plataforma, <a href="http://localhost:5173/email-validation/${encodedUserId}">Clique aqui</a> para prosseguir.` // Corpo do e-mail
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
            'INSERT INTO email_validacao (id_usuario, email_enviado) VALUES (?,?)',
            [
              user.id,
              enviado // Define o valor padrão de email_enviado como 0
            ]
          );
    
          res.status(200).json({ message: 'Email reenviado com sucesso' });
        } catch (error) {
          res.status(500).json({ message: 'Erro ao reenviar o e-mail de validação.' });
        }
      }
    } else {
      res.status(404).json({ message: 'Usuário não encontrado.' });
    }
  });

  app.post('/api/email-validation', async (req, res) => {
    const { userId } = req.body;

    try {
      const [rows, fields] = await connection.execute(
        'UPDATE users SET email_verificado = 1 WHERE id = ?',
        [userId]
      );
      if (rows.affectedRows > 0) {
        res.send('Email verificado com sucesso!');
      } else {
        res.status(400).send('Falha ao verificar o email.');
      }
    } catch (error) {
      res.status(400).send('Não foi possivel validar o email');
    }
  });

})();
