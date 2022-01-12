const crypto = require('crypto');

module.exports = {
	get(length, callback) {
		crypto.randomBytes(length, function (err, buffer) {
			if (err) {
				throw err;
			}

			callback(buffer.toString('hex'));
		});
	},
};
