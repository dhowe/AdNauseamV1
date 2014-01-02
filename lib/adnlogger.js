const { Cc, Ci, Cu } = require("chrome");
const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');

let AdnLogger = Class({

	logFile : null,
	ostream : null,
	extends : Unknown,
	fileName :  'adnauseam.log',

    initialize : function() {
    	 
    	console.log('');
		//console.log('Initializing Log');

		try {
			this.logFile = Cc["@mozilla.org/file/directory_service;1"]
				.getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
				
			this.logFile.append(this.fileName);

			if (!this.logFile.exists()) {
				this.logFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);
				console.log("[ADN] Created " + this.logFile.path);
			}
	
			if (!this.ostream) {
				this.ostream = Cc["@mozilla.org/network/file-output-stream;1"]
					.createInstance(Ci.nsIFileOutputStream);

				this.ostream.init(this.logFile, -1, -1, 0); // truncate ??
				this.log("Log: " + this.logFile.path);	
			}
		}
		catch(e) {
			
			console.exception(e);
		}
	},
	
	log : function(msg, dumpit) { // dumpit: [0=log-only, -1=dump-only, 1=both

		dumpit = dumpit || 1;
		
		if (typeof this.ostream === 'undefined' || !this.ostream) { 
			console.error('no iostream');
			console.trace();
		}
		
		if (dumpit) console.log(msg);
		
		if (dumpit != -1) {
			
			if (!msg || !msg.length) {
				msg = "\r\n";
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
	
	warn : function(msg, dumpit) { 
   		
   		dumpit = dumpit || 0;
   		if (dumpit == 0) 
   			console.warn(msg);
   		this.log("[WARN]\n     "+msg, dumpit);
   	},
   	
   	err : function(msg, e) { 
   		
   		
   		this.log("[ERROR]" + this.line(90) + "\n" + msg + "\n");
   		console.error(msg);
   		if (e) 
   			console.exception(e);
   		else
   			console.trace();
   	},
   	
   	line : function(num, sep) {
		var s = '';
		num = num || 50;
		sep = sep || '=';
		for (var i=0; i < num; i++) 
		  s += sep;
		return s+'\n';
	},
		
});

exports.Logger = AdnLogger();
exports.LogFile = exports.Logger.logFile.path;
