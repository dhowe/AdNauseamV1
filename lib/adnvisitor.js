const verbose = 0;

// TODO: multiple (concurrent) page-workers?

const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');
const { Cc, Ci, Cu, Cr } = require("chrome");
const { Options } = require("./adnoptions");
const { Logger } = require("./adnlogger");
const { Page } = require("./adnpage");
const timers = require("sdk/timers");

let AdVisitor = Class({

	attempts : 0,
	adLookup : null,
	currentAd : null, 
	lastVisitTs : 0,
	maxAttempts : 3,
	timeoutMs : 8000,
	extends : Unknown,
	
	initialize : function(parser) {

		this.component = parser.component;
		this.restart(parser.adlookup);

		//Logger.log("Created AdVisitor::"+this.component);				
	},
	
	pageVisited : function(options) {
		
		var url = options.url;
		if (url === 'about:blank') 
			return;
		
		if (!this.currentAd) {	
			Logger.warn("No current ad: "+url);
			return;
		}
		
		this.currentAd.path.push(url);
		this.currentAd.visited = this.markActivity()
		
		var msg = "VISITED: "+url+"\n";
		if (url != this.currentAd.target)
			msg += "               Redirected-from: "+this.currentAd.target;
			
		Logger.log(msg);
		
		if (Options.verboseNotify)
			Logger.notify(url, "Ad-Visited", this.currentAd.target, 1);		 	
	},

	pollQueue : function() {
		
		if (!Options.enabled) // disabled, no polling
			return;

		var now = +new Date();
		var elapsed = now - this.lastVisitTs;
		if (elapsed < this.timeoutMs) { // timeout
			
			this.nextPoll();
			return;
		}
			
		var next = this.checkNext();
		
		if (verbose) Logger.log("AdVisitor.pollQueue :: "+next);	
		
		if (next) {
			
			//Logger.log("NEXT :: "+next);
			
			if (this.currentAd === next) { // still not visited...
				
				Logger.log("TIMEOUT: (no visit) -> "+this.currentAd.target);

				if (++this.attempts == this.maxAttempts) {
					
					Logger.log("GIVEUP: "+this.currentAd.target);
					
					if (Options.verboseNotify)
						Logger.notify(this.currentAd.target, "Failed ("+this.maxAttempts+" attempts)", this.currentAd.target, 1);

					this.currentAd.errors.push
						('Timeout after '+this.maxAttempts+' tries');
						
					this.currentAd.visited = -1; // don't reselect
										
					// invalidate all ads with the same target 
					var ads = require("./adncomp").Component.parser.getAds();
					for (var i=0, j=ads.length; i< j; i++) {
						if (ads[i].target === next.target) {
							ads[i].visited = -1;
						}
					}
	
					this.attempts = 0;
				}
				
				this.currentAd = null;
			}
			else {
				
				if (next.target) {
					
					Logger.log("TRYING: "+next);
					
					this.currentAd = next;
					this.markActivity();
					
					this.pageWorker.contentURL = next.target; // LAUNCH REQUEST ...
		    		this.pageWorker.contentScriptOptions = { "url": next.target };
				}
			}
		}
		
		this.nextPoll();
	},
	
	nextPoll : function(t) {
		
		t = t || 1000;
		var me = this;
		timers.setTimeout(function() { me.pollQueue(); }, t);
	},

	removeAd : function(ad) {

		var ads = this.adlookup[ad.page];
		
		if (ads) {
			
			var delIdx = ads.indexOf(ad);
			
			if (delIdx > -1) {
				
				ads.splice(delIdx, 1);
				
				Logger.warn("AdVisitor failed to removeAd: \n"+
					JSON.stringify(ad,0,4)+"\nfrom: "+JSON.stringify(ads,0,4));
				
				return true;
			}
		}
		else {
			
			Logger.warn("AdVisitor.removeAd()->No ads for: "+next.page);
		}
		
		Logger.warn("AdVisitor.removeAd()->Can't remove ad: "+next);
		
		return false;
	},
	
	
	checkNext : function() {
		
		var next, keys = Object.keys(this.adlookup);
		
		for (var i = 0, j = keys.length; i < j; i++) {
			
			var ads = this.adlookup[keys[i]];
			
			for (var m=0, n = ads.length; m < n; m++) {
				
				if (ads[m].visited === 0) {
					
					return ads[m];
				}
			}
		}
		
		return null;
	},

	markActivity : function() {
		
		this.lastVisitTs = +new Date();
		return this.lastVisitTs;
	},
	
	afterLoad : function(subject, url, origUrl) {
		
		this.markActivity();
		
		if (0 && !this.isResource(url))
			Logger.log("afterLoad: "+url +"\n       ("+origUrl+")");
	},    

	beforeLoad : function(subject, url, origUrl) {
		
		var regexs = [ /^(chrome|about):/, /(itunes\.apple|appstore)\.com/i, /video/i, /(youtube|vimeo)\.com/i ];
		
		this.markActivity();
		
		//Logger.log("pre-beforeLoad: "+url +"\n       ("+origUrl+")");

		for (var i=0, j=regexs.length; i<j; i++) {
			
			if (regexs[i].test(url)) {
				
		  		return this.cancelVisit(subject, url, regexs[i].toString());
		  	}
		}
		
		if (0 && !this.isResource(url))
			Logger.log("beforeLoad: "+url +"\n       ("+origUrl+")");
    },
    
    cancelVisit : function(subject, url, msg) {
    	
    	Logger.log("Cancelled("+msg+") -> "+url);
    	
    	if (this.currentAd)
    		this.currentAd.errors.push( { 'url': url,'error': msg });
    	
    	//this.currentAd.visited = -1; // ?    	
		//this.removeAd(this.currentAd);
		
		return this.cancelRequest(subject);
    },
    	
    cancelRequest : function(subject) {

    	try {
    		var request = subject.QueryInterface(Ci.nsIRequest);
	    	request && request.cancel(Cr.NS_BINDING_ABORTED);
	    	return true;	
	    }
	    catch(e) {
	    	
	    	this.err(e);
	    }
	    
	    return false;
    },
	
	isResource : function(url) { 
		
    	return /\.(css|jpg|png|js|gif|swf|xml|ico|json|mp3|mpg|ogg|wav|aiff|avi|mov|m4a|woff)(\?|$|#)/i.test(url); 
	},
	
	restart : function(adl) {
		
		this.stop();
		
		//Logger.log("AdVisitor.restart("+adl+") :: enabled="+Options.enabled);
		
		this.adlookup = adl;
		
		this.pageWorker = Page({
		    contentScript:  'self.port.emit("ADNPageVisit", { "url": document.URL });'
 		});
 		
 		var me = this;
 		this.pageWorker.view.setAttribute("ADN", "ADN");
		this.pageWorker.port.on("ADNPageVisit", function(o) { me.pageVisited.call(me, o); });
		
		if (0) // testing 
			this.pageWorker.contentURL = "http://www.nytimes.com/adx/bin/adx_click.html?type=goto&opzn&page=homepage.nytimes.com/index.html&pos=HPmodule-RE2&sn2=d1cdc681/5274a2cb&sn1=a8d22866/2892c77f&camp=HPModule-Alchemy-35-1907746_&ad=35XV_Property_173x98px_c-9-27&goto=http%3A%2F%2Fwww%2E35xv%2Ecom%2F%3Futm%5Fsource%3DNYT%2BHomepage%2BModule%26utm%5Fmedium%3Dbanner%26utm%5Fcampaign%3D3%2Bto%2B4%2BBR"
			//"http://www.nytimes.com/adx/bin/adx_click.html?type=goto&opzn&page=homepage.nytimes.com/index.html&pos=TopLeft&sn2=ab8a95f5/87622a3f&sn1=2fb111cd/5ad829d7&camp=Bloomindales_HolidayGift_1903034-nyt8&ad=HP.SOV.Static.Dart184x90Left&goto=http%3A%2F%2Ftinyurl%2Ecom%2Fn3e3qa5";
		else
			this.pollQueue();		
	},
	
    stop : function() {
    	
    	this.currentAd = null;
    	
    	if (this.pageWorker) 
    		this.pageWorker.dispose();
    }
	
});

exports.AdVisitor = AdVisitor;

