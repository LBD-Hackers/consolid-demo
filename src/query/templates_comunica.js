function addPrefixes(query) {
    const prefixes = `
    PREFIX consolid: <https://w3id.org/consolid#> 
    PREFIX schema: <https://schema.org/>
    PREFIX dcat: <http://www.w3.org/ns/dcat#>
    `
    return prefixes + query
}


const selectConcept = (activeDocument, identifier, owner) => {
    return  addPrefixes(
`SELECT ?concept ?local ?alias
    WHERE {

        ?concept consolid:aggregates/consolid:hasIdentifier ?id  .
        ?id consolid:inDocument <${activeDocument}> ;
            schema:value "${identifier}" .

        OPTIONAL {
          ?concept consolid:aggregates ?local .
          FILTER CONTAINS(str(?local), '${owner.pod}')
        }
    
        OPTIONAL {
          ?concept consolid:aggregates ?alias .
          FILTER regex(str(?alias), '^((?!${owner.pod}).)*$')
        }

        FILTER regex(str(?concept), '^((?!graph=).)*$')
}`)
}

const selectLocalRepresentation = (reference, concept, graph) => {
    return addPrefixes(`SELECT ?concept ?reference ?value ?doc
    WHERE {

        <${concept}> consolid:aggregates <${reference}> .
        <${reference}> consolid:hasIdentifier ?id .
    
        ?id consolid:inDocument ?doc ;
            schema:value ?value .

        #?meta dcat:distribution/dcat:downloadURL ?doc .

    
        BIND(<${concept}> as ?concept)
        BIND(<${reference}> as ?reference)
    
}`)
}

const selectRemoteRepresentation = (alias, concept, graph) => {
    return addPrefixes(`SELECT ?reference ?value ?doc ?concept ?alias
    WHERE {
        <${alias}> consolid:aggregates ?reference .        
        ?reference consolid:hasIdentifier ?id .
    
        ?id consolid:inDocument ?doc ;
            schema:value ?value .
    
        #?meta dcat:distribution/dcat:downloadURL ?doc .

    BIND(<${concept}> as ?concept)
    BIND(<${alias}> as ?alias)
    }`)
}

module.exports = {selectConcept, selectRemoteRepresentation, selectLocalRepresentation}