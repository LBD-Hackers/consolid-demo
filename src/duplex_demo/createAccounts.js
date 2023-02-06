const users = require('./setup.json')
const {fetch} = require('cross-fetch')

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
  for (const user of Object.keys(users.users)) {
    await createPod(users.users[user])
  }
}


create()