/*eslint-env mocha */
var Collector = require('../promise-collector');
var resultSet = require('promise-results/resultSet');

describe('Promise Collector', function() {
  var PizzaShop;
  beforeEach(function() {
    PizzaShop = new Collector();
    PizzaShop.order = function (requested) {
      var expected = 'hot ' + requested;
      return new Promise(function (resolve, reject) {
        PizzaShop.receive(requested, function (actual) {
          return (expected === actual) ? resolve(actual) : reject(new Error(actual + ' does not match ' + expected));
        }, function (actual) {
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

  it('Collects pizzas', function () {
    return PizzaShop.collect(function() {
      PizzaShop.cook('pepperoni');
      PizzaShop.cook('hawaiian');
      PizzaShop.cook('supreme');
    }).should.eventually.eql({
      resolved: {
        pepperoni: 'hot pepperoni',
        hawaiian: 'hot hawaiian',
        supreme: 'hot supreme'
      },
      rejected: {}
    });
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
      results[0].should.have.length(3);
      Object.keys(results[1]).should.have.length(3);
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
