#!/bin/sh

if [ $# != 1 ]
then
  echo
  echo "usage: pub-xpi.sh [tag]"
  exit
fi

USR="dhowe"
XPI_DIR="/Library/WebServer/Documents/adnauseam/"
XPI_FILE="adnauseam-$1.xpi"

echo publishing $XPI_FILE
echo         to $RED:$XPI_DIR...

#scp adnauseam.xpi$RED:$XPI_DIR/$XPI_FILE

cat adnauseam.xpi | /usr/bin/ssh ${USR}@${RED} "(cd ${XPI_DIR} && /bin/rm -f $XPI_FILE && cat - > $XPI_FILE && ln -fs $XPI_FILE adnauseam.xpi && ls -l)" 
# mv $XPI_FILE xpi
