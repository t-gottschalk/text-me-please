const config = require('./server/config');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const Nexmo = require('nexmo');
const socket = require('socket.io');
const app = express();

const server = app.listen(3000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

// Nexmo initialization
const nexmo = new Nexmo({
  apiKey: config.api_key,
  apiSecret: config.api_secret,
}, {debug: true});

// Socket.io Library
const io = socket(server);
io.on('connection', (socket) => {
  console.log('Socket connected');
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected because ' + reason);
  });
});

// Configure Express
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json()); // Parse json
app.use(bodyParser.urlencoded({ extended: true })); // Parse html form data

// Express Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.post('/', (req, res) => {
  res.send(req.body);

  let toNumber = req.body.number;
  let text = req.body.text;

  let data = {}; // the data to be emitted to front-end

  // Sending SMS via Nexmo API
  nexmo.message.sendSms(
    15055224269, toNumber, text, {type: 'unicode'},
    (err, responseData) => {
      if (err) {
        data = {error: err};
      } else {
        //console.dir(responseData);
        if(responseData.messages[0]['error-text']) {
          data = {error: responseData.messages[0]['error-text']};
        } else {
          let n = responseData.messages[0]['to'].substr(0, responseData.messages[0]['to'].length - 4) + '****';
          data = {id: responseData.messages[0]['message-id'], number: n};
        }
        io.emit('smsStatus', data);
      }
    }
  );

  // Basic Number Insight - get info about the phone number
  nexmo.numberInsight.get({level:'basic', number: toNumber}, (err, responseData) => {
    if (err) {
      console.log(err);
    } else {
      console.dir(responseData);
    }
  });
});
