var MongoClient = require('mongodb').MongoClient;	// require the mongodb driver

/**
 * Uses mongodb v3.1.9 - [API Documentation](http://mongodb.github.io/node-mongodb-native/3.1/api/)
 * StoreDB wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our bookstore app.
 */
function StoreDB(mongoUrl, dbName){
	if (!(this instanceof StoreDB)) return new StoreDB(mongoUrl, dbName);
	this.connected = new Promise(function(resolve, reject){
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			function(err, client){
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to '+mongoUrl+'/'+dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
}

StoreDB.prototype.getProducts = function(queryParams) {
    return this.connected.then(function (db) {
        //console.log("get products collections cursor");
        //get database
        var collection = db.collection("products");
        var queryList = {};
        if ("category" in queryParams && queryParams.category != null) {
            queryList["category"] = queryParams.category;
        }
        if("minPrice" in queryParams || "maxPrice" in queryParams){
            queryList["price"] = {};
            if("minPrice" in queryParams){
                queryList["price"]['$gte'] = parseInt(queryParams.minPrice);
            }
            if("maxPrice" in queryParams){
                queryList["price"]['$lte'] = parseInt(queryParams.maxPrice);
            }
        }
        return new Promise(function(resolve,reject){
            collection.find(queryList).toArray(function(err, items){
                if(err){
                    reject(err);
                }
                var tempProducts = {};
                for (var i = 0; i < items.length; i++) {
                    var id = items[i]["_id"];
                    tempProducts[id] = {};
                    tempProducts[id]["label"] = items[i]["label"];
                    tempProducts[id]["price"] = items[i]["price"];
                    tempProducts[id]["quantity"] = items[i]["quantity"];
                    tempProducts[id]["imageUrl"] = items[i]["imageUrl"];
                    tempProducts[id]["category"] = items[i]["category"];
                }
                resolve(tempProducts);
            });
        });
    }).catch(function(error){
        console.log("unable to get product from database: " + error);
        return new Promise(function(resolve,reject){
            reject(error);
        });
    });
}



StoreDB.prototype.addOrder = function(order){
	return this.connected.then(function(db){
	    console.log("in addOrder");
	    console.log(order);
        var productsCollection = db.collection("products");
        var orderCollection = db.collection("orders");
        var cart = order["cart"];
        var promiseArray = [];
        return new Promise(function(resolve,reject){
            orderCollection.insertOne(order,async function(error){
                console.log("new order id: " + order._id);
                var keyArray = Object.keys(cart);
                var queryList = {};
                queryList["$or"] = [];
                for(var i =0; i < keyArray.length; i++){
                    queryList["$or"].push({"_id":keyArray[i]});
                }
                var cursor = productsCollection.find(queryList);
                while(await cursor.hasNext()){
                    const product = await cursor.next();
                    productsCollection.updateOne({"_id":product._id}, {"$inc":{"quantity":-cart[product._id]}});
                }
                resolve(order._id);
            });
        });
	});
}


module.exports = StoreDB;