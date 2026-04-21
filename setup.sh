#!/bin/bash

# Requires
# python3 -m pip install --upgrade pip
# pipx install bikeshed
# bikeshed update (to get the latest autolinking data)

# Enable recursive globbing for **
shopt -s globstar

# 1. Generate ALL diagrams
for diagram in ./*.mmd ./**/*.mmd; do [ -f "$diagram" ] && docker run --rm -u $(id -u):$(id -g) -v "$PWD:/data" minlag/mermaid-cli -i "/data/$diagram"; done

# 2. Build ALL specs
for bsdoc in ./*.bs ./**/*.bs; do [ -f "$bsdoc" ] && bikeshed spec "$bsdoc"; done