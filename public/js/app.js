// app.js by jack and blake
//const serverLink = "https://cpen400a-bookstore.herokuapp.com";
const serverLink = "http://localhost:3000";
const timeoutLength = 7000; //timeout length in ms
const maxAttempt = 4; //for ajaxGet
var displayed = [];



var Store = function(serverUrl){
    this.serverUrl = serverUrl;
	this.stock = {};
	this.cart = {};
    this.onUpdate = null;
};


Store.prototype.addItemToCart = function(itemName){
	if(this.stock[itemName].quantity>0){
		this.stock[itemName].quantity--;
		if(this.cart[itemName] == null){
			this.cart[itemName] = 0;
		}
        this.cart[itemName]++;
	}
	else{
		alert("Running out of stock!");
	}

    console.log("new stock");
    console.log(this.stock);
    console.log("new cart");
    console.log(this.cart);
    console.log("reset timer");
    resetTimer();
    this.onUpdate(itemName);
};

Store.prototype.removeItemFromCart = function(itemName){
	if(this.cart[itemName]!=null){
		if(this.cart[itemName]>1){
			this.cart[itemName]--;
		}
		else if(this.cart[itemName]==1){
			delete this.cart[itemName];
		}
		this.stock[itemName].quantity++;
	}
	else{
		alert("This item is not in the cart!");
	}

	resetTimer();
	this.onUpdate(itemName);
};

Store.prototype.onUpdate = null;

Store.prototype.syncWithServer = function(onSync){
    var storeTemp = this;
    console.log(storeTemp);
    console.log("SYNC WITH SERVER");
	ajaxGet(storeTemp.serverUrl+"/products", function(response){
	    var newProducts = response;
	    var oldProducts = storeTemp.stock;
	    var delta={};
		if(Object.keys(oldProducts).length != 0){
			for(var i = 0; i<Object.keys(oldProducts).length; i++){
			    var key = Object.keys(newProducts)[i];
				var newProduct = newProducts[Object.keys(newProducts)[i]];
				var oldProduct = oldProducts[Object.keys(oldProducts)[i]];
				if(Object.keys(newProducts)[i] in storeTemp.cart){
                    if((newProduct.price!=oldProduct.price)||(newProduct.quantity != oldProduct.quantity + storeTemp.cart[Object.keys(newProducts)[i]])){
                        delta[key]={price: (newProduct.price-oldProduct.price), quantity: (newProduct.quantity-oldProduct.quantity)};
                    }
				}else{
                    if((newProduct.price!=oldProduct.price)||(newProduct.quantity != oldProduct.quantity)){
                        delta[key]={price: (newProduct.price-oldProduct.price), quantity: (newProduct.quantity-oldProduct.quantity)};
                    }
				}
			}
			console.log("DELTA");
			console.log(delta);
			for(var i = 0; i<Object.keys(delta).length; i++){
			    var key = Object.keys(delta)[i];
                storeTemp.stock[key].quantity = storeTemp.stock[key].quantity + delta[key].quantity;
				if(storeTemp.cart[key]){
                    storeTemp.stock[key].quantity = storeTemp.stock[key].quantity - storeTemp.cart[key];
				}
                storeTemp.stock[key].price = storeTemp.stock[key].price + delta[key].price;
			}
			if(Object.keys(storeTemp.cart)){
				for(var i = 0; i<Object.keys(storeTemp.cart).length; i++){
				    var key =Object.keys(storeTemp.cart)[i];
					if(storeTemp.stock[key].quantity<0){
                        storeTemp.cart[key] = (storeTemp.cart[key]+storeTemp.stock[key].quantity);
                        storeTemp.stock[key].quantity=0;
					}
				}
				console.log("END CART");
				console.log(storeTemp.cart);
				console.log("END STOCK")
				console.log(storeTemp.stock);
			}
		}
		else{
            for(var i = 0; i<Object.keys(newProducts).length; i++){
                var newProduct= newProducts[Object.keys(newProducts)[i]];
                var key = Object.keys(newProducts)[i];
                delta[key]={price: newProduct.price, quantity: newProduct.quantity};
            }
            console.log("DELTA");
            console.log(delta);
            storeTemp.stock = newProducts;
		}
            storeTemp.onUpdate();

		if(onSync!=null){
			onSync(delta);
		}
	},
	function (error){
		console.log("Sync with Server Error: " + error);
	});
}


