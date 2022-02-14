const reportesController = {};

const mongoose = require('mongoose');
const fs = require('fs');

const reporte = require('../models/Reportes');
const usuario = require('../models/Usuarios');
const notificacion = require('../models/Notificaciones');


// -----------------------------------------------


// Crear reporte
reportesController.createReporte = async (req, res) => {
    const nuevoReporte = new reporte(req.body);

    nuevoReporte.urgente = false; // Se coloca el estado como desatendido inicialmente
    nuevoReporte.urgenciaTiempo = 0; // Se coloca la urgenciaTiempo como 0 inicialmente
    nuevoReporte.estado = 'Desatendido'; // Se coloca el estado como desatendido inicialmente
    nuevoReporte.fechaCreacion = Date.now(); // Se coloca la fecha de creación

    // Si el usuario que reportó el problema es invitado la credibilidad será 1
    if(!await usuario.findById(nuevoReporte.usuarios)) {
        nuevoReporte.credibilidad = 1;
    }
    // Si el usuario no es invitado se toma su credibilidad
    else {
        const getUsuario = await usuario.findById(nuevoReporte.usuarios);
        nuevoReporte.credibilidad = getUsuario.reputacion;
    }

    // Si se recibe que es cronico desde el frontend se revisan las coincidencias de ubicación con otros problemas del mismo tipo
    if(nuevoReporte.cronico == true) {
        console.log("Posible cronico");
        // Si hay 2 coincidencias se coloca como crónico, sino como no cronico
        let{ cronico, promTiempoCronico } = await reportesController.reporteCronico(nuevoReporte._id, nuevoReporte.ubicacion.latitud, nuevoReporte.ubicacion.longitud, nuevoReporte.tipoProblema);
        nuevoReporte.cronico = cronico;

        if(cronico)
            nuevoReporte.promTiempoCronico = promTiempoCronico;
    }

    await nuevoReporte.save(); // Se guarda el reporte
    res.status(200).json(nuevoReporte._id); // Se regresa el id del reporte al frontend

    usuariosReponsables = await notificacionResponsables(nuevoReporte);
    await notificacionNuevo(nuevoReporte, usuariosReponsables);
    reportesController.urgenciaTiempo(nuevoReporte, usuariosReponsables); // Se inicia el algoritmo de urgenciaTiempo
};

async function notificacionResponsables(nuevoReporte) {
    const usuarios = await usuario.find();
    let usuariosResp = [];
    let institucion = "";

    switch (nuevoReporte.tipoProblema) { //checa las iniciales del usuario para saber a que institucion pertenece
        case "Inundación":
        case "Fuga de agua":
        case "Falta de alcantarilla":
        case "Alcantarilla obstruida":
            institucion = "SP";
        break;

        case "Escombros tirados":
        case "Árbol caído":
            institucion = "PC";
        break;      

        case "Vehículo abandonado":
            institucion = "SM";
        break;
                    
        case "Socavón":
            institucion = "IF";
        break;

        case "Incendio":
            institucion = "BM";
        break;
        
        case "Alumbrado":
        case "Cables caídos":
            institucion = "CF";
        break;
            
        default:
            console.log("Ocurrio algo raro")
        break;
    }

    for(let usuario of usuarios) {
        if(usuario.nombreUsuario.substr(0, 2) == institucion)
        usuariosResp.push({_id: usuario._id});
    }

    return usuariosResp;
}

async function notificacionNuevo(nuevoReporte, usuariosResponsables) {
    const nuevaNotificacion = new notificacion();
        
    nuevaNotificacion.tipoNotificacion = "nuevoProblema";
    nuevaNotificacion.tipoProblema = nuevoReporte.tipoProblema;
    nuevaNotificacion.folioReporte = nuevoReporte._id;
    nuevaNotificacion.usuarios = usuariosResponsables;
    nuevaNotificacion.fechaCreacion = Date.now();
               
    await nuevaNotificacion.save();
}


