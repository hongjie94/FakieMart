const express = require ('express'); 
const app = express(); 
const bcrypt = require("bcryptjs");
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({extended: false}));
app.use(express.json());
const port = 3000;

// Middleware
const cookieParser = require("cookie-parser");
const session = require('express-session');
const flash = require('connect-flash');
app.use(session({
  secret: 'session-key',
  resave: true,
  saveUninitialized: true
}))
app.use(flash());
app.use(cookieParser());

// Local Json File
const myProducts = require("./public/products.json");

// MongoDB Configuration
const  mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/cis485", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.once('open', () => {
  console.log("Connected to MongoDB!");
}).on('error', (error) => {
  console.log(`Connection error: ${error}`);
});

const {User, Cart, Catalog} = require('./models/schemas');

// Helper functions
const redirectLogin = (req, res, message, status ) => {
  req.flash('message', message);
  req.flash('status', status);
  return res.redirect ("/");
}

app.use((req, res, next) => {
  console.log(`\nNew request made:`);
  console.log(`path: ${req.path}`);
  console.log(`method: ${req.method}`);
  next();
});

// Default route
app.get ("/", (req,res) => {
  res.render ( "login",{message:req.flash('message'), status:req.flash('status'), page:"Login"});	
});

// Login
app.get("/login", async (req, res) => {

  const user_id = req.query.userId;
  User.findOne({user_id: user_id})
    .then((data) => {
      // No data return
      if (!data){
        return redirectLogin( req, res, "Invalid Username!", "400")
      }
      // compare hashed password 
      bcrypt.compare(req.query.password, data.password,  (err, result) => { 
        if(result) { 
          req.session["auth_user"] = user_id;
          return res.redirect( "/products");
        } else { 
          return redirectLogin(req, res, "Invalid Password!", "400")
        } 
      });
    })
    .catch(function (err) {
      console.log(err)
    });
});

// Register
app.get ("/registration",  (req,res) => {
	res.render ( "register",{message:"", status:"", page:"Register"});	
});

app.post("/register", (req, res) => {
  
  if( req.body.password !==  req.body.conformation) {
    return res.render ( "register",{message:"Password Confirmation Not Match!", status:"400", page:"Register"});	
  }

  User.findOne({user_id: req.body.userId})
    .then((data) => {
      if(!data){    
        // hashing password   
        bcrypt.hash(req.body.password, 5, (err,hashedPassword)=> { 
          // error handling
          if (err) return console.log(err);
          // create a new user
          const newUser = new User({
            user_id: req.body.userId,
            password: hashedPassword
          });
          // save new user
          newUser.save().then(()=>{
            req.session["auth_user"] = req.body.userId;
            res.redirect ("/products");	
          }).catch((err)=>{
            console.log(err);
          }) 
        })
      }else{
        // User already exist
        res.render ( "register",{ message: 'User Already Exist!', status:"400", page:"Register"});
      }
    }).catch( (err) => {
      console.log(err)
    });
});

// Logoff
app.get ("/logoff", (req,res) => {
    if(req.session.auth_user){
      req.session["auth_user"]=null;
      redirectLogin(req, res, "You have successfully logged out","200","login");
    }else res.render ( "login.ejs",{message:"Must Login First", status:"400", page:""});	
});

// About
app.get("/about", (req, res) => {
  res.render("about", {page:"about"});
});

// Contact
app.get("/contact", (req, res) => {
  res.render("contact", {page:"contact"});
});

// Products
app.get("/products", (req, res) => {
  // User must be logged in
  if(req.session.auth_user){
    // Find all documents in the collection in no documents insert from local jason files
    Catalog.find({})
    .then((docs) => {
      if(docs.length === 0) {
        console.log("No documents were found, inserting products from products.JSON files");
        Catalog.insertMany(myProducts)
          .then(result => {
            console.log(`${result.length} products inserted`);
            mongoose.disconnect();
            res.render("products", { products: myProducts, page: "products" });
          })
          .catch(err => console.log(err));
      } else {
        res.render("products", { products: docs, page: "products" });
      }
    })
    .catch((err) => {
      console.log('Error retrieving documents from MongoDB:', err);
    });
  }else{
    // User not logged in
    res.render("login.ejs",{message:"Please log in to access this page.", status:"400", page:""});
  }	
});

