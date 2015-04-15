/*global casper */

var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:36.0) Gecko/20100101 Firefox/36.0',
    url = 'https://www.google.com/search?q=apple&ie=utf-8&oe=utf-8',
    selector = '#tads.c',
    timeoutMs = 10000;
    

casper.test.begin("test1", 1, function(test) {

        casper.userAgent(userAgent);

        casper.start(url)

        .waitForSelector(selector, function() {

                test.assertExists(selector, 'selector: ' + selector);

            }, function timeout() {

                test.fail(selector + ' timed out after ' + timeoutMs + ' ms');

            }, timeoutMs)

        .run(function() {

                test.done();
            });
    });