var jsdom = require("jsdom"),
    elemHide = require("../data/elemhide"),
    nodeRunFilters = elemHide.nodeRunFilters,
    waitForKeyElements = elemHide.waitForKeyElements,
    jquery = require("fs").readFileSync("../data/lib/jquery-1.11.2.min.js", "UTF-8");

var testUrls = [
    "https://www.google.com/search?q=jewelry&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg", // google 
    "https://search.yahoo.com/yhs/search;_ylt=AwrTccUv_hNV_X0AgfknnIlQ?ei=UTF-8&hsimp=yhs-001&hspart=mozilla&p=jewelry&SpellState=&fr2=sp-qrw-corr-top"  
];


if (1) {  // testing the script (work here)

    // loaded out google page
    jsdom.env({ url: testUrls[0], src: jquery, done: function(err, window) {
    
        console.log("* LOAD: "+this.url);
        
        // ok, we've loaded the page, save jquery obj
        var $ = window.$;
        
        // now print out the number of results
        console.log("* FOUND: "+ $('#resultStats').text() );  // this works **
        
        setTimeout(function() {  // waiting 5 sec for everything to load
        
            $('#tads').length && console.log("* FOUND: $('#tads')"); // this also works **
            
            !$('#tads.c').length && console.log("* FAILED: $('#tads.c')"); // but this fails ** (why?)
            
            //nodeRunFilters($); // if the above worked, then we could simply call this function (defined in elemhide.js) 
                        
            console.log('Done');
             
        }, 5000);
    }});
}
else {  // running the script (ignore for now)
    
    for (var i=0, len = testUrls.length; i<len; i++) {

        jsdom.env({ url: testUrls[i], src: jquery, done: whenDone });
    }
}

function whenDone(err, window) {

    if (err) { // check for errors
    
        for (var i=0,len=err.length; i<len; i++)
            console.error(err[i]); 
            
        return;
    } 
    
    // now check selectors from elemhide 
    nodeRunFilters(window.$);
}