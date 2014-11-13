#!/bin/bash

CHROME_BIN=chromium

pushd ..

$CHROME_BIN --pack-extension=lphelper
mv lphelper.pem lphelper/
mv lphelper.crx lphelper/

popd
