var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var jwt         = require('jsonwebtoken');
var dbConnect   = require('./dbConnect');
var User        = require('./models/user');
var Locations    = require('./models/location');
var cookieParser= require('cookie-parser');
var path        = require('path');

var urlencodedParser  = bodyParser.urlencoded({ extended: false });
var apiRoutes         = express.Router();
var loginToken        = '';
var publicDir         = path.join(__dirname, '/');

app.set('superSecret', dbConnect.secret);
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')))
app.use(morgan('dev'));

app.get('/', function(req, res) {
  res.status(301).redirect('/sign-in');
});

app.get('/sign-in', function (req, res) {
  res.render( __dirname + "/html/" + "sign-in.ejs" , {msg : req.query.msg, formData : req.body});
});

app.post('/sign-in', urlencodedParser, function(req, res, next) {

  User.findOne({name: req.body.userId}, function(err, user) {
    if (err) throw err;

    if (!user) {
      var string = encodeURIComponent('Authentication failed. User not found.');
      res.status(301).redirect('/sign-in?msg='+string);
    } else if (user) {
      if (user.password != req.body.password) {
        var string = encodeURIComponent('Authentication failed. Wrong password.');
        res.status(301).redirect('/sign-in?msg='+string);
      } else {
        var token = jwt.sign(user, app.get('superSecret'), {
            expiresIn : 60*60*24
        });
        loginToken = token;
        var today = new Date();
        var tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
        res.cookie('token' , token, tomorrow)
        res.status(301).redirect('/api/dashboard');
      }
    }

  });
});

app.get('/sign-up', urlencodedParser, function (req, res) {
  res.render( __dirname + "/html/" + "sign-up.ejs", {msg : req.query.msg});
});

app.post('/sign-up', urlencodedParser, function(req, res) {

  User.count({name: req.body.userId}, function (err, count) {
    if (!count) {

      if(req.body.confPassword !==  req.body.password) {
          res.render( __dirname + "/html/" + "sign-up.ejs" , {msg : 'Password Missmatch'});
          return false;
      }
      var nick = new User({
        name: req.body.userId,
        password: req.body.password,
        admin: true
      });

      nick.save(function(err) {
        if (err) throw err;
        var string = encodeURIComponent('User saved successfully..Please login.');
        res.status(301).redirect('/sign-in?msg='+string);
      });
    }
    else {
      res.render( __dirname + "/html/" + "sign-up.ejs" , {msg : 'User Already Exists'});
    }
  });
});

app.get('/sign-out', function (req, res) {
  res.clearCookie('token');
  res.redirect( __dirname + "/html/" + "sign-in.ejs");
});

apiRoutes.use(function(req, res, next) {
  var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
  if (token) {
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        req.decoded = decoded;
        next();
      }
    });

  } else {
    res.redirect('/sign-in');
  }
});

apiRoutes.get('/dashboard', function(req, res) {
  res.render( __dirname + "/html/" + "dashboard.ejs");
});

apiRoutes.get('/getUsers', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});

apiRoutes.get('/location', function(req, res) {
  Locations.find({}, function(err, users) {
    res.json(users);
  });
});

apiRoutes.post('/location', urlencodedParser, function(req, res) {
  var nick = new Locations({
    lat: req.body.lat,
    long: req.body.long,
    location: req.body.location,
    fullAddress: req.body.fullAddress,
    admin: true
  });

  nick.save(function(err) {
    if (err) throw err;
    // var string = encodeURIComponent('User saved successfully..Please login.');
    res.status(301).redirect('/api/location');
  });
});

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

// app.get('*',function (req, res) {
//     res.redirect('/sign-in');
// });

var server = app.listen(8081, function () {
   var port = server.address().port;
   console.log("Example app listening at http://%s:%s", 'http://127.0.0.1', port);
});
