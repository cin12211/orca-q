# <img src="https://orca-q.com/images/logo.png" width="32"> OrcaQ - Next Generation database editor

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](TODO)
[![Version](https://img.shields.io/badge/version-1.0.4-blue.svg)](package.json)

## Orca Query

<img src="https://orca-q.com/images/editor-preview.png" style="border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);" >
 
## Quick Start

```bash
npx orcaq
```

This will start OrcaQ on `http://localhost:9432` and open your browser automatically.

## Options

```bash
npx orcaq [options]

Options:
  -p, --port <port>   Port to run the server on (default: 9432)
  -h, --host <host>   Host to bind to (default: 0.0.0.0)
  --no-open           Don't open browser automatically
  --help              Show help message
```

## Examples

```bash
# Run on custom port
npx orcaq --port 9432

# Run on localhost only
npx orcaq --host localhost

# Run without opening browser
npx orcaq --no-open
```

## Learn More

- [Website](https://orca-q.com/)
- [GitHub](https://github.com/cin12211/orca-q)
- [Report Issues](https://github.com/cin12211/orca-q/issues)

## License

MIT
