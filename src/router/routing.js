const express = require('express');
const path = require('path');
const fs = require('fs');
const User = require('../modules/user.js');
const encryptionUtil = require('../utils/encryption-util.js');
const sanitize = require('mongo-sanitize');

const router = express.Router();

// Routes to public sites
router.get('/', (req, res) => {
	res.status(200).sendFile(path.resolve(__dirname + '/../frontend/index/index.html'));
});

router.get('/me', (req, res) => {
	var unsanitizedSecret = req.cookies['secret'];
	var unsanitizedUserid = req.cookies['userid'];

	try {
		var secret = sanitize(encryptionUtil.decrypt(unsanitizedSecret));
		var userid = sanitize(unsanitizedUserid);

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
	}		
	catch {
		res.redirect('/login');
	}
});

router.get('/user', function (req, res) {
	var userid = sanitize(req.query.id),
		key = sanitize(req.query.key);
	User.findOne({ userid: userid, key: key }, (err, obj) => {
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