// Product details 
app.get("/products/:id", async(req, res) => {

  if(req.session.auth_user){
    try {
      let id =  Number(req.params.id);
      console.log(id);
      const product = await Catalog.findOne({id:id});
      if (!product) {
        throw new Error('Product not found');
      }
      res.render("product", {page:"product", product:product});
    } catch (error) {
      console.error(error.message);
    }
  }else{
    redirectLogin(req, res, "Please log in to access this page.", "400", "Login Error");
  }	

});

// Add a new item to cart 
app.post("/add", (req, res) => {
  const product = req.body.data;
  const authUser = req.session.auth_user;

  if(authUser){
    Cart.findOne({user_id: authUser, product_id: product.id })
      .then((foundItem) => {
      if(foundItem){
        foundItem.quantity += 1;
        console.log(
          "Adding Item to Cart"+
          " \nItem Name:" , foundItem.name,
          " \nToatl qty:", foundItem.quantity
        );
        foundItem.save();
      }else {
        const newItem = new Cart({
          user_id: authUser,
          product_id: product.id,
          name:  product.title,
          price: product.price,
          quantity: 1,
          img_url:product.image,
        });
        newItem.save();
      }}).catch((err) => {
        console.log(err);
    });
  }else {
    redirectLogin(req, res, "Please log in to access this page.", "400");
  }
});

// Get user cart items 
app.get("/cart", (req, res) => {
  // Load cart base on authenticated user id
  const authUser = req.session.auth_user;
  if(authUser){
    Cart.find({ user_id: authUser }).sort({createdAt: -1})
    .then((data) => {
      res.render("cart", {cartItems: data, page:"cart"});
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Error retrieving cart items');
    });
  }else{
    redirectLogin(req, res, "Please log in to access this page.", "400");
  }	
});

// Delete item from cart 
app.delete('/cart/:id', async (req, res) => {

  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send('Invalid product ID');
  }
  try {
    const deletedProduct = await Cart.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).send('Product not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }

});

// Update qty for item in cart 
app.patch('/cart/:id', (req, res) => {

  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send('Invalid product ID');
  }
  const mongoId = new mongoose.Types.ObjectId(id)
  console.log(id);
  console.log(req.body.data );
  
  // Update current item
  Cart.updateOne({ _id: mongoId}, { $set: req.body.data })
    .then(()=> {
      // Get all cart items and send back
      Cart.find({ user_id: req.session.auth_user }).sort({createdAt: -1})
        .then(cart => {
          console.log(cart);
          res.status(200).send(cart);
        })
        .catch(error => {
          console.error(error);
          res.status(500).send('Error retrieving cart data');
        });
    })
    .catch(error => {
      res.status(500).send('Error updating cart');
    });
});

// Checkout (delete all items from cart) 
app.delete('/checkout', (req, res) => {
  const authUser = req.session.auth_user;
  if(authUser){
    Cart.deleteMany({ user_id: authUser })
    .then((data) => {
      console.log("line 301 Checkout - ", data);
      return res.status(200).send(JSON.stringify(data));
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Error retrieving cart');
    });
   
  }else{
    redirectLogin(req, res, "Please log in to access this page.", "400");
  }	
});

// Thank you page  *after check out
app.get("/thankyou",(req, res) => {
  res.render("thankyou", {page:"Thank You For Your Purchase!"});
});

// Page not found
app.use((req, res) => {
  res.status(404).render("404", {page:"404 page not found"});
});

app.listen(port, () => {
  console.log (`app listening on http://localhost:${port}`);
});

