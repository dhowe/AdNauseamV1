const Data = require("sdk/self").data;
const Options = require("./options").Options;
const Cc = require("chrome").Cc, Ci = require("chrome").Ci;

// TODO: replace all streams with File.IO (see uiman.export/import)
var Logger =  require('sdk/core/heritage').Class({

	borked : false,
	fileName :  'adnauseam-log.txt',

    initialize : function() {
    
        //console.log('Logger()');

		this.ostream = null;

		this.prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Ci.nsIPromptService);

		this.alertsService = Cc["@mozilla.org/alerts-service;1"]
			.getService(Ci.nsIAlertsService);

		this.logFile = Cc["@mozilla.org/file/directory_service;1"]
			.getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);

		this.logFile.append(this.fileName);

		if (Options.get('disableLogs'))
			return;

		this.reset(); 
		
		//console.log('Logger() done');
	},
	
	dispose : function() { // never called?
		
		if (this.logFile && this.logFile.exists()) {
			
			this.logFile.remove(false);
			if (this.logFile && this.logFile.exists()) {
			    
				require("./adnutil").AdnUtil.error("Logger.dispose()" +
				    " :: log still exists? "+this.logFile.exists());
            }
			this.logFile = null;
		}
		
		this.ostream && (this.ostream = null);
		this.prompts && (this.prompts = null);
		this.alertsService && (this.alertsService = null);
	},
	
	reset : function() {
				
		try {
			
			if (!this.logFile.exists()) {
				
				this.ostream = null;
				this.logFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);
				require("./adnutil").AdnUtil.log("Created " + this.logFile.path);
			}
	
			if (!this.ostream) {
				
				this.ostream = Cc["@mozilla.org/network/file-output-stream;1"]
					.createInstance(Ci.nsIFileOutputStream);
	
				this.ostream.init(this.logFile, 0x02 | 0x10, -1, 0);

				if (!this.ostream) throw Error('No iostream!');
					
				this.log('AdNauseam v'+require("sdk/self").version);
				//this.log('Log: ' + this.logFile.path); // leak
					
				Options.dump(this);	
			}
		}
		catch(e) {
			
			require("./adnutil").AdnUtil.error("Unable to create Logger: "+this.logFile, e);
		}
	},


	log : function(msg) { 
		
		var logsDisabled = Options.get('disableLogs'), 
		  Util = require("./adnutil").AdnUtil;
		
		if (!logsDisabled && (typeof this.ostream === 'undefined' ||
		  !this.ostream || !this.logFile || !this.logFile.exists())) 
		{ 
			require("./adnutil").AdnUtil.warn('Logger: Reinitializing log');

			this.initialize();
			
			if (typeof this.ostream === 'undefined' || !this.ostream) {
				 
				Util.warn('Logger: Unable to create iostream: '+this.logFile.path);
				Util.trace();
				
				// We've tried to reset and failed, so disable
				this.borked = true;
			}			
		}
		
		Util.log(msg);
		
		if (!this.borked && !logsDisabled) {
			
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
			
			msg = "[" + new Date().toUTCString() + "] " + msg + "\n" + this.line(90);
				
			if ( typeof this.ostream === 'undefined' || !this.ostream) {
				
				Util.error("NO IO!\n  Msg: "+msg);
				return;
			}
			
			this.ostream.write(msg, msg.length);
		}
	}, 
	
	warn : function(msg, notify) { 
   		
   		msg = "[*WARN*]\n     "+msg;
   		require("./adnutil").AdnUtil.warn(msg);
   		this.log(msg, notify);
   	},
   	
   	err : function(msg, e) { 
   		
   		var Util = require("./adnutil").AdnUtil;
   		
   		msg = "[ERROR]" + this.line(90) + "\n" + msg + "\n";
   		
   		Util.error(msg);
   		this.log(msg);
   		
   		if (e) 
   			Util.exception(e);
   		else
   			Util.trace();
   	},
   	
   	alert : function(message, title) {
   		
   		if (!message) return;
   		
   		title = title || 'AdNauseam';
   		
   		this.log("Alert: "+message);
   		
   		this.prompts && (this.prompts.alert(null, title, message));
   	},
   		
   	notify : function(message, title, url, noLog) {
   		
   		if (!message) return;
   		
   		title = title || 'AdNauseam';
   		
   		if (!noLog)
   			this.log("Notify: "+message.replace(/[\r\n]/,' '));
   			
		if (message.length <= 100) message = '\n' + message;
   		   		
   		try {
   		    
   			if (url) {
	   			var listener = {
	   				observe : function(subject, topic, data) {
	   					if (topic === 'alertclickcallback') // ??
	   						require("./uiman").UIManager.openInTab(data); 
	   				}
	   			};
	   			this.alertsService.showAlertNotification(Data.url('img/adn128.png'),
	   				 title, message, true, url, listener);
	   		}
	   		else {
	   			this.alertsService.showAlertNotification(Data.url('img/adn128.png'), 
	   				title, message);
			}
		}
		catch (e) {
			
			// This can fail on Mac OS X
			require("./adnutil").AdnUtil.warn("No notification!", e); // TODO: remove
		}
	},
	
   	trimPath : function(u, max) {
    	
		max = max || 60;
		if (u && u.length > max) 
			u = u.substring(0,max/2)+"..."+u.substring(u.length-max/2);
		return u;
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

exports.Logger = Logger();
