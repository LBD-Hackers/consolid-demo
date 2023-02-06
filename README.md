# ConSolid demo reproduction
This repository aids in locally reproducing a ConSolid experiment. The following steps should be taken:

Before you start, please execute `npm install`.

### Infrastructure
* Initialise a local Solid Community Server, with the customised version to have an associated SPARQL endpoint. A prototype can be found [here](https://github.com/LBD-Hackers/SolidCommunity_Fuseki.git). Install the necessary packages with `npm install`.
* Install [Apache Fuseki](https://jena.apache.org/documentation/fuseki2/), go to the folder "/run/templates" and make sure the templates that include "config-tdb-..." have the following setting enabled (by default commented out): `<#tdb_dataset_readwrite> tdb2:unionDefaultGraph true`. This activates the setting to expose the default graph as a union of the named graphs.
* Set the Fuseki backend in the Community Server's environment variables. By default, "SPARQL_STORE_ENDPOINT" is set to "http://localhost:3030".
* Start the Community Server using a file-based configuration with `npm run start:file`.
* A Pod must be created manually to initiate the server setup. Create this dummy Pod at `http://localhost:3000` and make sure the Pod gets its own namespace.

### Use case
* create the 3 users 'architect', 'engineer' and 'fm' by running the following script:
  * `node ./src/duplex_demo/createAccount.js`. For each user, a repository is created on the Fuseki server.
* register the SPARQL satellite at the user's webID: e.g. `<http://localhost:3000/fm/profile/card#me> <https://w3id.org/consolid#hasSparqlSatellite> <http://localhost:3030/fm/sparql> .`. This can be done via a SPARQL INSERT to the user's profile. A quick solution is to directly type this in the user's card (SolidCommunity_Fuseki/data/{pod}/profile/card$.ttl). This change will not be mirrored to the SPARQL endpoint, but for this use case, all requests to the WebID will happen via the LDP interface anyway, so it's ok.
* Create a project by consecutively executing the following scripts:
  * `node ./src/duplex_demo/createProject.js`. This will create an aggregator for the project on each Pod, containing pointers to a stakeholder's own datasets and to the aggregators of other stakeholders in the project. The following files will be uploaded, and registered as the distribution of a dataset: a 3D geometry model to the Engineer's Pod, an RDF semantic model to the Architect's Pod and an image of a concrete crack to the Facility Manager's Pod.
  * `node ./src/duplex_demo/createAlignment.js` This script automatically aligns the GlTF geometry on the Engineer Pod with the Semantics on the Architect's Pod. 
* Now the FM registers a damage, creates a concept for the damaged element and references the other concepts from other stakeholders that also refer to this element. Also, a damage zone is registered - linked to a pixel zone on an image of the crack. You can mimic this UI input by running the following script:
  * `node ./src/duplex_demo/registerCrack.js`.

## Querying the ecosystem
### Without access control satellite - direct query of the Fuseki repositories
You can now check that the alignment works by executing the following script: 
  * `node ./src/query/aggregate_fuseki.js` This script performs a query-based a sub-document selection and retrieves all registered references to the same concept. Queries are directly sent to the Fuseki endpoint.

### With Comunica
You can now check that the alignment works by executing the following script: 
  * `node ./src/query/aggregate_comunica.js` This script performs a query-based a sub-document selection and retrieves all registered references to the same concept, using the [Comunica](https://comunica.dev) framework. 

### With access control satellite
This use case is quite experimental, as the access control satellite does only support a small subset of SPARQL queries yet. Nevertheless, the discovery patterns for the use case should remain the same. Apart from the infrastructure described above, you need to install the [SPARQL wrapper satellite](https://github.com/LBD-Hackers/lbdserver-sparql-satellite). Don't forget to `npm install`.
* Start the SPARQL wrapper satellite using `npm run duplex`. This will instantiate a satellite instance for each of the stakeholders (see use case). If you want to create an instance for another pod, simply copy the environment variable template from `env-architect.env` and make the necessary changes. Now run the satellite with `env-cmd -f ./my-env.env ts-node src/index.ts`
* register the SPARQL satellite wrapper (instead of the Fuseki endpoint) at the user's webID instead of the Fuseki endpoint (manually or with SPARQL INSERT). The ports in the satellite configuration are as follows: 
  * ARCHITECT: `<http://localhost:3000/architect/profile/card#me> <https://w3id.org/consolid#hasSparqlSatellite> <http://localhost:3001/architect/sparql> .`
  * ENGINEER: `<http://localhost:3000/engineer/profile/card#me> <https://w3id.org/consolid#hasSparqlSatellite> <http://localhost:3002/engineer/sparql> .`
  * FM: `<http://localhost:3000/fm/profile/card#me> <https://w3id.org/consolid#hasSparqlSatellite> <http://localhost:3003/fm/sparql> .`
* You can now check that the alignment works by executing the following script: 
  * `node ./src/query/aggregate_satellite.js` This script performs a query-based a sub-document selection and retrieves all registered references to the same concept. 

