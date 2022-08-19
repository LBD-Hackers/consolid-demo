#LBDserver demo reproduction
This repository aids in locally reproducing an LBDserver experiment. The following steps should be taken:

* Initialise a local Solid Community Server, with the customised version to have an associated SPARQL endpoint. A prototype can be found [here](https://github.com/LBD-Hackers/SolidCommunity_Fuseki.git).
* Initialise a [Fuseki backend]().
* Set the Fuseki backend in the Community Server's environment variables. By default, "SPARQL_STORE_ENDPOINT" is set to "http://localhost:3030".
* create the 3 users 'architect', 'engineer' and 'fm' by running the following script:
  * `node ./src/createAccount.js`
* Verify that a dataset is automatically created on the Fuseki server.
* register the SPARQL satellite at the user's webID: 
    E.g. `<http://localhost:3000/fm/profile/card#me> lbds:hasSparqlSatellite <http://localhost:3030/fm/sparql> .`
* Create a project by consecutively executing the following scripts:
  * `node ./src/createProject.js`
  * `node ./src/createAlignment.js` This script automatically aligns the GlTF geometry on the Engineer Pod with the Semantics on the Architect's Pod. 
* Now the FM registers a damage, creates a concept for the damaged element and references the other concepts from other stakeholders that also refer to this element. Also, a damage zone is registered - linked to a pixel zone on an image of the crack. You can mimic this UI input by running the following script:
  * `node ./src/registerCrack.js`
* Check the alignment works by executing the following script: 
  * `node ./src/aggregate.js` This script mimicks a sub-document selection from a GUI (e.g. an object selected in a 3D viewer), and retrieves all registered references to the same concept.
    