//query function (given)
Store.prototype.queryProducts = function(query, callback){
    var self = this;
    var queryString = Object.keys(query).reduce(function(acc, key){
        return acc + (query[key] ? ((acc ? '&':'') + key + '=' + query[key]) : '');
    }, '');
    ajaxGet(this.serverUrl+"/products?"+queryString,
        function(products){
            Object.keys(products)
                .forEach(function(itemName){
                    var rem = products[itemName].quantity - (self.cart[itemName] || 0);
                    if (rem >= 0){
                        self.stock[itemName].quantity = rem;
                    }
                    else {
                        self.stock[itemName].quantity = 0;
                        self.cart[itemName] = products[itemName].quantity;
                        if (self.cart[itemName] === 0) delete self.cart[itemName];
                    }

                    self.stock[itemName] = Object.assign(self.stock[itemName], {
                        price: products[itemName].price,
                        label: products[itemName].label,
                        imageUrl: products[itemName].imageUrl
                    });
                });
            self.onUpdate();
            callback(null, products);
        },
        function(error){
            callback(error);
        }
    )
}

function renderMenu(container, storeInstance){
    while (container.lastChild) container.removeChild(container.lastChild);
    if (!container._filters) {
        container._filters = {
            minPrice: null,
            maxPrice: null,
            category: ''
        };
        container._refresh = function(){
            storeInstance.queryProducts(container._filters, function(err, products){
                if (err){
                    alert('Error occurred trying to query products');
                    console.log(err);
                }
                else {
                    displayed = Object.keys(products);
                    renderProductList(document.getElementById('productView'), storeInstance);
                }
            });
        }
    }

    var box = document.createElement('div'); container.appendChild(box);
    box.id = 'price-filter';
    var input = document.createElement('input'); box.appendChild(input);
    input.type = 'number';
    input.value = container._filters.minPrice;
    input.min = 0;
    input.placeholder = 'Min Price';
    input.addEventListener('blur', function(event){
        container._filters.minPrice = event.target.value;
        container._refresh();
    });

    input = document.createElement('input'); box.appendChild(input);
    input.type = 'number';
    input.value = container._filters.maxPrice;
    input.min = 0;
    input.placeholder = 'Max Price';
    input.addEventListener('blur', function(event){
        container._filters.maxPrice = event.target.value;
        container._refresh();
    });

    var list = document.createElement('ul'); container.appendChild(list);
    list.id = 'menu';
    var listItem = document.createElement('li'); list.appendChild(listItem);
    listItem.className = 'menuItem' + (container._filters.category === '' ? ' active': '');
    listItem.appendChild(document.createTextNode('All Items'));
    listItem.addEventListener('click', function(event){
        container._filters.category = '';
        container._refresh()
    });
    var CATEGORIES = [ 'Clothing', 'Technology', 'Office', 'Outdoor' ];
    for (var i in CATEGORIES){
        var listItem = document.createElement('li'); list.appendChild(listItem);
        listItem.className = 'menuItem' + (container._filters.category === CATEGORIES[i] ? ' active': '');
        listItem.appendChild(document.createTextNode(CATEGORIES[i]));
        listItem.addEventListener('click', (function(i){
            return function(event){
                container._filters.category = CATEGORIES[i];
                container._refresh();
            }
        })(i));
    }
}


//timer
function resetTimer() {
    clearTimer();
    console.log("timer started");
    inactiveTime = setTimeout(displayMessage, 1800000); //time is in ms
};
function clearTimer(){
    clearTimeout(inactiveTime);
};
function displayMessage(){
	alert("Hi! Are you still shopping with us?");
    resetTimer();
};

function makeRandomid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 8; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


