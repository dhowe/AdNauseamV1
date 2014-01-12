const { Cc, Ci, Cu } = require("chrome");
const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');
const { Options } = require("./adnoptions");
const { data } = require("sdk/self");

let AdnLogger = Class({

	logFile : null,
	ostream : null,
	extends : Unknown,
	fileName :  'adnauseam.log',

    initialize : function() {
    	
    	this.prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].
    		getService(Ci.nsIPromptService);
    		
    	this.alertsService = Cc["@mozilla.org/alerts-service;1"]
    		.getService(Ci.nsIAlertsService);
    	
    	console.log('');

		this.logFile = Cc["@mozilla.org/file/directory_service;1"]
			.getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
			
		this.logFile.append(this.fileName);

		if (Options.disableLogs) return;
			
		try {
			
			if (!this.logFile.exists()) {
				
				this.logFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);
				console.log("Created " + this.logFile.path);
			}
	
			if (!this.ostream) {
				
				this.ostream = Cc["@mozilla.org/network/file-output-stream;1"]
					.createInstance(Ci.nsIFileOutputStream);
				
				var flags = Options.saveLogs ? 0x02 | 0x10 : -1;

				this.ostream.init(this.logFile, flags, -1, 0);
				 
				this.log('=');
				this.log("Log: " + this.logFile.path+" ("+
					(Options.saveLogs ? "p" : "t")+")");
					
				Options.dump(this);	
			}
		}
		catch(e) {
			
			console.exception(e);
		}
	},
	
	log : function(msg, mode) {  // mode: [0=log-only, -1=dump-only, 1=both

		mode = mode || 1;
		
		if (!Options.disableLogs && (typeof this.ostream === 'undefined' || !this.ostream)) { 
			
			this.initialize();
			
			if (typeof this.ostream === 'undefined' || !this.ostream) { 
				console.warn('ADN: Unable to create log iostream');
				console.trace();
			}
		}
		
		if (mode) console.log(msg);
		
		if (!Options.disableLogs && mode != -1) {
			
			if (!msg || !msg.length) {
				msg = '\n';
				this.ostream.write(msg, msg.length);
				return;
			}
			
			if (msg === '=') {
				msg = '\n'+ this.line(90);
				this.ostream.write(msg, msg.length);
				return;
			}
			
			var d = new Date(), ms = d.getMilliseconds()+'', now = d.toLocaleTimeString();
		    ms =  (ms.length < 3) ? ("000"+ms).slice(-3) : ms;
	 
			msg = "[" + now  + ":" + ms + "] " + msg + "\n" + this.line(90);
				
			if ( typeof this.ostream === 'undefined' || !this.ostream) {
				console.error("NO IO!");
				return;
			}
			
			this.ostream.write(msg, msg.length);
		}
	}, 
	
	warn : function(msg, mode) { 
   		
   		mode = mode || 0;
   		if (mode == 0) 
   			console.warn(msg);
   		this.log("[WARN]\n     "+msg, mode);
   	},
   	
   	err : function(msg, e) { 
   		
   		this.log("[ERROR]" + this.line(90) + "\n" + msg + "\n");
   		
   		console.error(msg);
   		
   		if (e) 
   			console.exception(e);
   		else
   			console.trace();
   	},
   	
   	alert : function(message, title) {
   		
   		if (!message) return;
   		
   		title = title || 'Ad Nauseam';
   		
   		this.log("Alert: "+message);
   		
   		this.prompts && (this.prompts.alert(null, title, message));
   	},
   		
   	notify : function(message, title) {
   		
   		if (!message) return;
   		
   		title = title || 'Ad Nauseam';
   		
   		this.log("Notify: "+message.replace(/[\r\n]/,' '));
   		   		
   		try {
   			
   			this.alertsService.showAlertNotification(data.url('img/adn128.png'), title, message);
		}
		catch (e) {
			
			// This can fail on Mac OS X
			console.warn("No notification!", e); // TODO: remove
		}
	},
   	
   	line : function(num, sep) {
		var s = '';
		num = num || 78;
		sep = sep || '=';
		for (var i=0; i < num; i++) 
		  s += sep;
		return s+'\n';
	},
		
});

exports.Logger = AdnLogger();
exports.LogFile = exports.Logger.logFile.path;
