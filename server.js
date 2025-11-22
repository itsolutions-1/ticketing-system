
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: "secretkey",
  resave: false,
  saveUninitialized: true
}));

app.set("view engine", "ejs");
app.set("views", "./views");

// INIT TABLES
db.run("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
db.run("CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY, title TEXT, description TEXT, status TEXT)");

// DEFAULT ADMIN
db.get("SELECT * FROM users WHERE username='admin'", (err,row)=>{
  if(!row){
    bcrypt.hash("admin123",10,(err,hash)=>{
      db.run("INSERT INTO users(username,password) VALUES(?,?)",["admin",hash]);
    });
  }
});

// LOGIN PAGE
app.get("/", (req,res)=> res.render("login"));
app.post("/login",(req,res)=>{
  const {username,password}=req.body;
  db.get("SELECT * FROM users WHERE username=?", [username], (err,user)=>{
    if(!user) return res.send("User tidak ada");
    bcrypt.compare(password,user.password,(err,match)=>{
      if(!match) return res.send("Password salah");
      req.session.user=user;
      res.redirect("/dashboard");
    });
  });
});

function auth(req,res,next){
  if(!req.session.user) return res.redirect("/");
  next();
}

app.get("/dashboard", auth, (req,res)=>{
  db.all("SELECT * FROM tickets",[],(err,tickets)=>{
    res.render("dashboard",{tickets});
  });
});

app.get("/new", auth, (req,res)=> res.render("new"));

app.post("/new", auth, (req,res)=>{
  const {title,description}=req.body;
  db.run("INSERT INTO tickets(title,description,status) VALUES(?,?,?)",[title,description,"open"]);
  res.redirect("/dashboard");
});

app.get("/ticket/:id", auth, (req,res)=>{
  db.get("SELECT * FROM tickets WHERE id=?",[req.params.id],(err,t)=>{
    res.render("ticket",{t});
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Running at "+PORT));
