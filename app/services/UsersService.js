
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');

class UsersService {
    async criarUsuario({ username, cpf, email, password }) {
        const dbConfig = {
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'conect_car'
        };
        const connection = await mysql.createConnection(dbConfig);
        const [existingUserRows] = await connection.execute(
            'SELECT * FROM users WHERE username = ? OR email = ? OR cpf = ?',
            [username, email, cpf]
        );

        let statusResposta = 0;

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
            return { message, conflicts, status: statusResposta, tipoRetorno: 409 };
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

                statusResposta = 1;

                return { message: 'Usuário cadastrado com sucesso.', status: statusResposta, tipoRetorno: 200 };
            } catch (error) {
                return { message: 'Erro ao enviar o e-mail de validação.', status: statusResposta, tipoRetorno: 500 };
            }
        } else {
            return { message: 'Não foi possível cadastrar o usuário.', status: statusResposta, tipoRetorno: 401 };
        }
    }
}

module.exports = UsersService;