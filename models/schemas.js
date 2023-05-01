const mongoose = require("mongoose");
mongoose.pluralize(null);

const loginSchema = new mongoose.Schema({
  user_id: String,
  password: String
});
const  User = mongoose.model("login", loginSchema);

var cartSchema = new mongoose.Schema({
  user_id: String,
  product_id: Number,
  name: String,
  price:Number,
  quantity:Number,
  img_url: String,
});
var Cart = mongoose.model("cart", cartSchema);

var catalogSchema = new mongoose.Schema({
  id: Number,
  title: String,
  price: Number,
  description: String,
  category: String,
  image: String,
  rating: {
    rate: Number,
    count: Number,
  },
});
const Catalog = mongoose.model("catalog", catalogSchema);

module.exports = {
  User,
  Cart,
  Catalog
}