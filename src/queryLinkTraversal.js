const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;
const myEngine = new QueryEngine();

async function query(query, sources, options) {
    const bindingsStream = await myEngine.queryBindings(query, {
        sources,
        ...options
    });

    // Consume results as an array (easier)
    const bindings = await bindingsStream.toArray();
    if (bindings.length) return bindings
    else throw new Error('No query results')
}

module.exports = query