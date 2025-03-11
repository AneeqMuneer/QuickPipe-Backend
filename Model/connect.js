const { dbConnect } = require('../Data/db.js');

// import model files here


// create relationships between models here


dbConnect().then(() => {
    console.log('Database connected and models synchronized.');
}).catch(err => {
    console.error('Error connecting database:', err);
});