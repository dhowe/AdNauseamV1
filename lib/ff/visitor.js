const verbose = 0, pollQueueInterval = 5000, disabled = 0;

const Cr = require("chrome").Cr, Ci = require("chrome").Ci;
const Options = require("./options").Options;
const UIManager = require("./uiman").UIManager;
const VaultMan = require("./vaultman").VaultManager;
const Logger = require("./logger").Logger;
const Page = require("./extpage").Page;

const BeforeLoadREs = [
    /^(chrome|about):/,
    /(itunes\.apple|appstore|youtube|vimeo)\.com/i,
    /\.(exe|zip|rar|mp[ag34]|webm|og[gv]|avi|mov|asf|flv|m4v|vp8)([#&?].*|$)/i,
];

var AdVisitor = require('sdk/core/heritage').Class({

        currentAd: null,
        lastVisitTs: 0,
        maxAttempts: 3,
        pageWorker: null,
        allowJsOnPage: false,

        initialize: function(parser) {

            //console.log('AdVisitor()');
            this.parser = parser;
            this.restart();
            //console.log('AdVisitor() done');
        },

        /*
         * Handles request header and outgoing cookies for ad-visits
         * Also blocks any disallowed requests (audio,video, etc.)
         */
        beforeLoad: function(channel, subject, url, origUrl) {

            this.markActivity();

            BeforeLoadREs.forEach(function(re) {
                    if (re.test(url))
                        return this.cancelVisit(subject, url, re.toString());
                }, this); // fix for #12 TODO: this is not adequate

            if (0 && /video/i.test(url))
                Logger.warn("Allowing potential video link: " + url + " (from: " + origUrl + ")");

            if (0 && !this.isResource(url))
                Logger.log("beforeLoad: " + url + "\n       (" + origUrl + ")");

            if (channel) {

                if (this.currentAd && !Options.get('disableOutgoingReferer'))
                    channel.setRequestHeader('Referer', this.currentAd.pageUrl, false);

                if (Options.get('disableOutgoingCookies'))
                    channel.setRequestHeader('Cookie', '', false);

                verbose && this.dumpHeaders(channel, url, origUrl, 'Request');
            }
        },

        /*
         * Handles incoming cookies from responses to ad-visits
         */
        afterLoad: function(channel, subject, url, origUrl) {

            // Don't let the site set a cookie 
            if (channel) {

                if (Options.get('disableIncomingCookies')) {

                    channel.setResponseHeader('Set-Cookie', '', false);
                }

                if (channel.responseStatus != 200) {

                    verbose && Logger.log("HTTP-RESPONSE: " + 
                        channel.responseStatus + " / " + channel.responseStatusText +
                        "\n\nURL: " + url + "\n\nFROM: " + origUrl + "\n");
                }

                verbose && this.dumpHeaders(channel, url, origUrl, 'Response');
            }

            this.markActivity();

            if (0 && !this.isResource(url))
                Logger.log("afterLoad: " + url + "\n       (" + origUrl + ")");
        },

        dumpHeaders: function(channel, url, origUrl, key) {
        
            var start = key + ':\nURL: ' + url + '\n\nFROM: ' + origUrl + '\n',
                s = start,
                hvis = function(header, value) {
                    if (typeof s == 'undefined')
                        s = start;
                    s += ("  " + header + ": " + value + '\n');
                };

            if (key == 'Response')
                channel.visitResponseHeaders(hvis);
            else
                channel.visitRequestHeaders(hvis);

            require('./adnutil').AdnUtil.log(s);
        },

        pageVisited: function(options) {

            var ads, msg, url = options.url;

            if (url === 'about:blank') return;

            if (!this.currentAd) {

                Logger.warn("No current ad: " + url);
                return;
            }

            msg = "VISITED(#" + this.currentAd.id + "): " + url + "\n";
            if (url != this.currentAd.targetUrl)
                msg += "               Redirected-from: " + this.currentAd.targetUrl;

            Logger.log(msg);

            this.updateOnVisit(this.currentAd, this.markActivity(), options); // success		

            this.currentAd = null;
        },

        updateOnVisit: function(visitedAd, time, opts) {

            //require('./adnutil').AdnUtil..log("Visitor.updateOnVisit(#"+visitedAd.id+")");

            var title = (time && opts) ? opts.title : 'Unable to visit';
            var resolvedUrl = (opts && opts.url) ? opts.url : null;

            visitedAd.title = title;
            visitedAd.visitedTs = time;
            visitedAd.resolvedTargetUrl = resolvedUrl;
            visitedAd.path.push(resolvedUrl);

            require('./adnutil').AdnUtil.log("UPDATE(visitor): ad #" + visitedAd.id);

            UIManager.updateOnAdVisit(visitedAd);
        },

        pollQueue: function() {

            if (!Options.get('enabled') || disabled) {

                require('./adnutil').AdnUtil.warn('Visitor.disabled = true ***');
                return; // disabled, no polling
            }

            var next, now = +new Date(),
                elapsed = (now - this.lastVisitTs);

            if (!require("./adncomp").Component.initd) {  // handle this (shouldnt happen)
                require('./adnutil').AdnUtil.log('*** !this.parser.component.initd ***');
            }
            
            if (/*!this.parser.component.initd ||*/ elapsed < pollQueueInterval)
                return this.nextPoll();

            this.parser.serializeAdlist(now);

            next = this.checkNext();

            if (verbose) {

                Logger.log("AdVisitor.pollQueue :: found " + (next ? 'ad#' + next.id : 'NULL AD (none left?)') + ' total=' + this.parser.adlist.length);
            }

            if (next) {

                if (this.currentAd === next) { // still not visited...

                    Logger.log("TIMEOUT: (no visit) -> #" + this.currentAd.id + " :: " + this.currentAd.targetUrl + " " + (this.currentAd.attempts + 1) + "/" + this.maxAttempts);

                    var forceFail = require('../config').PARSER_TEST_MODE === 'update';
                    if (forceFail) require('./adnutil').AdnUtil.warn("FORCE FAIL ******* ");

                    if (++this.currentAd.attempts == this.maxAttempts || forceFail) {

                        Logger.log("GIVEUP(#" + this.currentAd.id + "): " + this.currentAd.targetUrl);

                        this.currentAd.errors.push('Timeout after ' + this.maxAttempts + ' tries');

                        // failed ads get a negative time-stamp
                        this.updateOnVisit(this.currentAd, -1 * this.markActivity(), null); // giveup
                    }

                    this.currentAd = null;
                } else {

                    if (next.targetUrl) {

                        Logger.log("TRYING(#" + next.id + "): " + next.targetUrl);

                        this.currentAd = next;
                        this.currentAd.attempts = this.currentAd.attempts || 0; // in case null

                        // tell menu/vault we have a new 'current'
                        UIManager.updateOnAdAttempt(next);

                        this.markActivity();

                        try {
                            this.pageWorker.contentURL = next.targetUrl; // LAUNCH REQUEST ...
                        } catch (e) {

                            require('./adnutil').AdnUtil.error('Visitor: unable to visit -> ' + next.targetUrl, e);
                        }
                    }
                }
            }

            this.nextPoll();
        },

        nextPoll: function(t) {

            t = t || pollQueueInterval;
            require("sdk/timers").setTimeout(this.pollQueue.bind(this), t);
        },

        checkNext: function() {

            if (VaultMan.inspected && VaultMan.inspected.visitedTs === 0) 
                return VaultMan.inspected;

            var ads = this.parser.pendingAds();
            ads.sort(require('./adnutil').AdnUtil.byField('-foundTs'));

            //Logger.log("POLL: " + ads.length + "/" + ads.length+" pending");

            return ads.length ? ads[0] : null;
        },

        markActivity: function() {

            this.lastVisitTs = +new Date();
            return this.lastVisitTs;
        },

        cancelVisit: function(subject, url, msg) {

            Logger.log("Cancelled(" + msg + ") -> " + url);

            if (this.currentAd)
                this.currentAd.errors.push({
                        'url': url,
                        'error': msg
                    });

            return this.cancelRequest(subject);
        },

        cancelRequest: function(subject) {

            try {
                var request = subject.QueryInterface(Ci.nsIRequest);
                request && request.cancel(Cr.NS_BINDING_ABORTED);
                return true;
            } catch (e) {

                this.err(e);
            }

            return false;
        },

        isResource: function(url) {

            return /\.(css|jpg|png|js|gif|swf|xml|ico|json|mp3|mpg|ogg|wav|aiff|avi|mov|m4a|woff)(\?|$|#)/i.test(url);
        },

        clearAds: function() {

            this.currrentAd = null;
        },

        restart: function() {

            this.stop();

            // sends a msg back to addon with title info (or just updates ad in place?)
            var script = "var s = '', elements = document.querySelectorAll('title'); " + "for (var i = 0; i < elements.length; i++) s += elements[i].textContent;" + "if (s) { /*console.log('TITLE: '+s.trim()+', URL: '+document.URL);*/" + "self.port.emit('page-visited', { 'title': s.trim(), 'url': document.URL });}";

            //Logger.log('Worker.Options: allowJS=' + this.allowJsOnPage 
            //+ ' allowPlugins=false allowDialogs=false');    

            this.pageWorker = Page({ // can we re-use this?

                    contentScript: script,
                    allow: {
                        "script": this.allowJsOnPage
                    } // allow or disallow js from loaded url
                });

            this.pageWorker.view.setAttribute("ADN", "ADN");
            this.pageWorker.port.on("page-visited", this.pageVisited.bind(this));
            
            this.nextPoll();
        },

        stop: function() {

            this.clearAds();

            this.pageWorker && this.pageWorker.dispose();
        },

        pause: function() {

            this.stop();
        },

        unpause: function() {

            this.restart();
        }
    });

exports.AdVisitor = AdVisitor;