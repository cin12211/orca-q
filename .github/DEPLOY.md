# Deployment Guide

This guide explains how to set up and use the automated CI/CD pipeline for OrcaQ.

## Overview

When code is merged to the `main` branch, GitHub Actions automatically:

1. **Builds and pushes a Docker image** to Docker Hub with version tags
2. **Builds and publishes the NPX package** to npm

## Required Setup

### 1. GitHub Secrets Configuration

You must configure these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

#### `DOCKERHUB_USERNAME`

Your Docker Hub username (e.g., `cin12211`)

#### `DOCKERHUB_TOKEN`

Docker Hub access token (NOT your password):

1. Log in to [Docker Hub](https://hub.docker.com)
2. Go to Account Settings → Security → Access Tokens
3. Click "New Access Token"
4. Name it `github-actions` with Read & Write permissions
5. Copy the token and add it as a GitHub secret

#### `NPM_TOKEN`

npm automation token with publish permissions:

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Click your profile → Access Tokens → Generate New Token
3. Select "Automation" type (for CI/CD)
4. Copy the token and add it as a GitHub secret

### 2. Verify Repository Settings

Ensure your repository has:

- GitHub Actions enabled (Settings → Actions → General)
- Workflow permissions set to "Read and write permissions"

## How It Works

### Workflow Triggers

The workflow automatically runs when:

- Code is pushed to the `main` branch
- A pull request is merged to `main`

### Docker Build Process

1. Checks out code
2. Sets up Docker Buildx for advanced builds
3. Authenticates with Docker Hub
4. Extracts version from `package.json`
5. Builds Docker image using your `Dockerfile`
6. Pushes with two tags:
   - `<username>/orcaq:<version>` (e.g., `cin12211/orcaq:1.0.20`)
   - `<username>/orcaq:latest`

### NPX Package Build Process

1. Checks out code
2. Installs Bun runtime
3. Installs dependencies with `bun install`
4. Builds Nuxt web app (`bun run nuxt:build-web`)
5. Runs NPX build script (`node scripts/build-npx.mjs`)
6. Publishes to npm as public package

## Version Management

The version is controlled by `package.json` in the root directory.

### To Release a New Version

```bash
# Patch version (1.0.20 → 1.0.21)
npm run version:patch

# Minor version (1.0.20 → 1.1.0)
npm run version:minor

# Major version (1.0.20 → 2.0.0)
npm run version:major

# Commit and push to trigger deployment
git add package.json
git commit -m "chore: bump version to $(node -p "require('./package.json').version")"
git push origin main
```

The `build-npx.mjs` script automatically syncs the version to `npx-package/package.json`.

## Monitoring Deployments

### GitHub Actions Dashboard

1. Go to your repository on GitHub
2. Click the "Actions" tab
3. Monitor running workflows in real-time
4. View logs for debugging

### Verify Docker Deployment

```bash
# Pull the latest image
docker pull <your-dockerhub-username>/orcaq:latest

# Run locally
docker run -p 3000:3000 <your-dockerhub-username>/orcaq:latest

# Access at http://localhost:3000
```

### Verify NPX Package

```bash
# Install and run the latest version
npx orcaq@latest

# Or specify a version
npx orcaq@1.0.20
```

## Troubleshooting

### Docker Push Fails

**Error**: `denied: requested access to the resource is denied`

**Solution**:

- Verify `DOCKERHUB_TOKEN` has write permissions
- Check that `DOCKERHUB_USERNAME` matches your Docker Hub account
- Ensure the repository exists on Docker Hub (it will be created automatically on first push)

### NPM Publish Fails

**Error**: `403 Forbidden` or `401 Unauthorized`

**Solution**:

- Verify `NPM_TOKEN` is an "Automation" token
- Check that the token has publish permissions
- Ensure the package name `orcaq` is available (or you own it)

### Build Fails

**Error**: Build errors in logs

**Solution**:

- Test locally first: `npm run nuxt:build-web`
- Test NPX build: `npm run npx:build`
- Check that all dependencies are in `package.json`
- Review GitHub Actions logs for specific error messages

### Version Conflict

**Error**: `version already published`

**Solution**:

- Bump the version in `package.json` before pushing
- Use the version scripts: `npm run version:patch`
- Each npm publish requires a unique version number

## Manual Deployment

If needed, you can trigger deployments manually:

### Docker

```bash
# Build and push manually
docker build -t <your-username>/orcaq:$(node -p "require('./package.json').version") .
docker push <your-username>/orcaq:$(node -p "require('./package.json').version")
```

### NPX Package

```bash
# Build and publish manually
npm run npx:build
cd npx-package
npm publish --access public
```

## Security Best Practices

1. **Never commit tokens** to the repository
2. **Use GitHub Secrets** for all sensitive values
3. **Rotate tokens** periodically (every 90 days recommended)
4. **Use scoped tokens** with minimum required permissions
5. **Enable 2FA** on Docker Hub and npm accounts

## Advanced Configuration

### Skip Publishing

To push to main without triggering deployment, include `[skip ci]` in your commit message:

```bash
git commit -m "docs: update README [skip ci]"
```

### Conditional Publishing

To only publish when version changes, you can modify the workflow to check git tags or compare versions.

### Add Deployment Notifications

Consider adding Slack, Discord, or email notifications on successful deployments by adding notification steps to the workflow.

## Support

For issues with the deployment pipeline:

1. Check GitHub Actions logs
2. Review this documentation
3. Open an issue on the repository
4. Contact the maintainers

---

**Note**: Both jobs run in parallel for faster deployment. The entire process typically takes 5-10 minutes depending on build complexity.
