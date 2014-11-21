// Load modules

var Hoek = require('hoek');
var Boom = require('boom');


// Declare internals

var internals = {};


exports = module.exports = internals.Router = function () {

    this._edge = null;              // { segment, record }
    this._literals = null;          // { literal: { segment, <node> } }
    this._param = null;             // <node>
    this._mixed = null;             // [{ segment, <node> }]
    this._wildcard = null;          // { segment, record }
};


internals.Router.prototype.add = function (segments, record) {

    /*
        { literal: 'x' }        -> x
        { empty: false }        -> {p}
        { wildcard: true }      -> {p*}
        { mixed: /regex/ }      -> a{p}b
    */

    var current = segments[0];
    var remaining = segments.slice(1);
    var isEdge = !remaining.length;
    var active = null;

    var literals = [];
    for (var i = 0, il = segments.length, isLiteral = true; i < il && isLiteral; ++i) {
        isLiteral = !!segments[i].literal;
        literals.push(segments[i].literal);
    }

    if (isLiteral) {
        current = { literal: literals.join('/') };
        isEdge = true;
    }

    if (current.literal !== undefined) {            // Can be empty string

        // Literal

        this._literals = this._literals || {};
        var literal = (record.settings.isCaseSensitive ? current.literal : current.literal.toLowerCase());
        this._literals[literal] = this._literals[literal] || new internals.Router();
        var node = this._literals[literal];
        if (isEdge) {
            Hoek.assert(!node._edge, 'New route', record.path, 'conflicts with existing', node._edge && node._edge.record.path);
            node._edge = { segment: current, record: record };
        }
        else {
            node.add(remaining, record);
            active = node;
        }
    }
    else if (current.wildcard) {

        // Wildcard

        Hoek.assert(!this._wildcard, 'New route', record.path, 'conflicts with existing', this._wildcard && this._wildcard.record.path);
        this._wildcard = { segment: current, record: record };
    }
    else if (current.mixed) {

        // Mixed

        this._mixed = this._mixed || [];

        var mixed = this._mixedLookup(current);
        if (!mixed) {
            mixed = { segment: current, node: new internals.Router() };
            this._mixed.push(mixed);
            this._mixed.sort(internals.mixed);
        }

        if (isEdge) {
            Hoek.assert(!mixed.node._edge, 'New route', record.path, 'conflicts with existing', mixed.node._edge && mixed.node._edge.record.path);
            mixed.node._edge = { segment: current, record: record };
        }
        else {
            mixed.node.add(remaining, record);
            active = mixed.node;
        }
    }
    else {

        // Parameter

        this._param = this._param || new internals.Router();

        if (isEdge) {
            Hoek.assert(!this._param._edge, 'New route', record.path, 'conflicts with existing', this._param._edge && this._param._edge.record.path);
            this._param._edge = { segment: current, record: record };
        }
        else {
            this._param.add(remaining, record);
            node = this._param;
        }
    }
};


internals.Router.prototype._mixedLookup = function (segment) {

    for (var i = 0, il = this._mixed.length; i < il; ++i) {
        if (internals.mixed({ segment: segment }, this._mixed[i]) === 0) {
            return this._mixed[i];
        }
    }

    return null;
};


internals.mixed = function (a, b) {

    var aFirst = -1;
    var bFirst = 1;

    var as = a.segment;
    var bs = b.segment;

    if (as.length !== bs.length) {
        return (as.length > bs.length ? aFirst : bFirst);
    }

    if (as.first !== bs.first) {
        return (as.first ? bFirst : aFirst);
    }

    for (var j = 0, jl = as.segments.length ; j < jl; ++j) {
        var am = as.segments[j];
        var bm = bs.segments[j];

        if (am === bm) {
            continue;
        }

        if (am.length === bm.length) {
            return (am > bm ? bFirst : aFirst);
        }

        return (am.length < bm.length ? bFirst : aFirst);
    }

    return 0;
};


internals.Router.prototype.match = function (path, options) {

    path = path.slice(1);                       // Drop the root '/'
    var segments = path.split('/');
    return this._match(path, segments, options);
};


internals.Router.prototype._match = function (path, segments, options) {

    // Full literal

    var match = this._literals && this._literals[options.isCaseSensitive ? path : path.toLowerCase()];
    if (match &&
        match._edge) {

        return { record: match._edge.record, array: [] };
    }

    // Current segment

    var current = segments[0];
    var isEdge = segments.length === 1;

    // Literal

    if (this._literals) {
        current = (options.isCaseSensitive ? current : current.toLowerCase());
        match = this._literals[current];
        if (match) {
            var record = internals.deeper(match, isEdge, current, path, segments, [], options);
            if (record) {
                return record;
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
                    if (value &&
                        value.isBoom) {

                        return value;
                    }

                    array.push(value);
                }

                var record = internals.deeper(match.node, isEdge, current, path, segments, array, options);
                if (record) {
                    return record;
                }
            }
        }
    }

    // Param

    if (this._param) {
        var value = internals.param(current, this._param._edge && this._param._edge.segment.empty);
        if (value === false ||
            (value && value.isBoom)) {

            return value;
        }

        var record = internals.deeper(this._param, isEdge, current, path, segments, [value], options);
        if (record) {
            return record;
        }
    }

    // Wildcard

    if (this._wildcard) {
        var value = internals.param(path, true);
        if (value &&
            value.isBoom) {

            return value;
        }

        return { record: this._wildcard.record, array: [value] };
    }

    return null;
};


internals.deeper = function (match, isEdge, current, path, segments, array, options) {

    if (!isEdge) {
        var result = match._match(path.slice(current.length + 1), segments.slice(1), options);
        if (result) {
            if (result.isBoom) {
                return result;
            }

            return { record: result.record, array: array.concat(result.array) };
        }
    }
    else if (match._edge) {
        return { record: match._edge.record, array: array };
    }
    else if (match._wildcard) {
        return { record: match._wildcard.record, array: array }
    }

    return null;
};


internals.param = function (value, empty) {

    if (!empty && !value) {
        return false;
    }

    if (empty && !value) {
        return undefined;
    }

    try {
        return decodeURIComponent(value);
    }
    catch (err) {
        return Boom.badRequest('Invalid request path');
    }
};
