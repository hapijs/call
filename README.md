# call - Simple HTTP Router

[![Build Status](https://secure.travis-ci.org/hapijs/call.png)](http://travis-ci.org/hapijs/call)

### Lead Maintainer - [Eran Hammer](https://github.com/hueniverse)

## Introduction
```call``` is a simple node.js HTTP Router. It is used by popular [hapi.js](https://github.com/hapijs/hapi) web framework. It implements predictable and easy to use routing. Even if it is designed to work with Hapi.js, you can still use it as independent component.

## Getting Started

### Installation
Install ```call``` as a dev dependency:

```
npm install --dev call
// Or if using Yarn
yarn add call
```

### Basic usage

``` javascript
// Import ES2015 modules
// Use babel if using ES2015 modules (node.js doesn't support ES modules as of version 7.9.0)
import * as Call from 'call';   // If using ES2015 modules

// Or if using commonjs
// const Call = require('call');

// Create new router
const router = new Call.Router();

// Add route
router.add({ method: 'get', path: '/' }, { label: 'root-path' });

// Add another route
router.add({ method: 'post', path: '/users' }, 'route specific data');

// Add another route with dynamic path
router.add({ method: 'put', path: '/users/{userId}' }, () => { /* ...handler... */ });

// Match route
router.route('post', '/users');
/* If matching route is found, it returns an object containing
    {
        params: {},                     // All dynamic path parameters as key/value
        paramsArray: [],                // All dynamic path parameter values in order
        route: 'route specific data';   // routeData
    }
*/


// Match route
router.route('put', '/users/1234');
/* returns
    {
        params: { userId: '1234' },
        paramsArray: [ '1234' ],
        route: [Function]
    }
*/
```

## API Reference

### **new Call.Router([options])**
Constructor to create a new router instance. To create router.
```javascript
const router = new Call.Router(); // Must be called with 'new' operator
```
It also accepts options object that currently supports following options:

```isCaseSensitive: true | false```:<br>
Specifies if paths should be treated as case sensitive. If set to true, then ```'/users'``` and ```/USERS``` are considered two different paths. Default value is ```true```.

### **router.add(config, [routeData])**
This method add a new route to router. Everytime, a route is added, router's internal table is analyzed to find possible conflicting route. ```config``` object has following fields:<br>

```method```: HTTP method (get, put, post, delete, etc.). Wildcard character (*) is supported to match all the methods.

```path```: URL path segment to use for route matching. The path segment can be static like ```/users/1234``` or it can be dynamic path segment (Path segment with named parameters).

```.add()``` method also accepts optional data ```routeData```. This can be anything viz. simple primitive data, **object** or some **handler** function that you may want to invoke when this route is matched. Router simply makes it available when the route is matched.

This method throws exception if conflicting path is found, that is, if the path that you are trying to add matches against already added path, then it throws an exception. **This is the coolest thing about this router.**

#### Dynamic Path segments with Named Parameters:

**Exact match**

```{param}```: If path contains ```/users/{user}``` then it matches ```/users/john``` or ```/users/1234``` but not ```/users```.


**Optional parameters**

```{param?}```: ? means parameter is optional . If path contains ```/users/{user?}``` It matches ```/users/john``` as well as ```/users```.

It is important to be aware that only the last named parameter in a path can be optional. That means that ```/{one?}/{two}/``` is an invalid path, since in this case there is another parameter after the optional one. You may also have a named parameter covering only part of a segment of the path, but you may only have one named parameter per segment. That means that /```{filename}.jpg``` is valid while ```/{filename}.{ext}``` is not.


**Multi-segment parameters**

```{params*n}```: With path configuration ```/users/{user*2}```, it matches ```/users/john/doe``` or ```/users/harshal/patil``` but not ```/users/john```. Number **n** after asterisk sign specifies the multiplier.

Like the optional parameters, a wildcard parameter (for example ```/{users*}```) may only appear as the last parameter in your path.


**Catch all**

```{params*}```: Using this option, it matches anything. So ```/users/{user*}``` with match ```/users/```, ```/users/john```, ```/users/john/doe```, ```/users/john/doe/smith```

**Routing order**

When determining what handler to use for a particular request, router searches paths in order from most specific to least specific. That means if you have two routes, one with the path ```/filename.jpg``` and a second route ```/filename.{ext}``` a request to /filename.jpg will match the first route, and not the second. This also means that a route with the path ```/{files*}``` will be the last route tested, and will only match if all other routes fail.

**Call** router has deterministic order than other routers and because of this deterministic order, ```call``` is able to detect conflicting routes and throw exception accordingly. In comparison, Express.js has different routing mechanism based on simple RegEx pattern matching making it faster (probably it only matters in theory) but unable to catch route conflicts. Read more about this at [Eran Hammer's comments](https://gist.github.com/hueniverse/a3109f716bf25718ba0e).

### **router.route(method, path)**
For a given method and path as string, router tries to locate given route. If route is found, then it returns an object containing following information:

```params```: Object containing all path parameters where each **key** is path name and **value** is the corresponding parameter value in URL.

```paramsArray```: All the parameter values in order as array.

```route```: provides optional ```routeData``` if it was added when a matched route was added.

If no route is found, then it returns a **[Boom](https://github.com/hapijs/boom)** error message with status code of 404.