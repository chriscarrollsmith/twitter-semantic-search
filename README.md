# Twitter Semantic Search

Basic semantic search for a tweet archive. Part of the [Community Archive](https://www.community-archive.org/) ecosystem. Generates semantic embeddings with OpenAI for each tweet thread (replies & retweets are ignored). Embeddings are inserted into CloudFlare's Vectorize DB. The frontend embeds the query with OpenAI and searches the vector DB.

Live demo: (https://defenderofbasic.github.io/twitter-semantic-search/)

## Self host this for your own tweet archive

The general steps are, create & deploy the CloudFlare worker + vector DB (see instructions in `cloudflare-worker/` directory). Then generate embeddings (run the script in `generate-embeddings/` with your archive JSON in `archives/`). Finally run the `frontend/` and replace the [cloudflare URL](https://github.com/DefenderOfBasic/twitter-semantic-search/blob/main/frontend/index.html#L71-L73) with your own, and a URL where the archive JSON is hosted. 

#### TODO later:

- Support offline mode. Can just use a local server that queries the vectra DB, no need for cloudflare. 
- script to turn a twitter zip to a single gzipped json, so you can do this even if your data isn't on Community Archive.
