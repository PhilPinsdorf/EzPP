const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const routing = require('./router/routing.js');
const api = require('./router/api.js');
const fileshare = require('./router/fileshare.js');

const mongoDbUri = process.env.MONGO_DB_URI;

//Express Instance
const app = express();
app.use(express.static('public'));
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Limit Request per IP To prevent DDoS
const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minutes
	max: 50, // Limit each IP to 50 requests per `window` (here, per 1 minute)
	message: 'Too many Requests', // Received Message
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
app.use(limiter);
app.use('/', routing);
app.use('/api/v1/', api);
app.use('/fileshare/', fileshare);

//Database Connection and opening of Port
mongoose
	.connect(mongoDbUri, { useNewUrlParser: true, useUnifiedTopology: true })
	.then((result) => {
		console.log('Connected to Database');
		app.listen(process.env.PORT || 3000, () => console.log('Listen to 3000'));
	})
	.catch((err) => {
		console.log(err);
	});
