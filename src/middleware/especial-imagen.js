const multer = require('multer');

// Direccion de la carpeta publica para guardar imagenes de usuarios especiales
const DIR = './public/especial-imagen';

// Definimos la direccion de almacenamiento y el nuevo nombre del archivo
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, DIR)
    },
    filename: (req, file, cb) => {
        const filename = Date.now() + '-' + file.originalname.toLowerCase().split(' ').join('-');
        cb(null, filename);
    }
}
);

// Subimos el archivo a la direccion con un formato de tipo imagen
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if(file.mimetype == 'image/png' || file.mimetype == 'image/jpg' || file.mimetype == 'image/jpeg' || file.mimetype == 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(null, false);
            return cb(new Error('El archivo debe ser png, jpg o jpeg'));
        }
    }
});

module.exports = upload;