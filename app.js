//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
require("dotenv").config();
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate =require("mongoose-findorcreate");



const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(session({
  secret: "Thismakesmeirritating@0to100",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect(process.env.LOCAL_DB_URL);
const userSchema = mongoose.Schema({
  email : String,
  password: String,
  googleId: String,
  facebookId: String,
  secret : String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("user", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(User, done){
  done(null, User);
});
passport.deserializeUser(function(User, done){
  done(null, User);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/",function(req , res){

  res.render("home");
});

app.get("/login",function(req , res){

  res.render("login");
});

app.get("/register",function(req , res){

  res.render("register");
});

app.get("/secrets", function(req, res){
      User.find({"secret":{$ne: null}}, function(err , found){
        if(err){
          console.log(err);
        }else{
          if(found){
            res.render("secrets", {userSecrets:found});
          }
        }
      });
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
      res.render("submit");
  }
  else{
    res.redirect("/login");
  }

});


app.get("/logout", function(req, res){
  req.logout(function(err){
    if(!err){
      res.redirect("/")
    }
    else{
      console.log(err);
    }
  });

});


app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));

  app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/secrets');
    });


  app.get('/auth/facebook',
    passport.authenticate('facebook'));

  app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/secrets');
    });
// ##########################################POST REQUEST##########################################
app.post("/register", function(req , res){
User.register({username: req.body.username}, req.body.password, function(err, user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }
  else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});
});

app.post("/login", function(req, res){
  const user = new User({
    email : req.body.username,
    password: req.body.password
  });
req.login(user, function(err){
  if(err){
    console.log(err);
    res.redirect("/login")
  }
  else{
    passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
    });
  }
});

});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  User.findById(req.user._id, function(err, found){
    if(err){
      console.log(err);
    }else{
      if(found){
        found.secret = submittedSecret;
        found.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });

});













app.listen(process.env.PORT || 3000, function(){
  console.log("Server is now online sir - 3000");
});
