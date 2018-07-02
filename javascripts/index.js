
/***
 * registering service worker
 */


if (navigator.serviceWorker){
    navigator.serviceWorker.register('../sw.js').then(function (reg) {
        console.log('service worker registered successfully');
        
        if (!navigator.serviceWorker.controller)
            return;

        if (reg.waiting){
            updateReady(reg.waiting);
            return;
        }

        if (reg.installing){
            trackInstalling(reg.installing);
            return;
        }


        reg.addEventListener('updatefound',function () {
            trackInstalling(reg.installing);
        });

        navigator.serviceWorker.addEventListener('controllerchange',function () {
            window.location.reload();
        });

    }).catch(function () {
        console.log('service worker failed registering');
    });
}



var updateReady = function(worker){
    worker.postMessage({action: 'skipWaiting'});
}


var trackInstalling = function(worker){
    worker.addEventListener('statechange',function () {
        if (worker.state==='installed'){
            updateReady(worker)
        }
    });
}



/***
 * idb database
 */

function openDatabase(){

    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
        return Promise.resolve();
    }

    return idb.open('currenzy-db',1,function (upgradeDb) {
        var keyValStore = upgradeDb.createObjectStore('currencies');
    });
}

function saveToDatabase(data){
    openDatabase().then(function (db) {
        if (!db) return;

        var tx = db.transaction('currencies', 'readwrite');
        var store = tx.objectStore('currencies');
        store.put(data,data.symbol);
    });
}


function fetchFromDatabase(symbol, amount, $scope) {
    openDatabase().then(function (db) {
        if (!db)return;
        var index = db.transaction('currencies').objectStore('currencies').get(symbol);
        return index;
    }).then(function (data) {

        let pairs = symbol.split('_');
        let fr = pairs[0];
        let to = pairs[1];

        if (data==null){
            $scope.error = "Oops. You can't convert that currency offline."
            $scope.rate = '';
            return
        }

        //console.log(numeral(amount * data.value).format('0.000'));
        $scope.rate = data.value;

    });
}







/***
 * angular app
 */


angular.module('app', []).controller('Converter', ['$scope', '$http', Converter]);

function Converter($scope, $http) {


    //method that gets called when selected item changes.
    $scope.changedValue = function () {

        let currencyFrom = $scope.fromCurrencySelected;
        let currencyTo = $scope.toCurrencySelected;

        if (currencyFrom != null && currencyTo != null) {

            $scope.error = "";

            if (currencyFrom !== currencyTo) {

                $scope.from_curr = $scope.fromCurrencySelected.currencySymbol;
                $scope.to_curr  = $scope.toCurrencySelected.currencySymbol;

                var params = `${$scope.fromCurrencySelected.id}_${$scope.toCurrencySelected.id}`;
                $http({
                    method: 'GET',
                    url: 'https://free.currencyconverterapi.com/api/v5/convert',
                    params: {
                        q: params,
                        compact: 'ultra'
                    }

                }).then(function (response) {

                    console.log(response.data);
                    if (!response)
                        console.log("could get current rate for this");

                    //using es6 arrow function to convert object to array
                    let rates = Object.keys(response.data).map(i => response.data[i]);
                    for (const rate of rates) {
                        $scope.rate = rate.toFixed(3);

                        if ($scope.consoleQty!==undefined) {
                            $scope.totalCal = $scope.consoleQty * $scope.rate;
                        }


                        // save object results for later use
                        let object = {
                            symbol: params,
                            value: rate.toFixed(3)
                        };

                        saveToDatabase(object)
                    }

                }, function (error) {
                    console.log(error);
                    fetchFromDatabase(params,$scope.consoleQty,$scope)
                });

            } else {
                $scope.error = "You can't convert same currency."
            }

        } else if (currencyFrom == null) {
            $scope.error = "Select a currency to convert from"
        } else if (currencyTo == null) {
            $scope.error = "Select a currency to convert to"
        }

    }


    /**
     * network request to get all currencies and bind them to the select dropdown element
     */
    $http({
        method: 'GET',
        url: 'https://free.currencyconverterapi.com/api/v5/currencies'
    }).then(function (response) {
        console.log(response.data);
        if (!response)
            console.log("could fetch currencies data");
        $scope.currencies = response.data.results;

    }, function (error) {
        console.log(error);
    });


    /**
     * hangles click events for number
     * @param n
     */
    $scope.print = function (n) {

                if ($scope.consoleQty===undefined) {
                    $scope.consoleQty = n;
                }else{
                    $scope.consoleQty = $scope.consoleQty.toLocaleString() + n;
                    $scope.totalCal = $scope.rate * $scope.consoleQty;
                }

    }

    /**
     * this clears the rate console
     */
    $scope.clearTotal = function () {
       // $scope.consoleQty = "";
        if($scope.consoleQty)
        $scope.consoleQty  = $scope.consoleQty.slice(0, $scope.consoleQty.length-1);
        $scope.totalCal = $scope.consoleQty * $scope.rate;
    }
}