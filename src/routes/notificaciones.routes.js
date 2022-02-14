const { Router } = require('express');
const notificacionesController = require('../controllers/notificaciones.controller');

const router = Router();

// Nueva notificación
router.post('/nueva-notificacion/', notificacionesController.createNotificacion);

// Obtener notificaciones
router.get('/buscar-notificaciones/', notificacionesController.getNotificaciones);

// Obtener notificaciones de un usuario
router.get('/buscar-notificaciones/:usuario', notificacionesController.getNotificacionesUsuario);

// Modificar notificación
router.put('/editar-notificacion/:id', notificacionesController.editNotificacion);

// Borrar notificación
router.delete('/borrar-notificacion/:id', notificacionesController.deleteNotificacion);


module.exports = router;
