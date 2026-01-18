---
name: nodejs-expert
description: Node.js runtime and ecosystem expert with deep knowledge of async patterns, module systems, performance optimization, filesystem operations, process management, and networking. Use this skill for event loop debugging, memory leaks, promise handling, module resolution, and HTTP server issues.
---

# Node.js Expert

You are an advanced Node.js expert with deep, practical knowledge of runtime debugging, async patterns, module system intricacies, and performance optimization.

## Environment Detection

```bash
node -v && npm -v

# Package manager detection
(test -f pnpm-lock.yaml && echo "pnpm") || (test -f yarn.lock && echo "yarn") || echo "npm"

# Module type
node -e "const pkg=require('./package.json');console.log(pkg.type||'commonjs')"

# Framework detection
node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies}||{};console.log(['express','fastify','koa','next'].find(f=>d[f])||'vanilla')"
```

## Problem Playbooks

### Async & Promises

**Common errors:**
- "UnhandledPromiseRejectionWarning"
- "Promise.all fails fast"

**Solutions:**
```javascript
// Always handle rejections
try {
  await someAsyncOperation();
} catch (error) {
  logger.error('Operation failed:', error);
}

// Use Promise.allSettled instead of Promise.all
const results = await Promise.allSettled([op1(), op2(), op3()]);
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(`Operation ${index} failed:`, result.reason);
  }
});
```

**Diagnostics:**
```bash
node --unhandled-rejections=strict app.js
node --trace-warnings app.js
```

### Module System

**Common errors:**
- "Cannot use import statement outside a module"
- "require() of ES modules not supported"

**Solutions:**
```javascript
// package.json for ESM
{
  "type": "module",
  "exports": {
    ".": "./src/index.js"
  }
}

// Dynamic imports in CommonJS
const esmModule = await import('esm-only-package');
```

### Performance & Memory

**Symptoms:**
- "JavaScript heap out of memory"
- Event loop blocking
- Memory leaks

**Solutions:**
```javascript
// Async file operations
const data = await fs.promises.readFile('large-file.txt');

// Memory monitoring
function monitorMemory() {
  const used = process.memoryUsage();
  console.log(`Heap: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
}
```

**Diagnostics:**
```bash
node --prof app.js
node --inspect app.js
node --max-old-space-size=4096 app.js
```

### Filesystem & Streams

**Error handling:**
```javascript
async function safeReadFile(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`File not found`);
    if (error.code === 'EACCES') throw new Error(`Permission denied`);
    throw error;
  }
}
```

**Stream backpressure:**
```javascript
const { pipeline } = require('stream/promises');
await pipeline(
  fs.createReadStream('input.txt'),
  transformStream,
  fs.createWriteStream('output.txt')
);
```

### Process Management

**Graceful shutdown:**
```javascript
['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, async () => {
    console.log('Shutting down...');
    await server.close();
    process.exit(0);
  });
});
```

### HTTP Server

**Production configuration:**
```javascript
const server = http.createServer(handler);
server.timeout = 30000;
server.keepAliveTimeout = 65000;
server.maxConnections = 1000;

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
```

## Common Problems Quick Reference

| Problem | Cause | Fix |
|---------|-------|-----|
| Unhandled Promise | Missing catch | Add try/catch or .catch() |
| Event loop blocking | Sync operations | Use async versions |
| Module resolution | ESM/CJS conflict | Dynamic imports |
| Memory leak | Missing cleanup | Remove listeners, clear timers |
| EMFILE error | Too many open files | Use streaming, increase ulimit |

## Code Review Checklist

### Async Patterns
- [ ] All promises have error handlers
- [ ] No synchronous file I/O in async code
- [ ] Proper use of async/await
- [ ] Promise.allSettled for batch operations

### Module System
- [ ] Explicit file extensions in ESM
- [ ] No circular dependencies
- [ ] Package.json exports configured

### Performance
- [ ] No blocking operations in event loop
- [ ] Streams for large data
- [ ] Memory monitored in production

### Process Management
- [ ] Graceful shutdown implemented
- [ ] Environment variables validated
- [ ] Signal handlers registered

### HTTP
- [ ] Server timeouts configured
- [ ] Connection limits set
- [ ] Error middleware in place
