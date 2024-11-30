import OpenAI from 'openai'
import { LocalIndex } from 'vectra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url));
const api = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default class Embeddings {
    constructor({ 
        id, 
        dataPath = path.join(__dirname, '..', `.data/`),
    }) {
        this.id = id 
        this.vectorDBIndex = new LocalIndex(path.join(dataPath, id));
    }

    async init() {
        const index = this.vectorDBIndex
        if (!await index.isIndexCreated()) {
            await index.createIndex();
        }
    }

    async embed(text) {
        const response = await api.embeddings.create({
            'model': 'text-embedding-ada-002',
            'input': [text],
        });
        return response.data.map(item => item.embedding)[0]
    }

    async insert(itemArray) {
        const existingMap = await this.getIdMap()
        const filteredItems = itemArray.filter(item => existingMap[item.id] == null)
        if (filteredItems.length == 0) {
            return
        }
        const response = await api.embeddings.create({
            'model': 'text-embedding-ada-002',
            'input': filteredItems.map(item => item.text),
        });
        const vectors = response.data.map(item => item.embedding)
        const items = []
        for (let i = 0; i < filteredItems.length; i++) {
            const vector = vectors[i]
            const { text, id } = filteredItems[i] 
            items.push({ vector, text, id })
        }

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

    async search(text, max = 100) {
        const index = this.vectorDBIndex
        const searchVector = await this.embed(text)
        const results = await index.queryItems(searchVector, max);
        return results
    }

    // Given text, find the item & its associated vector
    async findByText(text) {
        const index = this.vectorDBIndex
        return await index.listItemsByMetadata({ text: { $eq: text } })
    }
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