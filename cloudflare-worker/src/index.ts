import OpenAI from 'openai'
let api = null

export interface Env {
  VECTORIZE: Vectorize;
}

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
	"Access-Control-Max-Age": "86400"
  };

const routeFunctions:{[key:string]: any} = {
	'/insert': insert,
	'/query': query,
	'/delete': deleteFn
}

async function deleteFn(request:any, env:any, ctx:any) {
	const { idsToDelete } = await request.json();

	const deleted = await env.VECTORIZE.deleteByIds(idsToDelete);
	return Response.json(deleted, { headers: corsHeaders })
}

async function query(request:any, env:any, ctx:any) {
	const { searchTerm } = await request.json();

	// get embedding
	const response = await api.embeddings.create({
		'model': 'text-embedding-ada-002',
		'input': [searchTerm],
	});
	const queryVector = response.data.map(item => item.embedding)[0]
	const matches = await env.VECTORIZE.query(queryVector, {
		topK: 20,
		returnValues: true,
		returnMetadata: "all",
	});

	return Response.json(matches, { headers: corsHeaders })
}

async function insert(request:any, env:any, ctx:any) {
	const items: any = await request.json();
	// filter out anything that already exists
	const ids = items.map((item:any) => item.id);
	const existingIds = (await env.VECTORIZE.getByIds(ids)).map((item:any) => item.id);
	const toInsert = items.filter((item:any) => !existingIds.includes(item.id))

	let { mutationId } = await env.VECTORIZE.insert(
		toInsert.map((item: any) => {
			const maxApproxLength = 8000; // Approximate safe limit for 10,240 bytes
			if (item.metadata.text.length > maxApproxLength) {
				item.metadata.text = item.metadata.text.slice(0, maxApproxLength)
			}

		return { id: item.id, metadata: item.metadata, values: item.vector };
	  })
	);

	return Response.json({ mutationId, inserted_num: toInsert.length }, { headers: corsHeaders })
}


export default {
  async fetch(request, env, ctx): Promise<Response> {
	api = new OpenAI({ apiKey: env.OPENAI_API_KEY });

	const { pathname } = new URL(request.url);
	if (routeFunctions[pathname]) {
		return await routeFunctions[pathname](request, env, ctx)
	}

	return new Response("", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
