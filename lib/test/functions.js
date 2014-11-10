
// run with node

function targetDomain(text) {
    
    return new URL(extractDomains(url).pop()).hostname;
}


function extractDomains(text) {

    var result = [], matches,
        regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

    while (matches = regexp.exec(text))
        result.push(matches[0]);

    return result;
}

function assert(test,exp,msg) {
    msg = msg || 'expecting "'+exp+'", but got';
    console.log((test == exp) ? 'OK' : 'FAIL: '+msg, test);
}

(function runTests() {
    
    var test = 'http://www.rolex.com/watches/cellini.html?cmpid=dw201406035';
    assert(targetDomain(test), 'www.rolex.com');
    
    var test = 'http://www.rolex.com/watches/cellini.html?cmpid=dw201406035$';
    //assert(extractDomains(test), 'www.rolex.com');
     
})();