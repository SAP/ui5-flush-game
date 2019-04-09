sap.ui.define([
	"sap/ui/core/Control",
	"../controls/MessageToastDeluxe",
], function (Control/*, MessageToastDeluxe*/) {
	"use strict";

	/**
	 * MessageToastStory builds up a queue of message toasts to be played
	 */
	return Control.extend("flush.game.controls.MessageToastStory", {
		metadata: {
			properties: {
				"random": {
					type: "boolean",
					defaultValue: false
				},
				"delay": {
					type: "boolean",
					defaultValue: 0
				},
				"loop": {
					type: "boolean",
					defaultValue: false
				}
			},
			defaultAggregation: "steps",
			aggregations: {
				"steps": {
					type: "flush.game.controls.MessageToastDeluxe",
					multiple: true
				}
			}
		},

		/**
		 * Randomize array element order in-place.
		 * Using Durstenfeld shuffle algorithm.
		 */
		_shuffleArray: function (array) {
			for (var i = array.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
		},

		/**
		 * Plays a stack of animations
		 * @return {Promise} is resolved when the stack has ended playing
		 */
		play: function () {
			var aSteps = this.getAggregation("steps");

			// kill previous stack first before playing the same story again
			if (this.isPlaying()) {
				this.stop();
			}

			if (this.getRandom()) {
				this._shuffleArray(aSteps);
			}


			// build up promise chain
			this._bStopped = false;
			this._playAll(aSteps.reverse());

			this._oPlaying =  new Promise(function (fnResolve, fnReject) {
				this._fnResolve = fnResolve;
			}.bind(this));
			return this._oPlaying;
		},

		/**
		 * Method to check if a message toast story is currently playing
		 * @return {boolean} true if the story is playing, false if not
		 */
		isPlaying: function () {
			return !this._bStopped;
		},

		/**
		 * Stops the current stack
		 * @return {Promise} is resolved when the stack has ended playing
		 */
		stop: function () {
			this._bStopped = true;
			this._killLastToast();
			return this._oPlaying;
		},

		/**
		 * Hardcore-deletes the dom entry for the last-created message toast
		 */
		_killLastToast: function () {
			var aToastCollection = document.getElementsByClassName("sapMMessageToast");

			// remove last item
			if (aToastCollection.length) {
				aToastCollection.item(aToastCollection.length - 1).remove();
			}
		},

		/**
		 * Plays a stack of steps recursivels
		 * @param aSteps
		 * @private
		 */
		_playAll: function (aSteps) {
			if (aSteps.length === 0 || this._bStopped) {
				if (this.getLoop() && !this._bStopped) {
					this.play();
				}
				if (!this._bStopped) {
					this._fnResolve();
				}
				return;
			}

			var oStep = aSteps.pop();
			oStep.show().then(function () {
				if (this.getDelay()) {
					setTimeout(function () {
						this._playAll(aSteps);
					}.bind(this), this.getDelay());
				} else {
					this._playAll(aSteps);
				}
			}.bind(this));
		}
	});

});