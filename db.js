const dotenv = require('dotenv')
dotenv.config()
const {MongoClient} = require('mongodb')

const client = new MongoClient(process.env.CONNECTIONSTRING)

async function run(){
    await client.connect()
   module.exports = client
   let app = require('./app')
       app.listen(process.env.PORT)  
}
run()