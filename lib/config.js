// NOTE: this file is 'assume-unchanged' in git

// configs for the addon-UI (menu/advault/log)
var TEST_MODE = false,
	TEST_PAGE = "http://www.nytimes.com/",
	TEST_ADS = "../lib/test/test-ad-data.json";
	// TEST_ADS = "../lib/test/lots-of-ads.json";


if ( typeof exports != 'undefined') {

	// configs for the addon-core
	exports.PARSER_TEST_UPDATES = false;
	exports.PARSER_TEST_INSERTS = false;
	exports.PARSER_TEST_PAGE = "http://www.nytimes.com/";
}
