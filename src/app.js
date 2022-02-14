const express = require('express');
const morgan = require('morgan');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');

const app = express();

// Enviroment variables
// app.set('port', process.env.PORT || 3000);
// puerto = process.env.PORT || 3000; // Si está definido en el entorno, usarlo. Si no, el 3000
const PORT = process.env.PORT || 5000;
app.listen(PORT);

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('', require('./routes/usuarios.routes'));
app.use('', require('./routes/reportes.routes'));
app.use('', require('./routes/notificaciones.routes'));
app.use('/public', express.static(path.resolve('public')));

// --- Sistema automatizado cada día

const reporte = require('./models/Reportes');
const usuario = require('./models/Usuarios');
const notificacion = require('./models/Notificaciones');

cron.schedule("* * * * *", () => { // Dejar en "0 0 * * *" para que se haga a las 00:00 todos los días || "* * * * * *" para pruebas de 1 segundo
    reporteDesatendido();
    reporteDenegado();
});

async function reporteDesatendido() {
    const reporDesatendidos = await reporte.find({estado: "Desatendido"});
    const hoy = new Date().getTime(); 
    
    for(let repor of reporDesatendidos) {
        const diferencia = hoy - repor.fechaCreacion.getTime();
        const dias = Math.floor(diferencia/(1000*60)); // Real, 1 día
        // const dias = Math.floor(diferencia/(1000)); // Prueba de 1 segundo

        console.log("El reporte " + repor._id + "lleva desatendido " + dias + " días");

        if((dias > 1) && (dias % 3 == 0)) {
            const usuariosResponsables = await notificacionResponsables(repor);
            const nuevaNotificacion = new notificacion();

            nuevaNotificacion.tipoNotificacion = "desatendido";
            nuevaNotificacion.tipoProblema = repor.tipoProblema;
            nuevaNotificacion.folioReporte = repor._id;
            nuevaNotificacion.usuarios = usuariosResponsables;
            nuevaNotificacion.fechaReporte = repor.fechaCreacion;
            nuevaNotificacion.fechaCreacion = Date.now();
            await nuevaNotificacion.save();
        }
    }
}

async function notificacionResponsables(repor) {
    const usuarios = await usuario.find();
    let usuariosResp = [];
    let institucion = "";

    switch (repor.tipoProblema) { //checa las iniciales del usuario para saber a que institucion pertenece
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

    for(let usr of usuarios) {
        if(usr.nombreUsuario.substr(0, 2) == institucion)
        usuariosResp.push({_id: usr._id});
    }

    return usuariosResp;
}

async function reporteDenegado() {
    const notifDenegados = await notificacion.find({tipoNotificacion: "estadoDenegado"});
    const hoy = new Date().getTime(); 

    for(let notif of notifDenegados) {
        const diferencia = hoy - notif.fechaCreacion.getTime();
        const dias = Math.floor(diferencia/(1000*60*60*24)); // Real, 1 día
        // const dias = Math.floor(diferencia/(1000)); // Prueba de 1 segundo

        console.log("El reporte " + notif.folioReporte + "fue denegado hace " + dias + " días");

        if(dias >= 10) {
            await notificacion.findByIdAndDelete(notif._id);
        }
    }
}

// ---

module.exports = app;