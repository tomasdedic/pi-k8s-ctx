# pi-k8s-ctx

Kubernetes context switcher for Pi - slash command implementation.

## Installation

This package is already installed at:

```
~/.pi/agent/packages/pi-k8s-ctx/
```

## Quick Reference

```bash
/ctx switch              # Interactive picker
/ctx switch lab1         # Direct switch
/ctx current             # Show active context
/ctx list                # List all contexts
/ctx config              # Show configuration
```

## Documentation

See the installed package for full documentation:

- **README**: `~/.pi/agent/packages/pi-k8s-ctx/README.md`
- **Configuration**: `~/.pi/agent/packages/pi-k8s-ctx/CONFIGURATION.md`
- **Context Awareness**: `~/.pi/agent/packages/pi-k8s-ctx/CONTEXT_AWARENESS.md`

## Build

```bash
npm install
npx tsc
```

## Deploy

Copy to installed package:

```bash
cp scripts/*.mjs ~/.pi/agent/packages/pi-k8s-ctx/scripts/
cp extensions/*.js ~/.pi/agent/packages/pi-k8s-ctx/extensions/
```

## Source Files

This directory contains the source code. The compiled and working version is installed at `~/.pi/agent/packages/pi-k8s-ctx/`.
