var jsdom = require("jsdom"),
    runFilters = require("../data/elemhide").runFilters,
    waitForKeyElements = require("../data/elemhide").waitForKeyElements,
    jquery = require("fs").readFileSync("../data/lib/jquery-1.11.2.min.js", "UTF-8");

var testUrls = [
    "https://www.google.com.hk/search?q=jewelry", // google 
    // "https://search.yahoo.com/search;_ylt=Aoaam0.r9kr.KLlaCt0.ueubvZx4?p=jewelery"  
];





if (1) {  // testing the script

    jsdom.env({ url: testUrls[0], src: jquery, done: function(err, window) {
    
        var $ = window.$;
        
        console.log( $('#resultStats').text() );  
        
        waitForKeyElements($, '#tads', function(anchor) {
        
            console.log( 'ok' );
             
        }, true);    
    }});
}
else {  // running the script (later)
    
    function whenDone(err, window) {

        if (err) { // check for errors
        
            for (var i=0,len=err.length; i<len; i++)
                console.error(err[i]); 
                
            return;
        } 
        
        // now check selectors from elemhide 
        runFilters(window.$);
    }
    
    for (var i=0, len = testUrls.length; i<len; i++) {

        jsdom.env({ url: testUrls[i], src: jquery, done: whenDone });
    }
}

