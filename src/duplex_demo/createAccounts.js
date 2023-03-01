const users = require('./setup.json')
const {fetch} = require('cross-fetch')
const {generateSession} = require('consolid-daapi')

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
  const result = await fetch('http://localhost:3000/idp/register/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json)
  })
}

async function create() {
  for (const u of Object.keys(users.users)) {
    const user = users.users[u]
    await createPod(user)
    const session = await generateSession(user, user.webId)
    const body = `INSERT DATA {<${user.webId}> <https://w3id.org/consolid#hasSparqlSatellite> <${user.satellite}> .}`
    const options = {
      method: "PATCH",
      headers: {
        "Content-Type": "application/sparql-update"
      },
      body
    }

    await session.fetch(user.webId, options)
  }
}


create()