const mongoose = require('mongoose');

mongoose
    .connect('mongodb+srv://SaulIzcali:dbMapHop@cluster0.sa2dr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', {
        // useUnifiedTopology: true,
        // useNewUrlParser: true,
        // useFindAndModify: false
    })
    // mongodb+srv://SaulIzcali:<password>@cluster0.sa2dr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
    .then(db => console-console.log('Database is connected'))
    .catch((err) => console.error(err));