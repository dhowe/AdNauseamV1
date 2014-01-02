
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
	
	restart : function(adl) {

		this.stop();
		
		this.adlookup = adl;
		
		this.pageWorker = Page({
		    contentScript:  'self.port.emit("ADNPageVisit", { "url": document.URL });'
 		});
 		
 		var me = this;
 		this.pageWorker.view.setAttribute("ADN", "ADN");
		this.pageWorker.port.on("ADNPageVisit", function(o) { me.pageVisited.call(me, o); });
		
		//this.pageWorker.contentURL = "http://www.nytimes.com/adx/bin/adx_click.html?type=goto&opzn&page=homepage.nytimes.com/index.html&pos=TopLeft&sn2=ab8a95f5/87622a3f&sn1=2fb111cd/5ad829d7&camp=Bloomindales_HolidayGift_1903034-nyt8&ad=HP.SOV.Static.Dart184x90Left&goto=http%3A%2F%2Ftinyurl%2Ecom%2Fn3e3qa5";
		this.pollQueue();
	},
	
	pageVisited : function(options) {
		
		var url = options.url;
		if (url === 'about:blank') 
			return;
		
		if (!this.currentAd) {	
			Logger.err("No current ad: "+url);
			return;
		}
		
		this.currentAd.path.push(url);
		this.currentAd.visited = this.markActivity()
		
		var msg = "LOADED: "+url+"\n";
		if (url != this.currentAd.target)
			msg += "               REDIRECT: from="+this.trimPath(this.currentAd.target);
			
		Logger.log(msg);		 	
	},

	pollQueue : function() {
		
		if (!Options.enabled) // disabled, no polling
			return;
			
		var now = +new Date();
		var elapsed = now - this.lastVisitTs;
		if (elapsed < this.timeoutMs) { // timeout
			
			//Logger.log("AdVisitor.waiting :: "+(now - this.lastVisitTs));			
			this.nextPoll();
			return;
		}

		//Logger.log("AdVisitor.pollQueue :: "+now);	
			
		var next = this.checkNext();
		
		if (next) {
			
			//Logger.log("NEXT :: "+next);
			
			if (this.currentAd === next) { // still not visited...
				
				Logger.log("TIMEOUT: (no visit) -> "+this.currentAd.target);

				if (++this.attempts == this.maxAttempts) {
					
					Logger.log("GIVING UP -> "+this.currentAd.target);

					this.removeAd(next);
	
					this.attempts = 0;
				}
				
				this.currentAd = null;
			}
			else {
				
				if (next.target) {
					
					Logger.log("VISITING: "+next);
					
					this.currentAd = next;
					
					this.markActivity();
					
					// LAUNCH NEXT REQUEST .......
					this.pageWorker.contentURL = next.target;
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

	removeAd : function(next) {

		var ads = this.adlookup[next.page];
		
		if (ads) {
			
			var delIdx = ads.indexOf(this.currentAd);
			
			if (delIdx > -1) {
				
				ads.splice(delIdx, 1);
				return true;
			}
		}
		else {
			Logger.warn("AdVisitor.removeAd()->No ads found for: "+next.page);
		}
		
		Logger.warn("AdVisitor.removeAd()->Unable to remove ad: "+next);
		
		return false;
	},
	
	checkNext : function() {
		
		var next, keys = Object.keys(this.adlookup);
		
		for (var i = 0, j = keys.length; i < j; i++) {
			
			var ads = this.adlookup[keys[i]];
			
			for (var m=0, n = ads.length; m < n; m++) {
				
				if (!ads[m].visited) {
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
		
		this.markActivity();

		if (/^(chrome|about):/.test(url)) {
			Logger.log("Cancelled(chrome) :: "+url);
			return this.cancelVisit(subject);
		}
	
		if (/(itunes\.apple|appstore)\.com/i.test(url))  {
			Logger.log("Cancelled(itunes) :: "+url);
			return this.cancelVisit(subject);
		}
		
		if (/video/i.test(url))  {
			Logger.log("Cancelled(video) :: "+url);
			return this.cancelVisit(subject);
		}
		
		if (0 && !this.isResource(url))
			Logger.log("beforeLoad: "+url +"\n       ("+origUrl+")");
    },
    
    cancelVisit : function(subject) {
    	
		this.removeAd(this.currentAd);
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
	
	trimPath : function(u, max) {
		max = max || 60;
		if (u && u.length > max) 
			u = u.substring(0,max/2)+"..."+u.substring(u.length-max/2);
		return u;
	},

    stop : function() {
    	
    	this.currentAd = null;
    	
    	if (this.pageWorker) 
    		this.pageWorker.dispose();
    }
	
});

exports.AdVisitor = AdVisitor;

