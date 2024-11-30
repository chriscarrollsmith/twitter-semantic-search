# Twitter Semantic Search

Basic semantic search for a tweet archive. Part of the [Community Archive](https://www.community-archive.org/) ecosystem. Generates semantic embeddings with OpenAI for each tweet thread (replies & retweets are ignored). Embeddings are inserted into CloudFlare's Vectorize DB. The frontend embeds the query with OpenAI and searches the vector DB.

Live demo: TODO

- Deploy the

#### TODO later:

- Support offline mode. Can just use a local server that queries the vectra DB, no need for cloudflare. 
- script to turn a twitter zip to a single gzipped json, so you can do this even if your data isn't on Community Archive.
