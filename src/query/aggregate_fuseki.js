const p = require('./duplex.json')

const { selectConcept, selectRemoteRepresentation, selectLocalRepresentation } = require('./templates_fuseki')
const fetch = require('cross-fetch');
const { findConceptsById } = require('./functions');
const { Headers } = fetch;
const QueryEngine = require('@comunica/query-sparql').QueryEngine
const queryCount = 10
const iterations = 1

const query = `
PREFIX beo: <https://pi.pauwel.be/voc/buildingelement#>
PREFIX bot: <https://w3id.org/bot#>
PREFIX dot: <https://w3id.org/dot#>

SELECT ?el ?g WHERE {graph ?g {?el dot:hasDamageArea ?dam}} LIMIT ${queryCount}`

const engine = new QueryEngine()

async function run() {
    let allDuration = 0

    // await engine.query(`ASK {?s ?p ?o}`, {sources: p.map(i => i.referenceRegistry)})
    const now = new Date()
    const queryResults = await queryProject()
    const query = new Date()
    
    console.log("duration of query task: ", query.getTime() - now.getTime())
    
    for (let i = 0; i < iterations; i++) {
            const startConceptFinder = new Date()
            const concepts = await findConceptsById(queryResults, p)
            const endConceptFinder = new Date()
            console.log('endConceptFinder - startConceptFinder', endConceptFinder - startConceptFinder)
            console.log('JSON.stringify(concepts, 0,4)', JSON.stringify(concepts, 0,4))
        }

    const averageDuration = allDuration / iterations
    const averageDurationPerConcept = allDuration / (queryResults.length * iterations)
    console.log('allDuration', allDuration)
    console.log('averageDuration', averageDuration)
    console.log('averageDurationPerConcept', averageDurationPerConcept)
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

console.log('start')
run().then(() => {
    // const end = new Date()
    // console.log("duration: ", end.getTime() - now.getTime())
})