// Reportar problema ya existente
reportesController.replicarReporte = async (req, res) => {
    const getReporte = await reporte.findById(req.params.id);

    // Si el usuario que reportó el problema es invitado la credibilidad será 1 
    if(!await usuario.findById(req.body.usuarios)) {
        getReporte.credibilidad += 1;
    }
    // Si el usuario no es invitado se toma su credibilidad
    else {
        const getUsuario = await usuario.findById(req.body.usuarios);
        getReporte.credibilidad += getUsuario.reputacion;
    }

    getReporte.usuarios.push(req.body.usuarios); // Se agrega el usuario al arreglo de usuarios que reportaron el problema

    // Si se colocó que hay vidas en riesgo se agrega un punto al vidaRiesgo ya existente
    if(req.body.vidaRiesgo == true)
            getReporte.vidaRiesgo++;

    // Si se recibe que es cronico desde el frontend se revisan las coincidencias de ubicación con otros problemas del mismo tipo
    if(req.body.cronico == true) {
        // Si hay 2 coincidencias se coloca como crónico, sino como no cronico
        getReporte.cronico = await reportesController.reporteCronico(getReporte._id, getReporte.ubicacion.latitud, getReporte.ubicacion.longitud, getReporte.tipoProblema);
    }

    await reporte.findByIdAndUpdate(req.params.id, getReporte); // Se replica/actualiza el reporte
    res.json(getReporte._id); // Se regresa el id del reporte al frontend
};



// Reasignar un reporte a una nueva institucion
reportesController.reasignarReporte = async (req, res) => {
    let aux = req.params.id;
    let separar = aux.split("$");

    const getReporte = await reporte.findById(separar[0]);
    const nuevoReporte = new reporte({
        estado: "Desatendido",
        ubicacion: getReporte.ubicacion,
        tipoProblema: separar[1],
        fechaCreacion: getReporte.fechaCreacion,
        credibilidad: getReporte.credibilidad,
        urgenciaTiempo: 0,
        comentario: getReporte.comentario,
        vidaRiesgo: getReporte.vidaRiesgo,
        cronico: getReporte.cronico,
        usuarios: getReporte.usuarios
    });

    if(nuevoReporte.cronico == true) {
        // Si hay 2 coincidencias se coloca como crónico, sino como no cronico
        nuevoReporte.cronico = await reportesController.reporteCronico(nuevoReporte._id, nuevoReporte.ubicacion.latitud, nuevoReporte.ubicacion.longitud, nuevoReporte.tipoProblema);
    }

    await nuevoReporte.save(); // Se guarda el reporte

    res.json({status: 'Reporte reasignado'});

    reportesController.urgenciaTiempo(nuevoReporte); // Se inicia el algoritmo de urgenciaTiempo
};



// Enviar refuerzos a un problema
reportesController.refuerzoReporte = async (req, res) => {
    let aux = req.params.id;
    let separar = aux.split("$");

    const getReporte = await reporte.findById(separar[0]);
    let urgenciaTiempoOrg = getReporte.urgenciaTiempo

    getReporte.urgenciaTiempo = (parseInt(separar[1]) + 1); // Se coloca la urgencia del reporte más urgente, más 1 punto
    getReporte.estado = 'Desatendido'; // Se coloca el estado como desatendido para poder ser reasignado a una cuadrilla de la misma institucion
    
    let urgenciaMax = (parseInt(separar[1]) + 1)
    let urgenciaOrg = (parseInt(separar[2]) + 1)
    console.log(urgenciaOrg)
    // separar[2] // Contiene el la urgencia original
    await reporte.findByIdAndUpdate(separar[0], {urgenciaTiempo: urgenciaMax, estado: "Desatendido", urgenciaOriginal: urgenciaTiempoOrg, $unset:{"asignado":""}}); // Se actualiza el reporte
    // const reporteActualizado = await reporte.findByIdAndUpdate(req.params.id, {estado: "Desatendido",$unset:{"asignado":""}});

    console.log(separar[0])
    res.json({status: 'Refuerzos solicitados'});
};


// -----------------------------------------------


// Listar todos los reportes de un tipo
reportesController.getTipoReportes = async (req, res) => {
    const getReportes = await reporte.find({tipoProblema: req.params.tipo});
    res.json(getReportes);
};

// Listar todos los reportes en un estado
reportesController.getEstadoReportes = async (req, res) => {
    let aux = req.params.estado
    let separar = aux.split("$")
    let getReportes = [];

    if(separar[0] == "En proceso")
         getReportes = await reporte.find({$or: [{estado: "En ruta"}, {estado:"En proceso"}]});
    else
         getReportes = await reporte.find({estado: separar[0]});
                
    res.json(separarReportesPorInstitucion(separar[1].substr(0,2), getReportes));
};



reportesController.getReportesNoAsignados = async (req, res) => {
    const getReportes = await reporte.find({asignado: {$exists:false}});
    // o que el asigna
    res.json(separarReportesPorInstitucion(req.params.nombreUsuario.substr(0,2), getReportes));
};



