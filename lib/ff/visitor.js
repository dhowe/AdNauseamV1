const verbose = 0;
const pollQueueInterval = 5000;

const { Cc, Ci, Cu, Cr } = require("chrome");
const { Options } = require("../ffui/options");
const { UIManager } = require("../ffui/uiman");
const { Logger } = require("../ffui/logger");
const { Page } = require("./extpage");
const timers = require("sdk/timers");

var AdVisitor = require('sdk/core/heritage').Class({

	// TODO: multiple (concurrent) page-workers?

	attempts : 0,
	currentAd : null, 
	lastVisitTs : 0,
	maxAttempts : 3,
	timeoutMs : 8000,
	pageWorker : null,
	allowJsOnPage : false,
	
	initialize : function(parser) {
		
		this.parser = parser;
		this.component = parser.component;
		this.restart(parser.adlookup);
	},
	
	afterLoad : function(channel, subject, url, origUrl) {

		// Don't let the site set a cookie 
		if (channel) {
			
			if (Options.get('disableIncomingCookies')) {
				
				channel.setResponseHeader('Set-Cookie', '', false);
			}

			if (channel.responseStatus != 200) {
				
				verbose && Logger.log("HTTP-RESPONSE: "+channel.responseStatus
					+ " / " + channel.responseStatusText+"\n\nURL: "+url
					+ "\n\nFROM: "+origUrl+"\n");
			}
			
			verbose && this.dumpHeaders(channel, url, origUrl, 'Response');
		}
				
		this.markActivity();
					
		if (0 && !this.isResource(url))
			Logger.log("afterLoad: "+url +"\n       ("+origUrl+")");
	},    

	beforeLoad : function(channel, subject, url, origUrl) {
		
		var regexs = [ /^(chrome|about):/, /(itunes\.apple|appstore)\.com/i, /video/i, /(youtube|vimeo)\.com/i ];
		
		this.markActivity();
		
		for (var i=0, j=regexs.length; i<j; i++) {
			
			if (regexs[i].test(url)) {
				
		  		return this.cancelVisit(subject, url, regexs[i].toString());
		  	}
		}
		
		if (0 && !this.isResource(url)) 
			Logger.log("beforeLoad: "+url +"\n       ("+origUrl+")");
		
		if (channel) {
			
			if (!Options.get('disableOutgoingReferer'))
				channel.setRequestHeader('Referer', this.currentAd.pageUrl, false);
				
			if (Options.get('disableOutgoingCookies'))
				channel.setRequestHeader('Cookie', '', false);
				
			verbose && this.dumpHeaders(channel, url, origUrl, 'Request');
		}
    },
    
	dumpHeaders : function(channel, url, origUrl, key) {
		
		var start = key + ':\nURL: '+url+'\n\nFROM: '+origUrl+'\n',
			hvis = function(header, value) {
				if (typeof s == 'undefined')
					s = start;
	  			s += ("  "+header+": "+value+'\n');
			};
			
		if (key == 'Response')
			channel.visitResponseHeaders(hvis);
		else
			channel.visitRequestHeaders(hvis);
			
		console.log(s);
	},
	
	pageVisited : function(options) {
		
		var ads, msg, url = options.url;
		
		if (url === 'about:blank') 
			return;
		
		if (!this.currentAd) {
			
			Logger.warn("No current ad: "+url);
			return;
		}
		
		msg = "VISITED(#"+this.currentAd.id+"): "+url+"\n";
		if (url != this.currentAd.targetUrl)
			msg += "               Redirected-from: "+this.currentAd.targetUrl;
		Logger.log(msg);

		// update all other ads with the same target
		this.updateOnVisit(this.currentAd, this.markActivity(), options);						
	},

	/*
	 * Updates the visited ad, then checks for others (with same target) 
	 * and updates them in vault/menu as well
	 */	
	updateOnVisit : function(visitedAd, time, opts) {
		
		// NOTE: may leave ads w' same image (but diff target) unvisited

		visitedAd.visitedTs = time;
		visitedAd.title = (time && opts) ? opts.title : 'Error';
		if (opts && opts.url) {
			
			visitedAd.resolvedUrl = opts.url;
			visitedAd.path.push(opts.url);
		}

		var updated = [], ads = this.parser.getAds();
			
		for (var i=0, j=ads.length; i< j; i++) {
			
			// match all ads with same target (including original)
			if (ads[i].targetUrl === visitedAd.targetUrl) {
				
				ads[i].title = visitedAd.title; 
				ads[i].visitedTs = visitedAd.visitedTs;
				ads[i].resolvedTargetUrl = visitedAd.resolvedTargetUrl;
				
				updated.push(ads[i]);
			}
		}
		
//console.log("Updating "+updated.length+" ads");
		
		// update each ad item in the vault with same target
		for (var i=0, j=updated.length; i< j; i++) 
 			UIManager.updateOnAdVisit(updated[i]); // use map
 			
		// TODO: save the changes to storage (how often? use poll-queue)
		this.parser.saveAdLookup(); 
	},
	
	pollQueue : function() {
		
		if (!Options.get('enabled')) return; // disabled, no polling
			
		var ads, updated, next, now = +new Date(), elapsed = now - this.lastVisitTs;
		
		if (!this.component.initd || elapsed < this.timeoutMs) { // timeout
			
			this.nextPoll();
			return;
		}
			
		next = this.checkNext();
		
		if (verbose) Logger.log("AdVisitor.pollQueue :: "+next.id+" "+next.contentData);	
		
		if (next) {

			if (this.currentAd === next) { // still not visited...
				
				Logger.log("TIMEOUT: (no visit) -> "+this.currentAd.targetUrl);

				if (++this.attempts == this.maxAttempts) {
					
					Logger.log("GIVEUP(#"+this.currentAd.id+"): "+this.currentAd.targetUrl);

					this.currentAd.errors.push
						('Timeout after '+this.maxAttempts+' tries');
						
					this.updateOnVisit(this.currentAd, -1, null);
					
					this.attempts = 0;
				}
				
				this.currentAd = null;
			}
			else {
				
				if (next.targetUrl) {
					
					Logger.log("TRYING(#"+next.id+"): "+next.targetUrl);
					
					this.currentAd = next;
					this.markActivity();
					
					try {
						
						this.pageWorker.contentURL = next.targetUrl; // LAUNCH REQUEST ...
						
						// TODO: this puts the url into page-scope (there must be a cleaner way to do this)
						// 		 so that it can be used in pageVisited()
						// TODO: seems not to cause problems issue, but leaving for now
		    			//this.pageWorker.contentScriptOptions = { "url": next.targetUrl }; // 
		    		}
		    		catch (e) {
		    			
		    			console.error('Visitor: unable to visit -> '+next.targetUrl,e);
		    		}
				}
				else {
					
					Logger.warn('Visitor: ad with no targetUrl -> '+next.targetUrl);
					console.log(next);
					next.visitedTs = -1;
				}
			}
		}
		
		this.nextPoll();
	},
	
	nextPoll : function(t) {
		
		t = t || pollQueueInterval;
		timers.setTimeout(this.pollQueue.bind(this), t);
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
				
				if (ads[m].visitedTs === 0) {
					
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
    	
    	//this.currentAd.visitedTs = -1; // ?    	
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

		// TODO: this needs to send a msg back to addon with title info (or just update ad in place?)
		var script = "var s = '', elements = document.querySelectorAll('title'); "
            +	"for (var i = 0; i < elements.length; i++)" 
            +	"  s += elements[i].textContent;" 
            +	"console.log('TITLE: '+s);"
            +	"self.port.emit('page-visited', " 
            +	"{ 'title': s.trim(), 'url': document.URL });";

  		Logger.log('Worker.Options: allowJS=' + this.allowJsOnPage 
  			+ ' allowPlugins=false allowDialogs=false');
  		
		this.pageWorker = Page({
		    contentScript:  script,
		    allow: { "script": this.allowJsOnPage } 
 		});	
 		
		this.pageWorker.view.setAttribute("ADN", "ADN");
		this.pageWorker.port.on("page-visited", this.pageVisited.bind(this));
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

