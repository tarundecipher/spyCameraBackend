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
let recording = false

app.set('view engine','ejs');

app.use(express.static(path.join(__dirname , 'uploads')));
const server = app.listen(4000,()=>{
    console.log("SERVER STARTED");
})


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
  }, (request, accessToken, refreshToken, profile, done) => {
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
    Clients[id.email] = ws;
    console.log(id.email);
    let obj = {
        interval:'5',
        take_interval:false
    }
    ws.on('message', function message(data) {
        data = JSON.parse(data)
        console.log('received: %s',data.status);
        recording = data.status
      });
    ws.send(JSON.stringify(obj))
  });





const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'./uploads');
    },
    filename : function(req,file,cb){
        cb(null,new Date().toISOString()+file.originalname)
    }
});

const upload = multer({storage:storage})

app.post('/upload',upload.single('imageUpload'),(req,res)=>{
  res.status(201).send({message:'uploaded succesfully'});
})

app.get('/',(req,res)=>{
    console.log(req.useremail);
    res.render('index');
})

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get('/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/',
        failureRedirect: '/'
}));

app.get('/images',(req,res)=>{
    fs.readdir('./uploads', (error, files) => {
        var imgFiles = [];
        files.forEach(file => {
                var imgpath = file;
                imgFiles.push(imgpath);
       
        }) 
        res.render('images', {imgFiles: imgFiles});   
    })
});

app.post('/start',(req,res)=>{
    console.log('hi');
    res.status(201).send();
})

app.post('/stop',(req,res)=>{
    console.log('stop');
    res.status(201).send();
})