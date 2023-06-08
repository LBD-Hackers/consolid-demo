const query = require('../queryLinkTraversal')

const accessPoints = ["http://localhost:3000/architect/profile/card#me"]
const q = `SELECT DISTINCT * WHERE {
  ?s     <https://w3id.org/consolid#hasProjectCatalogue> ?catalogue .
  ?catalogue <http://www.w3.org/ns/dcat#dataset> ?dataset .
}`

const now = new Date()
query(q, accessPoints)
.then((data) => {
  data.map(b => console.log('b.get("dataset").value :>> ', b.get("dataset").value))
  console.log('duration: ', new Date() - now)
})
.catch(error => console.log('error :>> ', error))