reportesController.getReportesXMes = async (req, res) => {
    // console.log(req.params.usuario)
    let aux = req.params.usuario;
    let separar = aux.split("$");
    console.log(separar);
    console.log(req.params.usuario)

    var getDaysInMonth = function(month, year) {
        return new Date(year, month, 0).getDate();
       };
       
    let ultimoDiaDelMes = getDaysInMonth(parseInt(separar[1], 10), parseInt(separar[2], 10))

    let start = separar[2]+'-'+separar[1]+'-01T14:48:00.000Z'
    let end = separar[2]+'-'+separar[1]+'-'+ultimoDiaDelMes+'T14:48:00.000Z'   // aqui debe estar la cantidad de dias que tiene este mes

    // AHORA DEBO BUSCAR EN LA BASE DE DATOS DEPENDIENDO POR MES Y AÑO
    let getReportes

    if(separar[3] == "En proceso"){
        getReportes = await reporte.find({"$and" : [{"fechaCreacion" : {"$gte" : start}}, {"fechaCreacion" : {"$lte" : end}}, {"$or": [{estado: "En proceso"}, {estado: "En ruta"}]}]})
    }else{
        getReportes = await reporte.find({"$and" : [{"fechaCreacion" : {"$gte" : start}}, {"fechaCreacion" : {"$lte" : end}}, {estado: separar[3]}]})
        // await console.log(getReportes)
    }
    
    res.json(separarReportesPorInstitucion(separar[0].substr(0,2), getReportes));
    // res.json(getReportes)
};


function separarReportesPorInstitucion(institucion, getReportes){
    let reportes = [], cont = 0;
    //'alumbrado':'inundacion': 'fuga': 'faltaAlcantarilla': 'alcantarillaObstruida': 'escombros': 'vehiculo': 'arbol': 'socavon': 'cables': 'incendio':
    // ** ATENCION: CREO QUE FALTA AGREGAR ALGUNAS INSTITUCIONES (desde el registro, quizas)
    switch (institucion) { //checa las iniciales del usuario para saber a que institucion pertenece
        case "SP":
            cont = 0;
            getReportes.forEach(e => {
                if(e.tipoProblema == "Inundación" || e.tipoProblema == "Fuga de agua" || e.tipoProblema == "Falta de alcantarilla" || e.tipoProblema == "Alcantarilla obstruida"){
                    reportes.push(e) //guarda en un nuevo arreglo los reportes que correspondan al tipo que soluciona la institucion del usuario que realiza la peticion
                }
                cont++;
            });
        break;      

        case "PC":
            cont = 0;
            getReportes.forEach(e => {
                if(e.tipoProblema == "Escombros tirados" || e.tipoProblema == "Árbol caído"){
                    reportes.push(e) 
                }
                cont++;
            });
        break;      

        case "SM":
            cont = 0;
            getReportes.forEach(e => {
                if(e.tipoProblema == "Vehículo abandonado"){
                    reportes.push(e) 
                }
                cont++;
            });
        break;      
                    
        case "IF":
            cont = 0;
            getReportes.forEach(e => {
                if(e.tipoProblema == "Socavón"){
                    reportes.push(e)
                }
                cont++;
            });
        break;

        case "BM":
            cont = 0;
            getReportes.forEach(e => {
                if(e.tipoProblema == "Incendio"){
                    reportes.push(e)
                }
                cont++;
            }); 
        break;
        
        case "CF":
            cont = 0;
            getReportes.forEach(e => {
                if(e.tipoProblema == "Alumbrado" || e.tipoProblema == "Cables caídos"){
                    reportes.push(e)
                }
                cont++;
            });
        break;
            
        default:
            console.log("Ocurrio algo raro (y por ende se enviaron todos los reportes)")
            reportes = getReportes;
        break;
    }

    return reportes
}


// Listar todos los reportes
reportesController.getReportes = async (req, res) => {
    const getReportes = await reporte.find();
    res.json(getReportes);
};

// Busca reportes asignado y que el estado sea en ruta
reportesController.getReporteAsignado = async (req, res) => {
    const getReporteAsignado = await reporte.find({$and: [{asignado: req.params.id}, {estado: "En ruta"}]});

    if(getReporteAsignado.toString() == ""){
        res.json(false)
    }else{
        res.json(getReporteAsignado);
    }
};

