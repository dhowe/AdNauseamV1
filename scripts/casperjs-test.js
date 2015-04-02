// casperjs-test.js

var tests = [
  { name: 'adsense-1',  url: 'https://www.google.com/search?q=jewelry&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg' },
  { name: 'adsense-2',  url: 'https://www.google.com/search?q=jewelry&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg' },
  { name: 'adsense-3',  url: 'https://www.google.com/search?q=jewelry&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg' },
  { name: 'yahoo',      url: 'https://search.yahoo.com/yhs/search?p=prada&ei=UTF-8&hspart=mozilla&hsimp=yhs-001'},
  // { name: 'bing',       url: 'http://www.bing.com/search?q=shopping&pc=MOZI&form=MOZSBR'},
  { name: 'duckduckgo', url: 'https://duckduckgo.com/?q=shopping&t=ffsb&ia=about'},
  { name: 'ebay',       url: 'http://www.ebay.com/sch/i.html?_odkw=shopping&mfe=search&clk_rvr_id=805883700840&_osacat=0&_from=R40&_trksid=p2045573.m570.l1313.TR0.TRC0.H0.Xasdfsdf.TRS0&_nkw=asdfsdf&_sacat=0'},
  { name: 'aol',        url: 'http://search.aol.com/aol/search?enabled_terms=&s_it=comsearch&q=fund&s_chn=prt_aol20'}
];

var elemhide = require('../data/elemhide'), getMatcher = elemhide.getMatcher;

casper.test.begin('Text Ad detection test', 1, function suite(test) {

    casper.start();

    casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:36.0) Gecko/20100101 Firefox/36.0');
    
    var matcher = getMatcher(tests[0].name);

    casper.start(tests[0].url, function() {
        test.assertExists(matcher.selector, "Selector: " + matcher.selector + " is found.");
    });

    casper.run(function() {
        test.done();
    });
});