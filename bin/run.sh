#!/usr/bin/env bash
export NODE_ENV=production
node -r ./dist/tsconfig-paths-bootstrap.js dist/index.js $@
