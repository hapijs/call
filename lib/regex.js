// Load modules


// Declare internals

var internals = {};


exports.generate = function () {

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
