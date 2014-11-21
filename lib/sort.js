// Load modules


// Declare internals

var internals = {};


exports.sort = function (a, b) {

    // Biased for less and shorter segments which are faster to compare

    var aFirst = -1;
    var bFirst = 1;

    // Prepare fingerprints

    var aFingers = a.segments;
    var bFingers = b.segments;

    var al = aFingers.length;
    var bl = bFingers.length;

    // Compare fingerprints

    if ((aFingers[al - 1].wildcard) ^ (bFingers[bl - 1].wildcard)) {
        return (aFingers[al - 1].wildcard ? bFirst : aFirst);
    }

    var size = Math.min(al, bl);
    for (var i = 0; i < size; ++i) {

        var aSegment = aFingers[i];
        var bSegment = bFingers[i];

        // Equal (except both wildcards as that means entire route paths are equal)

        if ((aSegment.param && bSegment.param && !aSegment.wildcard && !bSegment.wildcard && !aSegment.mixed && !bSegment.mixed) ||
            (aSegment.literal !== undefined && aSegment.literal === bSegment.literal)) {

            continue;
        }

        // One is wildcard

        if (aSegment.wildcard) {
            return bFirst;
        }
        else if (bSegment.wildcard) {
            return aFirst;
        }

        // One is parameter -or- both and at least one is mixed

        if (aSegment.param) {
            if (bSegment.param &&
                al === bl) {

                if (aSegment.mixed && bSegment.mixed) {
                    var compare = exports.mixed(aSegment, bSegment);
                    if (compare !== 0) {
                        return compare;
                    }

                    continue;                               // Equal
                }
                else {
                    return (aSegment.mixed ? aFirst : bFirst);
                }
            }
            else {
                return (al >= bl ? bFirst : aFirst);        // Bias to literal over parameter
            }
        }
        else if (bSegment.param) {
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


exports.mixed = function (a, b) {

    var aFirst = -1;
    var bFirst = 1;

    if (a.length !== b.length) {
        return (a.length > b.length ? aFirst : bFirst);
    }

    if (a.first !== b.first) {
        return (a.first ? bFirst : aFirst);
    }

    for (var j = 0, jl = a.segments.length ; j < jl; ++j) {
        var am = a.segments[j];
        var bm = b.segments[j];

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
