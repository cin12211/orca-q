#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo  "${PURPLE}Step 1:${NC} ${GREEN}Starting build process...${NC}"

# Step 2: Build Nuxt application
echo  "${PURPLE}Step 2:${NC} ${GREEN}Building Nuxt application...${NC}"
npm run nuxt:generate

# Step 3: Create buildlectron directory
echo  "${PURPLE}Step 3:${NC} ${GREEN}Creating buildlectron directory...${NC}"
rm -rf .electron-build
mkdir .electron-build

# Step 4: Copy electron-app files
echo  "${PURPLE}Step 4:${NC} ${GREEN}Copying electron-app files...${NC}"
cp -r electron/* .electron-build/

# Step 5: Copy Nuxt dist files
echo  "${PURPLE}Step 5:${NC} ${GREEN}Copying Nuxt dist files...${NC}"
cp -r .output/public/_nuxt .electron-build/src/renderer/public
cp -r .output/public/index.html .electron-build/src/renderer

# Step 6: Navigate to build directory and install dependencies
echo  "${PURPLE}Step 6:${NC} ${GREEN}Installing dependencies in .electron-build...${NC}"
cd .electron-build
bun install

# Step 7: Build electron application
echo  "${PURPLE}Step 7:${NC} ${GREEN}Building Electron application...${NC}"
npm run build:mac

# Step 8: Move built artifacts to parent directory
echo  "${PURPLE}Step 8:${NC} ${GREEN}Moving built artifacts...${NC}"
rm -rf ../.electron-out
mkdir ../.electron-out
cp -r dist/* ../.electron-out/

# Step 9: Optional cleanup
if [ "$1" == "-c" ]; then
    echo  "${PURPLE}Step 9:${NC} ${GREEN}Cleaning up build directory...${NC}"
    cd ..
    rm -rf .electron-build
fi

echo  "${GREEN}Build process completed successfully!${NC}"