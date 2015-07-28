var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var bcrypt = require('bcrypt');
var session = require('express-session')

var app = express();


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials()); // Parse JSON (uniform resource locators)
app.use(bodyParser.json()); // Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 6000 }
})); //app.use()

app.use(express.static(__dirname + '/public'));


app.get('/', 
function(req, res) {
  res.render('index');
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.get('/create', //check if we have link, if not, save to database
function(req, res) {
  
  res.render('index');
  console.log('CREATE: GET. req.body=',req.body);
});

// app.post('/create', 
// function(req, res) {
//   res.end('WWWWAASup');
//   console.log('CREATE: POST');
// });

app.get('/links', 
function(req, res) {
  // console.log("TEST------>req.session.user", req.session)
  if(!req.session.user){
    res.redirect('/login');
    // res.end("You need to login!");
  }else{
    var model = new Link();
    var test1 = model.fetchAll();
    // var links = Links.fetch();
    console.log('TEST -----> link.fetchAll = ', test1);
    // console.log('TEST -----> Links.fetch = ', links);
    
    res.send(200, test1);
    // res.render('index');
    // Links.reset().fetch().then(function(links) {
    //   res.send(200, links.models);
    // });
  } //if

});

app.post('/links',  
function(req, res) {
  console.log('TEST-----> Inside Links.post');
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      // console.log('test ----------------------- found =', found);
      // console.log('test =--------------------', found.attributes);
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

app.post('/login', 
function(req, res){
  var username = req.body['username'];    
  var password = req.body['password'];
  // var salt = bcrypt.genSaltSync(10);
  // var hash = bcrypt.hashSync(password);
  // var userObj = db.users.findOne({ username: username, password: hash });
  new User({
    'username': username
  }).fetch().then(function(user) { 
    if (!user) { // failure
      res.end('failed login');
    } else { //success
      console.log('----> user=', user);
      if(bcrypt.compareSync(password, user.attributes.password)){ //user.password is a hash
        
            req.session.user = username;
            res.redirect('/links');
        // req.session.regenerate(function(){
        // });
        // req.session.user = username; 
        // req.session = true;

        // res.end('login successful!');
        // res.redirect('/links');
      } //if
        
    } //if
  }); //fetch
  

  // // if(userObj){
  //     req.session.regenerate(function(){
  //         req.session.user = userObj.username;
  //          // res.redirect('/restricted');
  //         res.redirect('/links');
  //     });
  // }else {
  //     res.redirect('/login');
  // } //if
}); //app /login

app.post('/signup', 
function(req, res){
  var username = req.body['username'];    
  var password = req.body['password'];

  // var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password, 10);
  // var userObj = db.users.findOne({ username: username, password: hash });
  var user = new User({
    'username': username,
    'password': hash
  });

  user.save().then(function() {
    console.log("TEST ------> Save user success!");
    res.end('success!');
  });
}); //app /login

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  // console.log("TEST ------>inside of /*. code=", req.params);
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      // console.log("TEST ------> working code");

      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
