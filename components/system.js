export function getGlobalScope() {
  try {
    return window
  } catch (error) {
    return global
  }
}

export function isServer() {
  try {
    window.document
    return false
  } catch (error) {
    return true
  }
}

export function getGlobalData() {
  const scope = getGlobalScope()
  if (!scope.ipfsBoards) scope.ipfsBoards = {}
  return scope.ipfsBoards
}

async function getIPFSOptions() {
  const common = {
    libp2p: {
      config: {
        pubsub: { enabled: true }
      }
    }
  }
  if (isServer()) {
    return {
      relay: { enabled: true, hop: { enabled: true, active: true } },
      ...common
    }
  } else {
    const serverInfo = await getServerInfo()
    let additionalOptions = {}
    if (serverInfo) {
      additionalOptions = {
        config: {
          Bootstrap: [ ...serverInfo.multiaddrs ]
        }
      }
    }
    return {
      ...common,
      ...additionalOptions
    }
  }
}

export async function getIPFS() {
  const data = getGlobalData()
  if (data.ipfs) return data.ipfs
  const IPFS = await import(/* webpackChunkName: "ipfs" */ 'ipfs')
  const options = await getIPFSOptions()
  if (!data.ipfsPromise) {
    data.ipfsPromise = IPFS.create(options) 
  }
  data.ipfs = await data.ipfsPromise
  delete data.ipfsPromise
  return data.ipfs
}

export async function getOrbitDB() {
  try {
    const data = getGlobalData()
    if (data.orbitDb) return data.orbitDb
    const ipfs = await getIPFS()
    const OrbitDB = await import(/* webpackChunkName: "orbit-db" */ 'orbit-db').then(m => m.default)
    const BoardStore = await import(/* webpackChunkName: "orbit-db-discussion-board" */ 'orbit-db-discussion-board').then(m => m.default)
    if (!data.orbitDbPromise) {
      OrbitDB.addDatabaseType(BoardStore.type, BoardStore)
      data.orbitDbPromise = OrbitDB.createInstance(ipfs)
    }
    data.orbitDb = await data.orbitDbPromise
    delete data.orbitDbPromise
    if (!data.boards) data.boards = {}
    return data.orbitDb
  } catch (error) {
    console.log('FATAL: COULD NOT LOAD ORBITDB', error)
    throw error
  }
}

export async function openBoard(id) {
  const data = getGlobalData()
  if (data.boards && data.boards[id]) return data.boards[id]
  const BoardStore = await import(/* webpackChunkName: "orbit-db-discussion-board" */ 'orbit-db-discussion-board').then(m => m.default)
  const options = {
    type: BoardStore.type,
    create: true,
    write: ['*']
  }
  const orbitDb = await getOrbitDB()
  const db = await orbitDb.open(id, options)
  data.boards[id] = db
  await db.load()
  return db
}

const defaultLocalStorage = {
  favouriteBoards: ['general', 'test']
}

export function getLocalStorage() {
  try {
    return window.localStorage
  } catch (error) {
    const data = getGlobalData()
    if (!data.localStorage) data.localStorage = { ...defaultLocalStorage }
    return {
      getItem: name => data.localStorage[name],
      setItem: (name, value) => data.localStorage[name] = value,
      removeItem: name => delete data.localStorage[name],
    }
  }
}

export async function getIPFSPeers() {
  const data = getGlobalData()
  return data.ipfs ? (await data.ipfs.swarm.peers()).map(x => x.peer._idB58String) : []
}

export async function getPubsubInfo() {
  const data = getGlobalData()
  if (!data.ipfs) return {}
  const rooms = await data.ipfs.pubsub.ls()
  const pubsubInfo = {}
  for (const room of rooms) {
    pubsubInfo[room] = await data.ipfs.pubsub.peers(room)
  }
  return pubsubInfo
}

export function getInfo() {
  const data = getGlobalData()
  return data.info
}

export async function refreshInfo() {
  const data = getGlobalData()
  const ipfsReady = Boolean(data.ipfs)
  const multiaddrs = ipfsReady ? data.ipfs.libp2p.peerInfo.multiaddrs.toArray().map(m => m.toJSON()) : []
  data.info = {
    isServer: isServer(),
    ipfsReady,
    ipfsLoading: Boolean(data.ipfsPromise),
    orbitDbReady: Boolean(data.orbitDb),
    orbitDbPromise: Boolean(data.orbitDbPromise),
    openBoards: Object.keys(data.boards || {}),
    ipfsPeers: await getIPFSPeers(),
    pubsub: await getPubsubInfo(),
    multiaddrs
  }
  return data.info
}

export async function getServerInfo() {
  const response = await fetch('/api/status')
  if (response.status === 200) {
    return response.json()
  }
  return null
}

export async function connectoToIPFSMultiaddr(multiaddr) {
  const ipfs = await getIPFS()
  try {
    // console.log(`Connecting to ${multiaddr}...`)
    await ipfs.swarm.connect(multiaddr)
    console.log(`Connected to ${multiaddr}!`)
  } catch (error) {
    // console.log(`Connection to ${multiaddr} failed:`, error.message)
  }
}

export async function connectIPFSToBackend() {
  const serverInfo = await getServerInfo()
  const addresses = serverInfo.multiaddrs
  return Promise.race(addresses.map(connectoToIPFSMultiaddr))
}