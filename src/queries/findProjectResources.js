const query = require('../queryLinkTraversal')
const {DCAT} = require('@inrupt/vocab-common-rdf')

const accessPoints = ["http://localhost:3000/architect/duplex"]
const q = `SELECT DISTINCT * WHERE {

  #the "+" sign means that a chain is created of this property
  <${accessPoints[0]}> <${DCAT.dataset}>+ ?dataset . 
  ?dataset <${DCAT.distribution}> ?distribution .

  ?distribution <${DCAT.mediaType}> <https://www.iana.org/assignments/media-types/model/gltf+json> .
}`

const now = new Date()
query(q, accessPoints, {lenient: true})
.then((data) => {
  data.map(b => console.log('Project resources:', b.get("distribution").value))
  console.log('duration: ', new Date() - now)
})
.catch(error => console.log('error :>> ', error))