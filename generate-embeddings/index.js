import fs from 'fs'
import zlib from 'zlib'
import path from 'path'
import Embeddings from './embeddings-openai.js'
import { Util } from '../frontend/src/util.js'
import OpenAI from 'openai'
const api = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ARCHIVE_FILEPATH = '../archives/visakanv.json.gz'
const CLOUDFLARE_WORKER_URL = 'https://visakanv-semantic-search.defenderofbasic.workers.dev'
const archive_basename = path.basename(ARCHIVE_FILEPATH, '.json.gz')

const util = new Util()
const compressedData = fs.readFileSync(ARCHIVE_FILEPATH);
const decompressedData = zlib.gunzipSync(compressedData);
const archiveJSON = JSON.parse(decompressedData.toString())
util.accountId = archiveJSON.account[0].account.accountId
util.username = archiveJSON.account[0].account.username
let tweets = util.preprocessTweets(archiveJSON.tweets)
tweets = util.sortAscending(tweets)
const threadData = util.getThreads(tweets)

// Get all threads / one off's
const threads = []
let wordCount = 0
for (let i = 0; i < threadData.tweets.length; i++) {
    const tweet = threadData.tweets[i]
    if (tweet.parent) {
        continue
    }
    const newThread = [tweet]
    let currentTweet = tweet 
    while (currentTweet.nextTweet) {
        wordCount += currentTweet.full_text.split(' ').length
        newThread.push(currentTweet.nextTweet)
        currentTweet = currentTweet.nextTweet
    }
    threads.push(newThread)
}

console.log(`Found ${threads.length} threads. Total word count: ${wordCount}`)

const itemsToEmbed = threads.map(thread => {
    let text = ''
    for (let tweet of thread) {
        text += tweet.full_text
    }

    return { text, id: thread[0].id }
})


// Insert them into CloudFlare vector DB
for (let i = 13800; i < itemsToEmbed.length; i+= 20) {
    console.log(i)

    // Get embedding from OpenAI
    const slice = itemsToEmbed.slice(i, i + 20)
    const embeddingResponse = await api.embeddings.create({
        'model': 'text-embedding-ada-002',
        'input': slice.map(item => item.text),
    });
    const vectors = embeddingResponse.data.map(item => item.embedding)
    const items = []
    for (let j = 0; j < vectors.length; j++) {
        items.push({
            id: itemsToEmbed[i].id,
            vector: vectors[j],
            metadata: { text: itemsToEmbed[i].text }
        })
    }
    
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/insert`, {
        method: 'POST',
        body: JSON.stringify(items)
    })
    console.log(response)
    const result = await response.json()
    console.log(result)
}


// query
// const response = await fetch(`${CLOUDFLARE_WORKER_URL}/query`, {
//     method: 'POST',
//     body: JSON.stringify({ searchTerm: 'anger' })
// })
// const result = await response.json()
// console.log(result.matches.map(item => {
//     return { score: item.score, text: item.metadata.text }
// }))

// delete
// const response = await fetch('http://localhost:8787/delete', {
//     method: 'delete',
//     body: JSON.stringify({ idsToDelete: items.map(item => item.id) })
// })
// const result = await response.json()
// console.log(result)

// local search
// const results = await embeddings.search('Love, joy, beauty')
// console.log(results.slice(0,5).map(item => [item.score, item.item.metadata]))
