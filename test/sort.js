// Load modules

var Hoek = require('hoek');
var Call = require('../');
var Code = require('code');
var Lab = require('lab');
var Sort = require('../lib/sort');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


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

    describe('#sort', function () {
        var paths = [
            '/detect/MobileRx',
            '/search-token/{browseToken}',
            '/storeLocator/ca_storefinder.do',
            '/storeLocator/ca_storefinder_details_short.do',
            '/find-in-store/{id}',
            '/c/{type}/{id}',
            '/cp/pharmacy/5431',
            '/cp/Rollbacks/130306',
            '/cp/All-Departments/121828',
            '/cp/Pet-Medications/1095032',
            '/cp/Value-of-the-Day/{path?}',
            '/cp/New-Generic-Drugs/1094789',
            '/cp/New-Pharmacy-Customer/1088604',
            '/cp/Your-Walmart-Pharmacy/538515',
            '/cp/Fill-New-Prescriptions/1088927',
            '/cp/Pharmacy-Home-Delivery/1042239',
            '/cp/Pharmacy-Online-Account/538509',
            '/cp/Pharmacy-Walmart-Mobile-Device/1084324',
            '/cp/{version}/{id}',
            '/ip/{id}/ratings',
            '/ip/{name}/{id}',
            '/api/item/vod',
            '/api/item/{id?}',
            '/order/history/{orderId}',
            '/browse/{name}/{browseToken}',
            '/detect/cp/130306',
            '/detect/cp/{id}',
            '/detect/search/browse-ng.do',
            '/detect/cp/{name}/{id}',
            '/checkout/payment/choose/edit',
            '/checkout/ship-to-home/choose/edit',
            '/checkout/site-to-store/{lat}/{lng}',
            '/find-in-store/{id}/{lat}/{lng}',
            '/{loc_type}/location/find/{type}',
            '/{loc_type}/location/list/{zip}',
            '/{loc_type}/location/locate/{type}',
            '/ip/{id}/components/{component_id}/{option_id}',
            '/{loc_type}/location/map/{lat}/{lng}',
            '/{loc_type}/location/find/{type}/{id}',
            '/{loc_type}/location/list/{lat}/{lng}',
            '/{loc_type}/location/locate/{type}/{id}',
            '/ip/{id}/components/{component_id}/{option_id}/ratings',
            '/ip/{id}/components/{component_id}/{option_id}/ratings/{sort}',
            '/shop-by-department/{path*}',
            '/api/topic/{id*}',
            '/detect/ip/{path*}',
            '/detect/tp/{path*}',
            '/detect/photo/{path*}',
            '/detect/browse/{path*}',
            '/account/create/{source*}',
            '/search-token/{browseToken}/{searchTerms*}',
            '/c/{type}/{id}/{page*}',
            '/detect/c/kp/{path*}',
            '/browse/{path*}',
            '/browse/{type}/{name}/{browseToken*}'
        ];

        it('sorts routes in right order', function (done) {
            var router = new Call.Router();
            for (var i = 0, il = paths.length; i < il; ++i) {
                router.add({ method: 'get', path: paths[i] }, paths[i]);
            }

            var routes = router.routes['get'];
            var list = [];
            var r1 = r2 = 0;
            var routesList = [];
            for (var i = 0, il = routes.length; i < il; ++i) {
                var route = routes[i];
                if (route.path === '/browse/{path*}') {
                    r1 = i;
                }
                if (route.path === '/browse/{type}/{name}/{browseToken*}') {
                    r2 = i;
                }
                routesList.push(route.path);
            }
            // console.log(routesList);
            expect(r2<r1).to.be.true();
            done();
        });
    });
});