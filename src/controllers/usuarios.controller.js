const usuariosController = {};

const bcryptjs = require('bcryptjs');
const usuario = require('../models/Usuarios');
const notificacion = require('../models/Notificaciones');
const jwt = require('jsonwebtoken');
const fs = require('fs');



// ------------------ USUARIO COMUN
usuariosController.createUsuarioComun = async (req, res) => {
    const nuevoUsuario = new usuario(req.body);

    nuevoUsuario.contrasena = usuariosController.encriptar(nuevoUsuario.contrasena);
    nuevoUsuario.reputacion = 2;

    await nuevoUsuario.save();

    res.status(200).json({'estado': 'ok'})
};



// ------------------ USUARIO ESPECIAL
usuariosController.createUsuarioEspecial = async (req, res) => {
    const nuevoUsuario = new usuario(req.body);

    nuevoUsuario.contrasena = usuariosController.encriptar(nuevoUsuario.contrasena);
    nuevoUsuario.reputacion = 10;
    nuevoUsuario.usuarioEspecial.validado = false;
    nuevoUsuario.usuarioEspecial.imagen = req.file.path;

    console.log(req.body);

    await nuevoUsuario.save();
    res.send({status: 'Usuario Especial creado'});
};



// ------------------ USUARIO REPONSABLE
usuariosController.createUsuarioResp = async (req, res, next) => {
    let numResp = 0;
    let usuarioTemp = "";
    const responsable = new usuario(req.body);
    responsable.usuarioResponsable.institucion = req.body.institucion;

    const users = await usuario.find();

    await users.forEach(i => {
        if(i.usuarioResponsable){ //checamos si el usuario recorrido tiene el atributo usuarioResponsable, para saber si es de este tipo
            if(i.usuarioResponsable.institucion == responsable.usuarioResponsable.institucion){
                numResp++;
            }
        }
    });

      setTimeout(() =>{
      console.log("El numero de responsables es de: ", numResp);
        switch(responsable.usuarioResponsable.institucion){                              // Nomenclaturas del nombre de usuario
            case 'SIAPA': usuarioTemp = "SP" + (numResp + 1).toString().padStart(4, "0000") + "R"; break;           //SP00xxR
            case 'Infrectructura': usuarioTemp = "IF" + (numResp + 1).toString().padStart(4, "0000") + "R"; break;  //IF00xxR
            case 'Bomberos': usuarioTemp = "BM" + (numResp + 1).toString().padStart(4, "0000") + "R"; break;        //BM00xxR
            case 'CFE': usuarioTemp = "CF" + (numResp + 1).toString().padStart(4, "0000") + "R"; break;             //CF00xxR
            case 'Proteccion': usuarioTemp = "PC" + (numResp + 1).toString().padStart(4, "0000") + "R"; break;             //CF00xxR
            case 'Movilidad': usuarioTemp = "SM" + (numResp + 1).toString().padStart(4, "0000") + "R"; break;             //CF00xxR
        }
  
        responsable.nombreUsuario = usuarioTemp;
        responsable.contrasena = usuariosController.encriptar(usuarioTemp);
        // responsable.contrasena = usuarioTemp;
        console.log("el nombre temporal es  ---->   ", responsable.nombreUsuario);
        responsable.save();
        
        res.json(usuarioTemp)
    }, 1);
    
};



// Buscar usuarios
usuariosController.getUsuarios = async (req, res) => {
    const usuarios = await usuario.find();
    res.json(usuarios);
};


usuariosController.nombresUsuarios = async (req, res) => {
    let usuarios = await usuario.find();
    let listaNombres = [];

        // usuarios.foreach(e => {
        //     listaNombres.push(e.nombreUsuario)
        // })
        
        for(let i of usuarios){
            listaNombres.push(i.nombreUsuario)

        }
        

        console.log(listaNombres)


    res.json(listaNombres);
    // res.json(usuarios);
};


// Buscar usuarios por su tipo
usuariosController.getUsuariosComunes = async (req, res) => {
    const usuarios = await usuario.find({$and: [ {usuarioResponsable: {$exists:false}}, {usuarioEspecial: {$exists:false}}, {usuarioAdmin: {$exists:false}}]});
    res.json(usuarios);
};

usuariosController.getUsuariosEspeciales = async (req, res) => {
    try{
        let usuarios1 = await usuario.find({$and: [ {usuarioEspecial: {$exists:true}}, { 'usuarioEspecial.validado': true}]});
        let usuarios2 = await usuario.find({$and: [ {usuarioEspecial: {$exists:true}}, { 'usuarioEspecial.validado': false}]});

            return res.status(200).json({usuarios1, usuarios2})
    }catch(error){
        console.log(error)
    }
};

usuariosController.getUsuariosResponsables = async (req, res) => {
    const usuarios = await usuario.find({usuarioResponsable: {$exists:true}});
    res.json(usuarios);
};



// Buscar un usuario
usuariosController.getUsuario = async (req, res) => {
    const usuarioEncontrado = await usuario.findById(req.params.id);
    res.send(usuarioEncontrado);
};



