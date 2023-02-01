const { Session } = require("@inrupt/solid-client-authn-node")
const { Catalog, generateSession, getRoot, getSatelliteFromLdpResource, LBDS } = require("consolid-daapi")
const { ReferenceRegistry, findReferenceRegistry } = require('consolid-raapi')
const { v4 } = require('uuid')
const { DCTERMS, DCAT } = require('@inrupt/vocab-common-rdf')
const {findConceptsById} = require('./functions')
const users = require('../config/accounts_demo.json')
const user = users.users["https://pod.werbrouck.me/fm/profile/card#me"]
const p = require('../config/project_demo.json')
const data = [{
    "activeDocument": "https://pod.werbrouck.me/engineer/f177466f-5929-445f-b2d7-ee19576c7d3a", 
    "identifier": "2gRXFgjRn2HPE$YoDLX0q2"
}]



async function run() {
    const session = await generateSession(user, user.webId)

    // for convenience, we have fixed these urls, but they need to be discovered in a real use case
    const imageUrl = "https://pod.werbrouck.me/fm/93f09e7a-0229-46e8-8579-964f4d02fca3"
    const url = "https://pod.werbrouck.me/fm/fb3d5bcd-8bcb-4d46-be2b-6c3ef824d5d9"
    const refRegUrl = await findReferenceRegistry(url)

    const project = new Catalog(session, url)

    const {distUrl, damagedElementUri, damageAreaUri} = await createDamageGraph(project, url, session)

    const refReg = new ReferenceRegistry(session, refRegUrl, project)

    // first we align the semantics of the Damaged Element with its effective concept, which can be found via an existing reference (e.g. a 3D object)
    const damageConcept = await refReg.createConcept()
    await refReg.createReference(damageConcept, undefined, distUrl, damagedElementUri)

    // so we can find the existing aliases for this concept with ...
    const references = await findConceptsById(data, p)
    for (const alias of references[0].aliases) {
        await refReg.registerAggregatedConcept(damageConcept, alias)
        await fakeConceptRegistrationByOthers(damageConcept, references[0].aliases)
    }

    // // we have indicated the following pixel zone on the image in a GUI
    const pixelZone = `${imageUrl}/pct:20,10,25,55/`
    const damageAreaConcept = await refReg.createConcept()
    await refReg.createReference(damageAreaConcept, undefined, distUrl, damageAreaUri)
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

const now = new Date()
run().then(() => {
    const end = new Date()
    console.log("duration: ", end.getTime() - now.getTime())
})


async function createDamageGraph(project, url, session) {
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
    const damageAreaUri = distUrl + "#" + v4()

    const data = `
    @prefix dot: <https://w3id.org/dot#> .
    <${damagedElementUri}> dot:hasDamageArea <${damageAreaUri}> .
    `

    await project.dataService.writeFileToPod(Buffer.from(data), distUrl, true, "text/turtle")

    return {distUrl, damagedElementUri, damageAreaUri}
}

