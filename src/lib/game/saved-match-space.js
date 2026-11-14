// The static home page cannot see browser storage. Reserve the resume card's
// space before the first paint; SavedMatchCard validates the save on mount.
try {
	document.documentElement.classList.toggle('has-saved-match', localStorage.getItem('pixelswars-saved-match') !== null)
} catch {
	// Storage may be unavailable.
}
