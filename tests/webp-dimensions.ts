import assert from 'node:assert/strict'

// These lossless sprite exports contain one VP8L chunk.
export function webpDimensions(data: Buffer): number[] {
	assert.equal(data.toString('ascii', 0, 4), 'RIFF')
	assert.equal(data.toString('ascii', 8, 16), 'WEBPVP8L')
	assert.equal(data[20], 0x2f)
	const dimensions = data.readUInt32LE(21)
	return [(dimensions & 0x3fff) + 1, ((dimensions >>> 14) & 0x3fff) + 1]
}
