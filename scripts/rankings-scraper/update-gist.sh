#!/bin/bash
# Script to update the Gist with rankings data

# IMPORTANT: Create a new GitHub token first!
# Then set these environment variables:
# export GIST_ID="a8f3bac998db4178457d3bd9f0a0d705"
# export GH_TOKEN="your-new-token-here"

if [ -z "$GIST_ID" ] || [ -z "$GH_TOKEN" ]; then
    echo "❌ Error: GIST_ID and GH_TOKEN environment variables must be set"
    echo ""
    echo "Please run:"
    echo "  export GIST_ID=\"a8f3bac998db4178457d3bd9f0a0d705\""
    echo "  export GH_TOKEN=\"your-new-github-token\""
    exit 1
fi

# Update with mock data
npx tsx update-gist.ts mock-rankings.json