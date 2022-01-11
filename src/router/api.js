const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const randomString = require('../utils/randomString.js');
const querystring = require('querystring');
const request = require('request');
const User = require('../modules/user.js');
const base64 = require('base-64');

const api = express.Router();

var spotifyApi = new SpotifyWebApi({
  clientId: '7c4553c111d241b7ba3f7038f77e2e87',
  clientSecret: '5bbe8d46b303428b993a475250e31278',
  redirectUri: 'https://ezpp.herokuapp.com/api/v1/login_callback'
});

var scope = ['user-read-private'];
var stateKey = 'spotify_auth_state';
// var b64token = 'Basic ' + base64.encode(client_id + ':' + client_secret).toString();

//Routes to the api
api.get('/login', function (req, res) {
	var state = randomString.get(16);
	res.cookie(stateKey, state);
	res.redirect(spotifyApi.createAuthorizeURL(scope, state, false, 'code'));
});

api.get('/login_callback', function (req, res) {
	var code = req.query.code || null;
	var state = req.query.state || null;
	var storedState = req.cookies ? req.cookies[stateKey] : null;

	// Check for matching states
	if (state === null || state !== storedState) {
		res.redirect(
			'/#' +
				querystring.stringify({
					error: 'state_mismatch',
				})
		);
		return
	}
	res.clearCookie(stateKey);

	// Retrieve an access token and a refresh token
	spotifyApi.authorizationCodeGrant(code)
	.then(function(data) {
		var refresh_token = data.body['refresh_token'];
		spotifyApi.setRefreshToken(refresh_token);
		spotifyApi.refreshAccessToken()
		.then(function(data) {
			spotifyApi.setAccessToken(data.body['access_token']);
			spotifyApi.getMe()
			.then(function(data) {
				var id = data.body['id'],
					display_name = data.body['display_name'],
					secret = '';

				User.findOne({ userid: id }, (err, result) => {
					if (err) {
						throw err;
					}

					if (!result) {
						newUser = new User({
							userid: id,
							enabled: false,
							secret: randomString.get(256),
							refreshToken: refresh_token,
							key: randomString.get(16),
							displayname: display_name,
						});

						newUser.save((err, user) => {
							if (err) {
								throw err;
							}
							secret = user.secret;
							console.log('Registered User ' + user.displayname);
						});
					} else {
						secret = result.secret;
						console.log('Logged in User ' + result.displayname);
					}

					res.clearCookie('secret');
					res.cookie('secret', secret);
					res.clearCookie('userid');
					res.cookie('userid', id);
					res.redirect('/me');
				});
			}, function(err) {
				console.log('Something went wrong!', err);
			}).then(() => {
				spotifyApi.resetRefreshToken();
				spotifyApi.resetAccessToken();
			});
			}, function(err) {
				console.log('Something went wrong!', err);
			});
		},
		function(err) {
			console.log('Could not refresh access token', err);
		}
	)
});

api.get('/getTracksBySearch', (req, res) => {
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
				url: 'https://api.spotify.com/v1/search?q=' + search_term + '&type=track&limit=10&market=DE',
				headers: {
					Authorization: 'Bearer ' + access_token,
				},
				json: true,
			};

			// Make Get Request and Use Auth Token to Search Song
			request.get(options, (error, response, body) => {
				if (!error && response.statusCode === 200) {
					var max_tracks = body.tracks.total > 10 ? 10 : body.tracks.total;

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

api.get('/addsong', (req, res) => {
	var userid = req.query.user;
	var songid = req.query.song;
	var key = req.query.key;

	User.findOne({ userid: userid, key: key }, (err, result) => {
		if(err){
			throw err;
		}


		if (!result) {
			console.log('Wrong Access Parameters');
			return;
		} 

		spotifyApi.setRefreshToken(result.refreshToken);
		spotifyApi.addToQueue(songid)
		.then(function(data) {
			if(data['statusCode'] === 204) {
				res.send('Added Song!');
			}
			res.end();
		}, function(err) {
			console.error('Something went wrong!', err);
		});
		spotifyApi.removeRefreshToken();
	});
});

api.get('/getlink', (req, res) => {
	var secret = req.cookies['secret'];

	User.findOne({ secret: secret }, (err, obj) => {
		if (obj) {
			res.send('https://ezpp.herokuapp.com/user?id=' + obj.userid + '&key=' + obj.key);
		} else {
			res.send('Invalid Secret');
		}
	});
});

api.get('/getname', (req, res) => {
	var secret = req.cookies['secret'];
	var userid = req.cookies['userid'];

	User.findOne({ secret: secret, userid: userid }, (err, obj) => {
		if (obj) {
			res.send(obj.displayname);
		} else {
			res.send('Invalid Secret');
		}
	});
});

api.get('/setenabled', (req, res) => {
	var secret = req.cookies['secret'];
	var userid = req.cookies['userid'];

	User.findOne({ secret: secret, userid: userid }, (err, obj) => {
		if (obj) {
			obj.enabled = req.query.state;
			obj.save(function (err) {
				if (err) {
					throw err;
				}
				res.send('Changed');
			});
		} else {
			res.send('Invalid Secret');
		}
	});
});

api.get('/generate_key', (req, res) => {
	var secret = req.cookies['secret'];
	var userid = req.cookies['userid'];

	User.findOne({ secret: secret, userid: userid }, (err, obj) => {
		if (obj) {
			obj.key = randomString.get(16);
			obj.save(function (err) {
				if (err) {
					throw err;
				}
				res.send('Changed');
			});
		} else {
			res.send('Invalid Secret');
		}
	});
});

api.get('/getenabled', (req, res) => {
	var secret = req.cookies['secret'];
	var userid = req.cookies['userid'];

	User.findOne({ secret: secret, userid: userid }, (err, obj) => {
		if (obj) {
			res.send({ enabled: obj.enabled });
		} else {
			res.send('Invalid Secret');
		}
	});
});

module.exports = api;
