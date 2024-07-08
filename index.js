const express = require('express');
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
    const cartCollection = client.db("toyDB").collection("carts")
    const userCollection = client.db("toyDB").collection("users");
    const paymentCollection = client.db("toyDB").collection("payments")

//jwt related api
app.post('/jwt',async(req,res)=>{
  const user = req.body;
  const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
    expiresIn:'10h'
  })
  res.send({token});
})

//middlewire
const verifyToken=(req,res,next)=>{
  console.log('inside verify token',req.headers.authorization)
  if(!req.headers.authorization){
    return res.status(401).send({message:'unauthorized access'})
  }
  const token=req.headers.authorization.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send('unauthorized access')
    }
    req.decoded=decoded;
    next()
  })
  // next();
}
//use verify admin after verifyToken
const verifyAdmin = async(req,res,next)=>{
  const email=req.decoded.email 
  const query={email:email}
  const user=await userCollection.findOne(query)
  const isAdmin=user?.role==='admin';
  if(!isAdmin){
    return res.status(403).send({message:'forbidden access'});
  }
  next();
}

 //user
 app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
 
  const result=await userCollection.find().toArray()
  res.send(result)
 })

 app.get('/users/admin/:email',verifyToken,async(req,res)=>{
   const email=req.params.email
   if(email!== req.decoded.email){
    return res.status(403).send({message:'forbidden access'})
   }
   const query={email:email};
   const user=await userCollection.findOne(query);
   let admin=false;
   if(user){
    admin= user?.role==='admin';
   }
   res.send({admin})
 })
    app.post('/users',async(req,res)=>{
        const user = req.body;
        //insert email if user doesn't exist
        const query={email:user.email}
        const existingUser=await userCollection.findOne(query)
        if(existingUser){
          return res.send({message:'user already exist',insertedId:null})
        }
        const result=await userCollection.insertOne(user)
        return res.send(result)
       })  
    
    app.patch('/users/admin/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id
      const filter={_id:new ObjectId(id)}
      const updatedDoc={
        $set:{
          role:'admin'
        }
      }
      const result=await userCollection.updateOne(filter,updatedDoc)
      res.send(result)
    })

    app.delete('/users/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)}
      const result=await userCollection.deleteOne(query)
      res.send(result)
    })

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

//addtocart data
app.get('/carts',async(req,res)=>{
  const email=req.query.email;
  const query={email: email}
  const result = await cartCollection.find(query).toArray()
  res.send(result)
})
   
app.post('/carts',async(req,res)=>{
  const cartItem=req.body;
  const result=await cartCollection.insertOne(cartItem)
  res.send(result)
})

app.delete('/carts/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await cartCollection.deleteOne(query)
  res.send (result)
})
  
//payment intent
app.post('/create-payment-intent',async(req,res)=>{
  const {price} = req.body;
  const amount = parseInt(price*100)

  const paymentIntent = await stripe.paymentIntents.create({
    amount:amount,
    currency:'BDT',
    payment_method_types: ['card']
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  })
})

app.get('/payments/:email',verifyToken,async(req,res)=>{
  const query={email:req.params.email}
  if(req.params.email!==req.decoded.email){
    return res.status(403).send({message:'forbidden access'});
  }
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
})

app.post('/payments',async(req,res)=>{
  const payment = req.body;
  const paymentResult=await paymentCollection.insertOne(payment)
  //delete each toy item from the cart
  console.log('payment info',payment)
  const query={_id: {
    $in: payment.cartIds.map(id => new ObjectId(id))
  }}
  const deleteResult=await cartCollection.deleteMany(query)
  res.send({paymentResult,deleteResult})
})
app.get('/payments',async(req,res)=>{
  const result=await paymentCollection.find().toArray();
  res.send(result)
})
   
//update payment for update the action
 app.patch('/payments/:id',async(req,res)=>{
  const id=req.params.id;
  const updatedStatus=req.body.status;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{status:updatedStatus}
  }
  const result=await paymentCollection.updateOne(filter,updateDoc);
  res.send(result)
 })
//stats/analytics
app.get('/admin-states',verifyToken,verifyAdmin, async(req,res)=>{
  const users = await userCollection.estimatedDocumentCount();
  const toyItems=await toysCollectionDatabase.estimatedDocumentCount()
  const orders=await paymentCollection.estimatedDocumentCount()

  // const payments=await paymentCollection.find().toArray();
  // const revenue =payments.reduce((total,item)=>total+parseInt(item.price),0)

  const result = await paymentCollection.aggregate([
    {
      $group:{
        _id:null,
        totalRevenue:{
          $sum: '$price'
        }
      }
    }
  ]).toArray()
  const revenue = result.length>0?result[0].totalRevenue: 0;
  res.send({
    users,
    toyItems,
    orders,
    revenue
  })
})

//user-stats
app.get('/user-stats/:email',async(req,res)=>{
  const email= req.params.email;

  const toyItems=await toysCollectionDatabase.estimatedDocumentCount()
    const result = await paymentCollection.aggregate([
      {
        $match:{email}
      },
    {
      $group:{
        _id:null,
        totalRevenue:{
          $sum: '$price'
        }
      }
    }
  ]).toArray()
  const revenue = result.length>0?result[0].totalRevenue: 0;

  
  const totalOrders=await cartCollection.countDocuments({email})
  res.send({

    toyItems,
    revenue,
    totalOrders
  })
})
app.get('/order-stats',verifyToken,verifyAdmin, async(req,res)=>{
  const result = await paymentCollection.aggregate([
{
   $unwind:'$toyItemIds'
},
{
  $set:{
    toyItemIds:{
      $toObjectId:'$toyItemIds'
    }
  }
},
{
  $lookup:{
    from:'toysDatabase',
    localField:'toyItemIds',
    foreignField:'_id',
    as:'toyItems'
  }
},
{
  $unwind:'$toyItems'
},
{
   $set:{
    'toyItems.price':{
      $convert:{
        input:'$toyItems.price',
        to:'int',
        onError:0,
        onNull:0
      }
    }
   }
},
{
  $group:{
    _id: '$toyItems.category',
    quantity:{$sum:1},
    revenue:{$sum: '$toyItems.price'}
  }
},
{
  $project:{
    _id:0,
    category:'$_id',
    quantity:'$quantity',
    revenue:'$revenue'
  }
}

  ]).toArray()
  res.send(result);
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