const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const serverless = require('serverless-http')
const express = require('express');
const randomString = require('./utils/randomString.js');
const querystring = require('querystring');
const request = require('request')
const path = require('path');
const User = require('./modules/user.js');
const base64 = require('base-64');

const mongoDbUri = 'mongodb+srv://expressapp:C4xqzz4YCQkzF2L@ezpp.yyk9j.mongodb.net/EzPP?retryWrites=true&w=majority'

//Express Instance
const app = express();
const router = express.Router();
app.use(express.static('public'))
app.use('/.netlify/functions/api', router);

var client_id = '7c4553c111d241b7ba3f7038f77e2e87'; 
var client_secret = '5bbe8d46b303428b993a475250e31278'; 
var redirect_uri = 'http://localhost:3000/api/v1/login_callback';
var stateKey = 'spotify_auth_state';
var b64token = 'Basic ' + base64.encode(client_id + ':' + client_secret).toString();

// Routes to public sites
router.get('/', (req, res) => {
    res.status(200).sendFile(path.resolve(__dirname + '/../frontend/index.html'))
})

router.get('/me', (req, res) => {
    var secret = req.cookies['secret'];
    var userid = req.cookies['userid'];
    if(secret != null && userid != null) {
        User.findOne({ userid: userid, secret: secret}, (err, result) => {
            if(err){
                throw err;
            }

            if(result) {
                res.status(200).sendFile(path.resolve(__dirname + '/../frontend/me.html'))
            } else {
                res.redirect('/login')
            }
        })
    } else {
        res.redirect('/login')
    }
})

router.get('/user', function (req, res) {
	User.findOne({ userid: req.query.id, key: req.query.key }, (err, obj) => {
		if (!obj) {
			res.send('User not in Database');
		} else {
            if(obj.enabled) {
                res.status(200).sendFile(path.resolve(__dirname + '/../frontend/searchinterface.html'))
                return
            }
            res.send('Der User hat den Dienst deaktiviert!')
		}
	});
});

//Routes to the api
router.get('/api/v1/login', function(req, res) {
    var state = randomString.get(16);
    res.cookie(stateKey, state);

    var scope = 'user-read-private user-read-email';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        show_dialog: true
    }));
});

router.get('/api/v1/login_callback', function(req, res) {
var code = req.query.code || null;
var state = req.query.state || null;
var storedState = req.cookies ? req.cookies[stateKey] : null;

if (state === null || state !== storedState) {
    res.redirect('/#' +
    querystring.stringify({
        error: 'state_mismatch'
    }));
} else {
    res.clearCookie(stateKey);
    var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
    },
    headers: {
        'Authorization': b64token
    },
    json: true
    };

    request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
        };

        var secret = ""

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
            console.log(body)
            User.findOne({ userid: body.id}, (err, result) => {
                if(err){
                    throw err;
                }

                if(!result) {
                    newUser = new User({
                        userid: body.id,
                        enabled: false,
                        secret: randomString.get(256),
                        refreshToken: refresh_token,
                        key: randomString.get(16),
                        displayname: body.display_name,
                    })

                    newUser.save((err, user) => {
                        if(err) {
                            throw err;
                        }
                        secret = user.secret
                        console.log('Registered User ' + user.userid)
                    })
                } else {
                    secret = result.secret
                    console.log('Logged in User ' + result.userid)
                }
                res.clearCookie('secret');
                res.clearCookie('userid');
                res.cookie('secret', secret)
                res.cookie('userid', body.id)
                res.redirect('/me')
            })
        });
    } else {
        res.redirect('/#' +
        querystring.stringify({
            error: 'invalid_token'
        }));
    }
    });
}
});

