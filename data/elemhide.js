/*jslint browser: true*/

/*global self */

/* this code handles ABP's hidden elements (text or img) */

var googleRegex =  /^(www\.)*google\.((com\.|co\.|it\.)?([a-z]{2})|com)$/i;

var admatchers = [

    // text-ads ---------------------------------------------------------------
    {
        selector: '#tads.c',
        waitfor: ".ads-ad",
        handler: googleText,
        name: 'adsense-1',
        domain: googleRegex
        
    }, // top
    {
        selector: '#bottomads',
        waitfor: ".ads-ad",
        handler: googleText,
        name: 'adsense-2',
        domain: googleRegex

    }, // bottom
    {
        selector: '#rhs_block > #mbEnd',
        waitfor: ".ads-ad",
        handler: googleText,
        name: 'adsense-3',
        domain: googleRegex

    }, // right
    {
        selector: '.ads ul',
        waitfor: 'li',
        handler: yahooText,
        name: 'yahoo',
        domain: 'search.yahoo.com'
    }, {
        selector: '.b_ad',
        waitfor: '.sb_adTA',
        handler: bingText,
        name: 'bing',
        domain: 'www.bing.com'
    }, {
        selector: '#ads',
        waitfor: 'div.result',
        handler: duckDuckText,
        name: 'duckduckgo',
        domain: 'duckduckgo.com'
    }, {
        selector: '#rtm_html_441',
        waitfor: 'tr:nth-child(even)',
        handler: ebayText,
        name: 'ebay',
        domain: 'www.ebay.com' 
    }, {
        selector: '[class$=SLL]',
        waitfor: 'div.sllLink.sllAllC',
        handler: aolText,
        name: 'aol',
        domain: 'search.aol.com'
    }, {
        selector: '#content_right > table > tbody > tr > td > div:not(#con-ar)',
        waitfor: "div[id^='bdfs']",
        handler: baiduText,
        name: 'baidu',
        domain: 'www.baidu.com'
    }, {
		selector: '.tgad-box + div',
		waitfor: ".bizr_rb",
		handler: sogouText,
		name: 'sogou',
        domain: 'www.sogou.com'
	},

    // img-ads ----------------------------------------------------------------

    {
        selector: "div[class^=ad][class$=t]",
        waitfor: "div.l_qq_com > a",
        handler: qqImg,
        name: 'qq',
        domain: 'qq.com'
    }, {
        selector: '#row-top',
        waitfor: 'div#mini-features > a',
        handler: zamImg,
        name: 'zam',
        domain: 'www.zam.com'
    }, {
        selector: "div[id^=ad_]",
        waitfor: "a",
        handler: sohuImg,
        name: 'sohu',
        domain: 'www.sohu.com'
    }, {
        selector: "#ecom",
        waitfor: "a",
        handler: hao123Img,
        name: 'hao123',
        domain: 'www.hao123.com'
    }, {
        selector: '#ad-container',
        waitfor: "a",
        handler: rednoiseTest,
        name: 'rednoise-test',
        domain: 'rednoise.org'
    }

    //{ selector: ".ad, .widead", waitfor: "iframe > a", handler: msnImg, name: 'msn' },
    //{ selector: "div[class^=ad]", waitfor: "div.l_qq_com > iframe", handler: qqImg2, name: 'qq2' }
];

// TODO: refactor out common code in these

function rednoiseTest(anchor) {
    
    if (!anchor.length) return;

    var targetUrl = anchor.attr('href'),
        imgTag = anchor.find('img');
        
    var img = imgTag.attr('src');
    
    if (targetUrl.length && img.length) {

        if (img !== 'none') {

            var ad = createImgAd('rednoiseTest', img, targetUrl);
            self.port && self.port.emit('parsed-img-ad', ad);
        }
    } else {
        console.warn('rednoiseTest.fail: ', img, targetUrl);
    }
}

