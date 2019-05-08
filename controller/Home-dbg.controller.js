sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter"
], function(BaseController, JSONModel, formatter) {
	"use strict";

	return BaseController.extend("flush.game.controller.Home", {

		formatter: formatter,

		/**
		 * Sets up the home screen
		 */
		onInit: function () {
			BaseController.prototype.onInit.apply(this, arguments);

			var oViewModel = new JSONModel({
				instructions: ""
			});
			this.setModel(oViewModel, "view");
			// attach to routing events
			this.getRouter().getRoute("home").attachPatternMatched(this._onNavigation, this);
			// clear idle timer when navigating away
			this.getRouter().attachRouteMatched(function (oEvent) {
				var sRoute = oEvent.getParameter("name");

				if (sRoute !== "home") {
					clearTimeout(this._iIdleTimer);
					clearInterval(this._iFocusInterval);
				}
			}.bind(this));
		},

		/**
		 * Wrapper for all routing events
		 * @private
		 */
		_onNavigation : function () {
			this._controlWeather(arguments[0]);
			this._updateGame(arguments[0]);
			this._unlockLevels(arguments[0]);
			this._manageIdle(arguments[0]);
			this._ensureFocus(arguments[0]);
		},

		/**
		 * Have some moderate bad weather on the home screen
		 * @private
		 */
		_controlWeather: function () {
			this.ready().then(function () {
				if (!this.getSoundManager().isPlaying("thunderLightning")) {
					this.getSoundManager().play("thunderLightning");
				}
				this.getBadWeather().rain("moderate");
				this.getBadWeather().lightning();
			}.bind(this));
		},

		/**
		 * Update the game state after a level has been finished
		 * @private
		 */
		_updateGame: function (oEvent) {
			this.getModel("appView").setProperty("/mode", "1player");
			this.ready().then(function () {
				var iTotalScore = Math.min(this.getModel("appView").getProperty("/score"), 10000),
					iOldMood = this.getModel("appView").getProperty("/mood");

				var fnPlayRandomQuotes = function () {
					this._playStory("randomQuotes");
				}.bind(this);

				if (iTotalScore === 10000 && !this._bOutroPlayed) {
					this._stopStory();
					this.getBadWeather().stop();
					this.getSoundManager().stop("thunderLightning");
					this._bOutroPlayed = true;
					this.getRouter().navTo("outro");
					return;
				}

				// calculate new mood
				var iMood = 100 - Math.max(0, iTotalScore) / 100;
				this.getModel("appView").setProperty("/mood", iMood);

				// check if coming from a level
				var bFromGame = this.getModel("appView").getProperty("/fromGame");
				this.getModel("appView").setProperty("/fromGame", false);

				// score last game
				if (bFromGame) {
					if (iOldMood - iMood > 0) {
						// unlock one more level
						this.getModel("appView").setProperty("/progress", this.getModel("appView").getProperty("/progress") + 1);
						this._playStory("lucky").then(fnPlayRandomQuotes);
						this.getSoundManager().play("Win").then(function () {
							this.getSoundManager().play("roboWin");
						}.bind(this));
					} else if (iOldMood - iMood === 0) {
						// mock player
						this._playStory("n00b").then(fnPlayRandomQuotes);
						this.getSoundManager().play("Loose").then(function () {
							this.getSoundManager().play("roboLoose");
						}.bind(this));
					} else {
						// insult player
						this._playStory("fool").then(fnPlayRandomQuotes);
						this.getSoundManager().play("Loose").then(function () {
							this.getSoundManager().play("roboLoose");
						}.bind(this));
					}
					// lock the tiles for a couple of seconds to allow players see their score
					clearTimeout(this._iLockTimer);
					this._bLockedAfterLevel = true;
					this._iLockTimer = setTimeout(function () {
						this._bLockedAfterLevel = false;
					}.bind(this), 3000);
				} else {
					this._playStory("intro").then(fnPlayRandomQuotes);
				}
			}.bind(this));
		},

		/**
		 * Unlock levels based on the global progress
		 * @private
		 */
		_unlockLevels: function () {
			this.ready().then(function () {
				var oAppModel = this.getModel("appView"),
					iProgress = oAppModel.getProperty("/progress");

				// cheating
				if (oAppModel.getProperty("/godMode")) {
					iProgress = 99999999;
				}

				var aTiles = this.byId("levels").getTiles();
				for (var i = 0; i < aTiles.length; i++) {
					(function (i) {
						setTimeout(function () {
							var bLocked = i >= iProgress;
							aTiles[i].setLocked(bLocked);
							if (!bLocked) {
								aTiles[i].focus();
							}
						}.bind(this), 500 + i * 200);
					})(i);
				}
			}.bind(this));
		},

		/**
		 * Replay intro when no activity is taken on the home screen
		 * @private
		 */
		_manageIdle: function () {
			clearTimeout(this._iIdleTimer);
			this._iIdleTimer = setTimeout(function () {
				this.onIntro();
			}.bind(this), this.getModel("appView").getProperty("/idleTimeReloopIntro")); // 2mins
		},

		/**
		 * Periodically set the focus on the level selection container while the screen is active
		 * @private
		 */
		_ensureFocus: function () {
			clearInterval(this._iFocusInterval);
			// try to focus first tile if focus has been lost
			var fnFocusFirstTile = function () {
				var oFocusControl = sap.ui.getCore().byId(document.activeElement.getAttribute("id"));
				if (!oFocusControl || oFocusControl.getMetadata().getName().split("\.").pop() !== "GameTile") {
					this.byId("levels").getTiles()[0].focus();
				}
			}.bind(this);

			fnFocusFirstTile();
			this._iFocusInterval = setInterval(fnFocusFirstTile, 2500); // 2,5secs
		},

		/**
		 * Navigates to the intro
		 */
		onIntro: function () {
			this._stopStory();
			this.getRouter().navTo("intro");
		},

		/**
		 * Launch a level by navigating to the game view
		 * @param oEvent
		 */
		onLevel: function (oEvent) {
			if (this._bLockedAfterLevel) {
				return;
			}

			this.getSoundManager().play("start");
			this.getBadWeather().stop();
			var oTile = oEvent.getSource();

			var	sLevel = oTile.getCustomData()[0].getValue(),
				iDifficulty = parseInt(oTile.getCustomData()[1].getValue());

			this._stopStory();
			this.getRouter().navTo("game", {
				level: sLevel,
				difficulty: iDifficulty
			});
		}

	});
});