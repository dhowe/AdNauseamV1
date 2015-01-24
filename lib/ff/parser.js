// Much of this class adapted from Add-Art (https://github.com/slambert/Add-Art)

const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const Data = require("sdk/self").data;
const File = require("sdk/io/file");

const AdVisitor = require("./visitor").AdVisitor;
const Logger = require("./logger").Logger;
const Options = require("./options").Options;
const Util = require("./adnutil").AdnUtil;

const SerializeInterval = 120000;
const LinkCheckRE = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;

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
	 
    ignoreRE :  /^(mailto|resource|javascript|about):/i, 

	initialize : function(comp) {
console.log('parser.init');
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
            
        // always reset the pageMap entry here 
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
                    Data.url("lib/jquery-1.10.2.min.js"), 
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
	        
            console.log("ElemHide: "+selector);
            
            this.elemHideMap[url].push(selector);
        }
	},

	/*
     *  RUN FROM WITHIN ADBLOCK ***
     *  Return false if the node SHOULD be blocked (accept=false) 
	 *  'type'-constants here: https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIContentPolicy
	 */
    handleAd : function(wnd, node, type, loc, collapse, abpResult) {

        var parentUrl = wnd.wrappedJSObject.document.URL, 
            uiMan = require("./uiman").UIManager,
            currentTitle =  wnd.wrappedJSObject.document.title;

        if (currentTitle.length && this.getTitle(parentUrl) === 'Pending') { // re-check
            
            console.log("Title-mismatch: "+currentTitle+" != "+this.getTitle(parentUrl));
            // should reset  pageMap[page].title = currentTitle  // TODO
        }
            
            
		if (type === this.elemHide) {
		    
            this.handleHiddenElement(parentUrl, loc.selector);
            return abpResult;
        }
 
        var rNode = this.findAdNode(node);
        
        if (!rNode || !rNode.parentNode || typeof rNode.wrappedJSObject == 'function')
        	return abpResult;

		var link = 'unknown', tag = rNode.tagName.toLowerCase();
		
		//Logger.log("TRANSFORMED: "+tag+' :: '+loc.spec+' :: '+type+' '+newNode._width+'x'+newNode._height);
	     
        if (tag === 'a') {  // TODO: DEAL WITH OTHER TAGS
        	
        	link = rNode.getAttribute("href");
        	
        	if (!this.ignoreRE.test(link)) {
                
                 // DCH: changed parentUrl -> currentUrl 11/11/14 -> changed back 1/3/15
	        	 this.createAd(rNode, loc.spec/*image-url*/, parentUrl/* page-url*/, currentTitle);
			}
        }
       	else {
       		
       		if (0 && tag !== 'img' && tag !== 'link')
        	   Logger.log('UNHANDLED('+tfag.toUpperCase()+"): "+(loc ? loc.spec : 'no url!'));
       	}
       	
        return abpResult; 
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
        
        var entry = this.pageMap[page];
        return entry ? entry.title : 'Pending';
    },
                
	validateLink : function(s) {
		
      return (s === '#') || LinkCheckRE.test(s);
   	},
    
	createAd : function(rNode, theUrl, pageUrl, pageTitle) {

		var link = rNode.getAttribute("href"), tries = 0;
		
		while (!this.validateLink(link)) { 
			
			if (!/^http/i.test(link)) {
				
				Logger.log("Relative Ad-target URL! -> "+link, theUrl, pageUrl);
				
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

		return this.makeAd(++this.count, pageTitle, pageUrl, link, { src: theUrl });
	},
    
    makeAd : function(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle) {
        
        var ad = new Ad(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle);
                
        if (!this.pageMap[pageUrl])
            throw Error("No entry for: "+pageUrl+"\n\t\t"+Object.keys(this.pageMap));
            
        // Add to data-structures
        this.pageMap[pageUrl].ads.push(ad);
        this.adlist.push(ad);

        if (ad.contentType === 'text')
            Logger.log("TEXT-AD: #"+ad.id+"/"+this.adlist.length+" "+ad.targetUrl);
        else
            Logger.log("FOUND-AD: #"+ad.id+"/"+this.adlist.length+" "+ad.contentData.src);
                        
        require("./uiman").UIManager.updateOnAdFound(ad);
        
        return ad;
    }, 

	findAdNode : function(node) {

        var adNode = node;

        while (adNode.parentNode && (
        	adNode.parentNode.tagName == 'A' ||
			adNode.parentNode.tagName == 'OBJECT' ||
            adNode.parentNode.tagName == 'IFRAME' ||
            (adNode.hasAttribute && adNode.hasAttribute('onclick')))) 
		{    
            adNode = adNode.parentNode;
        }
            
        return adNode;
    },
	
	restart : function() {
		
		this.saveAdlist();
		this.visitor.restart(this.pageMap = {}); 
	},
	
	saveAdlist : function() {

		Logger.log('PARSER: serializing ad-data ('
		  + this.adlist.length+' ads) at ' + new Date());
		
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
                    console.log('Skipping ad#'+ad.id+' pageUrl='+ad.pageUrl);
                    continue;
                }
                    
                if (!/^http/.test(ad.targetUrl)) {
                    console.log('Skipping ad#'+ad.id+' targetUrl='+ad.targetUrl);
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
