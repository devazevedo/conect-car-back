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

  async listarTodosUsuarios(req, res) {
    const userService = new UserService();

    const usuarioCriado = await userService.listarTodosUsuarios();

    const tipoRetorno = usuarioCriado.tipoRetorno;
    delete usuarioCriado.tipoRetorno;

    res.status(tipoRetorno).json(usuarioCriado);
  }

  async listarUsuariosPorId(req, res) {
    const idUsuario = req.params.id;

    const userService = new UserService();

    const usuarioCriado = await userService.listarUsuariosPorId(idUsuario);

    const tipoRetorno = usuarioCriado.tipoRetorno;
    delete usuarioCriado.tipoRetorno;

    res.status(tipoRetorno).json(usuarioCriado);
  }

}

module.exports = UsersController;
