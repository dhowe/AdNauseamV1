
$(function() {

    console.log("page-ready: "+document.URL);
    
    setTimeout(function() {  

        console.log("timer-ready");

        var $hidden = $("*").filter(function() {
            
            return /^url\("about:abp-elemhidehit?/.test($(this).css("-moz-binding"));
        });

        var ads = [];// s = '\n';
        
        $hidden.each(function() {
            
            $this = $(this), clz = 'ads-ad';

            if ($this.hasClass(clz)) {
                
                var ad = parseGoogleText($this, '.' + clz);
                if (ad) {
                    //console.log(ad);
                    ads.push(ad);
                }
            }
            else {
                
                console.log('elemhide.js::ignore #' + $this.attr('id') +
                     " /("+$(this)[0].classList+") page: "+document.URL);
            } 
        });
        
        console.log('Found '+ads.length+' ads ');
        
        ads.length && self.port && self.port.emit('parsed-text-ads', ads);

    }, 200);  // TODO: why is this needed (extra-time to apply moz-binding?)
   
});

function parseGoogleText($ele, sel) {
    
    var text = $ele.find('div.ads-creative');
    var site = $ele.find('div.ads-visurl cite');
    
    if (text.length && site.length) {
     
        var anchor =  $ele.find("a[class^='r-']"); // r-bottomads-,r-taw-,r-rhscol-

        if (anchor.length == 1) {
            
            return {
                
                selector : sel, 
                network : 'google',
                
                pageUrl : document.URL,
                targetUrl : anchor.attr('href'),
                title : anchor.text(),
                
                textHtml : text.html(),
                siteHtml : site.html(),
                
                // OR
                text : text.text(),
                site : site.text()
            };
        }
        else {
            
            console.log('parseGoogleText.anchor-fail(len='+anchor.length + 
                '):', sel, 'id='+$ele.attr('id'), '\n', $ele.contents() );
        }
    }
    else {
        
        console.log('parseGoogleText.fail: ', sel, text, site);
    }
    
    return null;
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
function waitForKeyElements (
    
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