// Busca los reportes de un usuario específico
reportesController.getReportesUsuario = async (req, res) => {
    const getReportesUsuario = await reporte.find({usuarios: {_id: req.params.usuario}});

    if(getReportesUsuario.toString() == ""){
        res.json(false)
    }else{
        res.json(getReportesUsuario);
    }
};

// Buscar un solo reporte
reportesController.getReporte = async (req, res) => {
    const getReporte = await reporte.findById(req.params.id);
    res.json(getReporte);
};


// -----------------------------------------------


// Editar un reporte
reportesController.editReporte = async (req, res) => {
    const getReporte = await reporte.findByIdAndUpdate(req.params.id, req.body);
     
    console.log(getReporte);
    if(getReporte.urgenciaOriginal){// o que si se asigno despues de pedir refuerzos
        let regresar = getReporte.urgenciaOriginal
        let id = getReporte._id
        let cambio = getReporte.urgenciaTiempo

        console.log("id: " + id + " | antigua: " + cambio + " | " + " actu: " + regresar)
        await reporte.findByIdAndUpdate(id, {urgenciaTiempo: regresar,$unset:{"urgenciaOriginal":""}});

    }
    
    res.json({status: 'Reporte actualizado'});
};

reportesController.editImagenReporte = async (req, res) => {
    let getReporte = await reporte.findById(req.params.id);

    if(getReporte.imagen){
        try {
            fs.unlinkSync(getReporte.imagen);
        }
        catch { }
    }

    await reporte.findByIdAndUpdate(req.params.id, {imagen: req.file.path});
    res.json({status: 'Reporte actualizado'});
};

// Borrar un reporte
reportesController.deleteReporte = async (req, res) => {
    const reporteElim = await reporte.findById(req.params.id);

    if(reporteElim.imagen){
        try {
            console.log(reporteElim.imagen);
            fs.unlinkSync(reporteElim.imagen);
        }
        catch { }
    }

    await reporte.findByIdAndDelete(req.params.id);
    res.json({status: 'Reporte eliminado'});
};


// -----------------------------------------------


// Se verifica si el reporte es cronico
reportesController.reporteCronico = async (_id, latComparada, lngComparada, tipo) => {
    let coincidencias = 0;
    let cronico = false;
    let promTiempoCronico = 0;
    let fechas = [];
    
    const getReportes = await reporte.find({tipoProblema: tipo}); // Se obtienen todos los reportes del mismo tipo

    for(let reporteAntiguo of getReportes) { // Se revisa si el reporte coincide en la ubicación con mínimo 2 reportes ya solucionados
        if(reporteAntiguo.estado == 'Solucionado') { // Para pruebas poner en 'Desatendido' ------------------
            if( (Math.abs(reporteAntiguo.ubicacion.latitud - latComparada) * 111100) < 30 && Math.abs((reporteAntiguo.ubicacion.longitud - lngComparada) * 111100) < 30){
                coincidencias++;
                fechas.push(reporteAntiguo.fechaCreacion.getTime());
            }
        }
    }

    // Se coloca como verdadero o falso dependiendo de la cantidad de coincidencias
    if(coincidencias >= 2) {
        cronico = true;
        let hoy = new Date().getTime();
        fechas.push(hoy);

        for(let i = 0; i < fechas.length-1; i++) {
            promTiempoCronico += Math.floor((fechas[i+1] - fechas[i])/(1000*60*60*24));
        }

        promTiempoCronico /= fechas.length-1;

        console.log(promTiempoCronico);
    }
    else
        cronico = false;

    return {cronico: cronico, promTiempoCronico: promTiempoCronico};
}






// ---------------------------------------------------------------------

