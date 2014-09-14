// Load modules

var Lab = require('lab');
var Hoek = require('hoek');
var Call = require('../');
var Sort = require('../lib/sort');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;


describe('Call', function () {

    describe('#sort', function () {

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

        it('sorts routes in right order', function (done) {

            var router = new Call.Router();
            for (var i = 0, il = paths.length; i < il; ++i) {
                router.add({ method: 'get', path: paths[i] }, paths[i]);
            }

            var routes = router.routes['get'];
            var list = [];
            for (var i = 0, il = routes.length; i < il; ++i) {
                var route = routes[i];
                list.push(route.path);
            }

            expect(list).to.deep.equal(paths);
            done();
        });

        it('compares every combination both ways', function (done) {

            var router = new Call.Router({ isCaseSensitive: true });

            for (var ai = 0, al = paths.length; ai < al; ++ai) {
                var a = router.analyze(paths[ai]);
                
                for (var bi = 0, bl = paths.length; bi < bl; ++bi) {
                    if (ai === bi) {
                        continue;
                    }

                    var b = router.analyze(paths[bi]);

                    var a2b = Sort.sort(a, b);
                    var b2a = Sort.sort(b, a);

                    if (a2b !== (-1 * b2a)) {
                        console.log('a: \'' + paths[ai] + '\' | b: \'' + paths[bi] + '\'');
                    }

                    if (ai < bi && a2b !== -1) {
                        console.log('a: \'' + paths[ai] + '\' | b: \'' + paths[bi] + '\'');
                    }

                    expect(a2b).to.not.equal(0);
                    expect(a2b).to.equal(-1 * b2a);
                    expect(a2b).to.equal(ai < bi ? -1 : 1);
                }
            }

            done();
        });

        for (var i = 0; i < 50; ++i) {
            it('sorts random routes in right order #' + i, function (done) {

                var router = new Call.Router();

                var copy = Hoek.clone(paths);
                while (copy.length) {
                    var i = Math.floor(Math.random() * (copy.length - 1));
                    var path = copy[i];
                    copy = copy.filter(function (item, index, array) { return index != i; });
                    router.add({ method: 'get', path: path }, paths[i]);
                }

                var routes = router.routes['get'];
                var list = [];
                for (var i = 0, il = routes.length; i < il; ++i) {
                    var route = routes[i];
                    list.push(route.path);
                }

                expect(list).to.deep.equal(paths);
                done();
            });
        }
    });
});