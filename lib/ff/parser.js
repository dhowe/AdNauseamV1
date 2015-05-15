// Parts of this class adapted from Add-Art (https://github.com/slambert/Add-Art)

/*global Services */

const { Cc, Ci, Cu } = require("chrome");
const File = require("sdk/io/file");
const Data = require("sdk/self").data;

const AdVisitor = require("./visitor").AdVisitor;
const Logger = require("./logger").Logger;
const Options = require("./options").Options;
const Util = require("./adnutil").AdnUtil;

const SerializeInterval = 10000;
const LinkCheckRE = /^(https?):\/\/(((([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;

Cu.import("resource://gre/modules/Services.jsm");
    
var AdParser = require('sdk/core/heritage').Class({

        count: 0,
        adlist: [],
        visitor: null,
        pageMap: {},
        tabWorker: null,
        elemHideMap: {},
        needsWrite: false,
        lastWrite: 0,

        urlIgnoresRE: /^(mailto|resource|javascript|about):/i,

        // ignore adchoices
        imageIgnores: [ 'http://pagead2.googlesyndication.com/pagead/images/ad_choices_en.png' ],

        // block ABP-blocked scripts from these page domains (either regex or string ok)
        blockablePageDomains: [ 'www.webpronews.com' ],
        
        initialize: function(comp) {

            //require('./adnutil').AdnUtil.log('AdParser()');
            
            // load pre-existing ad array here if we have one
            this.doImport(require("sdk/simple-storage").storage.adlist);

            // start with ids beyond the previous max 
            this.count = Math.max(0, 1 + (Math.max.apply(Math, this.adlist.map(function(ad) {
                                return ad.id;
                            }))));

            this.handleTestOptions();

            this.visitor = AdVisitor(this);
            this.logStats();
            
            //require('./adnutil').AdnUtil.log('AdParser() done');
        },

        /*
         *  RUN FROM WITHIN ADBLOCK ***
         *  Return false if the node SHOULD be blocked
         */
        handleAd: function(wnd, node, type, loc, collapse, abpResult) {

            var uiMan = require("./uiman").UIManager,
                parentUrl = wnd.top.document.URL,
                currentTitle = wnd.top.document.title,
                tag, rNode;

            if (currentTitle.length && this.getTitle(parentUrl) === 'Pending') { // re-check

                Logger.warn("Title-mismatch: " + currentTitle + " != " + this.getTitle(parentUrl));
                // should reset pageMap[page].title = currentTitle ? // TODO
            }

            if (type === this.elemHide) {

                this.handleHiddenElement(parentUrl, loc.selector);
                return abpResult;
            }

            //Logger.log("pre-find: "+node.tagName+' :: '+loc.spec);

            rNode = this.findAdNode(node);

            if (!rNode || typeof rNode.wrappedJSObject == 'function') {

                if (!abpResult)
                    Util.log('ABP-blocked Function:\n\t\t\t' + loc.spec);

                return abpResult;
                //return Ci.nsIContentPolicy.ACCEPT;
            }

            tag = rNode.tagName;

            //Logger.log("post-find: "+tag+' :: '+loc.spec+' :: '+type);//+' '+newNode._width+'x'+newNode._height);

            if (!/^(A|IMG|IFRAME|LINK)$/.test(tag)) {

                // Note: can't walkDOM for iframe here as it may not be loaded yet

                if (rNode.hasChildNodes()) {

                    //Util.log('DOMWALK('+tag+')', loc.spec);
                    rNode = this.walkDOM(rNode, 'A');
                }

                if (rNode) tag = rNode.tagName;
            }

            if (tag === 'A') {

                if (!this.handleAnchor(rNode, loc.spec, parentUrl, currentTitle))
                    Util.log('Failed Anchor!\n\t\t\t' + loc.spec);
                
            } else {

                if (tag === 'IFRAME') {

                    if (!abpResult)
                        Util.log("ALLOW: ABP-blocked IFRAME src=" +rNode.getAttribute("src") + "("+loc.host+")" );
                              
                    return Ci.nsIContentPolicy.ACCEPT; // testing allow all
 
                } else if (tag !== 'IMG' && tag !== 'LINK') {
                
                    Logger.warn('ALLOW: UNHANDLED TAG=' + tag +' '+(loc ? loc.spec : 'no url'));
                         
                    return Ci.nsIContentPolicy.ACCEPT;
                }
            }

            return abpResult;
        },

        handleAnchor: function(rNode, imgUrl, pageUrl, pageTitle) {

            var link = rNode.getAttribute("href"),
                tries = 0;

            // check our ignore lists
            if (this.imageIgnores.indexOf(imgUrl) > -1) {
            
                Util.log('Ignoring(imageIgnores): '+imgUrl);
                return;
            }

            while (!this.validateLink(link)) {

                if (!/^https?/i.test(link)) {

                    Logger.log("Relative Ad-target URL! -> " + link, imgUrl, pageUrl);

                    var parts = pageUrl.split('/'),
                        absolute = parts[0] + '//' + parts[2],
                        rellink = absolute + link;

                    if (link !== rellink) {

                        link = rellink;

                        Logger.log("  ** trying:  " + rellink);

                        // don't follow more than 5 relative redirects
                        if (++tries >= 5) {

                            Logger.warn("*** (Hit max-redirects-tries) Invalid target! -> " + link);
                            return;
                        }

                        continue; // retry
                    }
                }

                Logger.warn("Invalid ad target! -> " + link);

                return;
            }

            return this.makeAd(++this.count, pageTitle, pageUrl, link, { src: imgUrl });
        },
        
        // ignore scripts unless domain is listed in parser as blockable
        handleScript: function(wnd, loc, abpResult) {
    
            var blockDomain, domain = wnd.top.document.domain;
    
            blockDomain = (this.blockablePageDomains.some(function(re) {
                  
                return (typeof re == 'object') ? re.test(domain) : re === domain;
            }));
            
            if (!abpResult && blockDomain) {
            
                require('./adnutil').AdnUtil.log("[BLOCK] SCRIPT src=" +loc.spec + "("+ domain+")" );
                return abpResult;
            }
                 
            return Ci.nsIContentPolicy.ACCEPT;
        },
    
        isImage: function(url) { // remove, not used

            return /\.(jpg|png|gif|ico)(\?|$|#)/i.test(url);
        },
        
        onAttach: function(tab) {

            var page = tab.url,
                title = tab.title;
                
            if (!title || !title.length)
                Util.warn("NO TITLE FOR(title=" + title + "): " + page);
            
            Util.log("PAGE: " + page);// + " ("+domain+")");

            // always reset the pageMap entry here (including pointers)
            this.pageMapRemove(page);

            this.pageMap[page] = {

                page: page,
                title: title,
                ads: []
            };
            
            require("./uiman").UIManager.updateBadge();
        },

        logStats: function() {

            Logger.log('AdParser: ' + this.adlist.length +
                ' ads (' + this.pendingAds().length +
                ' pending, ' + this.failedAds().length + ' failed)');
        },

        handleHiddenElement: function(url, selector) {

            if (!this.elemHideMap[url]) { // first hidden element for page

                var me = this,
                    tab = Util.findTab(url);

                if (!tab) {
                    throw new Error("parser.handleHiddenElement: no tab " + 
                        " for selector:   " + selector + "\nt\t\tON " + url);
                }

                this.tabWorker = tab.attach({

                        contentScriptFile: [
                            Data.url("lib/jquery-1.11.2.min.js"), // ?
                            Data.url("elemhide.js")
                        ]
                    });

                this.tabWorker.port.on("parsed-img-ad", function(ad) {
                                        
                        me.makeAd(++me.count, ad.pageTitle, ad.pageUrl, ad.targetUrl, { src : ad.imgUrl });
                    });

                this.tabWorker.port.on("parsed-text-ad", function(ad) {

                        me.makeAd(++me.count, me.getTitle(url), url, ad.targetUrl, {
                                text: ad.text,
                                site: ad.site,
                                network: ad.network
                            }, ad.title);
                    });

                this.elemHideMap[url] = [];
            }

            if (this.elemHideMap[url].indexOf(selector) < 0) { // if (array-contains)

                Util.log("ElemHide: " + selector);

                this.elemHideMap[url].push(selector);
            }
        },

        typeStr: function(t) {

            // 'type'-constants: 
            // https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIContentPolicy

            var T = [];
            T[0] = 'UNKNOWN';
            T[1] = 'OTHER';
            T[2] = 'SCRIPT';
            T[3] = 'IMAGE';
            T[4] = 'STYLESHEET';
            T[5] = 'OBJECT';
            T[6] = 'DOCUMENT';
            T[7] = 'SUBDOCUMENT';
            T[8] = 'REFRESH';
            T[9] = 'XBL';
            T[10] = 'PING';
            T[11] = 'XMLHTTPREQUEST';
            T[12] = 'OBJECT_SUBREQUEST';
            T[13] = 'DTD';
            T[14] = 'FONT';
            T[15] = 'MEDIA';
            T[16] = 'WEBSOCKET';
            T[17] = 'CSP_REPORT';
            T[18] = 'XSLT';
            T[19] = 'BEACON';
            T[65533] = 'REJECT_SERVER';
            T[65534] = 'REJECT_TYPE';
            T[65535] = 'REJECT_REQUEST';
            return '[' + ((t > 0 && t < T.length) ? T[t] : T[0] + ':' + t) + '] ';
        },

        walkDOM: function(n, tag) {

            do {

                if (n.tagName === tag)
                    return n;

                if (n.hasChildNodes())
                    return this.walkDOM(n.firstChild, tag);

            } while ((n = n.nextSibling));
        },

        searchDOM: function(node, tag) { // ugly, but faster?

            //require('./adnutil').AdnUtil.log("searchDOM: "+node.tagName);
            var ch = node;
            while (ch) {

                if (ch.tagName === tag) return ch;

                // if node has children, get the first child
                if (ch.children.length > 0) {

                    ch = ch.firstElementChild;

                    // if node has silbing, get the sibling
                } else if (ch.nextElementSibling) {

                    ch = ch.nextElementSibling;

                    // if neither, go up until node has a sibling and get that sibling
                } else {

                    do {
                        ch = ch.parentNode;

                        //if we are back at document.body, return!
                        if (ch === node) return;

                    } while (!ch.nextElementSibling);

                    ch = ch.nextElementSibling;
                }
            }
        },

        serializeAdlist: function(now) {

            // check if we have new data and its time for another disk-write
            if (this.needsWrite && (now - this.lastWrite) > SerializeInterval) {

                this.needsWrite = false;
                this.saveAdlist();
                this.lastWrite = now;
            }
        },

        getAds: function() {

            return this.adlist;
        },

        findById: function(id) {

            for (var i = 0, j = this.adlist.length; i < j; i++) {

                if (this.adlist[i].id === id)
                    return this.adlist[i];
            }

            Logger.err('No ad for id: ' + id);
        },

        getTitle: function(page) {

            var entry = this.pageMapLookup(page);
            return entry ? entry.title : 'Pending';
        },

        pageMapLookup: function(url) {

            if (!url) return null;
            
            var res = this.pageMap[url];
            if (res && res.parent) { // is it a pointer?

                res = this.pageMap[res.parent];
            }
            
            if (!res) {
            
                var keys = Object.keys(this.pageMap);
                
                for (var i=0,len=keys.length; i<len; i++) {
                
                    // No page-map entry, fix to return partial-match per gh311
                    if (url.startsWith(keys[i])) {
                    
                        Logger.warn('No page-entry for: '+url+"\n\t*** Using partial-match: "+keys[i]);
                        
                        res = this.pageMapLookup(keys[i]);
                        break;
                    }
                }
            
            }
            return res;
        },

        pageMapRemove: function(url) { 
        
            var pmap = this.pageMap;

            Object.keys(pmap).forEach(function(key) {

                    var entry = pmap[key];
                    if (entry && entry.parent && entry.parent == url)                     
                        pmap[key] = null;
                });

            this.pageMap[url] = null;
        },

        validateLink: function(s) {

            return (s === '#') || LinkCheckRE.test(s);
        },


        makeAd: function(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle) {

            var ad = new Ad(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle),
                pageMapEntry = this.pageMapLookup(pageUrl), 
                uiman = require("./uiman").UIManager;

            if (!pageMapEntry) {

                Logger.warn("No entry for: " + pageUrl + "\n\t\tKeys: " + Object.keys(this.pageMap));
                return;
            }

            // add to data-structures
            pageMapEntry.ads.push(ad); 

            this.adlist.push(ad);

            Logger.log(ad.contentType === 'text' ?
                "TEXT-AD: #" + ad.id + " " + ad.contentData.text.trim() :
                "FOUND-AD: #" + ad.id + " " + ad.contentData.src.trim());

            uiman.updateOnAdFound(ad);

            return ad;
        },
        
        checkableParent: function(adNode) {

            return adNode.parentNode &&
            (adNode.parentNode.tagName == 'A' ||
                adNode.parentNode.tagName == 'OBJECT' ||
                adNode.parentNode.tagName == 'IFRAME' ||
                (adNode.hasAttribute && adNode.hasAttribute('onclick')));
        },

        findAdNode: function(node) {

            var adNode = node;

            while (this.checkableParent(adNode))
                adNode = adNode.parentNode;

            return adNode;
        },
        
        checkVersion: function(num) { 

            var curentBrowserVersion = Services.appinfo.platformVersion; //example: '31.*'
            return (Services.vc.compare(curentBrowserVersion, num) < 0) ? false : true;
        },

        restart: function() {

            this.saveAdlist();
            this.visitor.restart(this.pageMap = {});
        },

        saveAdlist: function() {

            Logger.log('PARSER: serializing ad-data (' + this.adlist.length + ' ads)');

            require("sdk/simple-storage").storage.adlist = this.adlist;
        },

        deleteAd: function(id) { // take id[] as well?

            //Logger.log('PARSER: delete ad#' + id);

            var ok = false;

            this.visitor.currentAd = null;

            for (var i = 0; i < this.adlist.length; i++) {

                if (this.adlist[i].id === id) {

                    this.adlist.splice(i, 1); // remove item
                    
                    Logger.log('PARSER: deleted #' + id);
                    
                    ok = true;
                    break;
                }
            }

            this.saveAdlist();

            return ok;
        },

        doImport: function(ads) {

            if (!ads) return (this.adlist = []);

            if (Util.is(ads, Util.O)) { // old-style ads

                ads = Util.toAdArray(ads);

                var ok = [];

                for (var i = 0, j = ads.length; i < j; i++) {

                    var ad = ads[i];

                    if (Util.is(ad.contentData, Util.S))
                        ads[i].contentData = {
                            src: ad.contentData
                    };

                    if (!ad.contentType || ad.contentType !== 'text')
                        ad.contentType = 'img';

                    if (!ad.pageTitle) ad.pageTitle = 'Unknown';

                    if (/adview.html$/.test(ad.pageUrl)) {
                        require('./adnutil').AdnUtil.log('Skipping ad#' + ad.id + ' pageUrl=' + ad.pageUrl);
                        continue;
                    }

                    if (!/^http/.test(ad.targetUrl)) {
                        require('./adnutil').AdnUtil.log('Skipping ad#' + ad.id + ' targetUrl=' + ad.targetUrl);
                        continue;
                    }

                    ok.push(ad);
                }

                ads = ok;
                Logger.log("PARSER: Converted " + ads.length + " Ads");
            }

            if (!Util.is(ads, Util.A)) {

                Logger.warn("PARSER: Import failed!!! Re-init...\n\t\tAds: ", ads);
                ads = [];
            }

            this.adlist = ads;
        },


        clearAds: function() {

            this.adlist = [];
            this.pageMap = {};
            this.visitor.currentAd = null;

            var adl = require("sdk/simple-storage").storage.adlist,
                keys = Object.keys(adl);

            // not sure if these deletes are needed
            for (var i = 0, j = keys.length; i < j; i++)
                delete adl[keys[i]];

            this.saveAdlist();

            Logger.log("Ads cleared");
        },

        stop: function() {

            this.visitor && (this.visitor.stop());
            this.saveAdlist();
            this.elemHideMap = {};
            this.pageMap = {};
        },

        pause: function() {

            this.visitor && (this.visitor.pause());
        },

        unpause: function() {

            this.visitor && (this.visitor.unpause());
        },

        pendingAds: function() {
            return this.adlist.filter(function(a) {
                    return a.visitedTs === 0;
                });
        },

        visitedAds: function() {
            return this.adlist.filter(function(a) {
                    return a.visitedTs > 0;
                });
        },

        failedAds: function() {
            return this.adlist.filter(function(a) {
                    return a.visitedTs < 0;
                });
        },

        isAdnWorker: function(win) {

            var cHandler;
            if (win) cHandler = win.QueryInterface(Ci.nsIInterfaceRequestor)
                    .getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell)
                    .chromeEventHandler;

            return (cHandler && cHandler.hasAttribute("ADN"));
        },

        handleTestOptions: function() {

            // TMP: FOR TESTING UPDATES ONLY =============================================
            if (require('../config').PARSER_TEST_MODE === 'update') {

                var ads = this.adslist || [];

                for (var i = 0, j = ads.length; i < j; i++) {

                    ads[i].attempts = 0;
                    ads[i].visitedTs = 0;
                    ads[i].title = '*TEST* (pending)';
                    ads[i].resolvedTargetUrl = null;

                    Util.warn('*TEST* resetting ad#' + ads[i].id);
                }
            } else if (require('../config').PARSER_TEST_MODE) {

                Util.warn('*TEST* clearing stored ads');

                this.pageMap = {};
                this.adlist = [];
            }
        }
    });

// Ad class

function Ad(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle) {

    this.id = adId;
    this.title = 'Pending';
    this.attempts = 0;
    this.visitedTs = 0;
    this.foundTs = +new Date();
    this.contentData = contentData;
    this.contentType = adTitle ? 'text' : 'img';
    this.targetUrl = targetUrl;
    this.pageTitle = pageTitle;
    this.pageUrl = pageUrl;
    this.resolvedTargetUrl;
    this.errors = [];
    this.path = []; // redirects

    if (this.contentType === 'text') {

        this.title = adTitle;
        this.contentType = 'text';
    }
}

exports.AdParser = AdParser;