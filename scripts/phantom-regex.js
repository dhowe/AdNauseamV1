// to be run via phantomjs 

/*global phantom */

var url="https://www.google.com/search?q=jewelry&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg";

var page = require('webpage').create();

console.log('User-agent: ' + page.settings.userAgent);

page.open(url, function() {

  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {

	page.render('google.png');

    var data = page.evaluate(function() {

        return { 
            'tads': $("#tads").length, 
            'tadsc': $("#tads.c").length 
        };
    });

    console.log("#tads: ", data.tads);
    console.log("#tads.c: ", data.tadsc);

    phantom.exit()
  });
});

