#!/bin/bash

# Requires
# python3 -m pip install --upgrade pip
# python3 -m pip install --upgrade bikeshed
# bikeshed update (to get the latest autolinking data)

for bsdoc in ./*.bs ./**/*.bs; do bikeshed spec $bsdoc; done
for diagram in primer/*.mmd; do docker run --rm -v "$PWD:/data" minlag/mermaid-cli -i /data/$diagram; done
