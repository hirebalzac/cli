#!/bin/bash
# Setup a workspace from a domain and configure it as default
# Usage: ./setup-workspace.sh https://myblog.com

set -e

DOMAIN="${1:?Usage: $0 <domain>}"

echo "Creating workspace for $DOMAIN..."
balzac workspaces create --domain "$DOMAIN" --wait

WORKSPACE_ID=$(balzac --json workspaces list | jq -r '.workspaces[0].id')
balzac config set workspace "$WORKSPACE_ID"

echo ""
echo "Workspace $WORKSPACE_ID is ready and set as default."
echo "Keywords:"
balzac keywords list
