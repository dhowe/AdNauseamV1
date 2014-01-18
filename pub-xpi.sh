#!/bin/sh

if [ $# != 1 ]
then
  echo
  echo "usage: pub-xpi.sh [tag]"
  exit
fi


$ADDON_SDK/bin/cfx xpi

USR="dhowe"
XPI_DIR="/Library/WebServer/Documents/adnauseam/"
XPI_FILE="adnauseam-$1.xpi"

echo Publishing $XPI_FILE
echo "  to $RED:$XPI_DIR"

#scp adnauseam.xpi$RED:$XPI_DIR/$XPI_FILE

cat adnauseam.xpi | /usr/bin/ssh ${USR}@${RED} "(cd ${XPI_DIR} && /bin/rm -f $XPI_FILE && cat - > $XPI_FILE && ln -fs $XPI_FILE adnauseam.xpi && ls -l)" 
rm www/adnauseam*.xpi
mv adnauseam.xpi www/adnauseam-$1.xpi
cd www
ln -s adnauseam-$1.xpi adnauseam.xpi

# mv $XPI_FILE xpi
