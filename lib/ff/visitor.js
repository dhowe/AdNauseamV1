const verbose = 0, pollQueueInterval = 5000, disabled = true;

const Cr = require("chrome").Cr, Ci = require("chrome").Ci;
const Options = require("./options").Options;
const UIManager = require("./uiman").UIManager;
const Logger = require("./logger").Logger;
const Util = require('./adnutil').AdnUtil;
const Page = require("./extpage").Page;

var AdVisitor = require('sdk/core/heritage').Class({

	currentAd : null, 
	lastVisitTs : 0,
	maxAttempts : 3,
	pageWorker : null,
	allowJsOnPage : false,
    
    initialize : function(parser) {
        
        this.parser = parser;
        this.restart();
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
		
		var regexs = [ 
		  /^(chrome|about):/, 
		  /(itunes\.apple|appstore)\.com/i, 
		  /(youtube|vimeo)\.com/i 
        ];
		
		this.markActivity();
		
		for (var i=0, j=regexs.length; i<j; i++) {
			
			if (regexs[i].test(url)) {
				
		  		return this.cancelVisit(subject, url, regexs[i].toString());
		  	}
		}
		
		if (0 && /video/i.test(url)) 
		    Logger.warn("Allowing potential video link: "+url +" (from: "+origUrl+")");
		
		if (0 && !this.isResource(url)) 
			Logger.log("beforeLoad: "+url +"\n       ("+origUrl+")");
		
		if (channel) {
			
			if (this.currentAd && !Options.get('disableOutgoingReferer')) {
			    
			    //Logger.log("Setting referer: "+this.currentAd.pageUrl);
				channel.setRequestHeader('Referer', this.currentAd.pageUrl, false);
            }
				
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
		
		if (url === 'about:blank') return;
		
		if (!this.currentAd) {
			
			Logger.warn("No current ad: "+url);
			return;
		}
		
		msg = "VISITED(#"+this.currentAd.id+"): "+url+"\n";
		if (url != this.currentAd.targetUrl)
			msg += "               Redirected-from: "+this.currentAd.targetUrl;
		Logger.log(msg);

		// update all other ads with the same target
		this.updateOnVisit(this.currentAd, this.markActivity(), options); // success					
	},
    
	 // CHANGED(12/19): Each ad is now visited separately	
	updateOnVisit : function(visitedAd, time, opts) {

		//console.log("Visitor.updateOnVisit(#"+visitedAd.id+")");

		var title = (time && opts) ? opts.title : 'Unable to visit';
		var resolvedUrl = (opts && opts.url) ? opts.url : null;
		
        visitedAd.title = title; 
        visitedAd.visitedTs = time;
        visitedAd.resolvedTargetUrl = resolvedUrl;
        visitedAd.path.push(resolvedUrl);

        console.log("UPDATE(visitor): ad #"+ visitedAd.id);

		UIManager.updateOnAdVisit(visitedAd);
	},
    
    pollQueue : function() {
        
        if (!Options.get('enabled') || disabled) return;// disabled, no polling
        
        var next, now = +new Date(), elapsed = (now - this.lastVisitTs);
        
		if (!this.parser.component.initd || elapsed < pollQueueInterval) 
            return this.nextPoll();

        this.parser.serializeAdlist(now);   
        
		next = this.checkNext();
		
		if (verbose) {
		     
		   Logger.log("AdVisitor.pollQueue :: found "+ (next ? 'ad#'+next.id
		       : 'NULL AD (none left?)') + ' total='+this.parser.adlist.length);
        }	
		
		if (next) {

            if (this.currentAd === next) { // still not visited...
                
                Logger.log("TIMEOUT: (no visit) -> #"+this.currentAd.id+" :: "
                    +this.currentAd.targetUrl + " "+(this.currentAd.attempts+1) 
                    + "/" + this.maxAttempts);

                var forceFail = require('../config').PARSER_TEST_MODE==='update';
                if (forceFail) console.log("FORCE FAIL ***********************");
  
                if (++this.currentAd.attempts == this.maxAttempts || forceFail) {
                    
                    Logger.log("GIVEUP(#"+this.currentAd.id+"): "+this.currentAd.targetUrl);

                    this.currentAd.errors.push
                        ('Timeout after '+this.maxAttempts+' tries');
                        
					this.updateOnVisit(this.currentAd, -1, null); // giveup
                }
                
                this.currentAd = null;
            }
            else {
 
                 if (next.targetUrl) {
                    
                    Logger.log("TRYING(#"+next.id+"): "+next.targetUrl);
                    
                    this.currentAd = next;
                    this.currentAd.attempts = this.currentAd.attempts || 0; // in case null

                    this.markActivity();
                    
                    try {
                        this.pageWorker.contentURL = next.targetUrl; // LAUNCH REQUEST ...
                    }
                    catch (e) {
                        
                        console.error('Visitor: unable to visit -> '+next.targetUrl,e);
                    }
                }
            }
        }
        
        this.nextPoll();
    },
    
    nextPoll : function(t) {
        
        t = t || pollQueueInterval;
        require("sdk/timers").setTimeout(this.pollQueue.bind(this), t);
    },
    
    checkNext : function() {

        var ads = this.parser.pendingAds();
        
        //console.log('Visitor.checkNext: '+ads.length+' '+this.parser.adlist.length+" "+Object.keys(this.parser.pageMap).length);
            
        ads.sort(Util.byField('-foundTs'));
        
        //Logger.log("POLL: " + ads.length + "/" + ads.length+" pending");
        
        return ads.length ? ads[0] : null;
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

		// sends a msg back to addon with title info (or just updates ad in place?)
		var script = "var s = '', elements = document.querySelectorAll('title'); "
            +	"for (var i = 0; i < elements.length; i++) s += elements[i].textContent;" 
            +	"if (s) { console.log('TITLE: '+s.trim()+', URL: '+document.URL);"
            +	"self.port.emit('page-visited', { 'title': s.trim(), 'url': document.URL });}";

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
        
        this.restart();
    }
});

exports.AdVisitor = AdVisitor;