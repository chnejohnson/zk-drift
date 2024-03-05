export function get_last_paths(paths) {
	let last_paths = [
		[-1, -1],
		[-1, -1],
		[-1, -1],
		[-1, -1],
		[-1, -1],
	]
	for (let i = 4; i > 0; i--) {
		if (paths[i][0] !== -1 && paths[i][1] !== -1) {
			last_paths[i - 1] = paths[i - 1]
		}
	}
	return last_paths
}

export function flatten(paths) {
	const res = [-1, -1, -1, -1, -1]
	for (let i = 0; i < paths.length; i++) {
		if (paths[i][0] !== -1 && paths[i][1] !== -1) {
			res[i] = paths[i][0] + paths[i][1] * 3
		}
	}
	return res
}
