
async function main (input) {
	console.log('input =', input)
}

module.exports = {
	input: {
		date: Date,
		makeFiles: Boolean,
		outputPath: String,
		department: 'DLOOKUP'
		// NOTE: process.stdin
	},
	run: main
}
