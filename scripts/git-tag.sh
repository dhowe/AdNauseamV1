#/bin/sh

set -e # die on errors 


if [ $# -lt "1"  ]
then
    echo
    echo "  error:   tag or version required"
    echo
    echo "  usage:   tag-release.sh [tag]" 
    exit
fi

VERSION=$1

cd ..

# commit your changes
git commit -am "Release v$VERSION"

# tag the commit
git tag -a v$VERSION -m "Release v$VERSION"

# push to GitHub
git push --force origin master --tags  
