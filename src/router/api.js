const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const randomKeyUtil = require('../utils/random-key-util.js');
const encryptionUtil = require('../utils/encryption-util.js');
const sanitize = require('mongo-sanitize');
const User = require('../modules/user.js');

const api = express.Router();

var spotifyApi = new SpotifyWebApi({
	clientId: '7c4553c111d241b7ba3f7038f77e2e87',
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	redirectUri: 'https://ezpp.herokuapp.com/api/v1/login_callback',
});

var scope = ['user-read-private'];
var stateKey = 'spotify_auth_state';

//Routes to the api
api.get('/login', function (req, res) {
	randomKeyUtil.get(16, (state) => {
		res.cookie(stateKey, state, {httpOnly: true, secure: true});
		res.redirect(spotifyApi.createAuthorizeURL(scope, state, false, 'code'));
	});
});

api.get('/login_callback', function (req, res) {
	var code = req.query.code || null;
	var state = req.query.state || null;
	var storedState = req.cookies ? req.cookies[stateKey] : null;

	// Check for matching states
	if (state === null || state !== storedState) {
		res.redirect('/#' + encodeURIComponent('state_mismatch'));
		return;
	}
	res.clearCookie(stateKey);

	// Retrieve an access token and a refresh token
	spotifyApi.authorizationCodeGrant(code).then(
		function (data) {
			var refresh_token = sanitize(data.body['refresh_token']);
			spotifyApi.setRefreshToken(refresh_token);
			spotifyApi.refreshAccessToken().then(
				function (data) {
					spotifyApi.setAccessToken(data.body['access_token']);

					spotifyApi.getMe().then(
							function (data) {
								console.log(data);
								var id = sanitize(data.body['id']),
								display_name = sanitize(data.body['display_name']),
								secret = '';

								User.findOne({ userid: id }, (err, result) => {
									if (err) {
										throw err;
									}

									if (!result) {
										randomKeyUtil.get(256, (genSecret) => {
											randomKeyUtil.get(16, (genKey) => {
												newUser = new User({
													userid: id,
													enabled: false,
													secret: genSecret,
													refreshToken: refresh_token,
													key: genKey,
													displayname: display_name,
												});

												newUser.save((err, user) => {
													if (err) {
														throw err;
													}
													secret = user.secret;
													console.log('Registered User ' + user.displayname);
												});
											})
										})
									} else {
										secret = result.secret;
										console.log('Logged in User ' + result.displayname);
									}

									res.clearCookie('secret');
									res.cookie('secret', encryptionUtil.encrypt(secret), {httpOnly: true, secure: true});
									res.clearCookie('userid');
									res.cookie('userid', id, {httpOnly: true, secure: true});
									res.redirect('/me');
								});
							},
							function (err) {
								console.log('Something went wrong!', err);
							}
						)
					.then(() => {
						spotifyApi.resetRefreshToken();
						spotifyApi.resetAccessToken();
					})
					.catch((error) => {
						// Check if user should have access to the app
						console.log("Wrong Status Code");
						var message = "Your Name is probably not on the allowlist of this App. If you think this is an Error, reach out to the Admin of this site!";
						res.redirect("/error?text=" + encodeURIComponent(message));
					});

				},
				function (err) {
					console.log('Something went wrong!', err);
				}
			);
		},
		function (err) {
			console.log('Could not refresh access token', err);
		}
	);
});

api.get('/getTracksBySearch', (req, res) => {
	var search_term = req.query.track,
		limit = req.query.limit || 5;

	spotifyApi.clientCredentialsGrant().then(
		function (data) {
			spotifyApi.setAccessToken(data.body['access_token']);
			spotifyApi
				.searchTracks(decodeURIComponent(search_term), { limit: limit, market: 'DE' })
				.then(
					function (data) {
						var importantData = [];

						for (var i = 0; i < limit; i++) {
							// If there is no Error get Important Data from Song
							var track = data.body['tracks']['items'][i];

							importantData[i] = {};
							importantData[i]['name'] = track['name'];
							importantData[i]['preview'] = track['preview_url'];
							importantData[i]['image'] = track['album']['images'][0]['url'];
							var arts = '';
							for (var a = 0; a < track['artists'].length; a++) {
								if (arts.length) {
									arts += ', ';
								}
								arts += track['artists'][a]['name'];
							}
							importantData[i]['artists'] = arts;
							importantData[i]['id'] = track['id'];
						}

						res.send(importantData);
					},
					function (err) {
						console.error('Song Search went wrong', err);
					}
				)
				.then(spotifyApi.resetAccessToken());
		},
		function (err) {
			console.log('Something went wrong when retrieving an access token', err);
		}
	);
});

api.get('/addsong', (req, res) => {
	var userid = sanitize(req.query.user);
	var songid = sanitize(req.query.song);
	var key = sanitize(req.query.key);

	User.findOne({ userid: userid, key: key }, (err, result) => {
		if (err) {
			throw err;
		}

		if (!result) {
			console.log('Wrong Access Parameters');
			return;
		}

		spotifyApi.setRefreshToken(result.refreshToken);
		spotifyApi.refreshAccessToken().then(function (data) {
			spotifyApi.setAccessToken(data.body['access_token']);
			spotifyApi.addToQueue('spotify:track:' + songid).then(function (data) {
				if (data['statusCode'] === 204) {
					res.send('Added Song!');
				}
				res.end();
			},
			function (err) {
				console.error('Something went wrong!', err);
			}).then(() => {
				spotifyApi.resetRefreshToken();
				spotifyApi.resetAccessToken();
			})
		},
		function (err) {
			console.error('Refreshing Access Token failed!', err);
		}
		)
	});
});

api.get('/getlink', (req, res) => {
	var secret = encryptionUtil.decrypt(req.cookies['secret']);

	User.findOne({ secret: secret }, (err, obj) => {
		if (obj) {
			res.send('https://ezpp.herokuapp.com/user?id=' + obj.userid + '&key=' + obj.key);
		} else {
			res.send('Invalid Secret');
		}
	});
});

api.get('/getname', (req, res) => {
	var secret = encryptionUtil.decrypt(req.cookies['secret']);
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
	var secret = encryptionUtil.decrypt(req.cookies['secret']);
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
	var secret = encryptionUtil.decrypt(req.cookies['secret']);
	var userid = req.cookies['userid'];


	randomKeyUtil.get(16, (key) => {
		User.findOne({ secret: secret, userid: userid }, (err, obj) => {
			if (obj) {
				obj.key = key;
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
});

api.get('/getenabled', (req, res) => {
	var secret = encryptionUtil.decrypt(req.cookies['secret']);
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