router.get('/api/v1/getTracksBySearch', (req, res) => {
    var search_term = req.query.track;

    var options = {
		url: 'https://accounts.spotify.com/api/token',
		headers: {
			Authorization: b64token,
		},
		form: {
			grant_type: 'client_credentials',
		},
		json: true,
	};

	// Make Post Request to get Auth Token
	request.post(options, (error, response, body) => {
        var access_token = body.access_token;

		// If there is no Error Callback Spotify Api Access Token
		if (!error && response.statusCode === 200) {
            var options = {
                url:
                    'https://api.spotify.com/v1/search?q=' +
                    search_term +
                    '&type=track&limit=10&market=DE',
                headers: {
                    Authorization: 'Bearer ' + access_token,
                },
                json: true,
            };
        
            // Make Get Request and Use Auth Token to Search Song
            request.get(options, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    var max_tracks = body.tracks.total > 10 ? 10 : body.tracks.total
                    
                    var ids = [];
                    for (var i = 0; i < max_tracks; i++) {
                        ids.push(body.tracks.items[i].id);
                    } 

                    var importantData = [];
                    for (var i = 0; i < max_tracks; i++) {
                        (function (cntr) {
                            var options = {
                                url: 'https://api.spotify.com/v1/tracks/' + ids[cntr] + '?market=DE',
                                headers: {
                                    Authorization: 'Bearer ' + access_token,
                                },
                                json: true,
                            };

                            // Make Get Request
                            request.get(options, (error, response, body) => {
                                if (!error && response.statusCode === 200) {
                                    // If there is no Error get Important Data from Song
                                    var obj = {};
                                    obj['name'] = body.name;
                                    obj['preview'] = body.preview_url;
                                    obj['image'] = body.album.images[0].url;
                                    var arts = '';
                                    for (var a = 0; a < body.artists.length; a++) {
                                        if (arts.length) {
                                            arts += ', ';
                                        }
                                        arts += body.artists[a].name;
                                    }
                                    obj['artists'] = arts;
                                    obj['id'] = body.id;

                                    importantData.push(obj);
                                        
                                    if (importantData.length === max_tracks) {
                                        res.send(importantData);
                                    }
                                } else {
                                    console.log('Getting Track Failed!');
                                }
                            });
                        })(i);
                    }

                } else {
                    console.log('Getting Songs Failed!');
                }
            });
		} else {
			console.log('Authentication Failed!');
		}
	});
});

router.get('/api/v1/addsong', (req, res) => {
    var userid = req.query.user;
	var songid = req.query.song;
    var key = req.query.key;

	User.findOne({ userid: userid }, (err, result) => {
		if (!result) {
			console.log('User not in Database');
		} else {
            if(key != result.key){
                res.send('Wrong Key!');
                return
            }

			//Access Token get new one
            var authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                headers: { 'Authorization': b64token },
                form: {
                grant_type: 'refresh_token',
                refresh_token: result.refreshToken
                },
                json: true
            };
        
            request.post(authOptions, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                var access_token = body.access_token;
                    var queueOptions = {
                        url:
                            'https://api.spotify.com/v1/me/player/queue?uri=' +
                            encodeURIComponent('spotify:track:' + songid),
                        headers: { Authorization: 'Bearer ' + access_token },
                        json: true,
                    };

                    request.post(queueOptions, (error, response, body) => {
                        if (response.statusCode === 204) {
                            res.send('Added Song!');
                        }
                        res.end();
                    });
                }
            });
		}
	});
})

router.get('/api/v1/getlink', (req, res) => {
    var secret = req.cookies['secret'];

    User.findOne({ secret: secret }, (err, obj) => {
		if (obj) {
			res.send('http://localhost:3000/user?id=' + obj.userid + '&key=' + obj.key);
		} else {
            res.send('Invalid Secret')
		}
	});
})

router.get('/api/v1/getname', (req, res) => {
    var secret = req.cookies['secret'];
    var userid = req.cookies['userid'];

    User.findOne({ secret: secret, userid: userid }, (err, obj) => {
		if (obj) {
			res.send(obj.displayname);
		} else {
            res.send('Invalid Secret')
		}
	});
})

router.get('/api/v1/setenabled', (req, res) => {
    var secret = req.cookies['secret'];
    var userid = req.cookies['userid'];

    User.findOne({ secret: secret, userid: userid }, (err, obj) => {
		if (obj) {
            obj.enabled = req.query.state;
            obj.save(function (err) {
                if (err)
                {
                    throw err;
                }
                res.send('Changed');
            });
		} else {
            res.send('Invalid Secret')
		}
	});
})

router.get('/api/v1/generate_key', (req, res) => {
    var secret = req.cookies['secret'];
    var userid = req.cookies['userid'];

    User.findOne({ secret: secret, userid: userid }, (err, obj) => {
		if (obj) {
            obj.key = randomString.get(16);
            obj.save(function (err) {
                if (err)
                {
                    throw err;
                }
                res.send('Changed');
            });
		} else {
            res.send('Invalid Secret')
		}
	});
})

router.get('/api/v1/getenabled', (req, res) => {
    var secret = req.cookies['secret'];
    var userid = req.cookies['userid'];

    User.findOne({ secret: secret, userid: userid }, (err, obj) => {
		if (obj) {
			res.send({enabled: obj.enabled});
		} else {
            res.send('Invalid Secret')
		}
	});
})

//Database Connection and opening of Port
mongoose
	.connect(mongoDbUri, { useNewUrlParser: true, useUnifiedTopology: true })
	.then((result) => {
		console.log('Connected to Database');
		app.listen(3000, () => console.log('Listen to 3000'));
		app.use(cors())
		app.use(cookieParser())
		app.use(express.json())
		app.use(express.urlencoded({extended: true}))
	})
	.catch((err) => {
		console.log(err);
	});

module.exports.handler = serverless(app)