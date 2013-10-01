#!/bin/sh

# duplicate the working directory
echo "Duplicating..."
cp -r adnauseum adnauseum_renamed
cd adnauseum

# package things up
echo "Zipping..."

#cd chrome
#rm -f adnauseum.jar
#zip -rq adnauseum.jar content skin locale
#jar tf adnauseum.jar
#rm -rf content skin locale
#cd ..

rm -f ../adnauseum-only.xpi
zip -rq ../adnauseum-only.xpi . 

# revert & back out
echo "Cleaning..."
cd ..
rm -rf adnauseum
mv adnauseum_renamed adnauseum

zip -q adnauseum.xpi *.xpi install.rdf 

exit 0
