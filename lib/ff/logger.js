const Data = require("sdk/self").data;
const Options = require("./options").Options;
const UIManager = require("./uiman.js").UIManager;
const LogURL = Data.url("log.html");
const Cc = require("chrome").Cc;
const Ci = require("chrome").Ci;
const MaxLogEntriesJSON = 50;

// TODO: replace all streams with File.IO? (see uiman.export/import)
var Logger = require('sdk/core/heritage').Class({

  borked: false,
  fileName: 'adnauseam-log.txt',
  logHTMLWorker: undefined,
	logJSON: [],
  timezoneOffset: null,

  initialize: function() {

    if (this.noRecreate) return; // we're shutting down

    this.ostream = null;

    this.prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Ci.nsIPromptService);

    this.alertsService = Cc["@mozilla.org/alerts-service;1"]
      .getService(Ci.nsIAlertsService);

    this.logFile = Cc["@mozilla.org/file/directory_service;1"]
      .getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);

    this.logFile.append(this.fileName);
    
    this.timezoneOffset = this.getTimezoneOffset();

    if (Options.get('disableLogs'))
      return;

    this.reset();
  },

  dispose: function(noRecreate) {

    arguments.length && (this.noRecreate = noRecreate); // don't recreate

    if (this.logFile && this.logFile.exists()) {

      this.logFile.remove(false);

      if (this.logFile && this.logFile.exists()) {

        require("./adnutil").AdnUtil.error("Logger.dispose()" +
          " :: log still exists? " + this.logFile.exists());
      }

      this.logFile = null;
    }

    this.ostream && (this.ostream = null);
    this.prompts && (this.prompts = null);
    this.alertsService && (this.alertsService = null);
  },

  reset: function() {

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

        this.log('AdNauseam v' + require("sdk/self").version);
        //this.log('Log: ' + this.logFile.path); // leak

        Options.dump(this);
      }
    } catch (e) {

      require("./adnutil").AdnUtil.error("Unable to create Logger: " + this.logFile, e);
    }
  },

  log: function(msg) {

    var logsDisabled = Options.get('disableLogs'),
      Util = require("./adnutil").AdnUtil;

    if (!logsDisabled && (typeof this.ostream === 'undefined' ||
        !this.ostream || !this.logFile || !this.logFile.exists())) {

      require("./adnutil").AdnUtil.warn('Logger: Reinitializing log');

      this.initialize();

      if (typeof this.ostream === 'undefined' || !this.ostream) {

        Util.warn('Logger: Unable to create iostream: ' + this.logFile.path);
        Util.trace();

        // We've tried to reset and failed, so disable
        this.borked = true;
      }
    }

    Util.log(msg);

    if (!this.borked && !logsDisabled) {

      //this.writeLogEntry("[" + new Date().toUTCString() + "] " + msg + '\n');
      this.writeLogEntry(msg);
    }
  },
  
  // getTimezoneOffset() code snippet from 
  // http://stackoverflow.com/questions/1091372/getting-the-clients-timezone-in-javascript 
  // by cryo
  getTimezoneOffset: function() {
    
    function pad(number, length) {
      var str = "" + number;
      while (str.length < length) {
        str = '0' + str;
      }
      return str;
    }

    var offset = new Date().getTimezoneOffset();
    var offset = ' GMT' + ((offset < 0 ? '+' : '-') + // Note the reversed sign
      pad(parseInt(Math.abs(offset / 60)), 2) +
      pad(Math.abs(offset % 60), 2))
      
    return offset;
  },

	writeLogEntry: function(msg) {

    var ts = new Date();
    var timeString = ts.toLocaleString() + this.timezoneOffset;

    this.updateDynamicLog(timeString, msg);

    if (typeof this.ostream === 'undefined' || !this.ostream)
			return Util.error("NO IO!\n  Msg: " + msg);

		msg = "[" + timeString + "] " + msg + '\n';

    msg = convertFromUnicode("UTF-8", msg);
		this.ostream.write(msg, msg.length);

    function convertFromUnicode(aCharset, aSrc) {

      try {

        var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
          .createInstance(Ci.nsIScriptableUnicodeConverter);
          converter.charset = aCharset;
        return converter.ConvertFromUnicode(aSrc);

      } catch (e) {}

      return aSrc;
    }
	},

  updateDynamicLog: function(ts, msg) {

    // limit the number of entries to MaxLogEntriesJSON
    if (this.logJSON.length >= MaxLogEntriesJSON)
      this.logJSON.shift();

    this.logJSON.push({time: ts, text: msg});

    // send update to log.html if its open
    if (this.logHTMLWorker && this.logTab())
      this.updateLogPage();
  },

  openLog: function() {

    // check if log page is open and ready
    var tab = this.logTab();
    if (tab && this.logHTMLWorker) {

      tab.activate();

      return;
    }

		require("sdk/tabs").open({

      url: LogURL,

			onClose: function() {

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

        this.logHTMLWorker.port.on("close-log", this.closeLog);

        //require("./adnutil").AdnUtil.log('\n\n'+
        //JSON.stringify(this.logJSON)+'\n\n');

        this.logHTMLWorker.port.emit('show-log', this.logJSON);

        var logFilePath = "file://" + this.logFile.path;
        this.logHTMLWorker.port.emit('add-log-path', Data.url(logFilePath));
      }
    }
  },

  closeLog : function() {

      require("./logger").Logger.log('UI->close-log');

      var tabs = require("sdk/tabs");
      for (var tab of tabs) {

          // handle issue #333 here, checking if last tab
          if (tab.url === LogURL) {
              if (tabs.length == 1)
                  tab.url = "about:blank";
              else
                  tab.close();
          }
      }
  },

  // returns the tab if it exists, else undefined
  logTab: function() {

    return require("./adnutil").AdnUtil.findTab(LogURL);
  },

  updateLogPage: function() {

    this.logHTMLWorker.port.emit('add-log-entry', this.logJSON);
  },

  warn: function(msg, notify) {

    msg = "[*WARN*]\n     " + msg;
    require("./adnutil").AdnUtil.warn(msg);
    this.log(msg, notify);
  },

  err: function(msg, e) {

    var Util = require("./adnutil").AdnUtil;

    msg = "[ERROR]" + this.line(90) + "\n" + msg + "\n";

    Util.error(msg);
    this.log(msg);

    if (e)
      Util.exception(e);
    else
      Util.trace();
  },

  alert: function(message, title) {

    if (!message) return;

    title = title || 'AdNauseam';

    this.log("Alert: " + message);

    this.prompts && (this.prompts.alert(null, title, message));
  },

  notify: function(message, title, url, noLog) {

    if (!message) return;

    title = title || 'AdNauseam';

    if (!noLog)
      this.log("Notify: " + message.replace(/[\r\n]/, ' '));

    if (message.length <= 100) message = '\n' + message;

    try {

      if (url) {
        var listener = {
          observe: function(subject, topic, data) {
            if (topic === 'alertclickcallback') // ??
              require("./uiman").UIManager.openInTab(data);
          }
        };
        this.alertsService.showAlertNotification(Data.url('img/adn_active.png'),
          title, message, true, url, listener);
      } else {
        this.alertsService.showAlertNotification(Data.url('img/adn_active.png'),
          title, message);
      }
    } catch (e) {

      // This can fail on Mac OS X
      require("./adnutil").AdnUtil.warn("No notification!", e); // TODO: remove
    }
  }

});

exports.Logger = Logger();
