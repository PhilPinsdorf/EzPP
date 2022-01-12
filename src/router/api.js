const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const randomString = require('../utils/randomString.js');
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
		res.redirect('/#' + encodeURIComponent('state_mismatch'));
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
	var search_term = req.query.track,
		limit = req.query.limit || 5;

	spotifyApi.clientCredentialsGrant()
	.then(function (data) {
		spotifyApi.setAccessToken(data.body['access_token']);

		spotifyApi.searchTracks(decodeURIComponent(search_term), {limit: limit, market: 'DE'})
		.then(function(data) {
			var total_results = data.body.tracks.total;
			
			var ids = [];
			console.log(data.body['tracks']['items'][0]['id'])
			for (var i = 0; i < total_results; i++) {
				ids.push(data.body.tracks.items[i]['id']);
			}

			var importantData = [];

			for (var i = 0; i < total_results; i++) {
				(function (cntr) {
					spotifyApi.getTrack(ids[cntr], {market: 'DE'})
					.then(function(data) {
						// If there is no Error get Important Data from Song
						var obj = {};
						obj['name'] = data.body['name'];
						obj['preview'] = data.body['preview_url'];
						obj['image'] = data.body['album'].images[0].url;
						var arts = '';
						for (var a = 0; a < data.body['artists'].length; a++) {
							if (arts.length) {
								arts += ', ';
							}
							arts += body.artists[a].name;
						}
						obj['artists'] = arts;
						obj['id'] = body.id;

						importantData.push(obj);

						if (importantData.length === total_results) {
							res.send(importantData);
						}
					})
				})(i);
			}
		}, function(err) {
			console.error('Song Search went wrong', err);
		});
	},
	function(err) {
		console.log('Something went wrong when retrieving an access token', err);
	})
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
