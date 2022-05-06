const ObjectID = require('mongodb').ObjectId
const User = require('./User')


const usersCollection = require('../db').db().collection('users')
const followsCollection = require('../db').db().collection('follows')



let Follow = function(followedUsername, authorId){
    this.followedUsername = followedUsername
    this.authorId = authorId
    this.errors = []
}

Follow.prototype.cleanUp = function(){
if(typeof(this.followedUsername) != "string"){this.followedUsername = ""}
}


Follow.prototype.validate = async function(action){
// this.followedUsername must exist in DB

let followedAccount = await usersCollection.findOne({username: this.followedUsername})
if(followedAccount){
    this.followedId = followedAccount._id
}else{
    this.errors.push('u cant follow that doesnt exist')
}
 let doesFollowAlreadyExist = await followsCollection.findOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
    if(action == "create"){
        if(doesFollowAlreadyExist){this.errors.push('U already follow')}
    }
    if(action == "delete"){
        if(!doesFollowAlreadyExist){this.errors.push('U have to follow to unfollow')}
    }
    if(this.followedId.equals(this.authorId)){this.errors.push(" u cant follow urself")}
}



Follow.prototype.create = function(){
    return new Promise(async (resolve, reject)=>{
        this.cleanUp()
        await this.validate("create")
        if(!this.errors.length){
           await followsCollection.insertOne({followedId:this.followedId, authorId: new ObjectID(this.authorId)})
           resolve()
        }else{
            reject(this.errors)
        }
    })
}

Follow.prototype.delete = function(){
    return new Promise(async (resolve, reject)=>{
        this.cleanUp()
        await this.validate("delete")
        if(!this.errors.length){
           await followsCollection.deleteOne({followedId:this.followedId, authorId: new ObjectID(this.authorId)})
           resolve()
        }else{
            reject(this.errors)
        }
    })
}

Follow.isVisitorFollowing = async function(followedId, visitorId){
    let followDoc = await followsCollection.findOne({followedId: followedId, authorId: new ObjectID(visitorId)})
    if(followDoc){
        return true
    }else{
        return false
    }
}

Follow.getFollowersById = function(id){
    return new Promise(async (resolve, reject)=>{
        try{
            let followers = await followsCollection.aggregate([
                {$match: {followedId: id}},
                {$lookup: {from: "users", localField: "authorId", foreignField: "_id", as: "userDoc"}},
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()
            followers = followers.map(function(follower){
                let user = new User(follower, true)
                return {username: follower.username, avatar: user.avatar}
            })
            resolve(followers)
        }catch{
            reject()
        }
    })
}

Follow.getFollowingById = function(id){
    return new Promise(async (resolve, reject)=>{
        try{
            let followers = await followsCollection.aggregate([
                {$match: {authorId: id}},
                {$lookup: {from: "users", localField: "followedId", foreignField: "_id", as: "userDoc"}},
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()
            followers = followers.map(function(follower){
                let user = new User(follower, true)
                return {username: follower.username, avatar: user.avatar}
            })
            resolve(followers)
        }catch{
            reject()
        }
    })
}

Follow.countFollowersById = function(id){
    return new Promise(async (resolve, reject)=>{
        let followerCount = await followsCollection.countDocuments({followedId: id})
        resolve(followerCount)

    })
}

Follow.countFollowingById = function(id){
    return new Promise(async (resolve, reject)=>{
        let followingCount = await followsCollection.countDocuments({authorId: id})
        resolve(followingCount)

    })
}

module.exports = Follow;