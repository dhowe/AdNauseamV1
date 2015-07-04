const Data = require("sdk/self").data;
const Options = require("./options").Options;
const UIManager = require("./uiman.js").UIManager;
const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const LogURL = Data.url("log.html");

// TODO: replace all streams with File.IO (see uiman.export/import)
var Logger =  require('sdk/core/heritage').Class({

	borked : false,
	fileName : 'adnauseam-log.txt',
	logJSON : [],
	logJSONSize : 100,
	logHTMLWorker : null,

    initialize : function() {
    
        //console.log('Logger()');
        if (this.noRecreate) return; // we're shutting down
        
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
	
	dispose : function(noRecreate) { 
		
		arguments.length && (this.noRecreate = noRecreate); // don't recreate
		
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
				this.writeLogJSONAndSendUpdate(msg);
				return;
			}
			
			if (msg === '=') {
				
				msg = '\n'+ this.line(90);
				this.ostream.write(msg, msg.length);
				this.writeLogJSONAndSendUpdate(msg);
				return;
			}
			
			msg = "[" + new Date().toUTCString() + "] " + msg + "\n" + this.line(90);
				
			if ( typeof this.ostream === 'undefined' || !this.ostream) {
				
				Util.error("NO IO!\n  Msg: "+msg);
				return;
			}

			this.ostream.write(msg, msg.length);
			this.writeLogJSONAndSendUpdate(msg);
		}
	},

	writeLogJSONAndSendUpdate: function (msg) {

		// Use Queue to limit the number of entries to the logJSONSize 
		if (this.logJSON.length >= this.logJSONSize)
			this.logJSON.shift();
			
		// store the entries in memory
		this.logJSON.push( msg );
		
		// send update to log.html if it exists
		if (this.logHTMLWorker && this.logTab()) // adding this.logHTMLWorker or else cleanupTabs() cannot close it
			this.updateLogPage();
	},

	openLog: function () {

		var Tabs = require("sdk/tabs");
		
		// check if log page is open and ready
		var tab = this.logTab();
        if (tab && this.logHTMLWorker) {

            tab.activate();
            tab.reload();

            return;
        }

		Tabs.open({

			url: LogURL,
			onClose: function () {

				this.logHTMLWorker = null;
			},
			onReady: sendLogData.bind(this)
		});

		function sendLogData(tab) {

			if (tab && tab.url === LogURL) {

				this.logHTMLWorker = tab.attach({

					contentScriptFile: [
						Data.url("lib/jquery-2.1.4.min.js"),
						Data.url("log.js")
					],
				});

				this.logHTMLWorker.port.emit('show-log', this.logJSON);

				var logFilePath = "file://" + this.logFile.path;
				this.logHTMLWorker.port.emit('add-log-path', Data.url(logFilePath));
			}
		}
	},

	// returns the 'pointer' to the tab if it exists
	logTab: function () {

		return require("./adnutil").AdnUtil.findTab(LogURL);
	},

	updateLogPage: function () {

		this.logHTMLWorker.port.emit('add-log-entry', this.logJSON);
	},

	warn: function (msg, notify) {

		msg = "[*WARN*]\n     " + msg;
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
	   			this.alertsService.showAlertNotification(Data.url('img/adn_active.png'),
	   				 title, message, true, url, listener);
	   		}
	   		else {
	   			this.alertsService.showAlertNotification(Data.url('img/adn_active.png'), 
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
