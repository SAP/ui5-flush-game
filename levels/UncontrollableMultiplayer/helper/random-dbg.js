sap.ui.define([], function() {
	"use strict";
	/**
	 * Calculates a random number.
	 *
	 * @param {number} min Min border for random number
	 * @param {number} max Max border for random number
	 * @returns {number} Random number
	 */
	return {
		getInt: function(min, max) {
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(Math.random() * (max - min)) + min;
		}
	};
});