function hao123Img(anchor) {

    if (!anchor.length) return;

    var targetUrl = anchor.attr('href'),
        imgTag = anchor.find('img');
		
	var img = imgTag.attr('src');

    if (targetUrl.length && img.length) {

        if (img !== 'none') {

            var ad = createImgAd('hao123', img, targetUrl);
            self.port && self.port.emit('parsed-img-ad', ad);
        }
    } else {
        console.warn('hao123Img.fail: ', img, targetUrl);
    }
}

function sohuImg(anchor) {

    //console.log('sohuImg: ', anchor.length);

    var targetUrl = anchor.attr('href'),
        imgTag = anchor.find('img');

    if (!imgTag.length) return;

    var img = imgTag.attr('src');

    if (targetUrl.length && img.length) {

        var ad = createImgAd('sohu', img, targetUrl);
        self.port && self.port.emit('parsed-img-ad', ad);
    } else {
        console.warn('sohuImg.fail: ', img, targetUrl);
    }
}

function qqImg(anchor) {

console.log("qqImg handler");
    if (!anchor.length) return;

    var targetUrl = anchor.attr('href'),
        img = anchor.css('background-image').replace('url("', '').replace('")', '');

    if (targetUrl.length && img.length) {

        if (img !== 'none') {

            var ad = createImgAd('qq', img, targetUrl);
            self.port && self.port.emit('parsed-img-ad', ad);
        }
    } else {
        console.warn('qqImg.fail: ', img, targetUrl);
    }
}

function zamImg(anchor) {

    var targetUrl = anchor.attr('href'),
        img = anchor.css('background-image').replace('url("', '').replace('")', '');

    if (targetUrl.length && img.length) {

        var ad = createImgAd('zam', img, targetUrl);
        self.port && self.port.emit('parsed-img-ad', ad);
    } else {
        console.warn('zamImg.fail: ', img, targetUrl);
    }
}

function ebayText(anchor) {

    var title = anchor.find('a > div:first-child'),
        site = anchor.find('a > div:nth-child(2)'),
        text = anchor.find('a > div:nth-child(3)'),
        targetUrl = anchor.find('a');

    if (text.length && site.length && title.length) {

        var ad = createTextAd('ebay', title.text(),
            text.text(), site.text(), targetUrl.attr('href'));

        self.port && self.port.emit('parsed-text-ad', ad);
    } else {
        console.warn('ebayText.fail: ', text, site);
    }
}

function aolText(anchor) {

    var title = anchor.find('a.titleLinkBgPaddingAndUnderline');
    var site = anchor.find('a.urlLinkBgPaddingAndUnderline');
    var text = anchor.find('.desc');

    if (text.length && site.length && title.length) {

        var ad = createTextAd('aol', title.text(),
            text.text(), site.text(), title.attr('href'));

        self.port && self.port.emit('parsed-text-ad', ad);
    } else {
        console.warn('aolText.fail: ', text.text(), site.text());
    }
}

function sogouText(anchor) {

    var title = anchor.find('.bizr_title');
    var site = anchor.find('.bizr_fb');
    var text = anchor.find('.bizr_ft');

    if (text.length && site.length && title.length) {

        var ad = createTextAd('sogou', title.text(),
            text.text(), site.text(), title.attr('href'));

        self.port && self.port.emit('parsed-text-ad', ad);
    } else {
        console.warn('sogouText.fail: ', text, site);
    }
}

function baiduText(anchor) {

    var title = anchor.find("a[id^='dfs']:first-child");
    var text = anchor.find("font:first-child");
    var site = anchor.find("font:last-child");

    if (text.length && site.length && title.length) {

        var ad = createTextAd('bing', title.text(),
            text.text(), site.text(), title.attr('href'));

        self.port && self.port.emit('parsed-text-ad', ad);
    } else {
        console.warn('baiduText.fail: ', text, site);
    }
}

