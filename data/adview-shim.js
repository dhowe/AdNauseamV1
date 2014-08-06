console.log("****adview-shim****");
$(document).ready(function(){

	msg("ADNShowLog");
});
var ads = self.options.ads;
unsafeWindow.options = cloneInto( { "ads" : ads }, unsafeWindow);

function msg(m) { addon.port.emit(m); }