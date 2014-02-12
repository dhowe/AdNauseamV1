const { Cc, Ci, Cu } = require("chrome");
const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');

let AdnUtil = Class({

	extends : Unknown,
	
   	test : function() {
	}

});

exports.Util = AdnUtil();
