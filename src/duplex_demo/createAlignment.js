const users = require('./setup.json')
const {generateSession, CONSOLID, getSatelliteFromLdpResource, getRoot} = require('consolid-daapi')
const {ReferenceRegistry} = require('consolid-raapi')
const {DCAT, DCTERMS} = require('@inrupt/vocab-common-rdf')
const {QueryEngine} = require('@comunica/query-sparql')
const {v4} = require('uuid')


async function querySatellite(query, endpoint, session) {
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    let urlencoded = new URLSearchParams();
    urlencoded.append("query", query)
    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
    };

    const results = await session.fetch(`${endpoint}`, requestOptions).then(i => i.json())
    if (Object.keys(results).length !== 0) return results
    else return false
}

async function findReferenceRegistry(projectUrl, session) {
    const sat = await getSatelliteFromLdpResource(projectUrl)

    const q = `
    SELECT ?refReg WHERE {
        <${projectUrl}> <${DCAT.dataset}> ?ds .
        ?ds a <${CONSOLID.ReferenceRegistry}> ;
            <${DCAT.distribution}>/<${DCAT.downloadURL}> ?refReg.
    }`
    console.log(q)
    console.log(sat)
    const results = await querySatellite(q, sat, session)
    console.log('results', results)
    if (results.results.bindings.length) return results.results.bindings[0]['refReg'].value
    else throw new Error('could not find reference registry for this project')
}

async function findPairs(ttlUrl, gltfUrl, session) {
    const sat = await getSatelliteFromLdpResource(ttlUrl)

    const q = `
    PREFIX props: <https://w3id.org/props#> 
    PREFIX schema: <http://schema.org/>
    SELECT ?ttl ?gltf WHERE {
        ?ttl props:globalIdIfcRoot/schema:value ?gltf
    }`

    const results = await querySatellite(q, sat, session)
    console.log(results)
    const mapping = []
    for (const binding of results.results.bindings) {
        mapping.push({
            gltf: binding['gltf'].value,
            ttl: binding['ttl'].value
        })
    }

    return mapping
}

async function run() {
    const ttlUrl = "http://localhost:3000/architect/5433f023-2ffe-4006-9e49-e26bbcb41fb6"
    const ttlProject = "http://localhost:3000/architect/0c39ccf8-b17e-47d8-a1d7-49a71c1a342f"
    const gltfUrl = "http://localhost:3000/engineer/f177466f-5929-445f-b2d7-ee19576c7d3a"
    const gltfProject = "http://localhost:3000/engineer/40050b82-9907-434c-91ab-7ce7c137d8b6"

    const ttlSession = await generateSession(users.users["http://localhost:3000/architect/profile/card#me"])
    const gltfSession = await generateSession(users.users["http://localhost:3000/engineer/profile/card#me"])

    //1. find pairs via TTL query
    const pairs = await findPairs(ttlUrl, gltfUrl, ttlSession)

    const ttlRefRegUrl = await findReferenceRegistry(ttlProject, ttlSession)
    const gltfRefRegUrl = await findReferenceRegistry(gltfProject, gltfSession)

    const ttlRefReg = new ReferenceRegistry(ttlSession, ttlRefRegUrl)
    const gltfRefReg = new ReferenceRegistry(gltfSession, gltfRefRegUrl)

    // 2. create concepts per pair and let them reference each other
    // let lengthPairs = pairs.length
    // for (const pair of pairs) {
    //     const ttlC = await ttlRefReg.createConcept()        
    //     const gltfC = await gltfRefReg.createConcept()

    //     await ttlRefReg.createReference(ttlC, undefined, ttlUrl, pair.ttl)
    //     await gltfRefReg.createReference(gltfC, undefined, gltfUrl, pair.gltf)
    //     await ttlRefReg.registerAggregatedConcept(ttlC, gltfC)
    //     await gltfRefReg.registerAggregatedConcept(gltfC, ttlC)
    //     lengthPairs = lengthPairs - 1
    //     console.log('lengthPairs', lengthPairs)
    // }

    let updateStringTtl = "INSERT DATA { "
    let updateStringGlTF = "INSERT DATA { "

    for (const pair of pairs) {
        const ttlC = ttlRefRegUrl + "#" + v4()
        const ttlRef = ttlRefRegUrl + "#" + v4()
        const ttlId = ttlRefRegUrl + "#" + v4()

        const gltfC = gltfRefRegUrl + "#" + v4()
        const gltfRef = gltfRefRegUrl + "#" + v4()
        const gltfId = gltfRefRegUrl + "#" + v4()

        updateStringTtl += `<${ttlC}> a <${CONSOLID.Concept}> ;
            <${CONSOLID.aggregates}> <${ttlRef}>, <${gltfC}> .
            <${ttlRef}> <${CONSOLID.hasIdentifier}> <${ttlId}> ;
             <${DCTERMS.created}> "${new Date()}".
            <${ttlId}> <${CONSOLID.inDocument}> <${ttlUrl}> ;
            <https://schema.org/value> "${pair.ttl}" .
            `

        updateStringGlTF += `<${gltfC}> a <${CONSOLID.Concept}> ;
        <${CONSOLID.aggregates}> <${gltfRef}>, <${ttlC}> .
        <${gltfRef}> <${CONSOLID.hasIdentifier}> <${gltfId}> ;
         <${DCTERMS.created}> "${new Date()}".
        <${gltfId}> <${CONSOLID.inDocument}> <${gltfUrl}> ;
        <https://schema.org/value> "${pair.gltf}" .
        `
    }

    updateStringGlTF += "}"
    updateStringTtl += "}"
    
    await ttlRefReg.update(updateStringTtl)
    await gltfRefReg.update(updateStringGlTF)
}

const now = new Date()
run().then(() => {
    console.log('duration: ', new Date() - now)
})