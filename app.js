
  const express = require("express");
  const app = express();
  const bodyparser = require('body-parser'); 
  const mongoose = require("mongoose");
  const bcrypt = require("bcryptjs"); 
  const passport = require('passport');
  const flash = require("connect-flash");
  const User = require("./models/User");
  const { ensureAuthenticated } = require("./config/auth")

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

  //==  Mongoose Setup =======================================================
  mongoose.connect('mongodb://localhost/MyDatabase',
    { useNewUrlParser: true, useUnifiedTopology: true });
  
  
//=========================================================================


//Routes

app.get("/signup", (req,res) => {
  res.render("signup");
})

app.get("/login", (req,res) => {
  res.render("login");
})

app.get("/private", ensureAuthenticated, (req,res) =>{
  res.render("private");
})

 

//=========Setting user signup======================================================================

app.post("/signup", (req,res) => {
  const {username,email,password} = req.body;
  let errors = [];

  //check required fields
  if(!username || !email || !password ){
    errors.push({msg: "Please fill in all details"});
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
              res.redirect("/login");
            })
            .catch(err => console.log(err));
        }))
      }
    })
  }
})
// ===========================================================================



// ================Setting Login Request=======================================
  app.post("/login",(req,res,next) =>{
    passport.authenticate("local",{
      successRedirect: "/private",
      failureRedirect: "/login",
      failureFlash: true
    })(req,res,next);
  })




// Logout
  app.get("/logout",(req,res) =>{
    req.logOut();
    req.flash("success_msg","You are logged out");
    res.redirect("/login");
  })


app.listen(3000, '127.0.0.1',function(){
    console.log('Node server running on port 3000');
});
