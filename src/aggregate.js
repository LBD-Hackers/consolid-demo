const p = require('./igent.json')
const { selectConcept, selectRemoteRepresentation, selectLocalRepresentation } = require('./templates')
const fetch = require('cross-fetch');
const { Headers } = fetch;

const now = new Date()
const queryCount = 10
const iterations = 10
const query = `
PREFIX beo: <https://pi.pauwel.be/voc/buildingelement#>
PREFIX bot: <https://w3id.org/bot#>
PREFIX dot: <https://w3id.org/dot#>

SELECT ?el ?g WHERE {graph ?g {?el a beo:Door}} LIMIT ${queryCount}`

async function run() {
    let allDuration = 0

    const queryResults = await queryProject()
    const query = new Date()

    console.log("duration of query task: ", query.getTime() - now.getTime())

    for (let i = 0; i < iterations; i++) {

        const concepts = []

        for (const r of queryResults) {
            const startPropagation = new Date()
            const concept = await findConceptById(r, p)
            if (concept.length) {
                const final = {
                    aliases: [],
                    references: []
                }
                concept.forEach(reference => {
                    final.aliases.push(reference.concept.value)
                    if (reference.alias) final.aliases.add(reference.alias.value)
                    final.references.push({
                        reference: reference.reference.value,
                        metadata: reference.meta.value,
                        identifier: reference.value.value,
                        document: reference.doc.value
                    })
                })
                // console.log('final', final)
                concepts.push(final)
                const propagate = new Date()
                const duration = propagate.getTime() - startPropagation.getTime()
                allDuration += duration
                // console.log('duration', duration)
            }
        }
    }

    const averageDuration = allDuration / iterations
    const averageDurationPerConcept = allDuration / (queryResults.length * iterations)
    console.log('allDuration', allDuration)
    console.log('averageDuration', averageDuration)
    console.log('averageDurationPerConcept', averageDurationPerConcept)
}

async function findConceptById(concept) {
    const conceptInfo = await queryConcept(concept)
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
                const remote = await queryRemoteReferences(ref, concept)
                if (remote.length) all.push(remote)
                alreadyQueried.push(ref.alias)
            }

        }
    }
    return all.flat()
}

async function queryLocalReferences(ref, concept) {
    const query = selectLocalRepresentation(ref.local.value, ref.concept.value)
    const reference = []
    const results = await queryFuseki(query, concept.owner.endpoint)
    results.results.bindings.forEach(binding => reference.push(binding))
    return reference
}

async function queryRemoteReferences(ref, concept) {
    const query = selectRemoteRepresentation(ref.alias.value, ref.concept.value)

    const podToEndpoint = {}

    p.forEach(i => {
        podToEndpoint[i.pod] = i.endpoint
    })

    const pod = getRoot(ref.alias.value)
    const reference = []
    const results = await queryFuseki(query, podToEndpoint[pod])
    results.results.bindings.forEach(binding => reference.push(binding))
    return reference
}

async function queryConcept(concept) {
    const query = selectConcept(concept.activeDocument, concept.identifier, concept.owner)
    const endpoints = p.map(i => i.endpoint)
    const projectConcept = []
    for (const endpoint of endpoints) {
        const results = await queryFuseki(query, endpoint)
        results.results.bindings.forEach(binding => projectConcept.push(binding).value)
    }

    return projectConcept
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
    return results
}

async function queryProject() {
    const propagateVariables = ["el"]
    const endpoints = p.map(i => i.endpoint)
    const allResults = []
    const podToEndpoint = {}

    p.forEach(i => {
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
        const results = await fetch(url, requestOptions)
            .then(response => response.json())

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

console.log('start')
run().then(() => {
    const end = new Date()
    console.log("duration: ", end.getTime() - now.getTime())
})