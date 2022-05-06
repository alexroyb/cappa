

const bcrypt = require('bcryptjs')
const usersCollection = require('../db').db().collection('users')
const validator = require('validator')
const md5 = require('md5')


let User = function(data, getAvatar){
    this.data = data
    this.errors = []
    if(getAvatar == undefined){ getAvatar = false}
    if(getAvatar){ this.getAvatar()}
}
// clean up for registration
User.prototype.cleanUp = function(){
    if(typeof(this.data.username) != "string"){this.data.username =''}
    if(typeof(this.data.email) != "string"){this.data.email =''}
    if(typeof(this.data.password) != "string"){this.data.password =''}


    // getting rid of bogus properties

    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }
}
// clean up for login

User.prototype.cleanup = function(){
    if(typeof(this.data.username) != "string"){this.data.username =''}
    
    if(typeof(this.data.password) != "string"){this.data.password =''}


    // getting rid of bogus properties

    this.data = {
        username: this.data.username.trim().toLowerCase(),
       
        password: this.data.password
    }
}


//end cleanup

User.prototype.validate = function(){
    return new Promise( async (resolve, reject) => {
        if(this.data.username == ''){this.errors.push('u must provide user name')}
        if(this.data.username !== '' && !validator.isAlphanumeric(this.data.username)){this.errors.push('u must provide a valid user name')}
        if(!validator.isEmail(this.data.email)){this.errors.push('u must provide valid email')}
        if(this.data.password == ''){this.errors.push('u must provide appropriate passward')}
        // only if usernme is valid then to check whether username is taken
        if(this.data.username.length > 2 && this.data.username.length < 20 && validator.isAlphanumeric(this.data.username)){
    
            let usernameExists = await usersCollection.findOne({username: this.data.username})
            if(usernameExists){this.errors.push('this name is already taken')}
        }
    
        // only if email is valid then to check whether email is used
        if(validator.isEmail(this.data.email)){
    
            let emailExists = await usersCollection.findOne({email: this.data.email})
            if(emailExists){this.errors.push('this email is already used')}
        }
        resolve()
    })
}

User.prototype.login = function(){
    this.cleanup()
  return  new Promise((resolve, reject) => {
        usersCollection.findOne({username:this.data.username},(err, attemptedUser) => {
            if(attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)){
                this.data = attemptedUser
                this.getAvatar()
                resolve('congratz!!!')
            }else{
                reject('invalid username/password')
            }
        })

    })
    
   

}



User.prototype.register = function(){
    return new Promise( async (resolve, reject) => {
        this.cleanUp()
       await this.validate()
    
        if(!this.errors.length){
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password, salt)
            await usersCollection.insertOne(this.data)
            this.getAvatar()
            resolve()
        }else{
            reject(this.errors)
        }
    }
    )
}

User.prototype.getAvatar = function(){
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function(username){
    return new Promise(function(resolve, reject) {
        if(typeof(username) != "string"){
            reject()
            return
        }
    usersCollection.findOne({username: username}).then(function(userDoc){
        if(userDoc){

            userDoc = new User(userDoc, true)
            userDoc = {
                _id: userDoc.data._id,
                username: userDoc.data.username,
                avatar: userDoc.avatar
            }
            resolve(userDoc)
        }else{
            reject()
        }

    }).catch(function(){
        reject()
    })    
    })
}

module.exports = User