#!/bin/sh
# Appends the last commit to cursor_helper/PROGRESS.md
# Run automatically by husky post-commit hook
# Only runs if cursor_helper exists (local-only, not on other machines)

PROGRESS="cursor_helper/PROGRESS.md"
[ ! -f "$PROGRESS" ] && exit 0

COMMIT=$(git log -1 --pretty=format:"- **%h** — %ad — %s" --date=short)
echo "" >> "$PROGRESS"
echo "$COMMIT" >> "$PROGRESS"
