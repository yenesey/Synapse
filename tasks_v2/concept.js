
async function main (params) {
	console.log('params =', params)
}

module.exports = {
	params: {
		date: Date,
		makeFiles: Boolean,
		outputPath: String,
		department: 'DLOOKUP'
		// NOTE: process.stdin
	},
	run: main
}
