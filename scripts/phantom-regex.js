// to be run via phantomjs: $ phantomjs phantom-regex.js

/*global phantom */

var tests = [
  { name: 'adsense-1',  url: 'https://www.google.com/search?q=jewelry&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg' },
  { name: 'adsense-2',  url: 'https://www.google.com/search?q=jewelry&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg' },
  { name: 'adsense-3',  url: 'https://www.google.com/search?q=jewelry&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg' },
  { name: 'yahoo',      url: 'https://search.yahoo.com/yhs/search?p=prada&ei=UTF-8&hspart=mozilla&hsimp=yhs-001'},
  { name: 'bing',       url: 'http://www.bing.com/search?q=shopping&pc=MOZI&form=MOZSBR'},
  { name: 'duckduckgo', url: 'https://duckduckgo.com/?q=shopping&t=ffsb&ia=about'},
  { name: 'ebay',       url: 'http://www.ebay.com/sch/i.html?_odkw=shopping&mfe=search&clk_rvr_id=805883700840&_osacat=0&_from=R40&_trksid=p2045573.m570.l1313.TR0.TRC0.H0.Xasdfsdf.TRS0&_nkw=asdfsdf&_sacat=0'},
  { name: 'aol',        url: 'http://search.aol.com/aol/search?enabled_terms=&s_it=comsearch&q=fund&s_chn=prt_aol20'}
];

var page = require('webpage').create(), elemhide = require('../data/elemhide'), getMatcher = elemhide.getMatcher;

// Firefox 36 for Mac user-agent
page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:36.0) Gecko/20100101 Firefox/36.0';
//console.log('user-agent: ' + page.settings.userAgent);


// NEXT: call each test in a loop (you may need to use CasperJS for this)


function openPage(test) {

    var matcher = getMatcher(test.name);

    page.open(test.url, function() {
    
        page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function(re) {

            var data = page.evaluate(function(selector) {
        
                return $(selector);
                
            }, matcher.selector);
            
            console.log(test.name + ' [' + matcher.selector + '] matched: ' + (data.length > 0));
            
            phantom.exit();       
        });
    });
}

openPage(tests[0]);




/*
page.open(url[1], function() {
  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
    page.render('firefox.png');
    var data = page.evaluate(function() {
      return {
        'dotAdsUl': $(".ads ul").length
      };
    });
    console.log(".ads ul: ", data.dotAdsUl);

    // remove "Unsafe JavaScript attempt" error
    setTimeout(function(){
      phantom.exit();
    }, 0);
  });
});

page.open(url[2], function() {
  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
    page.render('bing.png');
    var data = page.evaluate(function() {
      return {
        'bAd': $(".b_ad").length
      };
    });
    console.log(".b_ad: ", data.bAd);

    // remove "Unsafe JavaScript attempt" error
    setTimeout(function(){
      phantom.exit();
    }, 0);
  });
});

page.open(url[3], function() {
  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
    page.render('duckduckgo.png');
    var data = page.evaluate(function() {
      return {
        'ads': $("#ads").length
      };
    });
    console.log("#ads: ", data.ads);

    // remove "Unsafe JavaScript attempt" error
    setTimeout(function(){
      phantom.exit();
    }, 0);
  });
});


page.open(url[4], function() {
  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
    page.render('ebay.png');
    var data = page.evaluate(function() {
      return {
        'ads': $("#rtm_html_441").length
      };
    });
    console.log("#rtm_html_441: ", data.ads);

    // remove "Unsafe JavaScript attempt" error
    setTimeout(function(){
      phantom.exit();
    }, 0);
  });
});


page.open(url[5], function() {
  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
    page.render('duckduckgo.png');
    var data = page.evaluate(function() {
      return {
        'ads': $("[class$=SLL]").length
      };
    });
    console.log("[class$=SLL]: ", data.ads);

    // remove "Unsafe JavaScript attempt" error
    setTimeout(function(){
      phantom.exit();
    }, 0);
  });
});
*/
