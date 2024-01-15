const https = require('https');
const fs = require('node:fs');


function getHTTPReq(path) {
    return new Promise((resolve, reject) => {
        https.get((path), (response) => {
            let chunks_of_data = [];

            response.on('data', (fragments) => {
                chunks_of_data.push(fragments);
            });

            response.on('end', () => {
                let response_body = Buffer.concat(chunks_of_data);
                resolve(JSON.parse(response_body.toString()));
            });
        });
    });
}


(async function () {
    const srd_only = false


    spellPath = 'https://raw.githubusercontent.com/5etools-mirror-1/5etools-mirror-1.github.io/master/data/spells/'
    const index = await getHTTPReq(spellPath + 'index.json');

    promises = []

    Object.values(index).forEach((e) => {
        promises.push(getHTTPReq(spellPath + e))
    })

    Promise.allSettled(promises).then((results) => {
        let allSpells = []
        results.forEach((result) => {

            if ( result.value.spell.length > 0 ) allSpells = [...allSpells, ...result.value.spell]
        })

        if (srd_only === true){
            allSpells = allSpells.filter((e) => {
                return e.srd === true
            })
        }

        const filepath = 'data' + (srd_only === true ? "_srd" : "") + '/spells.json'
        fs.writeFileSync(filepath, JSON.stringify(allSpells));
    })
    
})();
