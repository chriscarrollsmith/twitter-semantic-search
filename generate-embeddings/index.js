import fs from 'fs'
import zlib from 'zlib'
import path from 'path'
import Embeddings from './embeddings-openai.js'
import { Util } from '../frontend/src/util.js'
import OpenAI from 'openai'

/**
 * Configuration and setup
 */
const api = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ARCHIVE_FILEPATH = '../archives/visakanv.json.gz'
const CLOUDFLARE_WORKER_URL = 'https://visakanv-semantic-search.defenderofbasic.workers.dev'
const archive_basename = path.basename(ARCHIVE_FILEPATH, '.json.gz')

/**
 * Load and decompress the Twitter archive
 */
const util = new Util()
const compressedData = fs.readFileSync(ARCHIVE_FILEPATH);
const decompressedData = zlib.gunzipSync(compressedData);
const archiveJSON = JSON.parse(decompressedData.toString())

// Set up user information from the archive
util.accountId = archiveJSON.account[0].account.accountId
util.username = archiveJSON.account[0].account.username

/**
 * Process tweets and organize them into threads
 */
let tweets = util.preprocessTweets(archiveJSON.tweets)
tweets = util.sortAscending(tweets)
const threadData = util.getThreads(tweets)

/**
 * Extract complete threads from the tweet data
 * A thread is a sequence of connected tweets starting with a root tweet (no parent)
 */
const threads = []
let wordCount = 0
for (let i = 0; i < threadData.tweets.length; i++) {
    const tweet = threadData.tweets[i]
    // Skip tweets that are replies within threads
    if (tweet.parent) {
        continue
    }
    // Create a new thread starting with this tweet
    const newThread = [tweet]
    let currentTweet = tweet 
    // Follow the chain of connected tweets
    while (currentTweet.nextTweet) {
        wordCount += currentTweet.full_text.split(' ').length
        newThread.push(currentTweet.nextTweet)
        currentTweet = currentTweet.nextTweet
    }
    threads.push(newThread)
}

console.log(`Found ${threads.length} threads. Total word count: ${wordCount}`)

/**
 * Prepare threads for embedding by combining tweet text
 * Each thread becomes a single item with the first tweet's ID
 */
const itemsToEmbed = threads.map(thread => {
    let text = ''
    for (let tweet of thread) {
        text += tweet.full_text
    }
    return { text, id: thread[0].id }
})

/**
 * Insert threads into Cloudflare vector database in batches
 * Process 20 items at a time to balance API limits and performance
 */
for (let i = 13800; i < itemsToEmbed.length; i+= 20) {
    console.log(i)

    // Get embeddings from OpenAI for the current batch
    const slice = itemsToEmbed.slice(i, i + 20)
    const embeddingResponse = await api.embeddings.create({
        'model': 'text-embedding-ada-002',
        'input': slice.map(item => item.text),
    });
    const vectors = embeddingResponse.data.map(item => item.embedding)

    // Prepare items for insertion
    const items = []
    for (let j = 0; j < vectors.length; j++) {
        items.push({
            id: itemsToEmbed[i].id,
            vector: vectors[j],
            metadata: { text: itemsToEmbed[i].text }
        })
    }
    
    // Send items to Cloudflare worker for storage
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/insert`, {
        method: 'POST',
        body: JSON.stringify(items)
    })
    console.log(response)
    const result = await response.json()
    console.log(result)
}