function bingText(anchor) {

    var title = anchor.find("h2 a");
    var text = anchor.find("div.b_caption p");
    var site = anchor.find("div.b_attribution cite");

    if (text.length && site.length && title.length) {

        var ad = createTextAd('bing', title.text(),
            text.text(), site.text(), title.attr('href'));

        self.port && self.port.emit('parsed-text-ad', ad);
    } else {
        console.warn('bingText.fail: ', text, site);
    }
}

function yahooText(anchor) {

    if (anchor.text().length <= 50) { // TODO: temporary; pls fix correctly (see #188)

        console.warn('yahoo text-Ad fail: ' + anchor.text());
        return;
    }

    var title = anchor.find('div:first-child a');
    var text = anchor.find('div.abs a');
    var site = anchor.find('em a');

    if (text.length && site.length && title.length) {

        var ad = createTextAd('yahoo', title.text(),
            text.text(), site.text(), title.attr('href'));
        self.port && self.port.emit('parsed-text-ad', ad);
    } else {
        console.warn('yahooText.fail: ', anchor.text(), '(length: ' +
            anchor.text().length + ')');
    }
}

function googleText(anchor) {

    //console.log('googleText('+anchor+')');

    var title = anchor.find('h3 a'),
        text = anchor.find('.ads-creative'),
        site = anchor.find('.ads-visurl cite');


    if (text.length && site.length && title.length) {

        var ad = createTextAd('google', title.text(),
            text.text(), site.text(), title.attr('href'));

        self.port && self.port.emit('parsed-text-ad', ad);
    } else {

        console.warn('googleText.fail: ', text, site);
    }
}

function duckDuckText(anchor) {

    var title = anchor.find('h2.result__title'),
        text = anchor.find('div.result__snippet a'),
        site = anchor.find('a.result__url');

    if (text.length && site.length && title.length) {

        var ad = createTextAd('duckduckgo', title.text(),
            text.text(), site.text(), title.attr('href'));
        self.port && self.port.emit('parsed-text-ad', ad);
    } else {
        console.warn('duckDuckText.fail: ', text, site);
    }
}

function createImgAd(network, img, target) {

    return {
        network: network,
        pageUrl: document.URL,
        pageTitle: document.title,
        targetUrl: target,
        imgUrl: img
    };
}

function createTextAd(network, title, text, site, target) {

    return {
        network: network,
        pageUrl: document.URL,
        title: title,
        text: text,
        site: site,
        targetUrl: target
    };
}

/*
Try qq nested iframes with:

function getElem(selector, $root, $collection) {  // not used
    if (!$root) $root = $(document);
    if (!$collection) $collection = $();
    
    // Select all elements matching the selector under the root
    $collection = $collection.add( $root.find(selector) );
    
    // Loop through all frames
    $root.find('iframe,frame').each(function() {
        // Recursively call the function, setting "$root" to the frame's document
        getElem(selector, $(this).contents(), $collection);
    });
    
    return $collection;
}
    
// Example:
var $allImageElements = getElem('img');

AND (in package.json):

    "permissions": {
        "cross-domain-content": ["http://wa.gtimg.com/"]
    },
    
*/

/*  A utility function, for Greasemonkey scripts,
    that detects and handles AJAXed content.

    Usage example:

        waitForKeyElements($,
            "div.comments", 
            commentCallbackFunction
        );

        //--- Page-specific function to do what we want when the node is found.
        function commentCallbackFunction(jNode) {
            jNode.text("This comment changed by waitForKeyElements().");
        }
*/
// from: https://gist.github.com/BrockA/2625891

