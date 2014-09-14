// Load modules

var Lab = require('lab');
var Call = require('../');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;


describe('Call', function () {

    it('routes request', function (done) {

        var router = new Call.Router();
        router.add({ method: 'get', path: '/' }, '/');
        router.add({ method: 'get', path: '/a' }, '/a');
        router.add({ method: 'get', path: '/b' }, '/b');

        expect(router.route('get', '/').route).to.equal('/');
        expect(router.route('get', '/a').route).to.equal('/a');
        expect(router.route('get', '/b').route).to.equal('/b');

        done();
    });

    it('matches routes in right order', function (done) {

        var paths = [
            '/',
            '/a',
            '/b',
            '/ab',
            '/a{p}b',
            '/a{p}',
            '/{p}b',
            '/{p}',
            '/a/b',
            '/a/{p}',
            '/b/',
            '/a1{p}/a',
            '/xx{p}/b',
            '/x{p}/a',
            '/x{p}/b',
            '/y{p?}/b',
            '/{p}xx/b',
            '/{p}x/b',
            '/{p}y/b',
            '/a/b/c',
            '/a/b/{p}',
            '/a/d{p}c/b',
            '/a/d{p}/b',
            '/a/{p}d/b',
            '/a/{p}/b',
            '/a/{p}/c',
            '/a/{p*2}',
            '/a/b/c/d',
            '/a/b/{p*2}',
            '/a/{p}/b/{x}',
            '/{p*5}',
            '/a/b/{p*}',
            '/{a}/b/{p*}',
            '/{p*}'
        ];

        var requests = [
            ['/', '/'],
            ['/a', '/a'],
            ['/b', '/b'],
            ['/ab', '/ab'],
            ['/axb', '/a{p}b'],
            ['/axc', '/a{p}'],
            ['/bxb', '/{p}b'],
            ['/c', '/{p}'],
            ['/a/b', '/a/b'],
            ['/a/c', '/a/{p}'],
            ['/b/', '/b/'],
            ['/a1larry/a', '/a1{p}/a'],
            ['/xx1/b', '/xx{p}/b'],
            ['/xx1/a', '/x{p}/a'],
            ['/x1/b', '/x{p}/b'],
            ['/y/b', '/y{p?}/b'],
            ['/0xx/b', '/{p}xx/b'],
            ['/0x/b', '/{p}x/b'],
            ['/ay/b', '/{p}y/b'],
            ['/a/b/c', '/a/b/c'],
            ['/a/b/d', '/a/b/{p}'],
            ['/a/doc/b', '/a/d{p}c/b'],
            ['/a/dl/b', '/a/d{p}/b'],
            ['/a/ld/b', '/a/{p}d/b'],
            ['/a/a/b', '/a/{p}/b'],
            ['/a/d/c', '/a/{p}/c'],
            ['/a/d/d', '/a/{p*2}'],
            ['/a/b/c/d', '/a/b/c/d'],
            ['/a/b/c/e', '/a/b/{p*2}'],
            ['/a/c/b/d', '/a/{p}/b/{x}'],
            ['/a/b/c/d/e', '/{p*5}'],
            ['/a/b/c/d/e/f', '/a/b/{p*}'],
            ['/x/b/c/d/e/f/g', '/{a}/b/{p*}'],
            ['/x/y/c/d/e/f/g', '/{p*}']
        ];

        var router = new Call.Router();
        for (var i = 0, il = paths.length; i < il; ++i) {
            router.add({ method: 'get', path: paths[i] }, paths[i]);
        }

        for (i = 0, il = requests.length; i < il; ++i) {
            expect(router.route('get', requests[i][0]).route).to.equal(requests[i][1]);
        }

        done();
    });

    describe('#analyze', function () {

        it('generates fingerprints', function (done) {

            var paths = {
                '/': '/',
                '/path': '/path',
                '/path/': '/path/',
                '/path/to/somewhere': '/path/to/somewhere',
                '/{param}': '/?',
                '/{param?}': '/?',
                '/{param*}': '/#',
                '/{param*5}': '/?/?/?/?/?',
                '/path/{param}': '/path/?',
                '/path/{param}/to': '/path/?/to',
                '/path/{param?}': '/path/?',
                '/path/{param}/to/{some}': '/path/?/to/?',
                '/path/{param}/to/{some?}': '/path/?/to/?',
                '/path/{param*2}/to': '/path/?/?/to',
                '/path/{param*}': '/path/#',
                '/path/{param*10}/to': '/path/?/?/?/?/?/?/?/?/?/?/to',
                '/path/{param*2}': '/path/?/?',
                '/%20path/': '/%20path/',
                '/a{p}': '/a?',
                '/{p}b': '/?b',
                '/a{p}b': '/a?b',
                '/a{p?}': '/a?',
                '/{p?}b': '/?b',
                '/a{p?}b': '/a?b'
            };

            var router = new Call.Router({ isCaseSensitive: true });
            var keys = Object.keys(paths);
            for (var i = 0, il = keys.length; i < il; ++i) {
                expect(router.analyze(keys[i]).fingerprint).to.equal(paths[keys[i]]);
            }

            done();
        });
    });

    describe('#route', function () {

        var paths = {
            '/path/to/|false': {
                '/path/to': false,
                '/Path/to': false,
                '/path/to/': true,
                '/Path/to/': true
            },
            '/path/to/|true': {
                '/path/to': false,
                '/Path/to': false,
                '/path/to/': true,
                '/Path/to/': false
            },
            '/path/{param*2}/to': {
                '/a/b/c/d': false,
                '/path/a/b/to': {
                    param: 'a/b'
                }
            },
            '/path/{param*}': {
                '/a/b/c/d': false,
                '/path/a/b/to': {
                    param: 'a/b/to'
                },
                '/path/': {},
                '/path': {}
            },
            '/path/{p1}/{p2?}': {
                '/path/a/c/d': false,
                '/Path/a/c/d': false,
                '/path/a/b': {
                    p1: 'a',
                    p2: 'b'
                },
                '/path/a': {
                    p1: 'a'
                },
                '/path/a/': {
                    p1: 'a'
                }
            },
            '/path/{p1}/{p2?}|false': {
                '/path/a/c/d': false,
                '/Path/a/c': {
                    p1: 'a',
                    p2: 'c'
                },
                '/path/a': {
                    p1: 'a'
                },
                '/path/a/': {
                    p1: 'a'
                }
            },
            '/{p*}': {
                '/path/': {
                    p: 'path/'
                }
            },
            '/{a}/b/{p*}': {
                '/a/b/path/': {
                    a: 'a',
                    p: 'path/'
                }
            },
            '/a{b?}c': {
                '/abc': {
                    b: 'b'
                },
                '/ac': {},
                '/abC': false,
                '/Ac': false
            },
            '/a{b?}c|false': {
                '/abC': {
                    b: 'b'
                },
                '/Ac': {}
            },
            '/%0A': {
                '/%0A': true,
                '/%0a': true
            },
            '/a/b/{c}': {
                '/a/b/c': true,
                '/a/b': false
            }
        };

        var test = function (path, matches, isCaseSensitive) {

            var router = new Call.Router({ isCaseSensitive: isCaseSensitive });
            router.add({ path: path, method: 'get' }, path);

            var mkeys = Object.keys(matches);
            for (var m = 0, ml = mkeys.length; m < ml; ++m) {
                match(router, path, mkeys[m], matches[mkeys[m]]);
            }
        };

        var match = function (router, path, match, result) {

            it((result ? 'matches' : 'unmatches') + ' the path \'' + path + '\' with ' + match + ' (' + (isCaseSensitive ? 'case-sensitive' : 'case-insensitive') + ')', function (done) {

                var output = router.route('get', router.normalize(match));
                var isMatch = !output.isBoom;

                expect(isMatch).to.equal(!!result);
                if (typeof result === 'object') {
                    var ps = Object.keys(result);
                    expect(ps.length).to.equal(output.paramsArray.length);

                    for (var p = 0, pl = ps.length; p < pl; ++p) {
                        expect(output.params[ps[p]]).to.equal(result[ps[p]]);
                    }
                }

                done();
            });
        };

        var keys = Object.keys(paths);
        for (var i = 0, il = keys.length; i < il; ++i) {
            var pathParts = keys[i].split('|');
            var isCaseSensitive = (pathParts[1] ? pathParts[1] === 'true' : true);
            test(pathParts[0], paths[keys[i]], isCaseSensitive);
        }
    });
});