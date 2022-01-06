const express = require('express');
const multer = require('multer');
const ws = require('ws');
const fs = require('fs');
const app = express();
const path = require('path');
const session = require('express-session');
const querystring = require('querystring');
const passport = require('passport')
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const { type } = require('express/lib/response');
const bodyParser = require('body-parser');
// const User = require('./database/db');
let recording = false
let email = ""

app.set('view engine','ejs');

app.use(express.static(path.join(__dirname , 'uploads')));
const server = app.listen(4000,()=>{
    console.log("SERVER STARTED");
})

app.use(bodyParser.json()); 


app.use(bodyParser.urlencoded());


//---------------------------------------
app.use(session({
    secret: "secret",
    resave: false ,
    saveUninitialized: true ,
}))
app.use(passport.initialize()) // init passport on every route call
app.use(passport.session())    //allow passport to use "express-session"

const GOOGLE_CLIENT_ID = "1038545448145-7e6dg83grlshsjgct4nlvdopp8d88ljr.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";



//Use "GoogleStrategy" as the Authentication Strategy
passport.use(new GoogleStrategy({
    clientID:     GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/callback",
    passReqToCallback   : true
  }, (request, accessToken, rebody_parserfreshToken, profile, done) => {
    return done(null, profile);
  }));


  passport.serializeUser( (user, done) => { 

    done(null, user)
} )


passport.deserializeUser((user, done) => {

        done (null, user)
}) 

//---------------------------------------
const wss = new ws.Server({ server });

let Clients = {}

wss.on('connection', (ws,req) => {
    req.url = req.url.slice(2,req.url.length);
    const id = querystring.parse(req.url);
    if(Clients[id.email]==null){
        Clients[id.email] = []
    Clients[id.email].push(ws);
    }
    else{
        Clients[id.email].push(ws);
    }
    console.log('email '+id.email);
    
  });





const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'./uploads');
    },
    filename : function(req,file,cb){
        let name  = new Date().toISOString()+file.originalname
        cb(null,name)
    }
});

const upload = multer({storage:storage})

app.post('/upload',upload.single('imageUpload'),(req,res)=>{
  res.status(201).send({message:'uploaded succesfully'});
})

app.get('/',(req,res)=>{
    res.render('index');
})

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get('/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/control',
        failureRedirect: '/'
}));

app.get('/images',(req,res)=>{
    if(!req.isAuthenticated()){
        res.redirect('/');
    }
    else{
    fs.readdir('./uploads', (error, files) => {
        var imgFiles = [];
        files.forEach(file => {
                var imgpath = file;
                imgFiles.push(imgpath);
       
        }) 
        res.render('images', {imgFiles: imgFiles});   
    })
}
});

app.get('/control',(req,res)=>{
    
    if(!req.isAuthenticated()){
        email = ""
        res.redirect('/');
    }
    else{
        email = req.user.email;
    console.log(recording)
    res.render("control",{recording:recording});
    }
})

app.get('/logout',(req,res)=>{
    req.logOut();
    res.redirect('/')
})

app.get('/delete',(req,res)=>{
    if(!req.isAuthenticated()){
        res.redirect('/');
    }
    else{
    let directory = __dirname+'/uploads/'
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
      
        for (const file of files) {
          fs.unlink(path.join(directory, file), err => {
            if (err) throw err;
          });
        }
      });
    res.redirect('/images');
    }
})

app.post('/toggle',(req,res)=>{
    if(!req.isAuthenticated()){
        res.redirect('/');
    }
    else{
        let cond = false;
        if(req.body.intervalActivate=='on'){
            cond = true;
        }
        else{
            cond = false;
        }
        let obj = {
            interval:req.body.interval,
            take_interval:cond
        }
        if(Clients[email]!=null){
            Clients[email].forEach((socket)=>{
                console.log("starting job")
                socket.on('message', function message(data) {
                    data = JSON.parse(data)
                    recording = data.status
                  });
                socket.send(JSON.stringify(obj))
            })
        }
        else{
            console.log('no client');
        }
    res.redirect('/control')
    }
})
