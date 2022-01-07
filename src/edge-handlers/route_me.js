
export function onRequest(event) {
    console.log(`Incoming request for ${event.requestMeta.url}`);
}

/*
router.get('/me', (req, res) => {
    var secret = req.cookies['secret'];
    var userid = req.cookies['userid'];
    if(secret != null && userid != null) {
        User.findOne({ userid: userid, secret: secret}, (err, result) => {
            if(err){
                throw err;
            }

            if(result) {
                res.status(200).sendFile(path.resolve(__dirname + '/../frontend/me.html'))
            } else {
                res.redirect('/login')
            }
        })
    } else {
        res.redirect('/login')
    }
})*/