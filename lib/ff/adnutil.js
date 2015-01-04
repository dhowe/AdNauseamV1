// Functions shared between addon and content-script code

function AdnUtil() { }

function byField(prop) { // dup in shared
    
    //this.log("BY FIELD");
    
    var sortOrder = 1;
    
    if(prop[0] === "-") {
        sortOrder = -1;
        prop = prop.substr(1);
    }
    
    return function (a,b) {
        var result = (a[prop] < b[prop]) ? -1 : (a[prop] > b[prop]) ? 1 : 0;
        return result * sortOrder;
    }
}
AdnUtil.prototype.byField = byField;

function toAdArray(adhash, filter) {  // dup in parser/shared

    var all = [], keys = Object.keys(adhash);
    for (var i = 0, j = keys.length; i < j; i++) {

        var ads = adhash[keys[i]];
        for (var k=0; k < ads.length; k++) {

            if (!filter || filter(ads[k]))
                all.push(ads[k]);
        }
    }

    return all;
}
AdnUtil.prototype.toAdArray = toAdArray;

function rand(min, max) {
    
    if (arguments.length == 1) {
        max = min;
        min = 0;
    } 
    else if (!arguments.length) {
        max = 1;
        min = 0;
    }
    
    return Math.floor(Math.random() * (max - min)) + min;
}
AdnUtil.prototype.rand = rand;

function log() { console.log.apply(console, arguments); }
AdnUtil.prototype.log = log;

function warn()  { console.warn.apply(console, arguments); }
AdnUtil.prototype.warn = warn;

typeof exports != 'undefined' && (exports.AdnUtil = new AdnUtil());
