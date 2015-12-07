/*
this content script is used only for our automated testing (via selenium)
 */

/*global self */
self.port && self.port.on('insert-count', function(json) {
    var adndiv = $('#adnauseam-count');
    if (!adndiv.length) {
        $('body').append('<div id="adnauseam-count" count="0"/>');
        //console.log("Inject: #adnauseam-count");
    }
    adndiv.attr('count', json.count);
    //console.log("adndiv.attr('count', "+json.count+")");
    console.log("INSERT_COUNT("+json.count+")="+$('#adnauseam-count').attr('count'));
});
