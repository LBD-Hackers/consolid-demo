const { Session } = require("@inrupt/solid-client-authn-node")
const { Catalog, generateSession, getRoot, getSatelliteFromLdpResource } = require("consolid-daapi")
const { ReferenceRegistry } = require('consolid-raapi')
const { v4 } = require('uuid')
const { DCTERMS, DCAT } = require('@inrupt/vocab-common-rdf')

const users = require('../config/accounts.json')
const user = users.users["http://localhost:3000/fm/profile/card#me"]

async function findReferenceRegistry(projectUrl) {
    const engine = new QueryEngine()
    const sat = await getSatelliteFromLdpResource(projectUrl)

    const q = `
    SELECT ?refReg WHERE {
        <${projectUrl}> <${DCAT.dataset}> ?ds .
        ?ds a <${LBDS.ReferenceRegistry}> ;
            <${DCAT.distribution}>/<${DCAT.downloadURL}> ?refReg.
    } LIMIT 1`

    const results = await engine.queryBindings(q, { sources: [sat] })
    const bindings = await results.toArray()
    if (bindings.length) return bindings[0].get('refReg').value
    else throw new Error('could not find reference registry for this project')
}

async function run() {
    const session = await generateSession(user, user.webId)

    // for convenience, we have fixed these urls, but they need to be discovered in a real use case
    const imageUrl = "http://localhost:3000/fm/93f09e7a-0229-46e8-8579-964f4d02fca3"
    const url = "http://localhost:3000/fm/fb3d5bcd-8bcb-4d46-be2b-6c3ef824d5d9"

    const refRegUrl = await findReferenceRegistry(url)
    const project = new Catalog(session, url)

    const root = getRoot(url)
    const dsUrl = root + v4()
    const distUrl = root + v4()

    const damageDs = new Catalog(session, dsUrl)
    const date = new Date()
    const dsMetadata = [{
        predicate: DCTERMS.created,
        object: date.toISOString()
    }]
    const distMetadata = [{
        predicate: DCAT.mediaType,
        object: `https://www.iana.org/assignments/media-types/text/turtle`
    }]

    await damageDs.create(true, dsMetadata)
    await project.addDataset(dsUrl)
    await damageDs.addDistribution(distUrl, distMetadata)

    const damagedElementUri = distUrl + "#" + v4()
    const damageZoneUri = distUrl + "#" + v4()

    const data = `
    PREFIX dot: <https://w3id.org/dot#> .
    <${damagedElementUri}> dot:hasDamageArea <${damageZoneUri}> .
    `

    await project.dataService.writeFileToPod(Buffer.from(data), distUrl, true, "text/turtle")

    const refReg = new ReferenceRegistry(session, refRegUrl, project)

    // first we align the semantics of the Damaged Element with its effective concept, which can be found via an existing reference (e.g. a 3D object)
    const damageConcept = await refReg.createConcept()
    await refReg.createReference(damageConcept, undefined, distUrl, damagedElementUri)

    // we have selected the following element in the 3D viewer (fixed GUID from config)
    const activeDocument = "http://localhost:3000/engineer/f177466f-5929-445f-b2d7-ee19576c7d3a"
    const selectedElement = "2O2Fr$t4X7Zf8NOew3FLOH"

    // so we can find the existing aliases for this concept with ...
    const references = await refReg.findConceptByIdentifier(activeDocument, selectedElement)
    for (const alias of references.aliases) {
        await refReg.registerAggregatedConcept(alias)
        await fakeConceptRegistrationByOthers(damageConcept, references.aliases)
    }

    // we have indicated the following pixel zone on the image in a GUI
    const pixelZone = "0.3,0.1 0.5,0.8"
    const damageAreaConcept = await refReg.createConcept()
    await refReg.createReference(damageAreaConcept, undefined, distUrl, damagedElementUri)
    await refReg.createReference(damageAreaConcept, undefined, imageUrl, pixelZone)
}

// normally, this should be done manually after a notification is received. Or by a reference registration satellite
async function fakeConceptRegistrationByOthers(concept, aliases) {
    for (const alias of aliases) {
        await getSatelliteFromLdpResource(alias)
        const refRegUrl = alias.split('#')[0]
        let session
        for (const u of Object.keys(users.users)) {
            const user = users.users[u]
            if (alias.includes(user.idp + '/' + user.name + '/')) {
                session = await generateSession(user, user.webId)
            }
        }
        const refReg = new ReferenceRegistry(session, refRegUrl)
        await refReg.registerAggregatedConcept(alias, concept)
    }
}

async function check() {
    const session = await generateSession(user, user.webId)

    // we have selected the following element in the 3D viewer (fixed GUID from config)
    const activeDocument = "http://localhost:3000/engineer/f177466f-5929-445f-b2d7-ee19576c7d3a"
    const selectedElement = "2O2Fr$t4X7Zf8NOew3FLOH"
    const url = "http://localhost:3000/fm/fb3d5bcd-8bcb-4d46-be2b-6c3ef824d5d9"
    const refRegUrl = await findReferenceRegistry(url)
    const project = new Catalog(session, url)
    const refReg = new ReferenceRegistry(session, refRegUrl, project)
    const references = await refReg.findConceptByIdentifier(activeDocument, selectedElement)

    // we should now get all references, the one from the damage semantics as well.
    console.log('references', references)
}

const now = new Date()
run().then(() => {
    const end = new Date()
    console.log("duration: ", end.getTime() - now.getTime())
})