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
	
	afterLoad : function(subject, url, origUrl) {
		
		this.markActivity();
		
		// This all to get the title  
	    var traceableChannel = subject.QueryInterface(Ci.nsITraceableChannel);
	    var newListener = new TracingListener();
	    newListener.originalListener = traceableChannel.setNewListener(newListener);
	 
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
		
		var url = options.url;
		if (url === 'about:blank') 
			return;
		
		if (!this.currentAd) {	
			Logger.warn("No current ad: "+url);
			return;
		}
		
		this.currentAd.path.push(url);
		this.currentAd.visited = this.markActivity();
		
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
						Logger.notify(this.currentAd.target, "Failed (" + 
							this.maxAttempts+" attempts)", this.currentAd.target, 1);

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
					
					Logger.log("TRYING: "+next.target);
					
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

	removeAd : function(ad) {  // Not used?

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
	
	clearAds : function(adl) {

		//console.log('visitor.clearAdLookup()');

		this.adlookup = {};
	},
	
	restart : function(adl) {
		
		this.stop();
				
		if (adl) this.adlookup = adl;

		this.pageWorker = Page({
			 		
	 	 	onAttach: startListening // remove
		});
		
		function startListening(worker) {
			
		  this.pageWorker.port.on('message', function(m) {
		  	
		     console.log("PageWorker.message: ", m);
		  });
		}	
 		
 		this.pageWorker.view.setAttribute("ADN", "ADN");
		this.pollQueue();		
	},
	
    stop : function() {
    	
    	this.currentAd && (this.currentAd = null);
    	
    	this.pageWorker && this.pageWorker.dispose();
    },
    
    pause : function() {
    	
		this.stop();
    },
    
   	unpause : function() {
   		
		this.restart(null);
    }
	
});

	
// This all to get the title (in afterLoad()) ========================================

function TracingListener() {
    this.originalListener = null;
    this.receivedData = [];   // array for incoming data
    this.title = '';
}

function CCIN(cName, ifaceName) {
    return Cc[cName].createInstance(Ci[ifaceName]);
}

TracingListener.prototype =
{
	onDataAvailable: function(request, context, inputStream, offset, count)
    {
        var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1",
                "nsIBinaryInputStream");
        var storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
        var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1",
                "nsIBinaryOutputStream");

        binaryInputStream.setInputStream(inputStream);
        storageStream.init(8192, count, null);
        binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

        // Copy received data as they come.
        var data = binaryInputStream.readBytes(count);
        this.receivedData.push(data);

        binaryOutputStream.writeBytes(data, count);

        this.originalListener.onDataAvailable(request, context,
            storageStream.newInputStream(0), offset, count);
    },

    onStartRequest: function(request, context) {
        this.originalListener.onStartRequest(request, context);
    },

    onStopRequest: function(request, context, statusCode)
    {
        // Get entire response
        var data = this.receivedData.join();
        var matches = data.match(/<title>(.*?)<\/title>/);
        if (matches && matches.length>1 && matches[1].length) {
        	if (!this.title) {
        		
 				this.title = matches[1];
				console.log("TITLE: "+this.title); // also need URL/Ad
			}
		}
        this.originalListener.onStopRequest(request, context, statusCode);
    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Ci.nsIStreamListener) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        throw cr.NS_NOINTERFACE;
    }
    
} // =====================================================================


exports.AdVisitor = AdVisitor;

