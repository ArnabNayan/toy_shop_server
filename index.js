const express = require('express');
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middlewire
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.strmsit.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const toysCollection = client.db("toyDB").collection("toys");
    const toysCollectionDatabase = client.db("toyDB").collection("toysDatabase")
    const userCollection = client.db("dbUser").collection("userCollection");

    app.get('/toys',async(req,res)=>{
        const toysData=toysCollection.find();
        const result=await toysData.toArray();
        res.send(result)
    })

    app.get('/toys/:id',async(req,res)=>{
        const id=req.params.id;
        const toysData=await toysCollection.findOne({_id:new ObjectId(id)})
        res.send(toysData)

    })

    app.post('/toysDatabase',async(req,res)=>{
       const toyData = req.body;
       const result = await toysCollectionDatabase.insertOne(toyData)
       res.send(result)
    })

    app.get('/toysDatabase',async(req,res)=>{
        const toyData=toysCollectionDatabase.find();
        const result=await toyData.toArray();
        res.send(result)
    })

    app.get('/toysDatabase/:id',async(req,res)=>{
        const id=req.params.id;
        const toyData=await toysCollectionDatabase.findOne({_id:new ObjectId(id)})
        res.send(toyData)

    })

    app.patch('/toysDatabase/:id',async(req,res)=>{
        const id = req.params.id
        const updatedData = req.body;
        const toyData = await toysCollectionDatabase.updateOne(
            {_id : new ObjectId(id)},
            {$set : updatedData}
        )
        res.send(toyData)
    })

    app.delete('/toysDatabase/:id',async(req,res)=>{
        const id = req.params.id;
        const toyData = await toysCollectionDatabase.deleteOne({_id : new ObjectId(id)})
        res.send(toyData)
    })


    //user
    app.post('/user',async(req,res)=>{
        const user = req.body;
        const result=await userCollection.insertOne(user)
        return res.send(result)
       })  

   
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Toy Shop server is running')
})

app.listen(port,()=>{
    console.log(`Server is running on PORT:${port}`)
})