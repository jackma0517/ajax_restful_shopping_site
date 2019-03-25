// Require dependencies
var path = require('path');
var express = require('express');
var StoreDB = require('./StoreDB.js');

// Declare application parameters
var PORT = process.env.PORT || 3000;
var STATIC_ROOT = path.resolve(__dirname, './public');

// Defining CORS middleware to enable CORS.
// (should really be using "express-cors",
// but this function is provided to show what is really going on when we say "we enable CORS")
function cors(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
  	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  	res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS,PUT");
  	next();
}

// Create a new db
var db = new StoreDB("mongodb://localhost:27017","cpen400a-bookstore");


// Instantiate an express.js application
var app = express();

// Configure the app to use a bunch of middlewares
app.use(express.json());							// handles JSON payload
app.use(express.urlencoded({ extended : true }));	// handles URL encoded payload
app.use(cors);										// Enable CORS

app.use('/', express.static(STATIC_ROOT));			// Serve STATIC_ROOT at URL "/" as a static resource

// Configure '/products' endpoint
app.get('/products', function(request, response) {
    var productsPromise = db.getProducts(request.query);
    productsPromise.then(function(products){
        response.json(products);
    }).catch(function(error){
        console.log("unable to get products from db");
        console.log(error);
        response.status = 500;
    });

});

app.post('/checkout', function(request, response){
    console.log("in /checkout");
    var order = request.body;
    if(!"client_id" in order || !"cart" in order || !"total" in order){
        console.log("Bad format for order");
        response.errmsg = "Bad format for order";
        response.status = 500;
        return ;
    }
    var orderPromise = db.addOrder(order);
    orderPromise.then(function(objectID){
        console.log("objectID for new order: " + objectID);
        response.send(objectID);
    }).catch(function(error){
        console.log("unable to submit order");
        console.log(error);
        response.status(500).send("error: unable to submit order");
    });

});

// Start listening on TCP port
app.listen(PORT, function(){
    console.log('Express.js server started, listening on PORT '+PORT);
});