#!/bin/sh

PROFILE=AdNauseamProf
PROFDIR=~/Documents/ff-profs/thg2jar2.AdNauseamProf

/bin/ps -ef | grep $PROFILE | grep -v grep | awk '{print $2}' | xargs kill -9

./compile.sh

rm -rf "${PROFDIR}/extensions/development@rednoise.org"
rm -rf "${PROFDIR}/extensions/development@rednoise.org.xpi"
cp -r adnauseam "${PROFDIR}/extensions/development@rednoise.org"

/Applications/Firefox.app/Contents/MacOS/firefox-bin -no-remote -P $PROFILE &
