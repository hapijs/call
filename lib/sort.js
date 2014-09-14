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