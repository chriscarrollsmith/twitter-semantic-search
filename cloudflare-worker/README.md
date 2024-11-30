# Cloudflare Worker for semantic search

TODO: env variable for OpenAI key?
https://developers.cloudflare.com/workers/configuration/environment-variables/

1. Create the index

```
wrangler vectorize create [INDEX_NAME] --dimensions=1536 --metric=cosine
```

Put this name in wrangler.toml, in the binding.

2. Create metadata

```
wrangler vectorize create-metadata-index [INDEX_NAME] --property-name=text --type=string
```

3. Deploy it

```
wrangler deploy
```

Also add the OPENAI_API_KEY environment variable to your worker in the CloudFlare dashboard.

Now take the deployed URL and put it in the `generate-embeddings` script to populate it.


### Local cloudflare development 

Start local with the remote index:

```
pnpm dev --experimental-vectorize-bind-to-prod
```
