const express = require('express');
const path = require('path');
const User = require('../modules/user.js');

const router = express.Router();

// Routes to public sites
router.get('/', (req, res) => {
	res.status(200).sendFile(path.resolve(__dirname + '/../frontend/index/index.html'));
});

router.get('/me', (req, res) => {
	var secret = req.cookies['secret'];
	var userid = req.cookies['userid'];
	if (secret != null && userid != null) {
		User.findOne({ userid: userid, secret: secret }, (err, result) => {
			if (err) {
				throw err;
			}

			if (result) {
				res.status(200).sendFile(path.resolve(__dirname + '/../frontend/me/index.html'));
			} else {
				res.redirect('/login');
			}
		});
	} else {
		res.redirect('/login');
	}
});

router.get('/user', function (req, res) {
	User.findOne({ userid: req.query.id, key: req.query.key }, (err, obj) => {
		if (!obj) {
			res.send('Wrong Access Link');
		} else {
			if (obj.enabled) {
				res.status(200).sendFile(path.resolve(__dirname + '/../frontend/searchinterface/index.html'));
				return;
			}
			res.send('Der User hat den Dienst deaktiviert!');
		}
	});
});

router.get('/login', (req, res) => {
	res.status(200).sendFile(path.resolve(__dirname + '/../frontend/login/index.html'));
});

module.exports = router;
