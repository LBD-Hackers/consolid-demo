const data = require('./setup.json')
const { fetch } = require('cross-fetch')
const { generateSession, Catalog, CONSOLID } = require('consolid-daapi')
const { RDF, DCAT, DCTERMS } = require('@inrupt/vocab-common-rdf')
const mime = require('mime-types')
const path = require('path')
const fs = require('fs')
const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;


async function getProjectRegistry(user) {
    const myEngine = new QueryEngine();
    const bindingsStream = await myEngine.queryBindings(`
    SELECT DISTINCT * WHERE {
      <${user}> <https://w3id.org/consolid#hasProjectCatalogue> ?catalogue .
    }`, {
        sources: [user],
        lenient: true,
    });

    // Consume results as an array (easier)
    const bindings = await bindingsStream.toArray();
    if (bindings.length) {
        return bindings[0].get('catalogue').value
    }
}


async function createProject(user, session) {
    const projectUrl = user.pod + user.projectId

    // // 1. Create a catalog for the project
    // const project = new Catalog(session, projectUrl)

    // const metadata = [{
    //     predicate: RDF.type,
    //     object: CONSOLID.Project
    // }]

    // await project.create(true, metadata)

    // // 2. Add other stakeholders' partial projects to the project
    // // normally a communication process of invite/accept precedes this
    // for (const u of Object.keys(data.users)) {
    //     if (data.users[u].webId !== user.webId) {
    //         project.addDataset(data.users[u].pod + data.users[u].projectId)
    //     }
    // }

    // 3. find the user's project registry
    const projectRegistry = await getProjectRegistry(user.webId)

    // 4. register the new project in the project registry
    const reg = new Catalog(session, projectRegistry)
    await reg.addDataset(projectUrl)

    // // 3. upload the intended datasets
    // const resources = fs.readdirSync(user.resourcePath);
    // for (const item of resources) {
    //     const dsUrl = user.pod + item + "_meta_"
    //     const distUrl = user.pod + item

    //     const p = path.join(__dirname, user.resourcePath + item);

    //     let mediaType = mime.lookup(p)
    //     const date = new Date()
    //     const dsMetadata = [{
    //         predicate: DCTERMS.created,
    //         object: date.toISOString()
    //     }]

    //     if (!mediaType) mediaType = "text/plain"
    //     const distMetadata = [{
    //         predicate: DCAT.mediaType,
    //         object: `https://www.iana.org/assignments/media-types/${mediaType}`
    //     }]

    //     const ds = new Catalog(session, dsUrl)
    //     await ds.create(true, dsMetadata)
    //     await project.addDataset(dsUrl)
    //     await ds.addDistribution(distUrl, distMetadata)
    //     const buff = fs.readFileSync(p);
    //     await ds.dataService.writeFileToPod(buff, distUrl, true, mediaType)    
    // }    
}

async function run() {
    for (const u of Object.keys(data.users)) {
        const user = data.users[u]
        const session = await generateSession(user)
        await createProject(user, session)
    }
}

const now = new Date()
run().then(() => {
    console.log('duration: ', new Date() - now)
})