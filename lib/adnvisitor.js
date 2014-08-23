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
	currentAd : null, 
	lastVisitTs : 0,
	maxAttempts : 3,
	timeoutMs : 8000,
	extends : Unknown,
	
	initialize : function(parser) {
		
		this.parser = parser;
		this.component = parser.component;
		this.restart(parser.adlookup);
		//Logger.log("Created AdVisitor::"+this.component);				
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
    
	pageVisited : function(options) {
		
		var ads, msg, updated, url = options.url;
		
		if (url === 'about:blank') 
			return;
		
		if (!this.currentAd) {
			
			Logger.warn("No current ad: "+url);
			return;
		}
		
		this.currentAd.path.push(url);
		this.currentAd.visited = this.markActivity();
		
		// update all ads with the same target (make function)
		updated = [ ];
		ads = this.parser.getAds();
		for (var i=0, j=ads.length; i< j; i++) {
			
			if (ads[i].target === this.currentAd.target) {
				
				ads[i].visited = this.currentAd.visited;
				updated.push(ads[i]);
			}
		}
		
		msg = "VISITED(#"+this.currentAd.id+"): "+url+"\n";
		if (url != this.currentAd.target)
			msg += "               Redirected-from: "+this.currentAd.target;
		Logger.log(msg);
		
		if (Options.verboseNotify)
			Logger.notify(url, "Ad-Visited", this.currentAd.target, 1);
		
		// save the changes to storage (how often?)
		this.parser.saveAdLookup();
			
		// update each ad item in the adview with new visited times
		for (var i=0, j=updated.length; i< j; i++) 
 			Options.updateAdview('visited', updated[i]);

			//Options.updateAdview('visited', this.currentAd);
	},

	pollQueue : function() {
		
		if (!Options.enabled) // disabled, no polling
			return;

		var ads, updated, next, now = +new Date(), elapsed = now - this.lastVisitTs;
		
		if (elapsed < this.timeoutMs) { // timeout
			
			this.nextPoll();
			return;
		}
			
		next = this.checkNext();
		
		if (verbose) Logger.log("AdVisitor.pollQueue :: "+next);	
		
		if (next) {

			if (this.currentAd === next) { // still not visited...
				
				Logger.log("TIMEOUT: (no visit) -> "+this.currentAd.target);

				if (++this.attempts == this.maxAttempts) {
					
					Logger.log("GIVEUP(#"+this.currentAd.id+"): "+this.currentAd.target);
					
					if (Options.verboseNotify)
						Logger.notify(this.currentAd.target, "Failed (" + this.maxAttempts+" attempts)", this.currentAd.target, 1);

					this.currentAd.errors.push
						('Timeout after '+this.maxAttempts+' tries');
						
					this.currentAd.visited = -1; // don't reselect
										
					// invalidate all ads with the same target (make function)
					ads = this.parser.getAds();
					updated = [];
					for (var i=0, j=ads.length; i< j; i++) {
						
						if (ads[i].target === next.target) {
							
							ads[i].visited = -1; // error
							updated.push(ads[i]);
						}
					}
					
					// save the changes to storage (how often?)
					this.parser.saveAdLookup();
					
					// if open, notify the adview of the error(s)
					for (var i=0, j=updated.length; i< j; i++) 
 						Options.updateAdview('visited', updated[i]);
	
					this.attempts = 0;
				}
				
				this.currentAd = null;
			}
			else {
				
				if (next.target) {
					
					Logger.log("TRYING(#"+next.id+"): "+next.target);
					
					this.currentAd = next;
					this.markActivity();
					
					try {
						
						this.pageWorker.contentURL = next.target; // LAUNCH REQUEST ...
		    			this.pageWorker.contentScriptOptions = { "url": next.target }; // what does this do?
		    		}
		    		catch (e) {
		    			
		    			console.error('Visitor: unable to visit -> '+next.target,e);
		    		}
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

	removeAd : function(ad) {  // Not used?

		var ads = this.parser.adlookup[ad.page];
		
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
		
		var next, keys = Object.keys(this.parser.adlookup);
		
		for (var i = 0, j = keys.length; i < j; i++) {
			
			var ads = this.parser.adlookup[keys[i]];
			
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
	
	clearAds : function() {
		
		this.currrentAd = null;
	},
	
	restart : function() {
		
		this.stop();

		// this needs to send a msg back to addon with title info (or just update ad in place?)
		var me = this, script = 'self.port.emit("ADNPageVisit", ' +
			'{ "url": document.URL });'+
			"var elements = document.querySelectorAll('title'); " +
            "for (var i = 0; i < elements.length; i++)" +
            "  console.log('TITLE('+i+'): '+elements[i].textContent) ";
             
		this.pageWorker = Page({
		    contentScript:  script
 		});	
 		
		this.pageWorker.view.setAttribute("ADN", "ADN");
		this.pageWorker.port.on("ADNPageVisit", function(o) { me.pageVisited.call(me, o); });

		this.pollQueue();		
	},
	
    stop : function() {
    	
    	this.clearAds();
    	
    	this.pageWorker && this.pageWorker.dispose();    	
    },
    
    pause : function() {
    	
		this.stop();
    },
    
   	unpause : function() {
   		
		this.restart(null);
    }
	
});

exports.AdVisitor = AdVisitor;

