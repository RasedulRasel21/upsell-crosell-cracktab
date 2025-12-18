#!/bin/bash

# Script to help download production database from DigitalOcean
#
# Usage:
#   1. Open DigitalOcean Console for your app
#   2. Copy and paste this script
#   3. The script will show you where the database is and create a backup

echo "🔍 Searching for SQLite database files..."
echo ""

# Search common locations
echo "Checking /data directory:"
ls -lh /data/*.sqlite 2>/dev/null || echo "  No database found in /data"

echo ""
echo "Checking /app directory:"
find /app -name "*.sqlite" -type f 2>/dev/null | while read file; do
  size=$(du -h "$file" | cut -f1)
  echo "  Found: $file (Size: $size)"
done

echo ""
echo "Checking for DATABASE_URL environment variable:"
echo "  DATABASE_URL=$DATABASE_URL"

echo ""
echo "📊 Database file sizes:"
find /app /data -name "*.sqlite" -type f -exec ls -lh {} \; 2>/dev/null

echo ""
echo "💾 To backup, use DigitalOcean's built-in backup or SFTP download"
echo "   The main database should be at: $DATABASE_URL"