// Editar un usuario
usuariosController.editUsuario = async (req, res) => {
    var { nombreUsuario, contrasena } = req.body;

    if(nombreUsuario != '') {
    console.log(nombreUsuario);
    await usuario.findByIdAndUpdate(req.params.id, {nombreUsuario: nombreUsuario});
    }
    if(contrasena != '') {
    console.log(contrasena);
    contrasena = usuariosController.encriptar(contrasena);
    await usuario.findByIdAndUpdate(req.params.id, {contrasena: contrasena});
    }
    res.json({status: 'Usuario actualizado'});
};


// Validar un usuario especial
usuariosController.aceptarEspecial = async (req, res) => {
    const { validado } = req.body;

    await usuario.findByIdAndUpdate(req.params.id, {usuarioEspecial: {validado: validado}});
    res.json({status: 'Usuario actualizado'});
};


// Editar reputación de un usuario
usuariosController.reputacionUsuario = async (req, res) => {
    let { usuarios, reputacion } = req.body;
    let baneado = "No";
    let bajo = false;

    if(reputacion == -1)
        bajo = true;

    console.log(usuarios);
    for(let usr of usuarios) {
        if(usr._id != "000000000000000000000000") {
            const getUsuario = await usuario.findById(usr);

            let tipoUsuario = "comun";
    
            if(getUsuario.usuarioAdmin)
                tipoUsuario = "admin";
            else if(getUsuario.usuarioEspecial)
                tipoUsuario = "especial";
            else if (getUsuario.usuarioResponsable)
                tipoUsuario = "responsable";
    
            if(tipoUsuario == "comun") {
                reputacion += getUsuario.reputacion;

                if(reputacion > 10)
                    reputacion = 10;
        
                if(bajo && reputacion == 1) {
                    const nuevaNotificacion = new notificacion();
            
                    nuevaNotificacion.tipoNotificacion = "strike1";
                    nuevaNotificacion.usuarios = {_id: usr};
                    nuevaNotificacion.fechaCreacion = Date.now();
                        
                    await nuevaNotificacion.save();
                }
                if(bajo && reputacion == 0) {
                    const nuevaNotificacion = new notificacion();
                
                    nuevaNotificacion.tipoNotificacion = "strike2";
                    nuevaNotificacion.usuarios = {_id: usr};
                    nuevaNotificacion.fechaCreacion = Date.now();
                        
                    await nuevaNotificacion.save();
                }
                if(bajo && reputacion < 0) {
                    console.log("Se elimina el usuario " + usr._id + " y sus notificacinoes por llegar a un reputación menor a 0")

                    const getNotificaciones = await notificacion.find();

                    for(notif of getNotificaciones) {
                        const usuarios = notif.usuarios;
    
                        if(usuarios.find(usrAux => usrAux._id === usr._id)){
    
                            for(let i = 0; i < usuarios.length; i++) {
                                if(usuarios[i]._id === usr._id)
                                    index = i;
                            }
                            usuarios.splice(index, 1);
    
                            if(!usuarios.length) {
                                await notificacion.findByIdAndDelete(req.params.id);
                            }
                            else {
                                await notificacion.findByIdAndUpdate(req.params.id, {usuarios: usuarios}); 
                            }
                        }
                    }

                    await usuario.findByIdAndDelete(usr._id);

                    // let fecha  = new Date();
                    // baneado = fecha.getTime().toString();
                    // console.log("Baneado: " + baneado)

                    // reputacion = -1;
                }
                    
                await usuario.findByIdAndUpdate(usr, {reputacion: reputacion, baneado: baneado});   
            }
        }
    }

    res.json({status: 'Reputacion actualizada'});
};



// Borrar un usuario
usuariosController.deleteUsuario = async (req, res) => {
    const usuarioElim = await usuario.findById(req.params.id);

    if(usuarioElim.usuarioEspecial){
        try {
            console.log(usuarioElim.usuarioEspecial.imagen);
            fs.unlinkSync(usuarioElim.usuarioEspecial.imagen);
        }
        catch { }
    }

    await usuario.findByIdAndDelete(req.params.id);
    res.json({status: 'Usuario eliminado'});
};



// Buscar usuario o correo repetido
usuariosController.buscarUsuarioRepetido = async (req, res) => {
    const { nombreUsuario } = req.body;
    var existe;

    const usuarioIngresado = await usuario.findOne({nombreUsuario});
    if(!usuarioIngresado){   
        existe = false;
    }else{
        existe = true;
    }
    res.status(200).json({existe});
};

usuariosController.buscarCorreoRepetido = async (req, res) => {
    const { correoElectronico } = req.body;
    var existe;

    const usuarioIngresado = await usuario.findOne({correoElectronico});
    if(!usuarioIngresado){   
        existe = false;
    }else{
        existe = true;  
    }
    res.status(200).json({existe});
};



// Encriptar y desencriptar
usuariosController.encriptar = (contrasena) => {
    //se encripta la contraseña que le pasan como parametro con un salto de 8 y despues la retorna
    return bcryptjs.hashSync(contrasena, 8);
};