function waitForKeyElements($,

    selectorTxt,
    /* Required: The jQuery selector string that
                        specifies the desired element(s).
                    */
    actionFunction,
    /* Required: The code to run when elements are
                        found. It is passed a jNode to the matched
                        element.
                    */
    bWaitOnce,
    /* Optional: If false, will continue to scan for
                        new elements even after the first match is
                        found.
                    */
    iframeSelector
    /* Optional: If set, identifies the iframe to
                        search.
                    */
) {

    //console.log('waitForKeyElements('+iframeSelector+')');

    var targetNodes, btargetsFound;

    if (typeof iframeSelector == "undefined") {

        targetNodes = $(selectorTxt);
    }
    else {
    
        targetNodes = $(iframeSelector).contents().find(selectorTxt);
    }

    if (targetNodes && targetNodes.length > 0) {

        btargetsFound = true;

        /*  Found target node(s). Go through each and act if they are new. */
        targetNodes.each(function() {

                var jThis = $(this);
                var alreadyFound = jThis.data('alreadyFound') || false;

                if (!alreadyFound) {

                    //--- Call the payload function.
                    var cancelFound = actionFunction(jThis);
                    if (cancelFound)
                        btargetsFound = false;
                    else
                        jThis.data('alreadyFound', true);
                }
            });
    } else {

        btargetsFound = false;
    }

    //--- Get the timer-control variable for this selector.
    var controlObj = waitForKeyElements.controlObj || {};
    var controlKey = selectorTxt.replace(/[^\w]/g, "_");
    var timeControl = controlObj[controlKey];

    //--- Now set or clear the timer as appropriate.
    if (btargetsFound && bWaitOnce && timeControl) {

        //--- The only condition where we need to clear the timer.
        clearInterval(timeControl);
        delete controlObj[controlKey];
    } else {

        //--- Set a timer, if needed.
        if (!timeControl) {
            timeControl = setInterval(function() {
                    waitForKeyElements($,
                        selectorTxt,
                        actionFunction,
                        bWaitOnce,
                        iframeSelector);
                },
                300);
            controlObj[controlKey] = timeControl;
        }
    }

    waitForKeyElements.controlObj = controlObj;
}

function findSelectorByName(name) {

    for (var i = 0; i < admatchers.length; i++) {
        if (admatchers[i].name === name)
            return admatchers[i];
    }
}

function checkElemHideABP() {

    //console.log("Checking: "+$(this).prop("tagName")+ " :: "+$(this).css("-moz-binding"));

    return ($(this).css("-moz-binding").indexOf("url(\"about:abp-elemhidehit?") === 0);
}
    
if (typeof module == 'undefined' || !module.exports) {

    $(function() { // page-is-ready

            
            // check top frame elements
            $("*").filter(checkElemHideABP).each(function(e) {
                runFilters(this);
            });

            // check iframe elements
            $("iframe").each(function() {
            
                var eles = $(this).contents().find("*").filter(checkElemHideABP);
                for(var i=0, len=eles.length; i<len; i++)
                    runFilters(eles[i], this); // pass the iframe
            });
        });
    
} else { // in Node

    module.exports['getMatcher'] = findSelectorByName;
}

function checkDomain(elemDom, pageDom, name) {

    var result = true;
    
    if (elemDom && pageDom) {
        
        result = (typeof elemDom === 'string') ? 
            (elemDom === pageDom) : elemDom.test(pageDom);
    }
    
    // if (!result) console.log("DOMAIN-CHECK-FAIL: "+name + " -> "+ pageDom);
        
    return result;
}

function runFilters(element, parentFrame) {

    //console.log('runFilters: '+$(this).attr('id'), parentFrame);
    
    var doc = document, domain = doc ? doc.domain : null;
     
    for (var i = 0; i < admatchers.length; i++) {

        var data = admatchers[i], 
            waitSel = data.selector + ' ' + data.waitfor;

        if (checkDomain(data.domain, domain, data.name) && $(element).is(data.selector)) {

            console.log('ELEMHIDE-HIT: ' + data.selector + ' waiting-for -> ' + waitSel + ' (iframe: ' +
                 (typeof parentFrame != 'undefined')+', domain: '+domain+') '+(parentFrame ? $(parentFrame).prop("tagName") : 'null'));

            try {
                waitForKeyElements($, waitSel, data.handler, true, parentFrame);
            } 
            catch (e) {

                //console.warn('failed processing text-ad', data);
                throw e;
            }
        }
    }
}