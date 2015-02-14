// NOTE: this file should be 'assume-unchanged' in git

// configs for testing the addon-UI (menu/advault/log)
var TEST_MODE = 0,
    TEST_PAGE = 'https://hk.yahoo.com/?p=us',
    TEST_ADS = '../lib/test/test-ad-data.json';
    
if (typeof exports != 'undefined') {

    // configs for testing the addon-core
    exports.PARSER_TEST_MODE =  0;//"update";
    exports.PARSER_TEST_PAGE = 'http://www.nytimes.com/';
    exports.PARSER_TEST_ADS =  '~/Documents/javascript-workspace/AdNauseam/lib/test/test-ad-data.json';
}
