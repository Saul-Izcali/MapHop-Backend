const { Router } = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const ImagenEspecial = require('../middleware/especial-imagen');

const router = Router();

// Registro de usuarios
router.post('/registro/', usuariosController.createUsuarioComun);
router.post('/registro-especial/', ImagenEspecial.single('imagen'), usuariosController.createUsuarioEspecial);
router.post('/registro-responsable/', usuariosController.createUsuarioResp);
router.post('/registro-administrador/', usuariosController.createAdmin);

// Buscar usuarios por su tipo
router.get('/buscarComun/', usuariosController.getUsuariosComunes);
router.get('/buscarEspecial/', usuariosController.getUsuariosEspeciales);
router.get('/buscarResponsable/', usuariosController.getUsuariosResponsables);

// Buscar, editar y borrar usuarios
router.get('/registro/', usuariosController.getUsuarios);
router.get('/registro/:id', usuariosController.getUsuario);
router.put('/registro/:id', usuariosController.editUsuario);
router.post('/aceptar-especial/:id', usuariosController.aceptarEspecial);
router.put('/reputacion/', usuariosController.reputacionUsuario);
router.delete('/registro/:id', usuariosController.deleteUsuario);

// Buscar usuario o correo repetido
router.post('/usuarioRepetido/', usuariosController.buscarUsuarioRepetido);
router.post('/correoRepetido/', usuariosController.buscarCorreoRepetido);

router.get('/nombresUsuarios/', usuariosController.nombresUsuarios);
// router.get('/correosUsuarios/', usuariosController.correoUsuarios);

// Ingresar
router.post('', usuariosController.signin);

// Comparar contraseñas
router.post('/comparar/', usuariosController.compararContrasenas);

// Cambiar contraseña perdida
router.post('/cambiarContra/:id', usuariosController.cambiarContrasenaPerdida);

// router.get('/privateTask/', usuariosController.verificarToken, usuariosController.privateTask);


module.exports = router;
