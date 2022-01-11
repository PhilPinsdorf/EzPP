const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userShema = new Schema(
	{
		userid: {
			type: String,
			required: true,
		},
		enabled: {
			type: Boolean,
			required: true,
		},
		secret: {
			type: String,
			required: true,
		},
		refreshToken: {
			type: String,
			required: true,
		},
		key: {
			type: String,
			required: true,
		},
		displayname: {
			type: String,
			required: true,
		},
	},
	{ collection: 'users' }
);

const User = mongoose.model('User', userShema);
module.exports = User;
