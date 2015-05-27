# promise-collector
Collects registered promises to be delivered together.

[![npm package](https://img.shields.io/npm/v/promise-collector.svg?style=flat-square)](https://www.npmjs.org/package/promise-collector)
[![build status](https://img.shields.io/travis/robcolburn/promise-collector/master.svg?style=flat-square)](https://travis-ci.org/robcolburn/promise-collector)
[![dependency status](https://img.shields.io/david/robcolburn/promise-collector.svg?style=flat-square)](https://david-dm.org/robcolburn/promise-collector)

Say you need to do something syncronous with your asyncronous data, like render a React component tree.
However, before you do that you need to get all your data in place.  That's fine you can use `Promise.all` or [`promise-results`](https://www.npmjs.com/package/promise-results).
But, let's say you'd like to pump that async data into places where it could easily be overridden like a Reflux store.
In that case, you want to allow your data to be gathered asyncronously and applied syncronously, like a Batch.
This is where PromiseCollector gives you a central place to gather these promises.
