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

    const items         = await getHTTPReq('https://raw.githubusercontent.com/5etools-mirror-1/5etools-mirror-1.github.io/master/data/items.json');
    const itemsBase     = await getHTTPReq('https://raw.githubusercontent.com/5etools-mirror-1/5etools-mirror-1.github.io/master/data/items-base.json');
    const magicVariants = await getHTTPReq('https://raw.githubusercontent.com/5etools-mirror-1/5etools-mirror-1.github.io/master/data/magicvariants.json');

    if (srd_only === true){
        items.item                 = items.item.filter(                (e) => e.srd === true)
        magicVariants.magicvariant = magicVariants.magicvariant.filter((e) => e.srd === true)
        itemsBase.baseitem         = itemsBase.baseitem.filter(        (e) => e.srd === true)
    }

    let totalItemList = []
    
    totalItemList.push(...itemsBase.baseitem)

    // Combine all items with their item.baseItem, overwriting already existing values
    items.item.forEach((e) => {
        if (e.hasRefs) {
        if (e.baseItem) {
            const [name, source] = e.baseItem.split('|')
            e = Object.assign({}, itemsBase.baseitem.filter((ib) => (ib.name.toUpperCase() === name.toUpperCase()) && (ib.source === source))[0], e)
        }
        }
        totalItemList.push(e)
    })

    // For all magical variants, make an item where the required keys are the same of the base item.
    magicVariants.magicvariant.forEach((magicItem) => {
        itemsBase.baseitem.forEach((baseItem) => {
        magicItem.requires.forEach((req) => {
            if (Object.keys(req).every((e) => req[e] === baseItem[e]) === true) {
            const obj = Object.assign({}, baseItem, magicItem.inherits)
            obj.name = ((obj.namePrefix || '') + baseItem.name + (obj.nameSuffix || ''))
            totalItemList.push(obj)
            }
        })
        })
    })

    // Replace all {#itemEntry <thing>} in item.entries
    // and push it onto totalItemList
    totalItemList = totalItemList.map((e) => {
        if (e.entries) {
        if (typeof e.entries[0] === 'string') {
            if (e.entries[0].match(/^{#.*}$/g)) {
            const [name] = e.entries[0].replace(/([{}])|#itemEntry /g, '').split('|')
            let entries = JSON.stringify(itemsBase.itemEntry.filter((e) => e.name === name)[0].entriesTemplate)

            while (entries.match(/{{.*?}}/)) {
                const match = entries.match(/{{.*?}}/)[0]
                const aspect = match.replace(/[{}]|item\./g, '')
                try {
                entries = entries.replace(match, e[aspect].join())
                } catch {
                entries = entries.replace(match, e[aspect])
                }
            }
            e.entries = JSON.parse(entries)
            }
        }
        }
        return e
    })

    totalItemList = totalItemList.map((e) => {
        if (e._copy !== undefined) {
        e = Object.assign({}, totalItemList.filter((ti) => ti.name === e._copy.name)[0], e)
        delete e._copy
        }
        return e
    })
    
    const filepath = 'data' + (srd_only === true ? "_srd" : "") + '/items.json'
    fs.writeFileSync(filepath, JSON.stringify(totalItemList));
})();
