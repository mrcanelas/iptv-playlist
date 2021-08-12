// require serverless version
const app = require('./index.js')

// create local server
app.listen(process.env.PORT || 3000, function () {
    console.log('Addon active on port 7000.');
    console.log('http://127.0.0.1:3000/channel/iniDate/endDate');
});