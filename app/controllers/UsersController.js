const UserService = require("../services/UsersService");

class UsersController {

  async criarUsuario(req, res) {
    const { username, cpf, email, password } = req.body;

    const userService = new UserService();

    const usuarioCriado = await userService.criarUsuario({ username, cpf, email, password });

    const tipoRetorno = usuarioCriado.tipoRetorno;
    delete usuarioCriado.tipoRetorno;

    res.status(tipoRetorno).json(usuarioCriado);
  }

}

module.exports = UsersController;
