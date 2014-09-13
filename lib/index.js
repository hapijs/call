// Load modules

var Hoek = require('hoek');
var Boom = require('boom');


// Declare internals

var internals = {
    defaults: {
        isCaseSensitive: true,
        cors: null
    }
};


exports.Router = internals.Router = function (options) {

    this.settings = Hoek.applyToDefaults(internals.defaults, options || {});

    this.routes = {};                                // Key: HTTP method or * for catch-all, value: sorted array of routes
    this.vhosts = null;                              // {} where Key: hostname, value: see this.routes
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
    table[method] = table[method] || [];

    var analysis = config.analysis || this.analyze(config.path);
    var record = {
        path: config.path,
        route: route,
        segments: analysis.segments,
        params: analysis.params,
        fingerprint: analysis.fingerprint
    };

    // Check for existing route with same fingerprint

    var altFingerprint = (record.segments[record.segments.length - 1].isEmptyOk ? record.fingerprint.substring(0, record.fingerprint.length - 2) : '');
    table[method].forEach(function (existing) {

        Hoek.assert(record.fingerprint !== existing.fingerprint, 'New route: ' + config.path + ' conflicts with existing: ' + existing.path);
        Hoek.assert(altFingerprint !== existing.fingerprint, 'New route: ' + config.path + ' conflicts with existing: ' + existing.path);

        var altExistingFingerprint = (existing.segments[existing.segments.length - 1].isEmptyOk ? existing.fingerprint.substring(0, existing.fingerprint.length - 2) : '');
        Hoek.assert(record.fingerprint !== altExistingFingerprint, 'New route: ' + config.path + ' conflicts with existing: ' + existing.path);
    });

    // Add and sort

    table[method].push(record);
    table[method].sort(internals.sort);
    return record;
};


internals.Router.prototype.route = function (method, path, hostname) {

    var vhost = (this.vhosts && hostname && this.vhosts[hostname]);
    var route = (vhost && this._lookup(path, vhost, method)) ||
                this._lookup(path, this.routes, method) ||
                (method === 'head' && vhost && this._lookup(path, vhost, 'get')) ||
                (method === 'head' && this._lookup(path, this.routes, 'get')) ||
                (method === 'options' && this.settings.cors) ||
                (vhost && this._lookup(path, vhost, '*')) ||
                this._lookup(path, this.routes, '*') ||
                Boom.notFound();

    return route;
};


internals.Router.prototype._lookup = function (path, table, method) {

    var match = false;
    var routes = table[method];
    if (routes) {
        var pathSegments = path.split('/');
        for (var i = 0, il = routes.length; !match && i < il; ++i) {
            var record = routes[i];
            match = this._match(record, path, pathSegments);                    // Returns Error, false, or result object
            if (match &&
                !match.isBoom) {

                match.route = record.route;
            }
        }
    }

    return match;
};


internals.Router.prototype._match = function (record, path, pathSegments) {

    var result = {
        params: {},
        paramsArray: []
    };

    // Literal comparison

    if (!record.params.length) {
        return (record.path === (this.settings.isCaseSensitive ? path : path.toLowerCase()) ? result : false);
    }

    // Mismatching segment count

    var pl = pathSegments.length - 1;
    var sl = record.segments.length;
    var last = record.segments[sl - 1];

    if (pl !== sl &&                                                        // Different count
        (pl !== sl - 1 || (!last.isEmptyOk && !last.isWildcard)) &&         // Not short one with empty or wildcard allowed
        (pl < sl || !last.isWildcard)) {

        return false;
    }

    // Parameter matching

    var match = true;
    for (var i = 0; match && (match instanceof Error === false) && i < record.segments.length; ++i) {
        var segment = record.segments[i];
        if (segment.isWildcard) {
            match = internals.setParam(segment.name, pathSegments.slice(i + 1).join('/'), result, true);
        }
        else if (segment.count) {
            match = internals.setParam(segment.name, pathSegments.slice(i + 1, i + 1 + segment.count).join('/'), result, false);
            i += (segment.count - 1);
        }
        else if (segment.name) {
            if (segment.extract) {
                var partial = pathSegments[i + 1].match(segment.extract);
                if (!partial) {
                    match = false;
                }
                else {
                    match = internals.setParam(segment.name, partial[1], result, segment.isEmptyOk);
                }
            }
            else {
                match = internals.setParam(segment.name, pathSegments[i + 1], result, segment.isEmptyOk);
            }
        }
        else {
            match = (segment.literal === (this.settings.isCaseSensitive ? pathSegments[i + 1] : pathSegments[i + 1].toLowerCase()));
        }
    }

    if (match !== true) {           // Can be Error
        return match;
    }

    return result;
};


