const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


const User = require("../models/User")

module.exports = function(passport){
    passport.use(
        new LocalStrategy({usernameField: "email"}, (email,password,done) =>{
            //Search for user
            User.findOne({email: email})
            .then(user => {
                if(!user){
                    return done(null,false,{message: "Ops that user is not registered"});
                }

                //Check password
                bcrypt.compare(password,user.password,(err,isMatch) => {
                    if(err) throw err;

                    if(isMatch){
                        return done(null,user);
                    }
                    else {
                        return done(null,false,{ message: "Password incorrect. Please try again"});
                    }
                });
            });    
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
      });
      
      passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
          done(err, user);
        });
      });
}