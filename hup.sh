#!/bin/sh

PROFILE=AdNauseamProf
PROFDIR=thg2jar2.AdNauseamProf

/bin/ps -ef | grep $PROFILE | grep -v grep | awk '{print $2}' | xargs kill -9

./compile.sh

rm -rf "/Users/dhowe/Library/Application Support/Firefox/Profiles/${PROFDIR}/extensions/development@rednoise.org"
rm -rf "/Users/dhowe/Library/Application Support/Firefox/Profiles/${PROFDIR}/extensions/development@rednoise.org.xpi"

cp -r adnauseam "/Users/dhowe/Library/Application Support/Firefox/Profiles/${PROFDIR}/extensions/development@rednoise.org"

/Applications/Firefox.app/Contents/MacOS/firefox-bin -no-remote -P $PROFILE &
