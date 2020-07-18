'use strict';

const Decode = require('../lib/decode');
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');


const internals = {};


const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;


describe('uri.decode()', () => {

    it('decodes URI strings', () => {

        const strings = [
            '',
            'abcd',
            '1+2+3+4',
            'a b c d',
            '=x',
            '%25',
            'p%C3%A5ss',
            '%61+%4d%4D',
            '\uFEFFtest',
            '\uFEFF',
            '%EF%BB%BFtest',
            '%EF%BB%BF',
            '%C2%B5',
            '†',
            '/a/b%2Fc',
            '¢™💩',
            encodeURI('¢™💩')
        ];

        for (const string of strings) {
            expect(Decode.decode(string)).to.equal(decodeURIComponent(string));
        }
    });

    it('handles invalid strings', () => {

        const strings = [
            '%',
            '%2',
            '%%25%%',
            '%ab',
            '%ab%ac%ad',
            'f%C3%A5il%',
            'f%C3%A5%il',
            '%f%C3%A5il',
            'f%%C3%%A5il',
            '%C2%B5%',
            '%%C2%B5%',
            '%E0%A4%A',
            '/a/b%"Fc',
            '64I%C8yY3wM9tB89x2S~3Hs4AXz3TKPS',
            'l3k%Dbbbxn.L5P2ilI-tLxUgndaWnr81',
            'fum3GJU-DLBgO%dehn%MGDsM-jn-p-_Q',
            'AWgvg5oEgIJoS%eD28Co4koKtu346v3j',
            'k3%c4NVrqbGf~8IeQyDueGVwV1a8_vb4',
            'QlW8P%e9ARoU4chM4ckznRJWP-6RmIL5',
            'h7w6%dfcx4k.EYkPlGey._b%wfOb-Y1q',
            'zFtcAt%ca9ITgiTldiF_nfNlf7a0a578',
            '.vQD.nCmjJNEpid%e5KglS35Sv-97GMk',
            '8qYKc_4Zx%eA.1C6K99CtyuN4_Xl8edp',
            '.Y4~dvjs%D7Qqhy8wQz3O~mLuFXGNG2T',
            'kou6MHS%f3AJTpe8.%eOhfZptvsGmCAC',
            '-yUdrHiMrRp1%DfvjZ.vkn_dO9p~q07A',
            'e6BF%demc0%52iqSGOPL3kvYePf-7LIH',
            'Aeo_4FxaGyC.w~F1TAAK9uYf-y._m%ca',
            'z0krVTLPXhcqW~1PxkEmke0CmNcIT%EE',
            '3KqqzjaF.6QH6M5gm5PnV5iR3X99n%Cb',
            'Nl_0qJEX6ZBVK2E3qvFNL0sMJzpxK%DF',
            'WKj35GkCYJ~ZF_mkKZnPBQzo2CJBj%D6',
            'ym8WNqRjaxrK9CEf.Y.Twn0he8.6b%ca',
            'S4q0CjXZW5aWtnGiJl.svb7ow8HG6%c9',
            '0iL5JYG96IjiQ1PHfxTobQOjaqv7.%d3',
            '3OzV6xpZ2xmPxSBoMTTC_LcFpnE0M%Ea',
            'dvQN9Ra2UoWefWY.MEZXaD69bUHNc%Cd'
        ];

        for (const string of strings) {
            expect(() => decodeURIComponent(string)).to.throw();
            expect(Decode.decode(string)).to.be.null();
        }
    });

    it('decodes every character', () => {

        const chars = [];
        for (let i = 0; i < 256; ++i) {
            chars.push(encodeURI(String.fromCharCode(i)));
        }

        const string = chars.join('a1$#');
        expect(Decode.decode(string)).to.equal(decodeURIComponent(string));
    });
});
