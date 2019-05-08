/* update loading screen with amazingly funny status messages */
(function () {
	var aStates = [
		"Checking Faulty Circuits",
		"Charging Chromatic Laser",
		"Rebooting AI Core System",
		"Instantiating Evil Robot Army",
		"Polishing communication antenna",
		"Booting up sound system",
		"Inspecting Software Bugs",
		"Analyzing Data Lake",
		"Taming Render Manager",
		"Updating Fusion Drive"
	];

	function updateStatus () {
		setTimeout(function () {
			var iRandom = Math.floor(Math.random() * aStates.length);
			document.getElementsByClassName("status")[0].innerHTML = aStates[iRandom];
			aStates.splice(iRandom, 1);
			if (aStates.length > 0) {
				updateStatus();
			}
		}, 300 + Math.random() * 500);
	}

	window.onload = updateStatus;
})();