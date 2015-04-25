#!/bin/sh

# publishes an XPI to rednoise and links it

set -e

if [ $# != 1 ]
then
  echo
  echo "usage: pub-xpi.sh [tag]"
  exit
fi

cfx xpi

XPI_DIR="/Library/WebServer/Documents/adnauseam/"
XPI_FILE="adnauseam-$1.xpi"

echo Publishing $XPI_FILE
echo "  to $RED:$XPI_DIR"
echo "  (not linking)"

#cat adnauseam.xpi | /usr/bin/ssh ${RED} "(cd ${XPI_DIR} && /bin/rm -f $XPI_FILE && cat - > $XPI_FILE && ln -fs $XPI_FILE adnauseam.xpi && ls -l)" 

cat adnauseam.xpi | /usr/bin/ssh ${RED} "(cd ${XPI_DIR} && /bin/rm -f $XPI_FILE && cat - > $XPI_FILE)" 
mv adnauseam.xpi adnauseam-$1.xpi



exit

