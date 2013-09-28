#!/bin/sh

killall firefox-bin

./compile.sh

rm -rf "/Users/dhowe/Library/Application Support/Firefox/Profiles/3i6yox33.DEV-AddArt/extensions/development@add-art.org"

cp -r addart "/Users/dhowe/Library/Application Support/Firefox/Profiles/3i6yox33.DEV-AddArt/extensions/development@add-art.org"

/Applications/Firefox.app/Contents/MacOS/firefox-bin -no-remote -P DEV-AddArt &
