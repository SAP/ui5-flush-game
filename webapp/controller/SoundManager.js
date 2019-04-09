/*global createjs*/

sap.ui.define([
	"sap/ui/base/Object",
	"sap/base/util/UriParameters",
	"sap/base/Log"
], function(UI5Object, UriParameters, Log) {
	"use strict";

	return UI5Object.extend("flush.game.controller.SoundManager", {
		init: function () {
			createjs.Sound.on("fileload", this._loadHandler, this);

			// an array of currently playing sounds for stopping on demand
			this._aPlayingSounds = [];

			// all sounds to load
			this._oSounds = {
				"thunderHit": "RenderManagerVomBlitzGetroffenDonner.mp3",
				"thunderLightning": "ThunderLightning.mp3",
				"coin": "243020__plasterbrain__game-start.mp3",
				"growl": "RenderManagerGrowl.mp3",
				"wind": "Windpfeifen.mp3",
				"hammer": "hammer.mp3",
				"badHit": "badHit.mp3",
				"goodHit": "goodHit.mp3",
				"Raketenduese": "Raketenduese.mp3",
				"Adlerschrei": "344445__reidedo__ram-mouth-hawk-rev-v1.mp3",
				"Cheer": "Audience_mixdown.mp3",
				"Win": "beep_win.mp3",
				"Loose": "beep_loose.mp3",
				"Level": "Musik_Tristan.mp3", // normal
				//"Level": "Jingle_Bells_3.mp3", // X-mas
				"big_bomb": "sounds_multiplayer/Bomb.mp3",
				"devil": "RenderManagerLachtTeuflisch.mp3",
				"start": "start_any_gamelevel.mp3",
				"roboStart": "robovoice_start.mp3",
				"roboLoose": "robovoice_loose.mp3",
				"roboWin": "robovoice_win.mp3",
				"gameOver": "game_over2.mp3",
				"laser": "sounds_multiplayer/Lasershot.mp3",
				"shoot": "344310__musiclegends__laser-shoot.mp3",
				"Controlshot": "sounds_multiplayer/Controlshot.mp3",
				"laserHitsControl": "sounds_multiplayer/laser_hits_control.mp3",
				"laserHitsRobot": "sounds_multiplayer/laser_hits_robot.mp3",
				"shootingCharge1": "sounds_multiplayer/LoadControlGun.mp3",
				"shootingCharge2": "sounds_multiplayer/LoadControlGun.mp3"
			};

			// load all sounds at the beginning
			this._loadSounds();
		},

		/**
		 * register and load sounds
		 * @private
		 */
		_loadSounds: function () {
			// register promises to play sounds only after they are loaded
			this._oSoundResolve = {};
			this._oSoundPromises = {};

			// load all sounds
			Object.keys(this._oSounds).forEach(function (sId) {
				this._oSoundPromises[sId] = new Promise(function (fnResolve) {
					this._oSoundResolve[sId] = fnResolve;
					var sSoundFile = sap.ui.require.toUrl("flush/game/sounds") +  "/" + this._oSounds[sId];
					createjs.Sound.registerSound(sSoundFile, sId);
				}.bind(this));

			}.bind(this));
		},

		/**
		 * Called when a sound file is loaded to resolve the promise assigned to the sound
		 * @param {sap.ui.base.Event} oEvent the event of the registered sound
		 * @private
		 */
		_loadHandler: function (oEvent) {
			this._oSoundResolve[oEvent.id]();
			Log.info("Loaded sound: " + oEvent.src);
		},

		/**
		 * Removes the sound from the playing array
		 * @param {object} oEvent the soundjs event
		 * @private
		 */
		_removePlayingSound: function (oEvent) {
			for (var i = 0; i < this._aPlayingSounds.length; i++) {
				if (this._aPlayingSounds[i] === oEvent.target) {
					this._aPlayingSounds.splice(i, 1);
					return;
				}
			}
		},

		/**
		 * Checks if a sound is currently playing
		 * @param {string} sWhich the sound to check
		 * @returns {boolean} true if currently playing, false otherwise
		 */
		isPlaying: function (sWhich) {
			for (var i = 0; i < this._aPlayingSounds.length; i++) {
				if (this._aPlayingSounds[i].id === sWhich) {
					return true;
				}
			}
			return false;
		},

		/**
		 * Stops a specific sound
		 * @param {string} sWhich the sound to stop
		 */
		stop: function (sWhich) {
			this._oSoundPromises[sWhich].then(function () {
				for (var i = 0; i < this._aPlayingSounds.length; i++) {
					if (this._aPlayingSounds[i].id === sWhich) {
						this._aPlayingSounds[i].stop();
						this._aPlayingSounds.splice(i, 1);
					}
				}
			}.bind(this));
		},

		/**
		 * Stops all sounds
		 */
		stopAllSounds: function () {
			createjs.Sound.stop();
		},

		/**
		 * Plays a sound with the given options after it is loaded
		 * @param {string} sId the id of the sound
		 * @param {int} [iWhen] introduces a delay for playing
		 * @param {int} [iHowLong] stops the sound
		 * @param {float} [fVolume] volume level for the sound
		 * @returns {Promise} is resolved when the sound finished playing
		 */
		play: function (sWhich, iDelay ,iHowLong, fVolume) {
			// no sound mode for quiet debugging
			var oUriParameters = new UriParameters(window.location.href);
			if (oUriParameters.get("sound") === "false") {
				// just return a delayed promise that does nothing
				return new Promise(function (fnResolve) {
					setTimeout(fnResolve, 500);
				});
			}

			var fnPlaySound = function (sId, fnResolve) {
				var oInstance = createjs.Sound.play(sId);
				oInstance.id = sId;
				oInstance.on("complete", fnResolve);
				oInstance.on("complete", this._removePlayingSound, this);
				this._aPlayingSounds.push(oInstance);
				if (fVolume) {
					oInstance.volume = fVolume;
				}
			}.bind(this);

			return new Promise(function (fnResolve) {
				this._oSoundPromises[sWhich].then(function () {
					if (iDelay) {
						setTimeout(function () {
							fnPlaySound(sWhich, fnResolve);
						}, iDelay);
					} else {
						fnPlaySound(sWhich, fnResolve);
					}
					if (iHowLong) {
						setTimeout(function () {
							this.stop(sWhich);
							fnResolve();
						}.bind(this), iHowLong);
					}
				}.bind(this));
			}.bind(this));
		}

	});
});