// Algoritmo de puntos de urgencia/tiempo
reportesController.urgenciaTiempo = async (nuevoReporte, usuariosReponsables) => {
    let puntos = 0;
    let tiempo = 0;

    const getReporte = await reporte.findById(nuevoReporte._id);

    let urgenciaTiempo = getReporte.urgenciaTiempo; // Se obtiene la urgencia actual del reporte

    // Se colocan los puntos y el tiempo dependiendo del tipo de problema
    switch (getReporte.tipoProblema) {
        case 'Alumbrado': {
            puntos = 5;
            tiempo = 86400000; // 24 horas
            break;
        }
        case 'Inundación': {
            puntos = 5;
            // tiempo = 7200000; // 2 horas
            tiempo = 60000; // 2 horas
            break;
        }
        case 'Fuga de agua': {
            puntos = 7;
            tiempo = 2400000; // 40 minutos
            break;
        }
        case 'Falta de alcantarilla': {
            puntos = 7;
            tiempo = 43200000; // 12 horas
            break;
        }
        case 'Alcantarilla obstruida': {
            puntos = 5;
            tiempo = 86400000; // 24 horas
            break;
        }
        case 'Escombros tirados': {
            puntos = 3;
            tiempo = 86400000; // 24 horas
            break;
        }
        case 'Vehículo abandonado': {
            puntos = 3;
            tiempo = 86400000; // 24 horas
            // tiempo = 10000; // Para prueba ------------------ 10 segundos
            break;
        }
        case 'Árbol caído': {
            puntos = 7;
            tiempo = 43200000; // 12 horas
            break;
        }
        case 'Socavón': {
            puntos = 5;
            tiempo = 86400000; // 24 horas
            break;
        }
        case 'Cables caídos': {
            puntos = 5;
            tiempo = 43200000; // 12 horas
            break;
        }
        case 'Incendio': {
            puntos = 10;
            // tiempo = 300000; // 5 minutos
            tiempo = 30000; // Para prueba ------------------ 30 segundos
            break;
        }
    }

    // Intervalo que se repite mientras el problema no esté solucionado
    let intervalo = setInterval( async () => {
        urgenciaTiempo += puntos;

        getReporte.urgenciaTiempo = urgenciaTiempo;

        // Si el problema existe entra
        if(await reporte.findById(nuevoReporte._id)) {
            const reporteEstado = await reporte.findById(nuevoReporte._id); // Se obtiene el reporte

            if(reporteEstado.estado == 'Desatendido') { // Si el estado del reporte es Desatendido se guarda el nuevo urgenciaTiempo
                await reporte.findByIdAndUpdate(nuevoReporte._id, getReporte);
                console.log(reporteEstado.urgente);
                if(!reporteEstado.urgente)
                    await ProblemaUrgente(nuevoReporte, usuariosReponsables);
                else
                    await reporte.findByIdAndUpdate(nuevoReporte._id, {urgente: true});
            }
            else
                clearInterval(intervalo); // Si no es Desatendido se detiene el algoritmo
        }
        else
            clearInterval(intervalo); // Si no existe el reporte se detiene el algoritmo
            
        console.log('Urgencia por tiempo: ' + urgenciaTiempo); // Para pruebas
    }, tiempo)
}

// ---------------------------------------------------------------------

async function ProblemaUrgente(nuevoReporte, usuariosReponsables) {
    let limitePuntosUrgencia = await LimiteUrgencia(); // Se obtiene el límite de puntos de urgencia
    let puntosUrgencia = await PuntosUrgencia(nuevoReporte._id); // Se obtienen los puntos de urgencia del reporte

    console.log("Limite de puntos de urgencia: " + limitePuntosUrgencia);
    console.log("Puntos de urgencia del reporte: " + puntosUrgencia);

    if(puntosUrgencia >= limitePuntosUrgencia) { // Si los puntos de urgencia del reporte superan el límite, el problema es urgente
        console.log("Es urgenteee")
        await reporte.findByIdAndUpdate(nuevoReporte._id, {urgente: true});
        await notificacionUrgente(nuevoReporte, usuariosReponsables);
    }
}

async function LimiteUrgencia() {
    return new Promise(async (resolve, reject) => {
        let limite =  0;
        let sumaUrgencias = 0;

        const getReportes = await reporte.find();

        for(let rep of getReportes) {
            sumaUrgencias += await PuntosUrgencia(rep._id);
        }

        limite = (sumaUrgencias/getReportes.length) * 3/2;

        resolve(limite);
    });
}

async function PuntosUrgencia(_id) {
    let puntosCredibilidad = await PuntosCredibilidad(_id);
    let puntosVidaEnRiesgo = await PuntosVidaEnRiesgo(_id);
    let puntosCronico = await PuntosCronico(_id);
    let puntosTiempo = await PuntosTiempo(_id);

    let puntosUrgencia = puntosCredibilidad + puntosVidaEnRiesgo + puntosCronico + puntosTiempo;

    return puntosUrgencia;
}

async function PuntosCredibilidad(_id) {
    return new Promise(async (resolve, reject) => {
        let puntosCredibilidad = 0;
        
        const getReporte = await reporte.findById(_id);
        
        puntosCredibilidad = getReporte.credibilidad;

        resolve(puntosCredibilidad);
    }); 
}

