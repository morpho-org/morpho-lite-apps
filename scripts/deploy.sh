#!/bin/bash

# inspired from https://gist.github.com/rbalicki2/30e8ee5fb5bc2018923a06c5ea5e3ea5

basedir="dist"
app=$1
bucket=$2
echo "You are deploying $app on $bucket"

aws s3 sync \
  ./apps/$app/$basedir \
  s3://$bucket \
  --delete \
  --cache-control max-age=0,no-cache

if [ $? -ne 0 ]; then
  echo "***** Failed sync $app to $bucket (html)"
  exit 1
fi
(cd apps/$app/$basedir &&
  find . -type f -name '*.html' | while read HTMLFILE; do
    HTMLFILESHORT=${HTMLFILE:2}
    HTMLFILE_WITHOUT_INDEX=${HTMLFILESHORT::${#HTMLFILESHORT}-5}

    # cp /about/index.html to /about
    aws s3 cp s3://$bucket/${HTMLFILESHORT} \
      s3://$bucket/$HTMLFILE_WITHOUT_INDEX \
       --content-type "text/html";

    if [ $? -ne 0 ]; then
      echo "***** Failed renaming build to $bucket (html)"
      cd $pwd
      exit 1
    fi
done)