internals.setParam = function (name, value, result, isEmptyOk) {

    if (!isEmptyOk && !value) {
        return false;
    }

    if (isEmptyOk && !value) {
        return true;
    }

    try {
        var decoded = decodeURIComponent(value);
        result.params[name] = decoded;
        result.paramsArray.push(decoded);
        return true;
    }
    catch (err) {
        return Boom.badRequest('Invalid request path');
    }
};


internals.generatePathRegex = function () {

    /*
        /path/{param}/path/{param?}
        /path/{param*2}/path
        /path/{param*2}
        /path/x{param}x
        /{param*}
    */

    var empty = '(^\\/$)';

    var legalChars = '[\\w\\!\\$&\'\\(\\)\\*\\+\\,;\\=\\:@\\-\\.~]';
    var encoded = '%[A-F0-9]{2}';

    var literalChar = '(?:' + legalChars + '|' + encoded + ')';
    var literal = literalChar + '+';
    var literalOptional = literalChar + '*';

    var midParam = '(\\{\\w+(\\*[1-9]\\d*)?\\})';                                   // {p}, {p*2}
    var endParam = '(\\/(\\{\\w+((\\*([1-9]\\d*)?)|(\\?))?\\})?)?';                 // {p}, {p*2}, {p*}, {p?}
    var mixParam = '(\\{\\w+\\??\\})';                                              // {p}, {p?}

    var literalParam = '(' + literal + mixParam + literalOptional + ')|(' + literalOptional + mixParam + literal + ')';

    var segmentContent = '(' + literal + '|' + midParam + '|' + literalParam + ')';
    var segment = '\\/' + segmentContent;
    var segments = '(' + segment + ')*';

    var path = '(^' + segments + endParam + '$)';

    var parseParam = '^(' + literalOptional + ')' + '\\{(\\w+)(?:(\\*)(\\d+)?)?(\\?)?\\}' + '(' + literalOptional + ')$';

    var expressions = {
        parseParam: new RegExp(parseParam),                                        // $1: literal-pre, $2: name, $3: *, $4: segments, $5: empty-ok, $6: literal-post
        validatePath: new RegExp(empty + '|' + path),
        validatePathEncoded: /%(?:2[146-9A-E]|3[\dABD]|4[\dA-F]|5[\dAF]|6[1-9A-F]|7[\dAE])/g
    };

    return expressions;
};


internals.pathRegex = internals.generatePathRegex();


