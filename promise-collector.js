var results = require('promise-results');

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
  var promisedCollection = results(this.promises);
  // Wipe promises to clean up memory
  this.promises = null;
  // Return promise to know when preloading is done.
  return promisedCollection;
};
/**
 * Deliver data to registered callbacks.
 *
 * @return {object|null} collection
 *   Data to be delivered to registered recipients.
 */
PromiseCollector.prototype.deliver = function (collection) {
  var delivered = {};
  for (var promiseKey in collection) {
    if (this.recipients[promiseKey]) {
      this.recipients[promiseKey](collection[promiseKey]);
      delivered[promiseKey] = true;
    }
  }
  return delivered;
};
/**
 * Declares a callback to receive promised data during deliver.
 *
 * @param {string} promiseKey
 *   Identifier of promise to receive data from.
 * @param {function} callback
 *   A function to be called with promised data once collection is delivered.
 */
 PromiseCollector.prototype.receive = function (promiseKey, callback) {
  // Early-detect non-functions for proper stack-tracing goodness.
  if (typeof callback !== 'function') {
    throw new Error('PromiseCollector.receive expects a function.');
  }
  this.recipients[promiseKey] = callback;
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
  if (!this.promises) {
    return;
  }
  // Early-detect non-Promises for proper stack-tracing goodness.
  if (typeof promise === 'function') {
    promise = promise();
  }
  if (!promise instanceof Promise) {
    throw new Error('PromiseCollector.promise expects a Promise.');
  }
  this.promises[promiseKey] = promise;
};

module.exports = PromiseCollector;
