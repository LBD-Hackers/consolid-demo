const fs = require('fs')
const {fetch} = require('cross-fetch')
const folders = [
    "C:/Users/Administrator/OneDrive - UGent/Algemeen/publicaties/SWJ_LBDserver/code/infrastructure/fuseki/run/configuration",
    "C:/Users/Administrator/OneDrive - UGent/Algemeen/publicaties/SWJ_LBDserver/code/infrastructure/fuseki/run/databases",
    "C:/Users/Administrator/OneDrive - UGent/Algemeen/publicaties/SWJ_LBDserver/code/infrastructure/fuseki/run/system_files"
]

const solidFolders = [
    "C:/Users/Administrator/OneDrive - UGent/Algemeen/publicaties/SWJ_LBDserver/code/infrastructure/css-lbd/data/architect",
    "C:/Users/Administrator/OneDrive - UGent/Algemeen/publicaties/SWJ_LBDserver/code/infrastructure/css-lbd/data/engineer",
    "C:/Users/Administrator/OneDrive - UGent/Algemeen/publicaties/SWJ_LBDserver/code/infrastructure/css-lbd/data/fm"
]

for (const folder of folders) {
    const files = fs.readdirSync(folder);
    for (const file of files) {
        const name = folder + '/' + file
        try {
            fs.unlinkSync(name)
        } catch (error) {
            fs.rmdirSync(name, {recursive: true, force: true})
        }
    }
}

for (const folder of solidFolders) {
    const files = fs.readdirSync(folder);
    for (const file of files) {
        if (file.length > 35) {
            fs.unlinkSync(folder + '/' + file)
        }
    }
    // const name = folder.split('/').pop()

    // const auth = 'Basic ' + Buffer.from("admin" + ":" + "pw").toString('base64')
    
    // var requestOptions = {
    //   method: 'POST',
    //   headers: {
    //       "Authorization": auth
    //   },
    // };

    // console.log('name', name)


    // fetch(`http://localhost:3030/$/datasets?dbName=${name}&dbType=tdb2`, requestOptions)
    //     .then(response => response.text())
    //     .then(result => console.log("Created pod mirror on remote SPARQL endpoint"))
    //     .catch(error => console.log(error));
}