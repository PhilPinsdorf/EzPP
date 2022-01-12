const crypto = require('crypto')

module.exports = {
	get(length) {
		crypto.randomBytes(length, function(err, buffer) {
			return buffer.toString('hex');
		});
	},
};
