
var express = require("express");
var app = express();
 

var http = require("http").createServer(app);
 

var io = require("socket.io")(http);


app.get('/',(req, res)=>{
    res.sendFile("./client.html", {root:__dirname});
})
app.get('/style.css',(req, res)=>{
    res.sendFile("./style.css", {root:__dirname});
})
app.get('/js/socket.io.js',(req, res)=>{
    res.sendFile("./js/socket.io.js", {root:__dirname});
})
app.get('/js/jQuery.js',(req, res)=>{
    res.sendFile("./js/jQuery.js", {root:__dirname});
})


var users = [];
io.on("connection", function (socket) {
    console.log("User connected", socket.id);
    socket.on("user_connected", function(username){
        users[username]=socket.id;
        //notify all connected clients;
        io.emit("user_connected", username);
    })

    //listen from client
    socket.on('send_message', function(data){
        //send event to reciever
        let socketId = users[data.receiver];

        io.to(socketId).emit("new_message", data);
    })
});


http.listen(3000, function () {
    console.log("Server started");
});