//cart
Store.prototype.checkOut = function(onFinish){
    var storeTemp = this;
    var oldstock = storeTemp.stock;
    storeTemp.syncWithServer(function(delta){
        var message = "";
		if(Object.keys(delta)!= 0){
			//alert change
            for(var i = 0; i<Object.keys(delta).length; i++){
                var label = Object.keys(delta)[i];
				if(delta[label].price != 0){
					message = message + "Price of " + label + " changed from "
						+ (storeTemp.stock[label].price - delta[label].price) + " to "
						+ storeTemp.stock[label].price + "\n"
				}
				if(delta[label].quantity != 0){
					message = message + "Quantity of " + label + " changed from "
						+ (storeTemp.stock[label].quantity - delta[label].quantity) + " to "
						+ storeTemp.stock[label].quantity + "\n"
				}
			}
            alert(message);
		}else{
			// post a order
            var Order = {};
            var total = 0;
			for(var key in storeTemp.cart){
                total = total + storeTemp.stock[key].price * storeTemp.cart[key];
			}
            Order["total"] = total;
			Order["cart"] = storeTemp.cart;
            Order["client_id"] = makeRandomid();
            console.log(Order);
            var json = JSON.stringify(Order);
            console.log(json);
            ajaxPost(storeTemp.serverUrl+"/checkout", json, function(response){
                console.log(response);
                storeTemp.cart = {};
                alert("your order is completed, Order ID " + response);
                showCart();
                storeTemp.onUpdate();
            }, function(error){
                console.log("checkout failed");
                console.log(error);
                alert("checkout error: " + error.responseText);
            });
		}

        if(onFinish){
            onFinish();
        }
	});
};

function showCart(){
    clearTimer();
    console.log("show cart items");
    var modal = document.getElementById("modal");
    modal.style.visibility='visible';
    renderCart(document.getElementById("modal-content"), store);
    resetTimer();
}

function renderCart(container, storeInstance){
    var cart = storeInstance.cart;
    var totalPrice = 0;

    //remove old stuff first
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    for (var keys in cart) {
		totalPrice = totalPrice + storeInstance.stock[keys].price * cart[keys];
		var lineContainer = document.createElement("div");
		var productName = storeInstance.stock[keys].label ;
		lineContainer.innerHTML += productName + " $" +storeInstance.stock[keys].price +
			": " + cart[keys];
		//add buttons
		var productAddButton = "  " + '<button class="btn-simple" id = "cart_addButton_'+keys+'" onClick="store.addItemToCart(\'' + keys + '\')" >+</button>';
		lineContainer.innerHTML += productAddButton;
		var productRemButton = " " +'<button class="btn-simple" id = "cart_remButton_'+keys+'" onClick="store.removeItemFromCart(\'' + keys + '\')" >-</button>';
		lineContainer.innerHTML += productRemButton;
		container.appendChild(lineContainer);
	}

	if(!container.firstChild){
        var lineContainer = document.createElement("div");
        lineContainer.innerHTML += "Your cart is empty!";
        container.appendChild(lineContainer);
	}

    var lineContainer = document.createElement("div");
    lineContainer.innerHTML += "Total price: " + totalPrice;
    container.appendChild(lineContainer);

    var lineContainer = document.createElement("div");
    var button = document.createElement("button");
    button.innerHTML = "checkout";
    button.id = "btn-check-out";
    button.class = "btn-simple";
    button.addEventListener ("click", function() {
        var thisButton = this;
        thisButton.disabled = true;
        store.checkOut(function(){
            thisButton.disabled = false;
		});
    });

    lineContainer.appendChild(button);
    container.appendChild(lineContainer);
}
function hideCart(){
    document.getElementById("modal").style.visibility='hidden';
}




function updateItem(itemName){
    if(itemName){
        renderProduct(document.getElementById("product-"+itemName),store,itemName);
        renderCart(document.getElementById("modal-content"), store);
    }
	else{
        renderMenu(document.getElementById("menuView"),store);
		renderProductList(document.getElementById("productView"), store);
    }
}

