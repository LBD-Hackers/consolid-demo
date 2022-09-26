const users = require('../config/accounts.json')
const {generateSession, CONSOLID, getSatelliteFromLdpResource, getRoot} = require('consolid-daapi')
const {ReferenceRegistry} = require('consolid-raapi')
const {DCAT, DCTERMS} = require('@inrupt/vocab-common-rdf')
const {QueryEngine} = require('@comunica/query-sparql')
const {v4} = require('uuid')

async function findReferenceRegistry(projectUrl) {
    const engine = new QueryEngine()
    console.log('projectUrl', projectUrl)
    const sat = await getSatelliteFromLdpResource(projectUrl)
    console.log('sat', sat)
    const q = `
    SELECT ?refReg WHERE {
        <${projectUrl}> <${DCAT.dataset}> ?ds .
        ?ds a <${CONSOLID.ReferenceRegistry}> ;
            <${DCAT.distribution}>/<${DCAT.downloadURL}> ?refReg.
    } LIMIT 1`

    console.log('q', q)
    
    const results = await engine.queryBindings(q, {sources: [sat]})
    const bindings = await results.toArray()
    if (bindings.length) return bindings[0].get('refReg').value
    else throw new Error('could not find reference registry for this project')
}

async function findPairs(ttlUrl, gltfUrl) {
    const engine = new QueryEngine()
    const ttlSatellite = await getSatelliteFromLdpResource(ttlUrl)

    const q = `
    PREFIX props: <https://w3id.org/props#> 
    PREFIX schema: <http://schema.org/>
    SELECT ?ttl ?gltf WHERE {
        ?ttl props:globalIdIfcRoot/schema:value ?gltf
    }`
    const results = await engine.queryBindings(q, {sources: [ttlSatellite]})
    const bindings = await results.toArray()
    const mapping = []
    for (const binding of bindings) {
        mapping.push({
            gltf: binding.get('gltf').value,
            ttl: binding.get('ttl').value
        })
    }

    return mapping
}

async function run() {
    const ttlUrl = "http://localhost:3000/architect/5433f023-2ffe-4006-9e49-e26bbcb41fb6"
    const ttlProject = "http://localhost:3000/architect/0c39ccf8-b17e-47d8-a1d7-49a71c1a342f"
    const gltfUrl = "http://localhost:3000/engineer/f177466f-5929-445f-b2d7-ee19576c7d3a"
    const gltfProject = "http://localhost:3000/engineer/40050b82-9907-434c-91ab-7ce7c137d8b6"

    //1. find pairs via TTL query
    const pairs = await findPairs(ttlUrl, gltfUrl)
    const ttlRefRegUrl = await findReferenceRegistry(ttlProject)
    const gltfRefRegUrl = await findReferenceRegistry(gltfProject)

    const ttlSession = await generateSession(users.users["http://localhost:3000/architect/profile/card#me"])
    const gltfSession = await generateSession(users.users["http://localhost:3000/engineer/profile/card#me"])

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