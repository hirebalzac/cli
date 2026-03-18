#!/bin/bash
# Export all completed articles to markdown files
# Usage: ./export-all-articles.sh [output-dir]

set -e

OUTPUT_DIR="${1:-exports}"
mkdir -p "$OUTPUT_DIR"

echo "Exporting articles to $OUTPUT_DIR/..."

balzac --json articles list --status done --per-page 100 | \
  jq -r '.articles[] | "\(.id) \(.slug // .id)"' | \
  while read -r id slug; do
    echo "  $slug"
    balzac articles export "$id" --format markdown --output "$OUTPUT_DIR/${slug}.md"
  done

echo "Done. Exported to $OUTPUT_DIR/"