function renderProduct(container, storeInstance, itemName){
	var product = storeInstance.stock[itemName];
	var productContainer = document.createElement("div");

	var productImage = document.createElement("img");
	productImage.classList.add("images");
	productImage.src=product.imageUrl;
	productContainer.appendChild(productImage);

	var productName = '</br>'+product.label;
	productContainer.innerHTML += productName;

	var productPrice = '<div class = "price"><a>$'+product.price+'</a></div>';
	productContainer.innerHTML += productPrice;

	if(product.quantity>0){
		var productAddButton = '<button class="btn-add" id = "addButton_'+itemName+'" onClick="store.addItemToCart(\'' + itemName + '\')" >+</button>';
		productContainer.innerHTML += productAddButton;
	}
	var maxStock = product.quantity;
	if(storeInstance.cart[itemName]){
		maxStock+=storeInstance.cart[itemName];
	}
	//console.log("Max stock for product: " + productName + " is: " + maxStock);
	if(product.quantity<maxStock){
		var productRemButton = '<button class="btn-remove" id = "remButton_'+itemName+'" onClick="store.removeItemFromCart(\'' + itemName + '\')" >-</button>';
		productContainer.innerHTML += productRemButton;
	}

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
	container.appendChild(productContainer);   
}

function renderProductList(container, storeInstance){
    console.log("renderProductList");
	while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    console.log(storeInstance);
	for(var i=displayed.length-1; i>=0; i--){
	    var key = displayed[i];
		var productContainer = document.createElement("ul");
		productContainer.classList.add("product");
		productContainer.setAttribute("id","product-"+key);
		renderProduct(productContainer, storeInstance, key);
		container.insertBefore(productContainer, container.firstChild);
	}
}

//ajax
function ajaxGet(url, onSuccess, onError, count) {
	if(!count){
        console.log("ajaxget from" + url);
		ajaxGet(url, onSuccess, onError, 1);
	}
	else{
        if(count == maxAttempt) {
            $.get(url, function(data){
                console.log("ajax data:");
                console.log(data);
            	onSuccess(data);
			}).fail(function(error){
                console.log("ajaxget failed after 4 tries");
				onError(error)
			});
        }
        else{
            $.get(url, function(data){
                console.log("ajax data:");
                console.log(data);
                onSuccess(data);
			}).fail(function(){
                ajaxGet(url, onSuccess, onError, count+1);
			});
		}
    }
}

jQuery["postJSON"] = function( url, data, callbackSuccess, callbackError ) {
    // shift arguments if no data
    console.log("in post JSON");
    console.log(data);

    if (jQuery.isFunction(data)) {
        callbackError = callbackSuccess;
        callbackSuccess = data;
        data = undefined;
    }
    return jQuery.ajax({
        url: url,
        type: "POST",
        contentType:"application/json; charset=utf-8",
        dataType: "json",
        data: data,
        success: callbackSuccess,
        error: callbackError
    });
};

function ajaxPost2(url, data, onSuccess, onError){
    $.postJSON(url, data,
        function(response){
            onSuccess(response);
        }, function(error){
            console.log("ajaxPost failed")
            console.log(error);
            onError(error);
        });
};

function ajaxPost(url, data, onSuccess, onError, count){
    if(!count){
        console.log("ajaxget from" + url);
        ajaxPost(url, data, onSuccess, onError, 1);
    }
    else{
        if(count == maxAttempt){
            $.postJSON(url, data,
                function(response){
                onSuccess(response);
                }, function(error){
                console.log("ajaxPost failed")
                console.log(error);
                onError(error);
                });
        }else{
            $.postJSON(url, data,
                function(response){
                    onSuccess(response);
                }, function(error){
                    console.log("ajaxPost failed")
                    console.log(error);
                    ajaxPost(url, data, onSuccess, onError, count + 1);;
                });
        }
    }
}

//bonus
document.onkeydown = function(evt) {
    evt = evt || window.event;
    if (evt.keyCode == 27) {
        hideCart();
    }
};


var inactiveTime = 0;
var store = new Store(serverLink);
store.onUpdate = updateItem;


$.ajaxSetup({timeout: timeoutLength});
store.syncWithServer(function(delta){
    displayed = Object.keys(delta);
});

window.onload=function(){
    resetTimer();
    console.log(displayed);
    store.onUpdate();
}


