// to be run via phantomjs

/*global phantom */

var url = [
  "https://www.google.com/search?q=jewelry&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg",
  "https://search.yahoo.com/yhs/search?p=prada&ei=UTF-8&hspart=mozilla&hsimp=yhs-001",
  "http://www.bing.com/search?q=shopping&pc=MOZI&form=MOZSBR",
  "https://duckduckgo.com/?q=shopping&t=ffsb&ia=about",
  "http://www.ebay.com/sch/i.html?_odkw=shopping&mfe=search&clk_rvr_id=805883700840&_osacat=0&_from=R40&_trksid=p2045573.m570.l1313.TR0.TRC0.H0.Xasdfsdf.TRS0&_nkw=asdfsdf&_sacat=0",
  "http://search.aol.com/aol/search?enabled_terms=&s_it=comsearch&q=fund&s_chn=prt_aol20",


];

var page = require('webpage').create();

// Firefox 36 for Mac user-agent
page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:36.0) Gecko/20100101 Firefox/36.0';
console.log('User-agent: ' + page.settings.userAgent);


page.open(url[0], function() {

  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {

    page.render('google.png');

    var data = page.evaluate(function() {

      return {
        'tadsc': $("#tads.c").length,
        'ads': $("#bottomads").length,
        'ads2': $("#rhs_block > #mbEnd").length
      };
    });
    console.log("#tads.c: ", data.tadsc);
    console.log("#bottomads: ", data.ads);
    console.log("#rhs_block > #mbEnd: ", data.ads2);

    // remove "Unsafe JavaScript attempt" error
    setTimeout(function(){
      phantom.exit();
    }, 0);
  });
});

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