async function PuntosVidaEnRiesgo(_id) {
    return new Promise(async (resolve, reject) => {
        let puntosVidaEnRiesgo = 0;
        let promedioCredibilidad = 0;
        let usuariosNoVidaRiesgo = 0;

        const getReporte = await reporte.findById(_id);

        promedioCredibilidad = getReporte.credibilidad / getReporte.usuarios.length
        usuariosNoVidaRiesgo = getReporte.usuarios.length - getReporte.vidaRiesgo;

        puntosVidaEnRiesgo = (3*(promedioCredibilidad) + 4*(getReporte.vidaRiesgo+1)/(usuariosNoVidaRiesgo+1));
                
        resolve(puntosVidaEnRiesgo);
    });
}

async function PuntosCronico(_id) {
    return new Promise(async (resolve, reject) => {
        let puntosCronico = 0;

        const getReporte = await reporte.findById(_id);

        if(getReporte.cronico = true)
            puntosCronico =  20;

        resolve(puntosCronico);
    });
}

async function PuntosTiempo(_id) {
    return new Promise(async (resolve, reject) => {
        let puntosTiempo = 0;

        const getReporte = await reporte.findById(_id);
                
        puntosTiempo = getReporte.urgenciaTiempo;

        resolve(puntosTiempo);
    });
}


async function notificacionUrgente(nuevoReporte, usuariosResponsables) {
    const nuevaNotificacion = new notificacion();

    nuevaNotificacion.tipoNotificacion = "nuevoUrgente";
    nuevaNotificacion.tipoProblema = nuevoReporte.tipoProblema;
    nuevaNotificacion.folioReporte = nuevoReporte._id;
    nuevaNotificacion.usuarios = usuariosResponsables;
    nuevaNotificacion.fechaCreacion = Date.now();
               
    await nuevaNotificacion.save();
}

// ---------------------------------------------------------------------







reportesController.infoUsuariosReporte = async (req, res) => {
    const usuarios = await usuario.find();
    let usuariosReporte = [];

    req.body.forEach(eR => {
        usuarios.forEach(eU => {
            if(eU._id == eR._id){
                usuariosReporte.push(eU)
            }
        });
    });

    res.send(usuariosReporte);
};


reportesController.saltarReporte = async (req, res) => {
    console.log(req.params.id)
    // const reporteActualizado = await usuario.find({_id: req.params.id}, {$unset:{"asignado":""}});
    const reporteActualizado = await reporte.findByIdAndUpdate(req.params.id, {estado: "Desatendido",$unset:{"asignado":""}});
    console.log(reporteActualizado)
    
    res.send(true);
};


reportesController.terminoRuta = async (req, res) => {
    console.log(req.params.id)

    const getReporte = await reporte.findById(req.params.id);

    if(getReporte.estado == "En ruta"){
        const reporteActualizado = await reporte.findByIdAndUpdate(req.params.id, {estado: "Desatendido", $unset:{"asignado":""}});
        console.log(reporteActualizado)
    }
    res.send(true);
};


reportesController.quitarFantasma = async (req, res) => {
    console.log(req.params.id)

    const getReporte = await reporte.findById(req.params.id);

    if(getReporte.fantasma == 0){
        res.send(false)
    }else if(getReporte.fantasma > 1){
        const reporteActualizado = await reporte.findByIdAndUpdate(req.params.id, {fantasma: 0 });
        console.log(reporteActualizado)
    }
    res.send(true);
};


reportesController.modificarReputacionUsr = async (req, res) => {
    console.log(req.params.id)
    let fechaA = new Date()

    const getUsr = await usuario.findById(req.params.id);
    let nuevaReputacion = getUsr.reputacion - 1

        await usuario.findByIdAndUpdate(req.params.id, {reputacion: nuevaReputacion, baneado: fechaA.getTime() });
        console.log("reputacion modificada")
        
    res.send(true);
};


reportesController.eliminarFantasma = async (req, res) => {
    const getReporte = await reporte.findById(req.params.id);

    console.log(getReporte.usuarios.length)

    if(getReporte.usuarios.length < 2){ // si el unico reporte es del usuario primero entonces elimina el reporte 
        console.log(req.params.id)
        await reporte.findByIdAndDelete(req.params.id);
    }

    res.send(true);
};





module.exports = reportesController;