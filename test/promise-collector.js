var Collector = require('../promise-collector');
var results = require('promise-results');

describe('Promise Results', function() {
  var PizzaShop;
  beforeEach(function() {
    PizzaShop = new Collector('PizzaShop');
    PizzaShop.order = function (requested) {
      return new Promise(function (resolve, reject) {
        PizzaShop.receive(requested, function (actual) {
          var expected = 'hot ' + requested;
          return (expected === actual) ? resolve(actual) : reject(new Error(actual + ' does not match ' + expected));
        });
      });
    };
    PizzaShop.cook = function (pizza) {
      PizzaShop.promise(pizza, Promise.resolve('hot ' + pizza));
    };
    PizzaShop.undercook = function (pizza) {
      PizzaShop.promise(pizza, Promise.reject('cold ' + pizza));
    };
  });
  afterEach(function() {
    PizzaShop = null;
  });

  it('Collects', function () {
    return PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.cook('hawaiian');
      PizzaShop.cook('supreme');
    }).should.eventually.eql({
      pepperoni: 'hot pepperoni',
      hawaiian: 'hot hawaiian',
      supreme: 'hot supreme'
    });
  });

  it('Delivers', function () {
    var orders = Promise.all([
      PizzaShop.order('pepperoni'),
      PizzaShop.order('hawaiian'),
      PizzaShop.order('supreme')
    ]);
    return PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.cook('hawaiian');
      PizzaShop.cook('supreme');
    }).then(function (pizzas) {
      var results = PizzaShop.deliver(pizzas);
      return Object.keys(results).length;
    })
    .should.eventually.eql(3);
  });

  it('Understands failure', function () {
    var orders = Promise.all([
      PizzaShop.order('pepperoni'),
      PizzaShop.order('hawaiian')
    ]);
    PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.undercook('hawaiian');
    }).then(function(pizzas) {
      PizzaShop.deliver(pizzas);
    });
    return orders.should.be.rejected;
  });

  it('Delivers failures', function () {
    var orders = results([
      PizzaShop.order('pepperoni'),
      PizzaShop.order('hawaiian'),
      PizzaShop.order('supreme')
    ]);
    return PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.undercook('hawaiian');
      PizzaShop.undercook('supreme');
    })
    .then(function (pizzas) {
      var results = PizzaShop.deliver(pizzas);
      return Object.keys(results).length;
    })
    .should.eventually.eql(3);
  });


  it('Makes appropriate payloads', function () {
    return PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.undercook('hawaiian');
      PizzaShop.undercook('supreme');
    })
    .then(function (pizzas) {
      var js = PizzaShop.toPayload(pizzas);
      var json = js.replace('PizzaShop=','');
      return JSON.parse(json);
    })
    .should.eventually.eql({
      pepperoni: 'hot pepperoni',
      hawaiian: 'cold hawaiian',
      supreme: 'cold supreme'
    });
  });

});

