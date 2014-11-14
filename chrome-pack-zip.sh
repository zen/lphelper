#!/bin/bash

rm -f lphelper.zip

zip -q -9 -r lphelper.zip src/*
zip -q -9 -r lphelper.zip manifest.json
zip -q -9 -r lphelper.zip logo128.png
