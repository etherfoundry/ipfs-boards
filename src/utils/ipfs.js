export async function ipfsPut(content) {
    const obj = {
        content: Buffer.from(content),
        path: '/'
    }
    const response = await window.ipfs.files.add(obj)
    return response[0].hash
}

export async function readText(multihash) {
    const buffer = await window.ipfs.object.get(multihash)
    return buffer.toString('utf-8')
}

export async function getStats() {
    const ipfs = window.ipfs;
    const orbitDb = window.orbitDb
    const dbs = {}
    const stats = {}
    if (ipfs) {
        const peers = await ipfs.swarm.peers()
        const id = await ipfs.id()
        stats.peers = peers.map(p => p.peer.id._idB58String)
        stats.id = id.id
    }
    if (orbitDb) {
        stats.pubKey = await orbitDb.key.getPublic('hex')
        Object.values(window.dbs || {}).forEach(db => {
            let writeable = db.access.write.indexOf('*') >= 0 || db.access.write.indexOf(stats.pubKey) >= 0
            const dbInfo = {
                opLogLength: db._oplog.length,
                access: {
                    admin: db.access.admin,
                    read: db.access.read,
                    write: db.access.write,
                    writeable
                },
                peers: []
            }
            const subscription = orbitDb._pubsub._subscriptions
            if (subscription && subscription.room) {
                dbInfo.peers = subscription.room._peers
            }
            dbs[db.address] = dbInfo
        }) 
    }
    stats.dbs = dbs
    return stats
}