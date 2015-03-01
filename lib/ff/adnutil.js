// Functions shared between addon and content-script code

function AdnUtil() { }

var Type = {
    
    N : 'number', S : 'string', O : 'object', A :'array', B : 'boolean', R : 'regexp', F : 'function',
    
    // From: http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/ 
    get : function(obj) {
        
        if (typeof obj == 'undefined') return null;
        return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    },
    
    // Returns true if the object is of type 'type', otherwise false
     
    is : function(obj,type) {
        
        return Type.get(obj) === type;
    },
    
    // Throws TypeError if not the correct type, else returns true
    ok : function(obj,type) {
        
        if (Type.get(obj) != type) {
            
            throw TypeError('Expected '+(type ? type.toUpperCase() : type+'') +
                ", but received "+(obj ? Type.get(obj).toUpperCase() : obj+''));
        }
        
        return true;
    }
};

AdnUtil.prototype.N  = Type.N;
AdnUtil.prototype.S  = Type.S;
AdnUtil.prototype.O  = Type.O;
AdnUtil.prototype.A  = Type.A;
AdnUtil.prototype.B  = Type.B;
AdnUtil.prototype.R  = Type.R;
AdnUtil.prototype.F  = Type.F;

AdnUtil.prototype.is = Type.is;
AdnUtil.prototype.ok = Type.ok;
AdnUtil.prototype.type = Type.get;

function byField(prop) {
    
    //this.log("BY FIELD");
    
    var sortOrder = 1;
    
    if(prop[0] === "-") {
        sortOrder = -1;
        prop = prop.substr(1);
    }
    
    return function (a,b) {
        var result = (a[prop] < b[prop]) ? -1 : (a[prop] > b[prop]) ? 1 : 0;
        return result * sortOrder;
    };
}
AdnUtil.prototype.byField = byField;

function toAdArray(adhash, filter) {

    var all = [], keys = Object.keys(adhash);
 
    for (var i = 0, j = keys.length; i < j; i++) {

        var page = adhash[keys[i]],
            ads = (typeof page.ads != 'undefined') ? page.ads : page;
            
        for (var k=0; k < ads.length; k++) {

            if (!filter || filter(ads[k]))
                all.push(ads[k]);
        }
    }

    return all;
}
AdnUtil.prototype.toAdArray = toAdArray;

function findTab(url) {

    var vtab, tabs = require("sdk/tabs");
        
    for (var tab of tabs) {
        
        if (tab.url === url) {
            
            if (vtab) 
                throw Error('Invalid state: multiple vaults open');
                
            vtab = tab;
        }
    }
          
    return vtab;
}
AdnUtil.prototype.findTab = findTab;
       
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

function computeHashKey(ad) { 
 
    // a backwards-compatible hash-key 
    if (ad.contentType !== 'text') {
        
        if (Type.is(ad.contentData, Type.O))
            return ad.contentData.src;
            
        if (Type.is(ad.contentData, Type.S))
            return ad.contentData;
    }
    else {
        
        return JSON.stringify(ad.contentData+'/'+ad.title);
    }
    
    error("[ERROR] AdnUtil.js -> Invalid ad object: ", ad);
}
AdnUtil.prototype.computeHashKey = computeHashKey;

function log() {
    
    if (typeof require == 'undefined' || require("./uiman").UIManager.cfx)
        console && console.log.apply(console, arguments);
}

function warn() {
    
    if (typeof require == 'undefined' || require("./uiman").UIManager.cfx)
        console && console.warn.apply(console, arguments);
}

function error() {
    
    if (typeof require == 'undefined' || require("./uiman").UIManager.cfx)
        console && console.error.apply(console, arguments);
}

function trace() {
    
    if (typeof require == 'undefined' || require("./uiman").UIManager.cfx)
        console && console.trace.apply(console, arguments);
}

AdnUtil.prototype.log = log;
AdnUtil.prototype.warn = warn;
AdnUtil.prototype.error = error;
AdnUtil.prototype.trace = trace;

typeof exports != 'undefined' && (exports.AdnUtil = new AdnUtil());
