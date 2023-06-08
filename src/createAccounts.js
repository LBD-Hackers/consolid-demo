const users = require('./setup.json')
const { fetch } = require('cross-fetch')
const { generateSession, Catalog } = require('consolid-daapi')

async function createPod(user) {
  const json = {
    podName: user.name,
    email: user.email,
    password: user.password,
    confirmPassword: user.password,
    createWebId: true,
    register: true,
    createPod: true
  };
  await fetch('http://localhost:3000/idp/register/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json)
  })
}

async function registerProjectCatalog(user, catalogName, session) {
  const body = `INSERT DATA {<${user.webId}> <https://w3id.org/consolid#hasProjectCatalogue> <${user.pod}${catalogName}> .}`
  const options = {
    method: "PATCH",
    headers: {
      "Content-Type": "application/sparql-update"
    },
    body
  }
  await session.fetch(user.webId, options)
}

async function run() {
  // iterate over the users in setup.json
  for (const u of Object.keys(users.users)) {
    const user = users.users[u]

    // create a Solid Pod for the user
    await createPod(user)

    // generate an authenticated Solid session for the user (dummy credentials in setup.json)
    const session = await generateSession(user, user.webId)

    //create the project catalog
    const catalogName = "myProjects"
    const catalogUrl = user.pod + catalogName // the url on the Pod
    const makePublic = true // if the catalog is public (false = only the owner, later adaptation is possible)

    const projectCatalog = new Catalog(session, catalogUrl)
    await projectCatalog.create(makePublic)

    // register the project catalog to allow discovery
    await registerProjectCatalog(user, catalogName, session)
  }
}

run()