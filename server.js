var http = require('http');
var app = http.createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(8080, '0.0.0.0');

var indexPage;

function handler(req, res) {
  console.log('Connection initiated...');

  function renderIndex() {
    res.writeHead(200);
    res.end(indexPage);
  }

  function loadIndex(callback) {
    fs.readFile(__dirname + '/index.html', function (err, data) {
      if (err) {
        indexPage = null;
        res.writeHead(500);
        return res.end('Error loading index.html');
      }

      indexPage = data;
      return callback();
    });
  }

  if (!indexPage) {
    console.log('Loading index page...');
    loadIndex(renderIndex);
  }
  else {
    console.log('Rendering index page...');
    renderIndex();
  }

  console.log('Request served.');
};

var nUsers = 0;

io.on('connection', function (socket) { // called for each user connection
  console.log("SOCKET.IO: User connection initiated.")

  function notifyUsers() {
    io.sockets.emit('userCount', { total: nUsers });
  }

  socket.on('user connected', function (data) {
    ++nUsers;
    console.log("User connected. Total:", nUsers);
    notifyUsers();
  });

  socket.on('disconnect', function () {
    --nUsers;
    console.log("User disconnected. Total:", nUsers);
    notifyUsers();
  });

});