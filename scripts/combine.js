#!/bin/sh

# combines/minimizes all packery bower components

uglifyjs lib/packery/bower_components/get-style-property/get-style-property.js lib/packery/bower_components/get-size/get-size.js lib/packery/bower_components/matches-selector/matches-selector.js lib/packery/bower_components/eventEmitter/EventEmitter.js lib/packery/bower_components/eventie/eventie.js lib/packery/bower_components/doc-ready/doc-ready.js lib/packery/bower_components/classie/classie.js lib/packery/bower_components/outlayer/item.js lib/packery/bower_components/outlayer/outlayer.js lib/packery/js/rect.js lib/packery/js/packer.js lib/packery/js/item.js lib/packery/js/packery.js -o packery.min.js
