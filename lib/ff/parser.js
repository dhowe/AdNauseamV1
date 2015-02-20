// Parts of this class adapted from Add-Art (https://github.com/slambert/Add-Art)

const File = require("sdk/io/file");
const Data = require("sdk/self").data;
const Cc = require("chrome").Cc, Ci = require("chrome").Ci;

const AdVisitor = require("./visitor").AdVisitor;
const Logger = require("./logger").Logger;
const Options = require("./options").Options;
const Util = require("./adnutil").AdnUtil;

const SerializeInterval = 120000;
const LinkCheckRE = /^(https?):\/\/(((([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\[|\]|\.|_|\||~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;

var AdParser =  require('sdk/core/heritage').Class({

	count : 0,
	adlist : [],
    visitor : null,
	pageMap : {},
	tabWorker : null,
    component : null,
	elemHideMap : {},
	needsWrite : false,
	lastWrite : 0,
	 
    urlIgnoresRE :  /^(mailto|resource|javascript|about):/i,
    
    // ignore adchoices
    imageIgnores :  [ 'http://pagead2.googlesyndication.com/pagead/images/ad_choices_en.png' ],

	initialize : function(comp) {

		// load pre-existing ad array here if we have one
		this.doImport(require("sdk/simple-storage").storage.adlist);

		// start with ids beyond the previous max 
		this.count = Math.max(1, 1+(Math.max.apply
            (Math, this.adlist.map(function(ad) { return ad.id; }))));
		
		this.handleTestOptions();
		
		this.component = comp;
		this.visitor = AdVisitor(this);
		this.logStats();
	},
    
    onAttach : function(tab) { 
        
        var page = tab.url, title = tab.title;
        
        if (!title || !title.length)
            console.warn("NO TITLE FOR(title="+title+"): "+page);
            
        Util.log("PAGE: "+page);
        
        // always reset the pageMap entry here 
        this.pageMapRemove(page);
        this.pageMap[page] = { page: page, title: title, ads: [] };        
    },
    
	logStats : function() {
	    
		Logger.log('AdParser: '+
			+ this.adlist.length+' ads ('
			+ this.pendingAds().length+' pending, '
			+ this.failedAds().length+' failed)');
	},
	
	handleHiddenElement : function(url, selector) {
	            	     
	    if (!this.elemHideMap[url]) { // first hidden element for page
	        
	        var me = this, tab = Util.findTab(url);
	        
	        if (!tab) {
	           throw new Error("parser.handleHiddenElement: no tab "
	               + " for selector:   "+selector+"\nt\t\tON "+url);
            }
	           
	        tabWorker = tab.attach({
	            
                contentScriptFile: [ 
                    Data.url("lib/jquery-1.11.2.min.js"), 
                    Data.url("elemhide.js")
                ]
            });
            
            tabWorker.port.on("parsed-text-ad", function(ad) {

                me.makeAd(++me.count, me.getTitle(url), url, ad.targetUrl, 
                    { text: ad.text, site: ad.site, network: ad.network }, ad.title);                        
            });
            
            this.elemHideMap[url] = [];
        }
	    
	    if (this.elemHideMap[url].indexOf(selector) < 0) { // if (array-contains)
	        
            Logger.log("ElemHide: "+selector);
            
            this.elemHideMap[url].push(selector);
        }
	},

	/*
     *  RUN FROM WITHIN ADBLOCK ***
     *  Return false if the node SHOULD be blocked (accept=false) 
	 *  'type'-constants here: https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIContentPolicy
	 */
    handleAd : function(wnd, node, type, loc, collapse, abpResult) {

        var uiMan = require("./uiman").UIManager,
            parentUrl = wnd.top.document.URL, tag, rNode, 
            currentTitle = wnd.top.document.title;

        if (currentTitle.length && this.getTitle(parentUrl) === 'Pending') { // re-check
            
            Logger.warn("Title-mismatch: "+currentTitle+" != "+this.getTitle(parentUrl));
            // should reset pageMap[page].title = currentTitle  // TODO
        }
            
		if (type === this.elemHide) {
		    
            this.handleHiddenElement(parentUrl, loc.selector);
            return abpResult;
        }

        //Logger.log("pre-find: "+node.tagName+' :: '+loc.spec);
 
        rNode = this.findAdNode(node);
        
        if (!rNode || /*!rNode.parentNode ||*/ typeof rNode.wrappedJSObject == 'function') {
                
        	return abpResult;
        }
        
        //if (!rNode.parentNode) Logger.warn("no parent-node for rNode!!!"); // TODO: is this needed above?

		tag = rNode.tagName;

		//Logger.log("post-find: "+tag+' :: '+loc.spec+' :: '+type);//+' '+newNode._width+'x'+newNode._height);
	    
	    if (!/^(A|IMG|IFRAME|LINK)$/.test(tag)) {
	        
	         // Note: can't walkDOM for iframe here as it may not be loaded yet

            if (rNode.hasChildNodes()) {
                
               Util.log('DOMWALK('+tag+')', loc.spec);
	           rNode = this.walkDOM(rNode, 'A');
            }	   
                 
            if (rNode) tag = rNode.tagName;
	    }
	    
        if (tag === 'A') {

            this.handleAnchor(rNode, loc.spec, parentUrl, currentTitle);
        }
       	else {
       		
       		if (tag === 'IFRAME') {
       		   Util.log('IFRAME: '+loc.spec);
               //rNode.addEventListener("load", function(){ console.log("LOADED1 IFRAME!") }, false);
            }
       		else if (tag !== 'IMG' && tag !== 'LINK')
        	   Logger.warn('UNHANDLED('+tag+"): "+(loc ? loc.spec : 'no url!'));
       	}
       	
        return abpResult; 
	},
	
    walkDOM : function(n, tag) {
        
        do {
            
            if (n.tagName === tag)
                return n;
            
            if (n.hasChildNodes())    
                return this.walkDOM(n.firstChild, tag);
                
        } while (n = n.nextSibling);
    },    
            
	searchDOM : function(node, tag) { // ugly, but faster?
	    
	    //console.log("searchDOM: "+node.tagName);
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

	serializeAdlist : function(now) {

        // check if we have new data and its time for another disk-write
        if (this.needsWrite && (now - this.lastWrite) > SerializeInterval) { 
            
            this.needsWrite = false;
            this.saveAdlist();
            this.lastWrite = now;
        }   
    },
    
    getAds : function() {
        
        return this.adlist;
    },
    
    findById : function(id) {
        
        for (var i = 0, j = this.adlist.length; i < j; i++) {
            
            if (this.adlist[i].id === id)
                return this.adlist[i];
        }

        Logger.err('No ad for id: '+id);
    },
    
    getTitle : function(page) {
        
        var entry = this.pageMapLookup(page);
        return entry ? entry.title : 'Pending';
    },

    pageMapLookup : function(url) {

        var res = this.pageMap[url];
        if (res && res.parent) { // is it a pointer?
            
            return this.pageMap[res.parent];
            //return this.pageMapLookup(res.parent);
        }
        return res;
    },
    
    pageMapRemove : function(url) {
        
        var pmap = this.pageMap;
        
        Object.keys(pmap).forEach(function(key) {
            
            var entry = pmap[key];
            if (entry && entry.parent && entry.parent == url)
                pmap[key] = null;
        });
        
        this.pageMap[url] = null;
    },
    
	validateLink : function(s) {
		
      return (s === '#') || LinkCheckRE.test(s);
   	},
    
	handleAnchor : function(rNode, imgUrl, pageUrl, pageTitle) {

		var link = rNode.getAttribute("href"), tries = 0;

        // check our ignore lists
        if (!/^https?:/.test(link) || this.imageIgnores.indexOf(imgUrl) > -1)
            return null;

		while (!this.validateLink(link)) { 
			
			if (!/^http/i.test(link)) {
				
				Logger.log("Relative Ad-target URL! -> "+link, imgUrl, pageUrl);
				
				var parts = pageUrl.split('/'),
					absolute = parts[0]+'//'+parts[2],
					rellink = absolute + link;
					
				if (link !== rellink) {
					
					link = rellink;
					
					Logger.log("  ** trying:  "+rellink);
					
                    // don't follow more than 5 relative redirects
					if (++tries >= 5) {
					    
                        Logger.warn("*** (Hit max-redirects-tries) Invalid target! -> "+link);
                        return null;
                    }
					
					continue; // retry
				}
			}
			
			Logger.warn("Invalid ad target! -> "+link);
			
			return null;
		}

		return this.makeAd(++this.count, pageTitle, pageUrl, link, { src: imgUrl });
	},
    
    makeAd : function(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle) {
        
        var ad = new Ad(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle),
            pageMapEntry = this.pageMapLookup(pageUrl);

        if (!pageMapEntry) {
            
            Logger.warn("No entry for: "+pageUrl+"\n\t\tKeys: "+Object.keys(this.pageMap));
            return;
        }
            
        // add to data-structures
        pageMapEntry.ads.push(ad);
        this.adlist.push(ad);

        Logger.log(ad.contentType === 'text' ?
            "TEXT-AD: #"+ad.id+" "+ad.contentData.text :
            "FOUND-AD: #"+ad.id+" "+ad.contentData.src);
                        
        require("./uiman").UIManager.updateOnAdFound(ad);
        
        return ad;
    }, 

    checkableParent : function(adNode) {
        return adNode.parentNode &&
            (adNode.parentNode.tagName == 'A' ||
             adNode.parentNode.tagName == 'OBJECT' ||
             adNode.parentNode.tagName == 'IFRAME' ||
             (adNode.hasAttribute && adNode.hasAttribute('onclick')));
    },

	findAdNode : function(node) {

        var adNode = node;

        while (this.checkableParent(adNode))
            adNode = adNode.parentNode;
            
        return adNode;
    },
	
	restart : function() {
		
		this.saveAdlist();
		this.visitor.restart(this.pageMap = {}); 
	},
	
	saveAdlist : function() {

		Logger.log('PARSER: serializing ad-data ('+ this.adlist.length+' ads)');
		
		require("sdk/simple-storage").storage.adlist = this.adlist;
	},

    doImport : function(ads) { 
               
        if (!ads) return this.adlist = [];
        
        if (Util.is(ads, Util.O)) { // old-style ads
            
            ads = Util.toAdArray(ads), ok = [];
            
            for (var i=0,j=ads.length; i<j; i++) {

                var ad = ads[i];
                
                if (Util.is(ad.contentData, Util.S))
                    ads[i].contentData = { src : ad.contentData };
                
                if (!ad.contentType || ad.contentType !== 'text')
                    ad.contentType = 'img';
                    
                if (!ad.pageTitle) ad.pageTitle = 'Unknown';
                
                if (/adview.html$/.test(ad.pageUrl)) {
                    require('./adnutil').AdnUtil.log('Skipping ad#'+ad.id+' pageUrl='+ad.pageUrl);
                    continue;
                }
                    
                if (!/^http/.test(ad.targetUrl)) {
                    require('./adnutil').AdnUtil.log('Skipping ad#'+ad.id+' targetUrl='+ad.targetUrl);
                    continue;   
                }
                    
                ok.push(ad);
            }
            
            ads = ok;
            Logger.log("PARSER: Converted "+ads.length + " Ads");
        }
        
        if (!Util.is(ads, Util.A)) {
            
            Logger.warn("PARSER: Import failed!!! Re-init...\n\t\tAds: ",ads);
            ads = [];
        }
          
        this.adlist = ads;
    },
    
    
	clearAds : function() {
		
		this.adlist = [];
		this.pageMap = {};
		this.visitor.currentAd = null;
		
		var adl = require("sdk/simple-storage").storage.adlist,
			keys = Object.keys(adl);
		
		// not sure if these deletes are needed
		for (var i = 0, j = keys.length; i < j; i++)
			delete adl[keys[i]];
		delete adl; 
		
		this.saveAdlist();
		
		Logger.log("Cleared all Ads");
	},
		
	stop : function() {

    	this.visitor && (this.visitor.stop());
		this.saveAdlist();
		this.elemHideMap = {};
    	this.pageMap = {};   	
    },
   
	pause : function() {
		
		this.visitor && (this.visitor.pause());
    },
    
   	unpause : function() {
   		
		this.visitor && (this.visitor.unpause());
    },

	pendingAds : function() { return this.adlist.filter(function(a) { return a.visitedTs === 0 } )},
	
	visitedAds : function() { return this.adlist.filter(function(a) { return a.visitedTs > 0 } )},
	
	failedAds : function() { return this.adlist.filter(function(a) { return a.visitedTs < 0 } )},
		
	isAdnWorker : function(win) {

		if (win) cHandler = win.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell)
			.chromeEventHandler;
			
		return (cHandler && cHandler.hasAttribute("ADN"));
	},
	
    handleTestOptions : function() {
    
        // TMP: FOR TESTING UPDATES ONLY =============================================
        if (require('../config').PARSER_TEST_MODE==='update') {

            var ads = this.adslist || [];
            
            for (var i=0, j=ads.length; i< j; i++) {
                
                ads[i].attempts = 0;
                ads[i].visitedTs = 0;
                ads[i].title = '*TEST* (pending)';
                ads[i].resolvedTargetUrl = null;
                
                console.warn('*TEST* resetting ad#'+ads[i].id);
             }
        }
        else if (require('../config').PARSER_TEST_MODE) {

            console.warn('*TEST* clearing stored ads');
            
            this.pageMap = {};
            this.adlist = [];
        }
    }
});

function Ad(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle) {

    //console.log('AD: ', pageTitle);//arguments);

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
    this.path = [];    // redirects
    
    if (this.contentType === 'text') {
        
        this.title = adTitle;
        this.contentType = 'text';
    }    
} 


 
exports.AdParser = AdParser;
