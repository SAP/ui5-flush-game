sap.ui.define([], function () {
	"use strict";
	return {

		/**
		 * Returns the relative URL to a product picture
		 * @param {string} sUrl image URL
		 * @return {string} relative image URL
		 */
		pictureUrl: function (sUrl) {
			return sap.ui.require.toUrl("flush/game/" + sUrl);
		},

		/**
		 * Returns a text matching the RenderManagers mood based on the game progress
		 * @param {int} iValue the mood value
		 * @reuturn {string}
		 */
		moodText: function (iValue) {
			var sResult = "Relaxed";
			if (iValue > 5 && iValue < 10) {
				sResult = "Calm";
			} else if (iValue < 20) {
				sResult = "Moderate";
			} else if (iValue < 30) {
				sResult = "Annoyed";
			} else if (iValue < 50) {
				sResult = "Rude";
			} else if (iValue < 70) {
				sResult = "Aggressive";
			} else if (iValue < 90) {
				sResult = "Violent";
			} else if (iValue < 95) {
				sResult = "Desastrous";
			} else {
				sResult = "Killing Spree"
			}
			return sResult;
		}
	};
});