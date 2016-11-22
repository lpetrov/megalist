PATH  := node_modules/.bin:$(PATH)
SHELL := /bin/bash

dist_file = dist/megalist.js
dist_minified_file = dist/megalist.min.js
dist_vendorpack_file = dist/megalist.incl.vendors.js
dist_vendorpack_min_file = dist/megalist.incl.vendors.min.js
minify_options = --screw-ie8

.PHONY: all test

clean:
	rm -rf dist/*

$(dist_minified_file): $(dist_file)
	uglifyjs $(minify_options) -cmo dist/megalist.min.js dist/megalist.js

$(dist_file): clean
	cp src/megalist.js $(dist_file)

$(dist_vendorpack_file): $(dist_file)
	cp src/vendor/perfect-scrollbar/js/perfect-scrollbar.js $(dist_vendorpack_file)
	cat src/megalist.js >> $(dist_vendorpack_file)
	mkdir dist/css/
	cp src/vendor/perfect-scrollbar/css/perfect-scrollbar.* dist/css/

$(dist_vendorpack_min_file): $(dist_vendorpack_file)
	uglifyjs $(minify_options) -cmo $(dist_vendorpack_min_file) $(dist_vendorpack_file)

test:
	./node_modules/karma/bin/karma start karma.conf.js

testci:
	./node_modules/karma/bin/karma start karma.conf.js --single-run

all: clean $(dist_file) $(dist_minified_file) $(dist_vendorpack_file) $(dist_vendorpack_min_file)
