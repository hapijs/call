<!-- version -->
# 5.0.1 API Reference
<!-- versionstop -->


<!-- toc -->
- [Call](#Call)
  - [`Router([options])`](#Router-options))
    - [`add(config, [routeData])`](#addconfig-routeData)
    - [`route(method, path)`](#routemethod-path)
<!-- tocstop -->

## Call

### `Router([options])`
Constructor to create a new router instance. To create router.

```javascript
// Must be called with 'new' operator
const router = new Call.Router();
```

It also accepts options object that currently supports following options:

- `isCaseSensitive` - Default `true`. Specifies if the paths should case sensitive. If set to true, then `/users` and `/USERS` are considered as two different paths.

#### `add(config, [routeData])`
This method adds a new route to the router. Everytime a route is added, the router will make sure there are no conflicting routes and will throw on a duplicate. `config` object has following fields:<br>

- `method` - HTTP method (get, put, post, delete, etc.). Wildcard character (*) is supported to match all the methods.

- `path` - URL path segment to use for route matching. The path segment can be static like `/users/1234` or it can be dynamic path segment (Path segment with named parameters).

`.add()` - method also accepts an optional data `routeData`. Basically, this is used for associating `handler` function with a route. However, this can be anything viz. simple primitive data, or  an **object** when this route is matched. Router simply makes it available when the route is matched.

_Note*: If the route being added matches against already added route, then this method throws an exception._

##### Dynamic Path segments with Named Parameters:

**Exact match**

`{param}`: If path contains `/users/{user}` then it matches `/users/john` or `/users/1234` but not `/users`.


**Optional parameters**

`{param?}`: ? means parameter is optional . If path contains `/users/{user?}` It matches `/users/john` as well as `/users`.

It is important to be aware that only the last named parameter in a path can be optional. That means that `/{one?}/{two}/` is an invalid path, since in this case there is another parameter after the optional one. You may also have a named parameter covering only part of a segment of the path, but you may only have one named parameter per segment. That means that /`{filename}.jpg` is valid while `/{filename}.{ext}` is not.


**Multi-segment parameters**

`{params*n}`: With path configuration `/users/{user*2}`, it matches `/users/john/doe` or `/users/harshal/patil` but not `/users/john`. Number **n** after asterisk sign specifies the multiplier.

Like the optional parameters, a wildcard parameter (for example `/{users*}`) may only appear as the last parameter in your path.


**Catch all**

`{params*}`: Using this option, it matches anything. So `/users/{user*}` with match `/users/`, `/users/john`, `/users/john/doe`, `/users/john/doe/smith`

For more details about path parameters, (read hapi.js docs)[https://github.com/hapijs/hapi/blob/master/API.md#path-parameters].

**Routing order**

When determining what handler to use for a particular request, router searches paths in order from most specific to least specific. That means if you have two routes, one with the path `/filename.jpg` and a second route `/filename.{ext}` a request to /filename.jpg will match the first route, and not the second. This also means that a route with the path `/{files*}` will be the last route tested, and will only match if all other routes fail.

**Call** router has deterministic order than other routers and because of this deterministic order, `call` is able to detect conflicting routes and throw exception accordingly. In comparison, Express.js has different routing mechanism based on simple RegEx pattern matching making it faster (probably it only matters in theory) but unable to catch route conflicts. Read more about this at [Eran Hammer's comments](https://gist.github.com/hueniverse/a3109f716bf25718ba0e).

#### `route(method, path)`
For a given method and path as string, router tries to locate given route. If route is found, then it returns an object containing following information:

- `params` - Object containing all path parameters where each **key** is path name and **value** is the corresponding parameter value in URL.

- `paramsArray` - All the parameter values in order as array.

- `route` - provides optional `routeData` if it was added when a matched route was added.

If no route is found, then it returns a **[Boom](https://github.com/hapijs/boom)** error message with status code of 404.
