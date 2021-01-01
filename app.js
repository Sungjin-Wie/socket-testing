var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var WebSocketClient = require("websocket").client;
let fs = require("fs");
let wavConverter = require("wav-converter");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

function base64encode(plaintext) {
  return Buffer.from(plaintext, "utf8").toString("base64");
}

function base64decode(base64text) {
  return Buffer.from(base64text, "base64");
}

var data = fs.readFileSync("./before.wav");
console.log(data);
var pcm = wavConverter.decodeWav(data);
// console.log(pcm);
var base64data = base64encode(pcm);
var rebase = base64decode(base64data);
// console.log(rebase);
var encodeOptions = {
  numChannels: 1,
  sampleRate: 16000,
  byteRate: 16,
};
var wavData = wavConverter.encodeWav(rebase, encodeOptions);
console.log(wavData);

var client = new WebSocketClient();

client.on("connectFailed", function (error) {
  console.log("Connect Error: " + error.toString());
});

client.on("connect", function (connection) {
  console.log("WebSocket Client Connected");
  connection.on("error", function (error) {
    console.log("Connection Error: " + error.toString());
  });
  connection.on("close", function () {
    console.log("echo-protocol Connection Closed");
  });
  connection.on("message", function (message) {
    if (message.type === "utf8") {
      console.log("received");
      let received = message.utf8Data;
      let decodedAfterToPCM = base64decode(received);
      console.log("decoded after data to pcm buffer");
      console.log(decodedAfterToPCM);
      fs.writeFileSync("./after.pcm", decodedAfterToPCM);
      let encodedPCMtoWAV = wavConverter.encodeWav(
        decodedAfterToPCM,
        encodeOptions
      );
      console.log("test wav file created");
      fs.writeFileSync("./after.wav", encodedPCMtoWAV);
    }
  });

  function sendNumber() {
    if (connection.connected) {
      var number = Math.round(Math.random() * 0xffffff);
      connection.sendUTF(base64data); //utf8data
    }
  }
  sendNumber();
});

client.connect("ws://54.90.23.142:3000");

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
