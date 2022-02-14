const notificacionesController = {};

const notificacion = require('../models/Notificaciones');

// ------------------ USUARIO COMUN
notificacionesController.createNotificacion = async (req, res) => {
    const nuevaNotificacion = new notificacion(req.body);

    nuevaNotificacion.fechaCreacion = Date.now();

    if(nuevaNotificacion.usuarios.find(usr => usr._id === "000000000000000000000000")){
        for(let i = 0; i < nuevaNotificacion.usuarios.length; i++) {
            if(nuevaNotificacion.usuarios[i]._id === "000000000000000000000000")
                nuevaNotificacion.usuarios.splice(i, 1);
        }
    }
    
    if(nuevaNotificacion.usuarios.length) {
        await nuevaNotificacion.save();
    }
    res.status(200).json({'estado': 'ok'});
};

// ------------------ USUARIO COMUN
notificacionesController.getNotificaciones = async (req, res) => {
    const getNotificaciones = await notificacion.find();

    if(getNotificaciones.toString() == ""){
        res.status(200).json(false);
    }else{
        res.status(200).json(getNotificaciones);
    }
};

// ------------------ USUARIO COMUN
notificacionesController.getNotificacionesUsuario = async (req, res) => {
    const getNotificaciones = await notificacion.find({usuarios: {_id: req.params.usuario}});

    if(getNotificaciones.toString() == ""){
        res.status(200).json(false);
    }else{
        res.status(200).json(getNotificaciones);
    }
};

// ------------------ USUARIO COMUN
notificacionesController.editNotificacion = async (req, res) => {
    const getNotificacion = await notificacion.findById(req.params.id);
    const usuarios = getNotificacion.usuarios;
    const { usuario } = req.body;

    if(usuarios.find(usr => usr._id === usuario)){

        for(let i = 0; i < usuarios.length; i++) {
            if(usuarios[i]._id === usuario)
                index = i;
        }
        usuarios.splice(index, 1);

        if(!usuarios.length) {
            await notificacion.findByIdAndDelete(req.params.id);
        }
        else {
            await notificacion.findByIdAndUpdate(req.params.id, {usuarios: usuarios}); 
        }
        res.status(200).json({'estado': 'ok'});
    }else{
        res.status(200).json("Ocurrió un problema eliminando el usuario");
    }
};

// ------------------ USUARIO COMUN
notificacionesController.deleteNotificacion = async (req, res) => {
    await notificacion.findByIdAndDelete(req.params.id);
    res.status(200).json({'estado': 'ok'});
};

module.exports = notificacionesController;