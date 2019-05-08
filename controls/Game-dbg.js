sap.ui.define([
	"sap/m/Page",
	"sap/ui/Device",
	"sap/ui/core/HTML",
	"sap/m/Image",
	"../controls/MessageToastDeluxe"
], function (Page, Device, HTML, Image, MessageToastDeluxe) {
	"use strict";

	/**
	 * Game class to load levels and introduce basic game mechanics
	 */
	var oGame = Page.extend("flush.game.controls.Game", {
		metadata: {
			properties: {
				/* the level to be loaded */
				"level": {
					type: "string",
					defaultValue: "Demo"
				},
				/* level difficulty */
				"difficulty": {
					type: "int",
					defaultValue: 1
				},
				/* game score */
				"score": {
					type: "int",
					defaultValue: 0
				},
				/* time limit until the level is ended */
				"timeLimit": {
					type: "int",
					defaultValue: 0
				},

				/* multi player properties */

				/* player1 lives */
				"player1Lives": {
					type: "int",
					defaultValue: 0
				},
				/* player2 lives */
				"player2Lives": {
					type: "int",
					defaultValue: 0
				},
				/* player1 energy */
				"player1Energy": {
					type: "float",
					defaultValue: 0
				},
				/* player2 energy */
				"player2Energy": {
					type: "float",
					defaultValue: 0
				}
			},
			events: {
				/* fired when the level is initialized */
				"init": {},
				/* fired when the level is destroyed */
				"end": {
					// game winner
					who: {
						type: "int"
					}
				},
				/* fired when a player was hit */
				"hit": {
					// hit player
					who: {
						type: "int"
					}
				},
				/* fired when a player threw a bomb */
				"bomb": {
					// player firing the bomb
					who: {
						type: "int"
					}
				}
			}
		},

		/**
		 * Injects an empty canvas into the page content
		 */
		init: function () {
			var oCanvas = new HTML(this.getId() + "-canvas", {
				content: '<canvas class="game sapMFocusable" width="' + (Device.system.desktop ? "1270px" : Device.resize.width) + '" height="' + (Device.system.desktop ? "720px" : Device.resize.height - 120 + "px") + '" tabindex="0"></canvas>'
			});
			this.addContent(oCanvas);

			var oDebugCanvas = new HTML("debugCanvas", {
				content: '<canvas width="' + (Device.system.desktop ? "1270px" : "100vw") + '" height="' + (Device.system.desktop ? "720px" : Device.resize.height - 120 + "px") + '" style="display:none"></canvas>'
			});
			this.addContent(oDebugCanvas);
		},

		setLevel: function(sLevel){
			// update canvas size on level load
			this._updateCanvasSize();
			// nice idea but the create.js levels don't support it yet
			//Device.orientation.attachHandler(this._updateCanvasSize);

			// update value property
			if (sLevel){
				this.setProperty("level", sLevel);
				this._loadLevel();
			}
			return this;
		},

		/**
		 * Set canvas as focus ref
		 * @returns {any}
		 */
		getFocusDomRef: function () {
			return this.getContent()[0].$()[0];
		},

		/**
		 * Updates canvas size to screen size
 		 * @private
		 */
		_updateCanvasSize: function () {
			var oCanvas = document.getElementsByClassName("game")[0];
			if (oCanvas) {
				oCanvas.setAttribute("width", (Device.system.desktop ? "1270px" : document.body.offsetWidth));
				oCanvas.setAttribute("height", (Device.system.desktop ? "720px" : document.body.offsetHeight - 120 + "px"));
			}
		},

		/**
		 * Returns a random position for a sprite
		 * @return {string} a random vertical and horizontal position
		 * @private
		 */
		_getRandomPosition: function () {
			var aOptionsVertical = ["begin", "end"];
			var aOptionsHorizontal = ["top", "center", "bottom"];

			var iRandomIndex1 = Math.floor(Math.abs(Math.random()) * aOptionsVertical.length);
			var iRandomIndex2 = Math.floor(Math.abs(Math.random()) * aOptionsHorizontal.length);
			return aOptionsVertical[iRandomIndex1] + " " + aOptionsHorizontal[iRandomIndex2];
		},

		/**
		 * Counts down to a certain timeLimit and dispays effects at certain time markers
		 * @private
		 */
		_timedGameLoop: function () {
			var iRemainingTime = parseInt(this.getModel("view").getProperty("/remainingTime")),
				oSprite;

			if (!this._bLevelRunning) {
				return;
			}

			// create an encouraging sprite at certain time events
			if (iRemainingTime === 16) {
				oSprite = new MessageToastDeluxe({
					number: "Hurry",
					image: "effect_points_negative.png",
					duration: 1,
					position: "center center"
				});
				this.getParent().byId("remainingTime").setState("Warning");
			} else if (iRemainingTime === 6) {
				oSprite = new MessageToastDeluxe({
					number: "Panic",
					image: "effect_points_negative.png",
					duration: 1,
					position: "center center"
				});
				this.getParent().byId("remainingTime").setState("Error");
			} else if (iRemainingTime === 1) {
				oSprite = new MessageToastDeluxe({
					number: "Over!",
					image: "effect_points_critical.png",
					duration: 1,
					position: "center center"
				});
			}

			// generic sprite lifecycle
			if (oSprite) {
				this.addDependent(oSprite);
				oSprite.show().then(function () {
					oSprite.destroy();
				});
			}

			// end game after countdown is at 0
			if (iRemainingTime <= 0) {
				this.getModel("view").setProperty("/remainingTime", 0);
				this.end();
				if (this.getProperty("level").match(/multi/i)) {
					// multi player end
					var iLifesPlayer1 = Math.max(0, this.getProperty("player1Lives"));
					var iLifesPlayer2 = Math.max(0, this.getProperty("player2Lives"));
					if (iLifesPlayer1 !== iLifesPlayer2) {
						// player with more life wins
						var iWinner = (iLifesPlayer1 > iLifesPlayer2 ? 1 : 2);
						this.fireEnd({
							who: iWinner
						});
					} else {
						// draw
						this.fireEnd();
					}
				} else {
					// single player end
					this.fireEnd();
				}


				return;
			}

			// call the next loop
			this.getModel("view").setProperty("/remainingTime", this.getModel("view").getProperty("/remainingTime") - 1);
			this._iLevelTimer = setTimeout(function () {
				this._timedGameLoop();
			}.bind(this), 1000);
		},

		/**
		 * Inits a multiplayer game
		 * @private
		 */
		_initMultiPlayer: function () {
			// set energy to 0
			this.setProperty("player1Energy", 0, true);
			this.setProperty("player2Energy", 0, true);
			// reload energy in 10 seconds
			this._iMultiEnergyLoop = setInterval(function () {
				this.setProperty("player1Energy", Math.min(100, this.getPlayer1Energy() + 0.5), true);
				this.setProperty("player2Energy", Math.min(100, this.getPlayer2Energy() + 0.5), true);
			}.bind(this), 80);
			// give both players 5 lives
			this.setProperty("player1Lives", 5, true);
			this.setProperty("player2Lives", 5, true);
		},

		/**
		 * Returns the energy loading segment for correct picture selection
		 */
		getPlayerEnergySegment: function (iWho) {
			var energy,
				segments = {
					1: 16.5,
					2: 33,
					3: 49.5,
					4: 66,
					5: 82.5,
					6: 99.9,
					7: 101
				},
				finalSegment;

			if (iWho !== undefined) {
				if (iWho === 1) {
					energy = this.getPlayer1Energy();
				} else if (iWho === 2) {
					energy = this.getPlayer2Energy();
				}
			}

			var segmentMaxBorder;
			var segmentFound = false;
			Object.keys(segments).forEach(function (sKey) {
				segmentMaxBorder = segments[sKey];
				if (energy < segmentMaxBorder && !segmentFound) {
					finalSegment = sKey;
					segmentFound = true;
				}
			});

			return finalSegment;
		},

		/**
		 * Starts a timed game that ends automatically when the time limit has been hit
		 */
		initTimeLimit: function () {
			// init
			this.getModel("view").setProperty("/remainingTime", this.getProperty("timeLimit"));
			this.getParent().byId("remainingTime").setState("None");

			// tick down
			this._bLevelRunning = true;
			this._timedGameLoop();
		},

		/**
		 * convenience function to control sounds from within a level
		 * @return {object} the global SoundManager instance
		 */
		getSoundManager: function () {
			if (!this._oSoundManager) {
				this._oSoundManager = this.getParent().getController().getSoundManager();
			}
			return this._oSoundManager;
		},

		/**
		 * Interface that can be triggered from inside the level code to display sprites
		 * @param {string} sWhich an identifier to decide which event has been toogled (Awesome, Ohno, Haha, Points, PointsNegative, PointsCritical)
		 * @param {int} iValue the points to be scored
		 * @param {array} [aWhere] x and y coordinate for the message to appear
		 */
		triggerEvent: function (sWhich, iValue, aWhere) {
			// choose effect
			switch (sWhich) {
				case "start":
					oSprite = new MessageToastDeluxe({
						number: "Fight!",
						image: "effect_points_critical.png",
						duration: 1,
						position: "center center"
					});
					break;
				case "Awesome":
					var sImage = (Math.random() > 0.3333 ? "effect_awesome.png" : "effect_pow.png");
					if (Math.random() <= 0.3333) {
						sImage = "effect_plop.png"
					}
					var oSprite = new MessageToastDeluxe({
						message: "",
						image: sImage,
						duration: 1,
						position: this._getRandomPosition()
					});
					this.getSoundManager().play("goodHit", undefined, undefined, 0.5);
					break;
				case "Ohno":
					var oSprite = new MessageToastDeluxe({
						message: "",
						image: "effect_ohno.png",
						duration: 1000,
						position: (aWhere ? aWhere[0] + " " + aWhere[1] : "end center")
					});
					this.getSoundManager().play("badHit", undefined, undefined, 0.5);
					break;
				case "Haha":
					var oSprite = new MessageToastDeluxe({
						message: "",
						image: "effect_ha_ha_ha_neu.png",
						duration: 1000,
						position: (aWhere ? aWhere[0] + " " + aWhere[1] : "end center")
					});
					if (!this.getSoundManager().isPlaying("devil")) {
						this.getSoundManager().play("devil");
					}
					this.getSoundManager().play("badHit");
					break;
				case "Points":
					var oSprite = new MessageToastDeluxe({
						message: "",
						number: iValue,
						image: "effect_points.png",
						duration: 1,
						jitter: 100,
						position: (aWhere ? aWhere[0] + " " + aWhere[1] : "begin center"),
					});
					break;
				case "PointsNegative":
					var oSprite = new MessageToastDeluxe({
						message: "",
						number: iValue,
						image: "effect_points_negative.png",
						duration: 3,
						jitter: 100,
						position: (aWhere ? aWhere[0] + " " + aWhere[1] : "end center")
					});
					break;
				case "PointsCritical":
					var oSprite = new MessageToastDeluxe({
						message: "",
						number: iValue,
						image: "effect_points_critical.png",
						duration: 3,
						jitter: 100,
						position: (aWhere ? aWhere[0] + " " + aWhere[1] : "center center")
					});
					break;
				case "LowEnergy":
					var oSprite = new MessageToastDeluxe({
						message: "",
						number: iValue,
						image: "effect_lowenergy.png",
						duration: 3,
						jitter: 100,
						position: (aWhere ? aWhere[0] + " " + aWhere[1] : "center center")
					});
					break;
				case "Bomb":
					var oSprite = new MessageToastDeluxe({
						message: "",
						number: iValue,
						image: (Math.random() <= 0.5 ? "effect_pow.png" : "Boom.png"),
						duration: 3,
						jitter: 100,
						position: (aWhere ? aWhere[0] + " " + aWhere[1] : "center center")
					});
					break;
				case "Laser":
					var oSprite = new MessageToastDeluxe({
						message: "",
						number: iValue,
						image: "Zing.png",
						duration: 3,
						jitter: 100,
						position: (aWhere ? aWhere[0] + " " + aWhere[1] : "begin center")
					});
					break;
				case "PickPhoenix":
					var sNumber = "CheckBox";
					switch (iValue) {
						case 2: sNumber = "Switch"; break;
						case 3: sNumber = "Button"; break;
						case 4: sNumber = "Select"; break;
						case 5: sNumber = "Progress"; break;
						case 6: sNumber = "Slider"; break;
						case 7: sNumber = "Tile"; break;
					}
					var oSprite = new MessageToastDeluxe({
						number: sNumber,
						image: "effect_points_critical.png",
						duration: 3,
						jitter: 100,
						position: (aWhere ? aWhere[0] + " " + aWhere[1] : "center center")
					});
					break;
			}

			// generic sprite lifecycle
			this.addDependent(oSprite);
			oSprite.show().then(function () {
				oSprite.destroy();
			});
		},

		/**
		 * Score points
		 * @param {int} iValue the points to be scored
		 * @param {array} [aWhere] x and y coordinate for the message to appear
		 */
		score: function (iValue, aWhere) {
			this.setProperty("score", this.getProperty("score") + iValue, true);
			if (iValue >= 0) {
				this.triggerEvent("Points", iValue, aWhere);
			} else {
				this.triggerEvent("PointsNegative", iValue, aWhere);
			}
		},

		/**
		 * Player hit
		 * @param {int} iWho 1 for player1, 2 for player2
		 */
		hit: function (iWho) {
			var iRemainingLifes = Math.max(0, this.getProperty("player" + iWho + "Lives") - 1);
			this.setProperty("player" + iWho + "Lives", iRemainingLifes, true);
			this.triggerEvent("Haha", undefined, [(iWho === 1 ? "begin" : "end"), "center"]);
			this.fireHit({who: iWho});
			if (iRemainingLifes === 0) {
				this.end();
				this.fireEnd({
					who: (iWho === 1 ? 2 : 1)
				});
			}
		},

		/**
		 * Check if player has enough energy to throw a bomb
		 * @param {int} iWho 1 for player1, 2 for player2
		 */
		hasBombEnergy: function (iWho) {
			var iEnergy = this.getProperty("player" + iWho + "Energy");
			return (iEnergy === 100);
		},

		/**
		 * Player bomb: reset energy level to 0
		 * @param {int} iWho 1 for player1, 2 for player2
		 */
		bomb: function (iWho) {
			var iEnergy = this.getProperty("player" + iWho + "Energy");
			if (iEnergy < 100) {
				this.triggerEvent("LowEnergy", undefined, [(iWho === 1 ? "begin" : "end"), "center"]);
			} else {
				this.setProperty("player" + iWho + "Energy", 0, true);
				this.triggerEvent("Bomb", undefined, [(iWho === 1 ? "begin" : "end"), "center"]);
				this.fireBomb({who: iWho});
			}
		},

		/**
		 * Add a level specific style class to allow for custom styling
		 */
		onBeforeRendering: function () {
			// add a custom game-dependent style class
			this.addStyleClass(this.getLevel());
		},
		/**
		 * Transforms the canvas element to a game area
		 */
		onAfterRendering: function () {
			// bug: only works with timeout in FLP sandbox

			setTimeout(function(){
				this.focus();
			}.bind(this), 0);
		},

		/**
		 * Setter without rerendering
		 * @override
		 * @param {int} iLimit the time limit for the current level
		 */
		setTimeLimit: function (iLimit) {
			this.setProperty("timeLimit", iLimit, true);
		},

		/**
		 * Loads the assigned level script with the currently set difficulty
		 */
		_loadLevel : function() {
			var sLevel = this.getLevel(),
				iDifficulty = this.getDifficulty();

			var fnInit = function () {
				sap.ui.require(["flush/game/levels/" + sLevel + "/Level"], function (Level) {
					var oController = this.getParent();
					var oCanvas = oController.byId(this.getId() + "-canvas");
					var oCanvasDebug = sap.ui.getCore().byId("debugCanvas");
					var aCanvas = [oCanvas, oCanvasDebug];

					// init level
					this._oLevel = new Level(this, aCanvas, oController.byId("controlManager"));
					this._oLevel.setDifficulty(iDifficulty);
					this._oLevel.init().then(function () {
						// show start message after 1s
						setTimeout(function () {
							this.triggerEvent("start");
						}.bind(this), 1000);

						// set up multiplayer mode
						if (this.getProperty("level").match(/multi/i)) {
							this._initMultiPlayer();
						}

						this.fireInit();

						// init time limit
						if (this.getTimeLimit() && !this._bLevelRunning) {
							this.initTimeLimit();
						}

						// save level running flag
						this._bLevelRunning = true;
					}.bind(this));
				}.bind(this));
			}.bind(this);

			// exit old level first
			if (this._oLevel) {
				this._bLevelRunning = false;
				clearTimeout(this._iLevelTimer);
				this._oLevel.exit().then(function () {
					this._oLevel.destroy();
					setTimeout(function(){
						fnInit();
					}, 0);
				}.bind(this));
			} else {
				fnInit();
			}
		},

		/**
		 * Ends a level, the actions such as updating the score may differ per level
		 */
		end : function () {
			//Device.orientation.detachHandler(this._updateCanvasSize);
			this._bLevelRunning = false;
			clearTimeout(this._iLevelTimer);
			clearInterval(this._iMultiEnergyLoop);
			return this._oLevel.exit();
		},

		/**
		 * Nothing special, just render the page with its current content
		 * @param {sap.ui.core.RenderManager} oRM the RenderManager
		 * @param {sap.ui.core.Control} oControl the control to be rendered
		 */
		renderer : function (oRM, oControl) {
			sap.m.PageRenderer.render(oRM, oControl);
		}

	});

	/**
	 * Override to overcome the stupid GenericTile bug that force rerenders the whole game
	 * Anyway, enough ranting, we don't want the game to be invalidated by the invisible control manager
	 * @override
	 */
	var fnOrigInvalidate = oGame.prototype.invalidate;
	oGame.prototype.invalidate = function (oSource) {
		if (oSource && oSource.getMetadata().getName() === "flush.game.controls.ControlManager") {
			return;
		} else {
			fnOrigInvalidate.apply(this, arguments);
		}
	};

	return oGame;

});