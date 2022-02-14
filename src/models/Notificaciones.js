const { Schema, model, Types } = require('mongoose');

const notificacionSchema = new Schema({
    fechaCreacion: {type: Date, required: true},
	tipoNotificacion: {type: String, required: true},
	folioReporte: {type: String, required: false},
	tipoProblema: {type: String, required: false},
	fechaReporte: {type: Date, required: false},
	usuarios: [
	    {
		    _id: {type: String, required: false}
        }
    ]
},
{
    timestamps: true,
    versionKey: false
});

module.exports = model('Notificacion', notificacionSchema);