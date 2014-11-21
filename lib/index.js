// Load modules

var Hoek = require('hoek');
var Boom = require('boom');
var Regex = require('./regex');
var Router = require('./router');


// Declare internals

var internals = {
    pathRegex: Regex.generate(),
    defaults: {
        isCaseSensitive: true
    }
};


exports.Router = internals.Router = function (options) {

    this.settings = Hoek.applyToDefaults(internals.defaults, options || {});

    this.routes = {};                               // Key: HTTP method or * for catch-all, value: sorted array of routes
    this.ids = {};                                  // Key: route id, value: record
    this.vhosts = null;                             // {} where Key: hostname, value: see this.routes

    this.specials = {
        badRequest: null,
        notFound: null,
        options: null
    };
};


internals.Router.prototype.add = function (config, route) {

    var self = this;

    var method = config.method.toLowerCase();

    var vhost = config.vhost || '*';
    if (vhost !== '*') {
        self.vhosts = self.vhosts || {};
        self.vhosts[vhost] = self.vhosts[vhost] || {};
    }

    var table = (vhost === '*' ? self.routes : self.vhosts[vhost]);
    table[method] = table[method] || { routes: [], router: new Router() };

    var analysis = config.analysis || this.analyze(config.path);
    var record = {
        path: config.path,
        route: route || config.path,
        segments: analysis.segments,
        params: analysis.params,
        fingerprint: analysis.fingerprint,
        settings: this.settings
    };

    // Add route

    table[method].routes.push(record);
    table[method].router.add(analysis.segments, record);

    var last = record.segments[record.segments.length - 1];
    if (last.empty) {
        table[method].router.add(analysis.segments.slice(0, -1), record);
    }

    if (config.id) {
        Hoek.assert(!this.ids[config.id], 'Route id', config.id, 'for path', config.path, 'conflicts with existing path', this.ids[config.id] && this.ids[config.id].path);
        this.ids[config.id] = record;
    }

    return record;
};


internals.Router.prototype.special = function (type, route) {

    Hoek.assert(Object.keys(this.specials).indexOf(type) !== -1, 'Unknown special route type:', type);

    this.specials[type] = { route: route };
};


internals.Router.prototype.route = function (method, path, hostname) {

    var vhost = (this.vhosts && hostname && this.vhosts[hostname]);
    var route = (vhost && this._lookup(path, vhost, method)) ||
                this._lookup(path, this.routes, method) ||
                (method === 'head' && vhost && this._lookup(path, vhost, 'get')) ||
                (method === 'head' && this._lookup(path, this.routes, 'get')) ||
                (method === 'options' && this.specials.options) ||
                (vhost && this._lookup(path, vhost, '*')) ||
                this._lookup(path, this.routes, '*') ||
                this.specials.notFound || Boom.notFound();

    return route;
};


internals.Router.prototype._lookup = function (path, table, method) {

    var set = table[method];
    if (!set) {
        return null;
    }

    var match = set.router.match(path, this.settings);      // Returns Error, null, or result object
    if (!match) {
        return null;
    }

    if (match.isBoom) {
        return this.specials.badRequest || match;
    }

    var assignments = {};
    var array = [];
    for (var i = 0, il = match.array.length; i < il; ++i) {
        var name = match.record.params[i];
        var value = match.array[i];
        if (value !== undefined) {
            if (assignments[name] !== undefined) {
                assignments[name] += '/' + value;
            }
            else {
                assignments[name] = value;
            }

            if (i + 1 === il ||
                name !== match.record.params[i + 1]) {

                array.push(assignments[name]);
            }
        }
    }

    return { params: assignments, paramsArray: array, route: match.record.route };
};


internals.Router.prototype.normalize = function (path) {

    if (path &&
        path.indexOf('%') !== -1) {

        // Uppercase %encoded values

        var uppercase = path.replace(/%[0-9a-fA-F][0-9a-fA-F]/g, function (encoded) {

            return encoded.toUpperCase();
        });

        // Decode non-reserved path characters: a-z A-Z 0-9 _!$&'()*+,;=:@-.~
        // ! (%21) $ (%24) & (%26) ' (%27) ( (%28) ) (%29) * (%2A) + (%2B) , (%2C) - (%2D) . (%2E)
        // 0-9 (%30-39) : (%3A) ; (%3B) = (%3D)
        // @ (%40) A-Z (%41-5A) _ (%5F) a-z (%61-7A) ~ (%7E)

        var decoded = uppercase.replace(/%(?:2[146-9A-E]|3[\dABD]|4[\dA-F]|5[\dAF]|6[1-9A-F]|7[\dAE])/g, function (encoded) {

            return String.fromCharCode(parseInt(encoded.substring(1), 16));
        });

        path = decoded;
    }

    return path;
};


internals.Router.prototype.analyze = function (path) {

    Hoek.assert(internals.pathRegex.validatePath.test(path), 'Invalid path:', path);
    Hoek.assert(!internals.pathRegex.validatePathEncoded.test(path), 'Path cannot contain encoded non-reserved path characters:', path);

    var pathParts = path.split('/');
    var segments = [];
    var params = [];
    var fingers = [];

    for (var i = 1, il = pathParts.length; i < il; ++i) {                            // Skip first empty segment
        var segment = pathParts[i];
        var param = segment.match(internals.pathRegex.parseParam);

        // Literal

        if (!param) {
            segment = this.settings.isCaseSensitive ? segment : segment.toLowerCase();
            fingers.push(segment);
            segments.push({ literal: segment });
            continue;
        }

        // Parameter

        var pre = param[1];
        var name = param[2];
        var isMulti = !!param[3];
        var multiCount = param[4] && parseInt(param[4], 10);
        var empty = !!param[5];
        var post = param[6];

        Hoek.assert(params.indexOf(name) === -1, 'Cannot repeat the same parameter name:', name, 'in:', path);
        params.push(name);

        if (isMulti) {
            if (multiCount) {
                for (var m = 0; m < multiCount; ++m) {
                    fingers.push('?');
                    segments.push({ param: true });
                    if (m) {
                        params.push(name);
                    }
                }
            }
            else {
                fingers.push('#');
                segments.push({ param: true, wildcard: true });
            }
        }
        else if (pre || post) {
            fingers.push(pre + '?' + post);
            segments.push({
                param: true,
                mixed: new RegExp('^' + Hoek.escapeRegex(pre) + '(.' + (empty ? '*' : '+') + ')' + Hoek.escapeRegex(post) + '$', (!this.settings.isCaseSensitive ? 'i' : '')),
                length: 1 + (pre ? 1 : 0) + (post ? 1 : 0),
                first: !pre,
                segments: pre && post ? [pre, post] : (pre ? [pre] : [post]),
            });
        }
        else {
            fingers.push('?');
            segments.push({ param: true, empty: empty });
        }
    }

    return {
        path: path,
        segments: segments,
        fingerprint: '/' + fingers.join('/'),
        params: params
    }
};


internals.Router.prototype.table = function (host) {

    var result = [];
    var collect = function (table) {

        if (!table) {
            return;
        }

        Object.keys(table).forEach(function (method) {

            table[method].routes.forEach(function (record) {

                result.push(record.route);
            });
        });
    };

    if (this.vhosts) {
        var vhosts = host ? [].concat(host) : Object.keys(this.vhosts);
        for (var i = 0, il = vhosts.length; i < il; ++i) {
            collect(this.vhosts[vhosts[i]]);
        }
    }

    collect(this.routes);

    return result;
};
