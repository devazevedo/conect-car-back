const LoginService = require("../services/LoginService");

class LoginController {

  async login(req, res) {
    const { username, password } = req.body;

    const loginService = new LoginService();

    const logar = await loginService.login({ username, password });

    const tipoRetorno = logar.tipoRetorno;
    delete logar.tipoRetorno;

    res.status(tipoRetorno).json(logar);
  }

}

module.exports = LoginController;
