# ConSolid demo reproduction
This repository helps in locally reproducing a ConSolid experiment. The following steps should be taken:

Before you start, please execute `npm install`.

### Infrastructure
* Initialise a local Solid Community Server, with the customised version to have an associated SPARQL endpoint. A prototype can be found [here](https://github.com/LBD-Hackers/SolidCommunity_Fuseki.git). Install the necessary packages with `npm install`. You will need to install the following library globally: env-cmd (`npm i -g env-cmd`)
* Install [Apache Fuseki](https://jena.apache.org/documentation/fuseki2/), go to the folder "/run/templates" and make sure the templates that include "config-tdb-..." have the following setting enabled (by default commented out): `<#tdb_dataset_readwrite> tdb2:unionDefaultGraph true`. This activates the setting to expose the default graph as a union of the named graphs in the repository.
* Set the Fuseki backend in the Community Server's environment variables. By default, "SPARQL_STORE_ENDPOINT" is set to "http://localhost:3030".
* Start the Community Server with using a file-based configuration with `npm run start:file`.
* A Pod must be created manually to initiate the server setup. Create this dummy Pod at `http://localhost:3000` and make sure the Pod gets its own namespace.
* Download the SPARQL satellite (https://github.com/ConSolidProject/auth-satellite). Install its dependencies with `npm install`. With the command `npm run demo`, 3 parallel instances of this satellite will be created, one for each user. To run the demo, the following library need to be installed globally: concurrently (`npm i -g concurrently`), ts-node (`npm i -g ts-node`) and nodemon (`npm i -g nodemon`).

### Use case
* create the 3 users 'architect', 'engineer' and 'fm' by running the following script:
  * `node ./src/createAccount.js`. For each user, a repository is created on the Fuseki server. The SPARQL satellite contains configurations for each of these users. The SPARQL satellite endpoint will be linked automatically to the user's WebId.
* Create a project by consecutively executing the following scripts:
  * `node ./src/createProject.js`. This will create an aggregator for the project on each Pod, containing pointers to a stakeholder's own datasets and to the aggregators of other stakeholders in the project. The following files will be uploaded, and registered as the distribution of a dataset: a 3D geometry model to the Engineer's Pod, an RDF semantic model to the Architect's Pod and an image of a concrete crack to the Facility Manager's Pod.
  * `node ./src/createAlignment.js` This script automatically aligns the GlTF geometry on the Engineer Pod with the Semantics on the Architect's Pod. 
* Now the FM registers a damage, creates a concept for the damaged element and references the other concepts from other stakeholders that also refer to this element. Also, a damage zone is registered - linked to a pixel zone on an image of the crack. You can mimic this UI input by running the following script:
  * `node ./src/registerCrack.js`
* Check if the alignment works by executing the following script: 
  * `node ./src/aggregate.js` This script mimicks a sub-document selection from a GUI (e.g. an object selected in a 3D viewer), and retrieves all registered references to the same concept.

### Without Access Control
You can run the setup without access control by setting the sparql satellite of each user to port 3030 (Fuseki) instead of the above mentioned ports. 
    
