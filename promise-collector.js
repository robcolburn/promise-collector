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
  this.promises = {};
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
 * @return {object<key: boolean>}
 *   Keyed objected of all keys that were delivered out.
 */
PromiseCollector.prototype.deliver = function (collection) {
  var delivered = {};
  var promiseKey;
  for (promiseKey in collection.resolved) {
    if (this.recipients[promiseKey]) {
      this.recipients[promiseKey](collection.resolved[promiseKey]);
      delivered[promiseKey] = true;
    }
  }
  for (promiseKey in collection.rejected) {
    if (this.rejectees[promiseKey]) {
      this.rejectees[promiseKey](collection.rejected[promiseKey]);
      delivered[promiseKey] = true;
    }
  }
  return delivered;
};
/**
 * Declares callbacks to receive promised data during deliver.
 *
 * @param {string} promiseKey
 *   Identifier of promise to receive data from.
 * @param {function} onFulfilled
 *   A function to be called with promised data once collection is delivered.
 * @param {function} onRejected
 *   A function to be called with rejected data once collection is delivered.
 */
PromiseCollector.prototype.receive = function (promiseKey, onFulfilled, onRejected) {
  // Early-detect non-functions for proper stack-tracing goodness.
  if (typeof promiseKey !== 'string') {
    throw new TypeError('PromiseCollector.receive expects promiseKey to be a string.');
  }
  // Allow onFulfilled to be optional
  if (onFulfilled) {
    if (typeof onFulfilled !== 'function') {
      throw new TypeError('PromiseCollector.receive expects onFulfilled to be a function.');
    }
    this.recipients[promiseKey] = onFulfilled;
  }
  // Allow onRejected to be optional
  if (onRejected) {
    if (typeof onRejected !== 'function') {
      throw new TypeError('PromiseCollector.receive expects onRejected to be a function.');
    }
    this.rejectees[promiseKey] = onRejected;
  }
};
/**
 * Declares a promise of data to be delivered with page.
 *
 * @param {string} promiseKey
 *   Identifier of promise to provide data to.
 * @param {function|Promise} promise
 *   Promise of data to be collected to collection.
 *   Or, a function to be called to return the Promise.
 */
PromiseCollector.prototype.promise = function (promiseKey, promise) {
  // Early-detect non-Promises for proper stack-tracing goodness.
  if (typeof promiseKey !== 'string') {
    throw new TypeError('PromiseCollector.receive expects promiseKey to be a string.');
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
    if (!promise.then) {
      throw new TypeError('PromiseCollector.promise expects promise function to return a Promise.');
    }
  }
  this.promises[promiseKey] = promise;
};

module.exports = PromiseCollector;
