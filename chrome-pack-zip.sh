#!/bin/bash

rm -f lphelper.zip

zip -q -9 -r lphelper.zip lib/*
zip -q -9 -r lphelper.zip manifest.json
zip -q -9 -r lphelper.zip data/*
