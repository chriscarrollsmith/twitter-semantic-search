import OpenAI from 'openai'
import { LocalIndex } from 'vectra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url));
const api = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Manages vector embeddings for text using OpenAI's embedding model and local vector storage
 */
export default class Embeddings {
    /**
     * Creates a new Embeddings instance
     * @param {Object} config Configuration object
     * @param {string} config.id Unique identifier for this embedding collection
     * @param {string} config.dataPath Path where vector data will be stored
     */
    constructor({ 
        id, 
        dataPath = path.join(__dirname, '..', `.data/`),
    }) {
        this.id = id 
        this.vectorDBIndex = new LocalIndex(path.join(dataPath, id));
    }

    /**
     * Initializes the vector database, creating it if it doesn't exist
     */
    async init() {
        const index = this.vectorDBIndex
        if (!await index.isIndexCreated()) {
            await index.createIndex();
        }
    }

    /**
     * Converts a single text string into a vector embedding using OpenAI's API
     * @param {string} text Text to convert to embedding
     * @returns {Promise<number[]>} Vector embedding
     */
    async embed(text) {
        const response = await api.embeddings.create({
            'model': 'text-embedding-ada-002',
            'input': [text],
        });
        return response.data.map(item => item.embedding)[0]
    }

    /**
     * Inserts multiple items into the vector database
     * @param {Array<{id: string, text: string}>} itemArray Array of items to insert
     * Each item must have an id and text property
     */
    async insert(itemArray) {
        // Check which items already exist to avoid duplicates
        const existingMap = await this.getIdMap()
        const filteredItems = itemArray.filter(item => existingMap[item.id] == null)
        if (filteredItems.length == 0) {
            return
        }

        // Generate embeddings for all new items in a single API call
        const response = await api.embeddings.create({
            'model': 'text-embedding-ada-002',
            'input': filteredItems.map(item => item.text),
        });
        const vectors = response.data.map(item => item.embedding)

        // Combine vectors with their corresponding items
        const items = []
        for (let i = 0; i < filteredItems.length; i++) {
            const vector = vectors[i]
            const { text, id } = filteredItems[i] 
            items.push({ vector, text, id })
        }

        // Insert all items into the vector database
        const index = this.vectorDBIndex
        await index.beginUpdate();
        for (let item of items) {
            console.log(item.text, item.id)
            await index.insertItem({
                vector: item.vector,
                metadata: { text: item.text, id: item.id }
            });
        }
        await index.endUpdate();
    }

    /**
     * Searches for similar items in the vector database
     * @param {string} text Text to search for
     * @param {number} max Maximum number of results to return
     * @returns {Promise<Array>} Array of similar items with their similarity scores
     */
    async search(text, max = 100) {
        const index = this.vectorDBIndex
        const searchVector = await this.embed(text)
        const results = await index.queryItems(searchVector, max);
        return results
    }

    /**
     * Finds items in the database that exactly match the given text
     * @param {string} text Text to search for
     * @returns {Promise<Array>} Matching items
     */
    async findByText(text) {
        const index = this.vectorDBIndex
        return await index.listItemsByMetadata({ text: { $eq: text } })
    }

    /**
     * Creates a map of all items in the database, keyed by their IDs
     * @returns {Promise<Object>} Map of ID to item
     */
    async getIdMap() {
        const allItems = await this.vectorDBIndex.listItems()
        const itemMap = {}
        for (let item of allItems) {
            const key = item.metadata.id
            itemMap[key] = item
        }

        return itemMap
    }
}