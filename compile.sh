#!/bin/sh

# duplicate the working directory
echo "Duplicating..."
cp -r addart addart_renamed
cd addart

# package things up
echo "Zippin..."
cd chrome
rm -f addart.jar
zip -rq addart.jar content skin locale
rm -rf content skin locale
cd ..
rm -f ../addart-build.xpi
zip -rq ../addart-build.xpi .

# revert & back out
echo "Cleaning up..."
cd ..
rm -rf addart
mv addart_renamed addart

zip -q addart.xpi *.xpi install.rdf 

exit 0
