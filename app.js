const express = require("express");
const app = express();
const bodyparser = require('body-parser'); 
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); 
const passport = require('passport');
const flash = require("connect-flash");
const User = require("./models/User");
const Message = require("./models/message");
const { ensureAuthenticated } = require("./config/auth")
const connectEnsureLogin = require('connect-ensure-login');
const { update } = require("./models/User");


const http = require("http").createServer(app);
const io = require("socket.io").listen(http);
let port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('Node server running on port 3000');
});
//Express Session Middleware
const expressSession = require('express-session')({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
});
require("./config/passport")(passport);

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

//Setting files
app.use(express.static("public"))
app.use(bodyparser.urlencoded(  {extended:false})) 
app.use(bodyparser.json())
app.use(expressSession);
app.set('view engine', 'ejs');

//   Passport Setup
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//Global vars
app.use((req, res, next) =>{
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
})

//  Mongoose Setup =======================================================

let db_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/MyDatabse'
mongoose.connect(db_URI, {useNewUrlParser: true, useUnifiedTopology: true})

  .then(()=>{
    console.log("1.db conneted");
  })
  .catch((err)=>{
    console.log(" Error Occured \n"+err);
  })

//=========Setting user signup======================================================================
app.post("/signup", (req,res) => {
const {username,email,password,confirmPassword} = req.body;
let errors = [];

//check required fields
if(!username || !email || !password || !confirmPassword ){
  errors.push({msg: "Please fill in all details"});
}
//checking if password is matched
if (password != confirmPassword) {
  errors.push({msg: "Password should be same"})
}
//check pass length
if(password.length<6){
  errors.push({msg: "Password should be atleast 6 characters"});
}

//check for any error
if(errors.length>0){
  res.render("signup",{
    errors,
    username,
    email,
    password
  });
} else {
  //check if user already registred
  User.findOne({email: email})
  .then(user =>{
    if(user){
      errors.push({ msg: "User already registered"})
      res.render("signup",{
      errors,
      username,
      email,
      password
      });
    } else{
      const newUser = new User({
        username,
        email,
        password
      });

      //Hash password
      bcrypt.genSalt(10,(err,salt) =>   bcrypt.hash(newUser.password,salt,(err,hash) =>{
        if(err) throw err;
        //Set password to hash
        newUser.password=hash;
        //Save user
        newUser.save()
          .then(user => {
            req.flash("success_msg","You are now registered. Please login");
            res.redirect("/");
          })
          .catch(err => console.log(err));
      }))
    }
  })
}
})
// ================Setting Login Request=======================================
app.post("/login", passport.authenticate("local",{
  successRedirect: "/private",
  failureRedirect: "/",
  failureFlash: true
}),
(req, res)=>{
  res.redirect("/private");
}
)

// Logout
app.get("/logout",(req,res) =>{
req.logOut();
req.flash("success_msg","You are logged out");
res.redirect("/");
})

//  =================SOCKETS PART=============================
var users = [];
let username1 = '';
io.on("connection", function (socket) {
  console.log("user connected", socket.id);
  socket.on("user_connected",async function(){
        await User.updateOne({username: username1}, {
        socketId: socket.id
      })
      let updateSocket = await User.findOne({username: username1});
      console.log(updateSocket.socketId);
  })
  socket.on('receiverRequest', async function(data){
    await Message.find({$or:[
                            {$and: [{sender: data.sender},{receiver: data.receiver}]},
                            {$and: [{sender: data.receiver}, {receiver: data.sender}]}
                        ]},async function(err, result){
                          await User.findOne({username: data.sender}, function(error, response){
                            console.log("The response request is from: "+response.socketId)
                            
                        io.to(response.socketId).emit('receiverResponse', result);
                        })
                        .then(()=>console.log("FETCHED OLD MESSAGE"+result))
                        .catch((err)=>console.log(err))
                      });
    /////////////////////////////ERROR PART
  });


  socket.on('disconnect', ()=>console.log('user disconnected '+socket.id));
  //listen from client
  socket.on('send_message', async function(data){
    // console.log(data)
    await User.findOne({username: data.receiver}, function(err, result){
      if(err)console.log(err);
      console.log("resulting socket id "+result.socketId+" message: "+data.message)
      io.to(result.socketId).emit("new_message", data.message);
      let messageToDB = new Message({
        sender: data.sender,
        receiver: data.receiver,
        sendmessage: data.message
      });
      messageToDB.save();
      console.log("MESSAGE SEND:\n"+messageToDB);
    });
  });
});
// ====================================================
//Routes
app.get('/', (req, res)=>{
  res.render("login.ejs", {root:__dirname});
});
app.get("/signup", (req,res) => {
  res.render("signup");
});
app.get('/private', connectEnsureLogin.ensureLoggedIn(),async (req, res) =>{
  let db = "mongodb+srv://anand:Anandyadav@1@realtimeapp.yntiq.mongodb.net/RealtimeApp?retryWrites=true&w=majority";
  let allUsers = await User.find({});
  res.render('private', {
    name: req.user.username,
    users: allUsers,
    port: process.env.PORT
  });
  username1 = req.user.username;
   //Login successful redirect///////////////////////
});
app.get('/style.css',(req, res)=>{
  res.sendFile("./style.css", {root:__dirname});
});
app.get('/js/socket.io.js',(req, res)=>{
  res.sendFile("./js/socket.io.js", {root:__dirname});
});
app.get('/js/jQuery.js',(req, res)=>{
  res.sendFile("./js/jQuery.js", {root:__dirname});
});