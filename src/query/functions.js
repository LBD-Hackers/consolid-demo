const { selectConcept, selectRemoteRepresentation, selectLocalRepresentation } = require('./templates_fuseki')

const options = ["endpoint", "satellite"]
const methods = ["comunica", "remote"]

const option = options[0]
const method = methods[1]

async function findConceptsById(data, project) {
    const concepts = []
    for (const r of data) {
        const startPropagation = new Date()
        const concept = await findRawConceptData(r, project)
        if (concept.length) {
            const addedRefs = []
            const final = {
                aliases: new Set(),
                references: []
            }
            concept.forEach(reference => {
                final.aliases.add(reference.concept.value)
                if (reference.alias) final.aliases.add(reference.alias.value)
                if (!addedRefs.includes(reference.reference.value)) {
                    final.references.push({
                        reference: reference.reference.value,
                        identifier: reference.value.value,
                        document: reference.doc.value
                    })
                    addedRefs.push(reference.reference.value)
                }
            })
            final.aliases = Array.from(final.aliases)
            concepts.push(final)
            const propagate = new Date()
            const duration = propagate.getTime() - startPropagation.getTime()
            console.log('duration:', duration)
        }
        return concepts
    }
}


async function findRawConceptData(concept, project) {
    const conceptInfo = await queryConcept(concept, project)
    const alreadyQueried = []
    const all = []
    for (const ref of conceptInfo) {
        if (!alreadyQueried.includes(ref.local)) {
            const local = await queryLocalReferences(ref, concept)
            if (local.length) all.push(local)
            alreadyQueried.push(ref.local)
        }
        if (ref.alias) {
            if (!alreadyQueried.includes(ref.alias)) {
                const remote = await queryRemoteReferences(ref, project)
                if (remote.length) all.push(remote)
                alreadyQueried.push(ref.alias)

            }

        }
    }
    return all.flat()
}

async function queryLocalReferences(ref, concept) {
    let referenceRegistry = ref.concept.value
    const hashindex = referenceRegistry.indexOf('#')
    referenceRegistry = referenceRegistry.replace(referenceRegistry.substring(hashindex, referenceRegistry.length), "");
    const query = selectLocalRepresentation(ref.local.value, ref.concept.value, referenceRegistry)
    const reference = []
    let results
    if (method == "remote") results = await queryFuseki(query, concept.owner[option])
    else results = await queryComunica(query, referenceRegistry)
    results.results.bindings.forEach(binding => reference.push(binding))
    return reference
}

async function queryRemoteReferences(ref, project) {
    let referenceRegistry = ref.alias.value
    const hashindex = referenceRegistry.indexOf('#')
    referenceRegistry = referenceRegistry.replace(referenceRegistry.substring(hashindex, referenceRegistry.length), "");
    const query = selectRemoteRepresentation(ref.alias.value, ref.concept.value, referenceRegistry)
    const podToEndpoint = {}

    project.forEach(i => {
        podToEndpoint[i.pod] = i[option]
    })

    const pod = getRoot(ref.alias.value)
    const reference = []
    let results
    if (method == "remote") results = await queryFuseki(query, podToEndpoint[pod])
    else results = await queryComunica(query, podToEndpoint[pod])
    results.results.bindings.forEach(binding => reference.push(binding))
    return reference
}

async function queryConcept(concept, project) {
    const query = selectConcept(concept.activeDocument, concept.identifier, concept.owner)
    const endpoints = project.map(i => i[option])
    const projectConcept = []
    for (const endpoint of endpoints) {
        let results
        if (method == "remote") results = await queryFuseki(query, endpoint)
        else results = await queryComunica(query, endpoint)
        console.log('JSON.stringify(results)', JSON.stringify(results))
        if (results && results.results.bindings.length) results.results.bindings.forEach(binding => projectConcept.push(binding).value)
    }
    return projectConcept
}

async function queryComunica(query, source) {
    const result = await engine.query(query, { sources: [source] })
    const { data } = await engine.resultToString(result, 'application/sparql-results+json');
    const asJSON = await streamToString(data)
    // engine.invalidateHttpCache()
    return JSON.parse(asJSON)
}

function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
        stream.on('error', err => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

async function queryFuseki(query, endpoint) {
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    let urlencoded = new URLSearchParams();
    urlencoded.append("query", query)
    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
    };

    const results = await fetch(`${endpoint}`, requestOptions).then(i => i.json())
    if (Object.keys(results).length !== 0) return results
    else return []
}

async function queryProject(project, query) {
    const propagateVariables = ["el"]
    const endpoints = project.map(i => i.endpoint)
    const allResults = []
    const podToEndpoint = {}

    project.forEach(i => {
        podToEndpoint[i.endpoint] = i
    })

    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    let urlencoded = new URLSearchParams();
    urlencoded.append("query", query)
    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
    };

    for (const endpoint of endpoints) {
        const url = `${endpoint}`
        const results = await fetch(url, requestOptions).then(response => response.json())

        results.results.bindings.forEach(binding => {
            Object.keys(binding).forEach(key => {
                if (propagateVariables.includes(key) && binding[key].value) {
                    allResults.push({ identifier: binding[key].value, activeDocument: binding["g"].value, owner: podToEndpoint[endpoint] })
                }
            })
        })
    }
    return allResults
}

function getRoot(resource) {
    let root = resource.split('/').slice(0, resource.split('/').length - 1);
    root = root.join('/');
    if (!root.endsWith('/')) root += '/';
    return root;
}

module.exports = {findConceptsById}