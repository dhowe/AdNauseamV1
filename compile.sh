#!/bin/sh

# duplicate the working directory
echo "Duplicating..."
cp -r adnauseam adnauseam_renamed
cd adnauseam

# package things up
echo "Zipping..."

#cd chrome
#rm -f adnauseam.jar
#zip -rq adnauseam.jar content skin locale
#jar tf adnauseam.jar
#rm -rf content skin locale
#cd ..

rm -f ../adnauseam-only.xpi
zip -rq ../adnauseam-only.xpi . 

# revert & back out
echo "Cleaning..."
cd ..
rm -rf adnauseam
mv adnauseam_renamed adnauseam

zip -q adnauseam.xpi *.xpi install.rdf 

exit 0
