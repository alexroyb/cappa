
const router =require('./router')
const express = require('express');
const session = require('express-session')
const MongoStore = require('connect-mongo')
const flash = require('connect-flash')
const markdown = require('marked')
const sanitizeHTML = require('sanitize-html')
const app = express()


let sessionOptions = session({
    secret: "aquickbrownfox",
    store: MongoStore.create({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000*60*60*24, httpOnly: true}

})

app.use(sessionOptions)
app.use(flash())
app.use(function(req, res, next){
    // markdown in ejs
    res.locals.filterUserHTML = function(content){
        return sanitizeHTML(markdown.parse(content),{allowedTags:['p', 'br', 'ul', 'ol','li','strong', 'bold', 'i', 'em', 'h1','h2'], allowedAttributes: {}})
    }
    // make available flash (success/errors) on view templates
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")
    //make available userid on request obj
    if(req.session.user){
        req.visitorId = req.session.user._id

    }else{
        req.visitorId = 0
    }

    //make available "user" on ejs 
    res.locals.user = req.session.user
    next()
})
app.use(express.urlencoded({extended:false}))
app.use(express.json())
app.set('views', 'views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use('/', router)
const server = require('http').createServer(app)
const io = require('socket.io')(server) /// let socket =require('socket.io'); let io = socket(server)
io.use((socket, next)=>{
    sessionOptions(socket.request, socket.request.res, next)
})
io.on('connection', socket=>{
    if(socket.request.session.user){
        let user = socket.request.session.user
        socket.emit('welcome' ,{username: user.username, avatar: user.avatar}) 
        socket.on('chatMessageFromBrowser', data =>{
            //io.emit for all whereas socket.broadcast.emit
            socket.broadcast.emit('chatMessageFromServer', {message: sanitizeHTML(data.message, { allowedTags: [] , allowedAttributes: {} }), username: user.username, avatar: user.avatar})
        })
    }
})
module.exports = server