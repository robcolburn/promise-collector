var resultSet = require('promise-results/resultSet');

/**
 * Intended to be used as a singleton, but instanced for isolation.
 *
 * @class The Promise Collector.
 */
function PromiseCollector() {
  // Key-Value of callback functions that return Promises.
  this.promises = null;
  // Key-Value of callback functions to deliver Promised data to.
  this.recipients = {};
  // Key-Value of callback functions to deliver Promised rejections to.
  this.rejectees = {};
}
/**
 * Collect promises during the syncrounous callback, into a single promise.
 *
 * @param {function} callback
 *   Syncronous method which will trigger registering promises.
 * @return {Promise}
 *   Always resolve with results of collection of Promises.
 */
PromiseCollector.prototype.collect = function (callback) {
  // Ensure the state of our promises is clean.
  this.promises = [];
  // Run a syncronous render method
  callback();
  // Gather promises together to know when all preloading is done.
  var promisedCollection = resultSet(this.promises);
  // Wipe promises to clean up memory
  this.promises = null;
  // Return promise to know when preloading is done.
  return promisedCollection;
};
/**
 * Deliver data to registered callbacks.
 *
 * @param {object<resolved: object, rejected: object>} collection
 *   Data to be delivered to registered recipients.
 *
 * @return {object<index: string|undefined>}
 *   Representive object of all keys that were successfully delivered out.
 */
PromiseCollector.prototype.deliver = function (collection) {
  var delivered = {
    resolved: new Array(collection.resolved.length),
    rejected: new Array(collection.rejected.length)
  };
  var i, l;
  var receiveKey;
  for (i = 0, l = collection.resolved.length; i < l; i++) {
    if (!collection.resolved[i]) {
      continue;
    }
    receiveKey = collection.resolved[i].key;
    if (this.recipients[receiveKey]) {
      this.recipients[receiveKey](collection.resolved[i].value);
      delivered.resolved[i] = receiveKey;
    }
  }
  for (i = 0, l = collection.rejected.length; i < l; i++) {
    if (!collection.rejected[i]) {
      continue;
    }
    receiveKey = collection.rejected[i].key;
    if (this.rejectees[receiveKey]) {
      this.rejectees[receiveKey](collection.rejected[i].value);
      delivered.rejected[i] = receiveKey;
    }
  }
  return delivered;
};
/**
 * Declares callbacks to receive promised data during deliver.
 *
 * @param {string} receiveKey
 *   Identifier of receiver to promise data to.
 * @param {function} onFulfilled
 *   A function to be called with promised data once collection is delivered.
 * @param {function} onRejected
 *   A function to be called with rejected data once collection is delivered.
 */
PromiseCollector.prototype.receive = function (receiveKey, onFulfilled, onRejected) {
  // Early-detect non-functions for proper stack-tracing goodness.
  if (typeof receiveKey !== 'string') {
    throw new TypeError('PromiseCollector.receive expects receiveKey to be a string.');
  }
  // Allow onFulfilled to be optional
  if (onFulfilled) {
    if (typeof onFulfilled !== 'function') {
      throw new TypeError('PromiseCollector.receive expects onFulfilled to be a function.');
    }
    this.recipients[receiveKey] = onFulfilled;
  }
  // Allow onRejected to be optional
  if (onRejected) {
    if (typeof onRejected !== 'function') {
      throw new TypeError('PromiseCollector.receive expects onRejected to be a function.');
    }
    this.rejectees[receiveKey] = onRejected;
  }
};
/**
 * Declares a promise of data to be delivered with page.
 *
 * @param {string} receiveKey
 *   Identifier of receiver to promise data to.
 * @param {function|Promise} promise
 *   Promise of data to be collected to collection.
 *   Or, a function to be called to return the Promise.
 */
PromiseCollector.prototype.promise = function (receiveKey, promise) {
  // Early-detect non-Promises for proper stack-tracing goodness.
  if (typeof receiveKey !== 'string') {
    throw new TypeError('PromiseCollector.receive expects receiveKey to be a string.');
  }
  if (typeof promise !== 'function' && !promise.then) {
    throw new TypeError('PromiseCollector.promise expects promise to be a Promise or a function that returns a Promise.');
  }
  // Don't fire callback, and dont' store when we aren't collecting.
  if (!this.promises) {
    return;
  }
  if (typeof promise === 'function') {
    promise = promise();
  }
  if (!promise.then) {
    throw new TypeError('PromiseCollector.promise expects promise function to return a Promise.');
  }
  this.promises.push(promise.then(function keyedResult (result) {
    return {
      key: receiveKey,
      value: result
    };
  }, function keyedResult (result) {
    return Promise.reject({
      key: receiveKey,
      value: result
    });
  }));
};

module.exports = PromiseCollector;
