#!/bin/bash
# Write multiple articles from a list of topics
# Usage: ./batch-write.sh

set -e

TOPICS=(
  "Best AI writing tools for 2026"
  "How to build a content strategy with AI"
  "SEO tips for startup blogs"
)

for topic in "${TOPICS[@]}"; do
  echo "Starting: $topic"
  balzac briefings create --topic "$topic"
  sleep 2
done

echo ""
echo "All briefings created. Articles are being written."
echo "Check progress with: balzac articles list"
