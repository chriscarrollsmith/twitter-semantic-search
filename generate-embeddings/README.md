# Vector Search Generator

This tool processes Twitter archives into searchable vector embeddings using OpenAI's embedding model and Cloudflare's vector database.

## Overview

The system:
1. Loads and decompresses a Twitter archive
2. Extracts threads and standalone tweets
3. Generates vector embeddings using OpenAI's API
4. Stores these in Cloudflare's vector database for semantic search

## Usage Examples

### Querying the Vector Database

Search for semantically similar content:

```javascript
const response = await fetch(${CLOUDFLARE_WORKER_URL}/query, {
    method: 'POST',
    body: JSON.stringify({ searchTerm: 'anger' })
})
const result = await response.json()
console.log(result.matches.map(item => {
    return { score: item.score, text: item.metadata.text }
}))
```

### Deleting Items

Remove items from the database:

```javascript
const response = await fetch('http://localhost:8787/delete', {
    method: 'delete',
    body: JSON.stringify({ idsToDelete: items.map(item => item.id) })
})
const result = await response.json()
console.log(result)
```

### Local Search

Search using the local vector database:

```javascript
const results = await embeddings.search('Love, joy, beauty')
console.log(results.slice(0,5).map(item => [item.score, item.item.metadata]))
```

## Configuration

The system requires:
- OpenAI API key (set as environment variable `OPENAI_API_KEY`)
- Twitter archive in .json.gz format
- Cloudflare Worker URL for vector database operations

## Architecture

- Uses OpenAI's `text-embedding-ada-002` model for generating embeddings
- Processes tweets in batches of 20 to balance API limits and performance
- Stores vectors in Cloudflare's distributed vector database for fast querying
- Supports both local and cloud-based vector search

## Benefits of Cloudflare Integration

- Edge computing for low-latency responses worldwide
- Native vector database support through Vectorize
- Cost-effective with generous free tier
- Simple deployment and maintenance