const crypto = require('crypto')

// Deterministic 32-byte Hyperswarm topic derived directly from a fixture's
// stable matchId (see fixtures.js). Because the matchId is bundled data,
// not free-text a user types, every peer derives the identical topic for
// the identical match with zero risk of typos/formatting producing two
// different rooms for what should be the same match.
function topicFromMatchId(matchId) {
  return crypto.createHash('sha256').update(matchId).digest()
}

module.exports = { topicFromMatchId }
