const { Session } = require("@inrupt/solid-client-authn-node")
const { Catalog } = require("consolid-daapi")
const { ReferenceRegistry } = require('consolid-raapi')

async function run() {
    const session = new Session()

    // we have selected the following element in the 3D viewer (fixed GUID from config)
    const activeDocument = "http://localhost:3000/engineer/f177466f-5929-445f-b2d7-ee19576c7d3a"
    const selectedElement = "2O2Fr$t4X7Zf8NOew3FLOH"

    // the project is active
    const url = "http://localhost:3000/fm/fb3d5bcd-8bcb-4d46-be2b-6c3ef824d5d9"

    const refRegUrl = await findReferenceRegistry(url)
    const project = new Catalog(session, url)
    const refReg = new ReferenceRegistry(session, refRegUrl, project)
    const references = await refReg.findConceptByIdentifier(activeDocument, selectedElement)

    // we should now get all references, the one from the damage semantics as well.
    console.log('references', references)
}

const now = new Date()
console.log('start')
run().then(() => {
    const end = new Date()
    console.log("duration: ", end.getTime() - now.getTime())
})