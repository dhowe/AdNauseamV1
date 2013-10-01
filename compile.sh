#!/bin/sh

# duplicate the working directory
echo "Duplicating..."
cp -r addart addart_renamed
cd addart

# package things up
echo "Zipping..."
cd chrome
rm -f addart.jar
zip -rq addart.jar content skin locale
rm -rf content skin locale
cd ..
rm -f ../adnauseum-only.xpi
zip -rq ../adnauseum-only.xpi .

# revert & back out
echo "Cleaning..."
cd ..
rm -rf addart
mv addart_renamed addart

zip -q adnauseum.xpi *.xpi install.rdf 

exit 0
