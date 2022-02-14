require('./database');
const app = require('./app');

app.listen(app.get('port'));
console-console.log('Server on port', app.get('port'));