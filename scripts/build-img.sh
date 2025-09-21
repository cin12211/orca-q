#!/bin/bash
set -e

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
IMAGE="cinny09/orca-q"

echo "Building version: $VERSION"

# Build with version
docker build --platform=linux/amd64 -t $IMAGE:$VERSION .

# Tag as latest
docker tag $IMAGE:$VERSION $IMAGE:latest

# Push both
docker push $IMAGE:$VERSION
docker push $IMAGE:latest
 
