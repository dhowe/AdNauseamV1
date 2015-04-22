// usage:  $ casperjs test casperjs-test.js

/*global casper */

var elemhide = require('../data/elemhide'),
    userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:36.0) Gecko/20100101 Firefox/36.0',
    timeoutMs = 10000,
    testData = [{
            name: 'amazon',
            url: 'https://www.amazon.com'
        }/*, {
            name: 'adsense-1',
            url: 'https://www.google.com/search?q=apple&ie=utf-8&oe=utf-8'
        }, {
            name: 'adsense-2',
            url: 'http://www.google.com/search?q=facial&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg'
        }, {
            name: 'adsense-3',
            url: 'http://www.google.com/search?q=facial&ie=utf-8&oe=utf-8&rls=org.mozilla:en-US:official&client=firefox-a&channel=sb&gws_rd=cr&ei=qdCBVOvaGYLYmAXO2oKgDg'
        }, {
            name: 'yahoo',
            url: 'https://search.yahoo.com/yhs/search;_ylt=AwrTcePFkiZVRqYALkgnnIlQ;_ylc=X1MDMTM1MTE5NTY4NwRfcgMyBGZyAwRncHJpZANUdmxKNnZkQlFZZTVxZUVOclk4RFhBBG5fcnNsdAMwBG5fc3VnZwMxMARvcmlnaW4Dc2VhcmNoLnlhaG9vLmNvbQRwb3MDMARwcXN0cgMEcHFzdHJsAwRxc3RybAM0BHF1ZXJ5A2RydWcEdF9zdG1wAzE0Mjg1OTEzMDg-?p=drug&fr2=sb-top-search&hspart=mozilla&hsimp=yhs-001'
        }, {
            name: 'bing',
            url: 'http://www.bing.com/search?q=shopping&pc=MOZI&form=MOZSBR'
        }, {
            name: 'duckduckgo',
            url: 'https://duckduckgo.com/?q=shopping&t=ffsb&ia=about'
        }, {
            name: 'ebay',
            url: 'http://www.ebay.com/sch/i.html?_odkw=shopping&mfe=search&clk_rvr_id=805883700840&_osacat=0&_from=R40&_trksid=p2045573.m570.l1313.TR0.TRC0.H0.Xasdfsdf.TRS0&_nkw=asdfsdf&_sacat=0'
        }, {
            name: 'aol',
            url: 'http://search.aol.com/aol/search?s_it=topsearchbox.search&s_chn=prt_aol20&v_t=comsearch&q=money'
        }, {
            name: 'zam',
            url: 'http://www.zam.com/'
        }*/
    ];

testData.forEach(function(td) {

        casper.test.begin(td.name, 1, function(test) {

                casper.userAgent(userAgent);

                var selector = elemhide.getMatcher(td.name).selector;

                casper.start(td.url)
                    .waitForSelector(selector, function() {

                        //this.capture('./images/' + td.name + '.png');
                        test.assertExists(selector, 'selector: ' + selector);

                    }, function timeout() {

                        test.fail(selector + ' timed out after ' + timeoutMs + ' ms');

                    }, timeoutMs)

                .run(function() {

                        test.done();
                    });
            });
    });