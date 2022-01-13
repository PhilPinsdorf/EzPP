const express = require('express');
const filesanitizing = require('sanitize-filename');
const path = require('path');
const fs = require('fs');
const User = require('../modules/user.js');

const fileshare = express.Router();

fileshare.get('/:type/:site/:name', (req, res) => {
	var file = __dirname + '/../frontend/' + filesanitizing(req.params.site) + '/' + filesanitizing(req.params.name) + '.' + filesanitizing(req.params.type);
	console.log(file);

	if (!fs.existsSync(file)) {
		res.status(404).send('File not found');
		return;
	}

	res.status(200).sendFile(path.resolve(file));
});

module.exports = fileshare;
