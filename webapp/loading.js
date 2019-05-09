/* update loading screen with amazingly funny status messages */
(function () {
	var aStates = [
		"Checking faulty circuits",
		"Charging chromatic laser",
		"Rebooting AI core system",
		"Instantiating evil robot army",
		"Polishing communication antennas",
		"Booting up sound system",
		"Inspecting software bugs",
		"Analyzing data lakes",
		"Taming render manager",
		"Updating fusion drive"
	];

	function updateStatus () {
		setTimeout(function () {
			var iRandom = Math.floor(Math.random() * aStates.length);
			document.getElementsByClassName("status")[0].innerHTML = aStates[iRandom] + "...";
			aStates.splice(iRandom, 1);
			if (aStates.length > 0) {
				updateStatus();
			}
		}, 300 + Math.random() * 500);
	}

	window.onload = updateStatus;
})();