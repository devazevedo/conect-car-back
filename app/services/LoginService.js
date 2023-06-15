const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');

class LoginService {
    async login({ username, password }) {
        const dbConfig = {
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'conect_car'
        };

        const connection = await mysql.createConnection(dbConfig);

        let statusResposta = 0;
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

                    statusResposta = 1;
                    return { token, status: statusResposta, tipoRetorno: 200 };
                } else {
                    return { message: 'Email não verificado', status: statusResposta, tipoRetorno: 401 };
                }
            } else {
                return { message: 'Login ou senha inválidos', status: statusResposta, tipoRetorno: 401 };
            }
        } else {
            return { message: 'Login ou senha inválidos', status: statusResposta, tipoRetorno: 401 };
        }
    }
}

module.exports = LoginService;