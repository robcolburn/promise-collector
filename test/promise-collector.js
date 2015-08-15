/*eslint-env mocha */
var Collector = require('../promise-collector');
var resultSet = require('promise-results/resultSet');

describe('Promise Collector', function() {
  var PizzaShop;
  beforeEach(function() {
    PizzaShop = new Collector();
    PizzaShop.order = function (requestedPizza, name, ignoreWrongAddress) {
      var expected = 'hot ' + requestedPizza;
      var address = name || requestedPizza;
      return new Promise(function (resolve, reject) {
        PizzaShop.receive(address, function (actual) {
          if (expected === actual) {
            resolve(actual);
          } else if (!ignoreWrongAddress) {
            reject(new Error(actual + ' does not match ' + expected));
          }
        }, function (actual) {
          reject(new Error(actual + ' does not match ' + expected));
        });
      });
    };
    PizzaShop.cook = function (requestedPizza, name) {
      var address = name || requestedPizza;
      PizzaShop.promise(address, Promise.resolve('hot ' + requestedPizza));
    };
    PizzaShop.undercook = function (requestedPizza, name) {
      var address = name || requestedPizza;
      PizzaShop.promise(address, Promise.reject('cold ' + requestedPizza));
    };
  });
  afterEach(function() {
    PizzaShop = null;
  });

  it('Collects pizzas', function () {
    return PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.cook('hawaiian');
      PizzaShop.cook('supreme');
    }).should.eventually.have.property('resolved').that.eql([
      {key: 'pepperoni', value: 'hot pepperoni'},
      {key: 'hawaiian', value: 'hot hawaiian'},
      {key: 'supreme', value: 'hot supreme'}
    ]);
  });

  it('Delivers', function () {
    var orders = Promise.all([
      PizzaShop.order('pepperoni'),
      PizzaShop.order('hawaiian'),
      PizzaShop.order('supreme')
    ]);
    var deliveries = PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.cook('hawaiian');
      PizzaShop.cook('supreme');
    }).then(function (pizzas) {
      return PizzaShop.deliver(pizzas);
    });
    return Promise.all([
      orders,
      deliveries
    ]).then(function(results) {
      var orderResults = results[0];
      var deliverResults = results[1];
      orderResults.should.have.length(3);
      Object.keys(deliverResults.resolved).should.have.length(3);
    });
  });

  it('Understands failure', function () {
    var orders = [
      PizzaShop.order('pepperoni'),
      PizzaShop.order('hawaiian')
    ];
    PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.undercook('hawaiian');
    }).then(null, function (pizzas) {
      PizzaShop.deliver(pizzas);
    });
    return Promise.all(orders).should.be.rejected;
  });

  it('Delivers mixed results', function () {
    var orders = [
      PizzaShop.order('pepperoni'),
      PizzaShop.order('hawaiian'),
      PizzaShop.order('supreme')
    ];
    PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.undercook('hawaiian');
      PizzaShop.undercook('supreme');
    })
    .then(null, function (pizzas) {
      var delivered = PizzaShop.deliver(pizzas);
      return Object.keys(delivered);
    });
    return resultSet(orders).then(null, function (results) {
      results.resolved[0].should.eql('hot pepperoni');
      results.rejected[1].should.be.an.instanceof(Error);
      results.rejected[2].should.be.an.instanceof(Error);
    });
  });

  it('Allow multiple receipts to the same address.', function () {
    var orders = Promise.all([
      PizzaShop.order('pepperoni', '1 Pizza Lane', true),
      PizzaShop.order('sausage', '1 Pizza Lane', true)
    ])
    var deliveries = PizzaShop.collect(function() {
      PizzaShop.cook('sausage', '1 Pizza Lane');
      PizzaShop.cook('pepperoni', '1 Pizza Lane');
    }).then(function (pizzas) {
      return PizzaShop.deliver(pizzas);
    });
  });

  it('Doesn\'t crash with unreceived data.', function () {
    return PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
    }).then(function (pizzas) {
      PizzaShop.deliver(pizzas);
    });
  });

  it('Doesn\'t crash with unreceived errors.', function () {
    return PizzaShop.collect(function() {
      PizzaShop.undercook('sausage');
    }).then(null, function (pizzas) {
      PizzaShop.deliver(pizzas);
    });
  });

  it('Validates receive hooks.', function () {
    PizzaShop.receive.bind(PizzaShop, 'a').should.not.throw(TypeError);
    PizzaShop.receive.bind(PizzaShop, function(){}).should.throw(TypeError);
    PizzaShop.receive.bind(PizzaShop, 'a', function(){}).should.not.throw(TypeError);
    PizzaShop.receive.bind(PizzaShop, 'a', 'b', function(){}).should.throw(TypeError);
    PizzaShop.receive.bind(PizzaShop, 'a', function(){}, 'b').should.throw(TypeError);
    PizzaShop.receive.bind(PizzaShop, 'a', function(){}, function(){}).should.not.throw(TypeError);
  });

  it('Validates promise hooks.', function () {
    PizzaShop.promise.bind(PizzaShop, function(){}).should.throw(TypeError);
    PizzaShop.promise.bind(PizzaShop, Promise.resolve()).should.throw(TypeError);
    PizzaShop.promise.bind(PizzaShop, 'a').should.throw(TypeError);
    PizzaShop.promise.bind(PizzaShop, 'a', {}).should.throw(TypeError);
    PizzaShop.promise.bind(PizzaShop, 'a', function(){}).should.not.throw(TypeError);
    PizzaShop.promise.bind(PizzaShop, 'a', Promise.resolve()).should.not.throw(TypeError);
    return PizzaShop.collect(function() {
      PizzaShop.promise.bind(PizzaShop, 'a', function(){}).should.throw(TypeError);
      PizzaShop.promise.bind(PizzaShop, 'a', function() {
        return function(){};
      }).should.throw(TypeError);
      PizzaShop.promise.bind(PizzaShop, 'a', function(){
        return Promise.resolve();
      }).should.not.throw(TypeError);
    });
  });

});
