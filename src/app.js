const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const serverless = require('serverless-http')
const router = require('./router.js');

const mongoDbUri = 'mongodb+srv://expressapp:C4xqzz4YCQkzF2L@ezpp.yyk9j.mongodb.net/EzPP?retryWrites=true&w=majority'

//Express Instance
const app = express();
app.use(express.static('public'))
app.use('/.netlify/functions/', router);

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