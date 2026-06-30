const fs = require('fs')
const path = require('path')
const crypto = require('hypercore-crypto')
const b4a = require('b4a')

// Loads or creates a persistent Ed25519 keypair for this app instance.
// This keypair doubles as BOTH the Hyperswarm DHT identity AND the Hypercore
// writer keypair -- so a peer's Hypercore public key is exactly the same
// key that other peers see as `info.publicKey` on connection. That means
// no extra handshake/gossip protocol is needed to discover peer core keys.
function loadIdentity(identityFile) {
  fs.mkdirSync(path.dirname(identityFile), { recursive: true })

  if (fs.existsSync(identityFile)) {
    const saved = JSON.parse(fs.readFileSync(identityFile, 'utf8'))
    return {
      publicKey: b4a.from(saved.publicKey, 'hex'),
      secretKey: b4a.from(saved.secretKey, 'hex')
    }
  }

  const keyPair = crypto.keyPair()
  fs.writeFileSync(identityFile, JSON.stringify({
    publicKey: b4a.toString(keyPair.publicKey, 'hex'),
    secretKey: b4a.toString(keyPair.secretKey, 'hex')
  }))
  return keyPair
}

module.exports = { loadIdentity }
