/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

/**
 * Shortcut for document.getElementById(id)
 */
function E(id)
{
	return document.getElementById(id);
}

/**
 * Formats a unix time according to user's locale.
 * @param {Integer} time  unix time in milliseconds
 * @return {String} formatted date and time
 */
function formatTime(time)
{
	if(!time) {
		return '';
	}
	
	try
	{
		let date = new Date(time);
		let fmt = Components.classes["@mozilla.org/intl/scriptabledateformat;1"].createInstance(Components.interfaces.nsIScriptableDateFormat);
		return fmt.FormatDateTime("", Ci.nsIScriptableDateFormat.dateFormatShort,
																							Ci.nsIScriptableDateFormat.timeFormatNoSeconds,
																							date.getFullYear(), date.getMonth() + 1, date.getDate(),
																							date.getHours(), date.getMinutes(), date.getSeconds());
	}
	catch(e)
	{
		// Make sure to return even on errors
		Cu.reportError(e);
		return "";
	}
}