
var textAdSelectors = [ 
    { selector: 'ads-ad', waitfor: "a[class^='r-']", handler: googleText, name: 'adsense' },
    { selector: 'results--ads', waitfor: '.result__a', handler: duckDuckText, name: 'duckduckgo' }
];

$(function() {
    
    var $hidden = $("*").filter(function() {

        return /^url\("about:abp-elemhidehit?/.test($(this).css("-moz-binding"));
    });
    
    $hidden.each(function() {
    
        for (var i=0; i < textAdSelectors.length; i++) {
   
            var data = textAdSelectors[i];
            
            var clz = data.selector, sel = '.' + clz;
            
            //console.log("CHECK: "+$(this)[0].classList +" hasClass: "+clz);
                    
            if ( $(this).hasClass(clz) ) {
               
                waitForKeyElements(sel + ' ' + data.waitfor, 
                    data.handler.bind( $(this) ));
    
            }
               
        };
    });
});

// TODO: combine the functions below?
function googleText(anchor) {
    
    var text = this.find('div.ads-creative');
    var site = this.find('div.ads-visurl cite');
    
    if (text.length && site.length) {
 
        var ad = {
            
            network : 'google',            
            pageUrl : document.URL,
            
            targetUrl : anchor.attr('href'),
            title : anchor.text(),
            text : text.text(),
            site : site.text()
        }
        
        self.port && self.port.emit('parsed-text-ad', ad);
    }
    else {
        
        console.log('googleText.fail: ', text, site);
    }
}

function duckDuckText(anchor) {
                    
    var text = this.find('div.result__snippet a');
    var site = this.find('a.result__url');
    
    if (text.length && site.length) {
        
        var ad = {

            pageUrl : document.URL,
            network : 'duckduckgo',
            
            targetUrl : anchor.attr('href'),
            title : anchor.text(),
            text : text.text(),
            site : site.text()
        }
        
        self.port && self.port.emit('parsed-text-ad', ad);
    } 
    else {
        
        console.log('duckDuckText.fail: ',  text, site);
    }
}

/*  A utility function, for Greasemonkey scripts,
    that detects and handles AJAXed content.

    Usage example:

        waitForKeyElements(
            "div.comments", 
            commentCallbackFunction
        );

        //--- Page-specific function to do what we want when the node is found.
        function commentCallbackFunction(jNode) {
            jNode.text("This comment changed by waitForKeyElements().");
        }

    IMPORTANT: This function requires your script to have loaded jQuery.
*/
// from: https://gist.github.com/BrockA/2625891
function waitForKeyElements(
    
    selectorTxt,    /* Required: The jQuery selector string that
                        specifies the desired element(s).
                    */
    actionFunction, /* Required: The code to run when elements are
                        found. It is passed a jNode to the matched
                        element.
                    */
    bWaitOnce,      /* Optional: If false, will continue to scan for
                        new elements even after the first match is
                        found.
                    */
    iframeSelector  /* Optional: If set, identifies the iframe to
                        search.
                    */
) {
    var targetNodes, btargetsFound;

    if (typeof iframeSelector == "undefined")
        targetNodes     = $(selectorTxt);
    else
        targetNodes     = $(iframeSelector).contents ()
                                           .find (selectorTxt);

    if (targetNodes  &&  targetNodes.length > 0) {
        btargetsFound   = true;
        /*  Found target node(s). Go through each and act if they are new. */
        targetNodes.each ( function () {
            var jThis        = $(this);
            var alreadyFound = jThis.data ('alreadyFound')  ||  false;

            if (!alreadyFound) {
                //--- Call the payload function.
                var cancelFound     = actionFunction (jThis);
                if (cancelFound)
                    btargetsFound   = false;
                else
                    jThis.data ('alreadyFound', true);
            }
        } );
    }
    else {
        btargetsFound   = false;
    }

    //--- Get the timer-control variable for this selector.
    var controlObj      = waitForKeyElements.controlObj  ||  {};
    var controlKey      = selectorTxt.replace (/[^\w]/g, "_");
    var timeControl     = controlObj [controlKey];

    //--- Now set or clear the timer as appropriate.
    if (btargetsFound  &&  bWaitOnce  &&  timeControl) {
        //--- The only condition where we need to clear the timer.
        clearInterval (timeControl);
        delete controlObj [controlKey]
    }
    else {
        //--- Set a timer, if needed.
        if ( ! timeControl) {
            timeControl = setInterval ( function () {
                    waitForKeyElements (    selectorTxt,
                                            actionFunction,
                                            bWaitOnce,
                                            iframeSelector
                                        );
                },
                300
            );
            controlObj [controlKey] = timeControl;
        }
    }
    waitForKeyElements.controlObj = controlObj;
}
