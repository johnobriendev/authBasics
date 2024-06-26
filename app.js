const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');
const { body, validationResult } = require("express-validator");
require('dotenv').config();



const mongoDb = process.env.MONGODB_URI;
mongoose.connect(mongoDb);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));



//Models
const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
  })
);



const app = express();
app.set("views", __dirname);
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await User.findOne({ username: username });
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        };
        const match = await bcrypt.compare(password, user.password);
          if (!match) {
            // passwords do not match!
            return done(null, false, { message: "Incorrect password" })
          }

        //we replaced this with the above bcrypt compare 
        // if (user.password !== password) {
        //   return done(null, false, { message: "Incorrect password" });
        // };
        return done(null, user);
      } catch(err) {
        return done(err);
      };
    })
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch(err) {
        done(err);
    };
});
  
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});
 

/////ROUTES////////

app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

app.get("/sign-up", (req, res) => res.render("sign-up-form"));

app.post("/sign-up",

[
  // Validation rules
  body('username')
    .trim()
    .isLength({ min: 1 }).withMessage('Username is required.')
    .isAlphanumeric().withMessage('Username must be alphanumeric.')
    .escape(),
  body('password')
    .trim()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
    .escape()
],
async (req, res, next) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // There are validation errors. Render the form again with sanitized values/error messages.
    return res.render('sign-up-form', { 
      errors: errors.array(),
      username: req.body.username
    });
  }
  
  bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
    if(err){
      return next(err);
    }
    
    try {
      const user = new User({
        username: req.body.username,
        password: hashedPassword
      });
      const result = await user.save();
      res.redirect("/");
    } catch(err) {
      return next(err);
    }
  });
});

app.post(
  "/log-in",
  [
    // Validation rules
    body('username')
      .trim()
      .isLength({ min: 1 }).withMessage('Username is required.')
      .escape(),
    body('password')
      .trim()
      .isLength({ min: 1 }).withMessage('Password is required.')
      .escape()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // There are validation errors. Render the form again with sanitized values/error messages.
      return res.render('index', { 
        errors: errors.array(),
        user: req.user
      });
    }
  
  passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/"
  })(req, res, next);

}
);



app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});
app.listen(3000, () => console.log("app listening on port 3000!"));