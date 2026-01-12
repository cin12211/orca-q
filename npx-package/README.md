# OrcaQ

The open source database editor - run locally via npx.

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
