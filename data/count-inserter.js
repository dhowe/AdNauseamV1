
/*global self */
self.port && self.port.on('insert-count', function(json) { 
    var adndiv = $('#adnauseam-count');
    if (!adndiv.length) 
        $('body').append('<div id="adnauseam-count" count="0" automated="'+json.automated+'"/>');
    adndiv.attr('count', json.count);
    console.log("CS.INSERT_COUNT="+$('#adnauseam-count').attr('count')+"  AUTO="+$('#adnauseam-count').attr('automated'));
});