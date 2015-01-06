var http = require('http');
var fs = require('fs');

http.createServer(function (req, res) {
  console.log('Connection initiated...');

  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end("Hello, Google Compute world!");

  console.log('Request served.');
}).listen(8080, '0.0.0.0');