# Configuration Guide for pi-k8s-ctx

## Overview

You can customize where `pi-k8s-ctx` looks for kubeconfig files and where it writes the active config.

## Configuration Methods (Priority Order)

### 1. Environment Variables (Highest Priority)

```bash
# In your shell profile (~/.zshrc, ~/.bashrc, etc.)
export K8S_CTX_CONFIG_DIR="$HOME/.kube/myconfigs"
export K8S_CTX_TMP_FILE="$HOME/tmp/current-kube"
```

Or use the alternative name:
```bash
export KUBECONFIG_DIR="$HOME/.kube/myconfigs"
```

### 2. Config File

Create `~/.pi/k8s-ctx.json`:

```bash
./scripts/k8s-ctx.mjs init ~/.kube/myconfigs ~/tmp/current-kube
```

Or manually create `~/.pi/k8s-ctx.json`:
```json
{
  "configDir": "/Users/yourname/.kube/myconfigs",
  "tmpFile": "/Users/yourname/tmp/current-kube"
}
```

### 3. Defaults (Lowest Priority)

If nothing is configured:
- **Config directory**: `~/.kube/confignopass`
- **Temp file**: `~/tmp/kube`

## Commands

### Show Current Configuration

```bash
./scripts/k8s-ctx.mjs config
```

Or in pi:
```
/ctx config
```

Output:
```
Current configuration:
  Config directory: /Users/yourname/.kube/confignopass
  Temp file:        /Users/yourname/tmp/kube
```

### Initialize Config File

```bash
# Use custom paths
./scripts/k8s-ctx.mjs init ~/.kube/myconfigs ~/tmp/my-kube

# Use default config dir, custom tmp file
./scripts/k8s-ctx.mjs init "" ~/tmp/my-kube

# Use custom config dir, default tmp file
./scripts/k8s-ctx.mjs init ~/.kube/myconfigs
```

## Examples

### Example 1: Different Config Directory

If your kubeconfigs are in `~/.kube/configs`:

**Option A: Environment Variable**
```bash
echo 'export K8S_CTX_CONFIG_DIR="$HOME/.kube/configs"' >> ~/.zshrc
source ~/.zshrc
```

**Option B: Config File**
```bash
~/.pi/agent/packages/pi-k8s-ctx/scripts/k8s-ctx.mjs init ~/.kube/configs
```

### Example 2: Custom Output File

If you want to write to `~/.kube/current`:

```bash
echo 'export K8S_CTX_TMP_FILE="$HOME/.kube/current"' >> ~/.zshrc
source ~/.zshrc
```

## Verify Configuration

```bash
# Check what will be used
~/.pi/agent/packages/pi-k8s-ctx/scripts/k8s-ctx.mjs config

# Test listing
~/.pi/agent/packages/pi-k8s-ctx/scripts/k8s-ctx.mjs list
```

## Config File Format

The config file (`~/.pi/k8s-ctx.json`) is simple JSON:

```json
{
  "configDir": "/full/path/to/your/kubeconfigs",
  "tmpFile": "/full/path/to/output/file"
}
```

Both fields are optional. Omitted fields use defaults.

## Notes

- Config files must still follow the pattern: `<name>-config`
- The config directory should contain files like:
  - `lab1-config`
  - `prod-config`
  - `dev-config`
- The temp file will be created/overwritten on context switch
- To apply in shell: `source <tmpFile>`