usuariosController.desencriptar = (contrasenaEnviada, contraseña) => {
    // contraseñas de prueba
    let contraseñaPasada = contrasenaEnviada,
        contraseñaGuardadaEnLaBD = contraseña;

    // compara la contraseña que le pasaron y la del usuario que se encuentra almacenada
    // entonces se encripta la contraseña que le pasaron y la compara con la encriptada guardada en la bd
    // esto por motivos de seguridad, para no desencriptar una y compararala asi
    return bcryptjs.compare(contraseñaPasada, contraseñaGuardadaEnLaBD);
};

usuariosController.compararContrasenas = async (req, res) => {
    const { id, contrasena } = req.body;

    const usr = await usuario.findById(id);
    const contrasenaBD = usr.contrasena;
    console.log(contrasenaBD);
    
    bcryptjs.compare(contrasena, contrasenaBD, (err, coinciden) => {
        if(err){
            return res.status(401).send("error al comparar la contraseña");
        }
        res.status(200).json({coinciden});
    });
};



// Ingresar
usuariosController.signin = async (req, res) => {
    const { nombreUsuario, contrasena } = req.body;

    const usuarioIngresado = await usuario.findOne({nombreUsuario});
    console.log(usuarioIngresado)
    console.log(contrasena)

    if(!usuarioIngresado) return res.status(200).json({noExiste: true});

    //los parametros de este metodo son la contraseña de texto plano, la contraseña encriptada y el callback
    bcryptjs.compare(contrasena, usuarioIngresado.contrasena, async (err, coinciden) => {
        if(err){
            return res.status(401).send("error al comparar la contraseña");
        }
        if(coinciden == true){
            const token = jwt.sign({_id: usuarioIngresado._id}, 'llaveSecreta')
            let tipoUsuario = "comun";
            let idUsuario = usuarioIngresado._id;
            let especialValidado = false;
            let baneado = "No";

            if(!usuarioIngresado) return res.status(200).json({noExiste: true});

            if(usuarioIngresado.usuarioAdmin)
                tipoUsuario = "admin";
            else if(usuarioIngresado.usuarioEspecial) {
                tipoUsuario = "especial";
                especialValidado = usuarioIngresado.usuarioEspecial.validado;
            } 
            else if (usuarioIngresado.usuarioResponsable)
                tipoUsuario = "responsable";

            if(usuarioIngresado.baneado) {
                let fecha = new Date()
                if(parseInt(usuarioIngresado.baneado) >= (fecha.getTime() - 129600000)) // si han pasado menos de 36 desde que fue baneado no puede ingresar
                    baneado = "Si";
                else
                    await usuario.findByIdAndUpdate(idUsuario, {baneado: "No"});
            }
    
            return res.status(200).json({token, idUsuario, tipoUsuario, nombreUsuario, especialValidado, baneado})
        }else{
            return res.status(200).json({noCoincide: true});
        }
    })

};


usuariosController.TipoUsuario = async (req, res) => {
    const usuarioEncontrado  = await usuario.findById(req.params.id);
    console.log(usuarioEncontrado)

    if(!usuarioEncontrado) return res.status(401).send("El usuario no existe");

            let tipoUsuario = "comun";

            if(usuarioEncontrado.usuarioAdmin)
                tipoUsuario = "admin";
            else if(usuarioEncontrado.usuarioEspecial)
                tipoUsuario = "especial";
            else if (usuarioEncontrado.usuarioResponsable)
                tipoUsuario = "responsable";
    
            return res.status(200).json(tipoUsuario)
};



// Verificar token
usuariosController.verificarToken = (req, res, next) => {

    if(!req.headers.authorization){
        return res.status(401).send("autorizacion no permitida");
    }
    
    const token = req.headers.authorization.split(' ')[1]

    if(token === 'null'){
        return res.status(401).send("autorizacion no permitida");
    }

    const payload = jwt.verify(token, 'llaveSecreta')
    console.log("payload", payload)

    res.usuarioId = payload._id
    next();
}


// Metodo para crear usuario administrador
usuariosController.createAdmin = async (req, res) => {
    const nuevoUsuario = new usuario(req.body);

    nuevoUsuario.contrasena = usuariosController.encriptar(nuevoUsuario.contrasena);
    nuevoUsuario.usuarioAdmin.admin = true;

    await nuevoUsuario.save();

    res.status(200).json({'estado': 'ok'})
};



//metodo de prueba para saber si funciona el token
// usuariosController.privateTask =  (req, res) => {
//     res.json([
//         {
//             _id: 1, nombre: "saul", descripcion: "doble queso",
//         },
//         {
//             _id: 2, nombre: "julio", descripcion: "triple queso",
//         }
//     ])
// }

usuariosController.cambiarContrasenaPerdida = async (req, res) => {
    let { contrasena } = req.body;
    
    contrasena = usuariosController.encriptar(contrasena);
    await usuario.findByIdAndUpdate(req.params.id, {contrasena: contrasena});

    res.send("Bien");
};



module.exports = usuariosController;