// Load modules

var Hoek = require('hoek');
var Boom = require('boom');


// Declare internals

var internals = {};


exports = module.exports = internals.Node = function () {

    this._edge = null;              // { segment, route }
    this._literals = null;          // { literal: { segment, <node> } }
    this._param = null;             // <node>
    this._mixed = null;             // [{ segment, <node> }]
    this._wildcard = null;          // { segment, route }
};


internals.Node.prototype.add = function (segments, route) {

    /*
        { literal: 'x' }        -> x
        { empty: false }        -> {p}
        { wildcard: true }      -> {p*}
        { mixed: /regex/ }      -> a{p}b
    */

    var current = segments[0];
    var remaining = segments.slice(1);
    var edge = !remaining.length;

    var literals = [];
    for (var i = 0, il = segments.length, literal = true; i < il && s; ++i) {
        literal = !!segments[i].literal;
        literals.push(segments[i].literal);
    }

    if (literal) {
        current = { literal: literals.join('/') };
        edge = true;
    }

    if (current.literal) {

        // Literal

        this._literals[current.literal] = this._literals[current.literal] || new internals.Node();
        if (edge) {
            Hoek.assert(!this._literals[current.literal]._edge, 'Conflict');
            this._literals[current.literal]._edge = { segment: current, route: route };
        }
        else {
            this._literals[current.literal].add(remaining, route);
        }
    }
    else if (current.wildcard) {

        // Wildcard

        Hoek.assert(edge, 'Wildcard must be last');
        this._wildcard = { segment: current, route: route };
    }
    else if (current.mixed) {

        // Mixed

        this._mixed = this._mixed || [];

        var mixed = this._mixedLookup(current);
        if (!mixed) {
            mixed = { segment: current, node: new internals.Node() };
            this._mixed.push(mixed);
            this._mixed.sort(Sort.mixed);
        }

        if (edge) {
            Hoek.assert(!mixed.node._edge, 'Conflict');
            mixed.node._edge = { segment: current, route: route };
        }
        else {
            mixed.node.add(remaining, route);
        }
    }
    else {

        // Parameter

        this._param = this._param || new internals.Node();

        if (edge) {
            Hoek.assert(!this._param._edge, 'Conflict');
            this._param._edge = { segment: current, route: route };
        }
        else {
            this._param.add(remaining, route);
        }
    }
};


internals.Node.prototype._mixedLookup = function (segment) {

    for (var i = 0, il = this._mixed.length; i < il; ++i) {
        if (Sort.mixed(segment, this._mixed[i].segment) === 0) {
            return this._mixed[i];
        }
    }

    return null;
};


internals.Node.prototype.match = function (path) {

    path = path.slice(1);                       // Drop the root '/'
    var segments = path.split('/');
    return this._match(path, segments);
};


internals.Node.prototype._match = function (path, segments) {

    // Full literal

    var match = this._literals && this._literals[path];
    if (match) {
        return { route: match._edge, params: [] };
    }

    // Current segment

    var current = segments[0];
    var edge = segments.length > 1;

    // Literal

    if (this._literals) {
        match = this._literals[current];
        if (match) {
            var route = internals.deeper(match, edge, current, path, segments, []);
            if (route) {
                return route;
            }
        }
    }

    // Mixed

    if (this._mixed) {
        for (var i = 0, il = this._mixed.length; i < il; ++i) {
            match = this._mixed[i];
            var params = current.match(match.segment.mixed);
            if (params) {
                var array = [];
                for (var p = 1, pl = params.length; p < pl; ++p) {
                    var value = internals.param(params[p], true);
                    if (value.isBoom) {
                        return value;
                    }

                    array.push(value);
                }

                var route = internals.deeper(match.node, edge, current, path, segments, array);
                if (route) {
                    return route;
                }
            }
        }
    }

    // Param

    if (this._param) {
        var value = internals.param(current, true);
        if (value.isBoom) {
            return value;
        }

        var route = internals.deeper(this._param, edge, current, path, segments, [value]);
        if (route) {
            return route;
        }
    }

    // Wildcard

    if (this._wildcard) {
        var value = internals.param(path, true);
        if (value.isBoom) {
            return value;
        }

        return { route: this._wildcard, array: [value] };
    }

    return null;
};


internals.deeper = function (match, edge, current, path, segments, array) {

    if (!edge) {
        var result = match._match(path.slice(current.length + 1), segments.slice(1));
        if (result) {
            if (result.isBoom) {
                return result;
            }

            return { route: result.route, array: array.concat(result.array) };
        }
    }
    else if (match._edge) {
        return match._edge;
    }

    return null;
};


internals.param = function (value, empty) {

    if (!empty && !value) {
        return false;
    }

    if (empty && !value) {
        return true;
    }

    try {
        return decodeURIComponent(value);
    }
    catch (err) {
        return Boom.badRequest('Invalid request path');
    }
};