internals.Router.prototype.analyze = function (path) {

    Hoek.assert(internals.pathRegex.validatePath.test(path), 'Invalid path:', path);
    Hoek.assert(!internals.pathRegex.validatePathEncoded.test(path), 'Path cannot contain encoded non-reserved path characters:', path);

    var pathParts = path.split('/');
    var segments = [];
    var params = {};
    var fingers = [];

    for (var i = 1, il = pathParts.length; i < il; ++i) {                            // Skip first empty segment
        var segment = pathParts[i];
        var param = segment.match(internals.pathRegex.parseParam);
        if (param) {

            // Parameter

            var pre = param[1];
            var name = param[2];
            var isMulti = !!param[3];
            var multiCount = param[4] && parseInt(param[4], 10);
            var isEmptyOk = !!param[5];
            var post = param[6];

            Hoek.assert(!params[name], 'Cannot repeat the same parameter name:', name, 'in:', path);
            params[name] = true;

            if (isMulti) {
                if (multiCount) {
                    for (var m = 0; m < multiCount; ++m) {
                        fingers.push('?');
                        segments.push({ name: name, count: multiCount });
                    }
                }
                else {
                    fingers.push('#');
                    segments.push({ isWildcard: true, name: name });
                }
            }
            else {
                fingers.push(pre + '?' + post);
                var segmentMeta = {
                    name: name,
                    isEmptyOk: isEmptyOk
                };

                if (pre || post) {
                    segmentMeta.mixed = true;
                    segmentMeta.pre = pre;
                    segmentMeta.post = post;
                    segmentMeta.extract = new RegExp('^' + Hoek.escapeRegex(pre) + '(.' + (isEmptyOk ? '*' : '+') + ')' + Hoek.escapeRegex(post) + '$', (!this.settings.isCaseSensitive ? 'i' : ''));
                }

                segments.push(segmentMeta);
            }
        }
        else {

            // Literal

            segment = this.settings.isCaseSensitive ? segment : segment.toLowerCase();
            fingers.push(segment);
            segments.push({ literal: segment });
        }
    }

    return {
        segments: segments,
        fingerprint: '/' + fingers.join('/'),
        params: Object.keys(params)
    }
};


internals.Router.prototype.table = function (host) {

    var result = [];
    var collect = function (table) {

        if (!table) {
            return;
        }

        Object.keys(table).forEach(function (method) {

            table[method].forEach(function (record) {

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


internals.sort = function (a, b) {

    // Biased for less and shorter segments which are faster to compare

    var aFirst = -1;
    var bFirst = 1;

    // Prepare fingerprints

    var aFingers = a.segments;
    var bFingers = b.segments;

    var al = aFingers.length;
    var bl = bFingers.length;

    // Compare fingerprints

    if ((aFingers[al - 1].isWildcard) ^ (bFingers[bl - 1].isWildcard)) {
        return (aFingers[al - 1].isWildcard ? bFirst : aFirst);
    }

    var size = Math.min(al, bl);
    for (var i = 0; i < size; ++i) {

        var aSegment = aFingers[i];
        var bSegment = bFingers[i];

        // Equal (except both wildcards as that means entire route paths are equal)

        if ((aSegment.name && bSegment.name && !aSegment.isWildcard && !bSegment.isWildcard && !aSegment.mixed && !bSegment.mixed) ||
            (aSegment.literal !== undefined && aSegment.literal === bSegment.literal)) {

            continue;
        }

        // One is wildcard

        if (aSegment.isWildcard) {
            return bFirst;
        }
        else if (bSegment.isWildcard) {
            return aFirst;
        }

        // One is parameter -or- both and at least one is mixed

        if (aSegment.name) {
            if (bSegment.name &&
                al === bl) {

                var mixed = internals.compareMixed(aSegment, bSegment);
                if (mixed === 0) {
                    continue;
                }

                return mixed;
            }
            else {
                return (al >= bl ? bFirst : aFirst);        // Bias to literal over parameter
            }
        }
        else if (bSegment.name) {
            break;
        }

        // Both literal but different

        if (al === bl) {
            if (aSegment.literal.length === bSegment.literal.length) {
                return (aSegment.literal > bSegment.literal ? bFirst : aFirst);
            }

            return (aSegment.literal.length > bSegment.literal.length ? bFirst : aFirst);
        }

        // Less segments win

        break;
    }

    return (al > bl ? bFirst : aFirst);
};


internals.compareMixed = function (aSegment, bSegment, p) {

    p = p || 0;
    if (p === 3) {
        return 0;
    }

    var aFirst = -1;
    var bFirst = 1;

    var prop = ['mixed', 'pre', 'post'][p];
    var ap = aSegment[prop];
    var bp = bSegment[prop];

    if (ap === bp) {
        return internals.compareMixed(aSegment, bSegment, p + 1);
    }
    else {
        if (ap) {
            if (bp) {
                if (ap.length === bp.length) {
                    return (ap > bp ? bFirst : aFirst);
                }
                else {
                    return (ap.length > bp.length ? aFirst : bFirst);
                }
            }
            else {
                return aFirst;
            }
        }
        else {
            return bFirst;
        }
    }
};