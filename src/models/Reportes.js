const { Schema, model, Types } = require('mongoose');

const reporteSchema = new Schema({
	estado: {type: String, required: true},
	ubicacion: {
		longitud: {type: Number, required: true},
		latitud: {type: Number, required: true}
    },
	tipoProblema: {type: String, required: true},
	imagen: {type: String, required: false},
	fechaCreacion: {type: Date, required: true},
	fechaSolucion: {type: Date, required: false},
	credibilidad: {type: Number, required: true},
	urgenciaTiempo: {type: Number, required: false},
	comentario: {type: String, required: false},
	vidaRiesgo: {type: Number, required: false},
	asignado: {type: String, required: false},
	cronico: {type: Boolean, required: false},
	promTiempoCronico: {type: Number, required: false},
	fantasma: {type: Number, required: false},
	urgente: {type: Boolean, required: false},
	urgenciaOriginal: {type: Number, require: false},
	usuarios: [
        {
            _id: {type: Types.ObjectId, required: false}
        }
    ]
},
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = model('Reporte', reporteSchema);