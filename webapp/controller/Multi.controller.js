sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter"
], function(BaseController, JSONModel, formatter) {
	"use strict";

	return BaseController.extend("flush.game.controller.Multi", {

		formatter: formatter,

		/**
		 * Sets up the multi screen
		 */
		onInit: function () {
			BaseController.prototype.onInit.apply(this, arguments);

			var oViewModel = new JSONModel({
				player1wins: 0,
				player2wins: 0,
				instructions: ""
			});
			this.setModel(oViewModel, "view");
			// attach to routing events
			this.getRouter().getRoute("multi").attachPatternMatched(this._onNavigation, this);
			this.getRouter().getTarget("multi").attachDisplay(this._onNavigation, this);
			// clear idle timer when navigating away
			this.getRouter().attachRouteMatched(function (oEvent) {
				var sRoute = oEvent.getParameter("name");

				if (sRoute !== "multi") {
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
		 * @param {sap.ui.base.Event} oEvent the routing event
		 * @private
		 */
		_updateGame: function (oEvent) {
			var iWinner;
			var sLevel;
			var iDifficulty;

			if (oEvent && oEvent.getParameter("data")) {
				iWinner = oEvent.getParameter("data").who;
				sLevel = oEvent.getParameter("data").level;
				iDifficulty = parseInt(oEvent.getParameter("data").difficulty);
			}
			this.getModel("appView").setProperty("/mode", "2player");

			this.ready().then(function () {
				var fnPlayRandomQuotes = function () {
					this._playStory("randomQuotes");
				}.bind(this);

				if (!iWinner && this.getModel("appView").getProperty("/multiProgress") === 1) {
					this._reset();
				}

				if (iWinner) {
					// unlock one more level
					this._markLastLevelAsWon(iWinner, sLevel, iDifficulty);
					this.getModel("appView").setProperty("/multiProgress", this.getModel("appView").getProperty("/multiProgress") + 1);
					this._playStory("player" + iWinner + "win").then(fnPlayRandomQuotes);
					this.getModel("view").setProperty("/player" + iWinner + "wins", this.getModel("view").getProperty("/player" + iWinner + "wins") + 1);
					this._bMatchWon = true;
					this.getSoundManager().play("Win").then(function () {
						this.getSoundManager().play("roboWin");
						this._bMatchWon = false;
					}.bind(this));
					// lock the tiles for a couple of seconds to allow players see their score
					clearTimeout(this._iLockTimer);
					this._bLockedAfterLevel = true;
					this._iLockTimer = setTimeout(function () {
						this._bLockedAfterLevel = false;
					}.bind(this), 3000);
				} else {
					// only show intro story when no match was won before
					// navTo is also called async after winning to update the hash
					this.getModel("appView").setProperty("/fromGame", false);
					if (!this._bMatchWon) {
						this._playStory("intro").then(fnPlayRandomQuotes);
					}
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
					iProgress = oAppModel.getProperty("/multiProgress");

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
		 * Show which player won the last played level
		 * @private
		 */
		_markLastLevelAsWon: function (iWho, sLevel, iDifficulty) {
			var oAppModel = this.getModel("appView");

			var aTiles = this.byId("levels").getTiles();
			aTiles.some(function (oTile) {
				if(sLevel === oTile.getCustomData()[0].getValue() &&
					iDifficulty === parseInt(oTile.getCustomData()[1].getValue())) {
					oTile.removeStyleClass("player" + (iWho === 1 ? 2 : 1) + "win");
					oTile.addStyleClass("player" + iWho + "win");
					return true;
				}
			});
		},

		/**
		 * resets the multiplayer home screen when a new game is started
		 * @private
		 */
		_reset: function () {
			this.getModel("view").setProperty("/player1wins", 0);
			this.getModel("view").setProperty("/player2wins", 0);

			var aTiles = this.byId("levels").getTiles();
			for (var i = 0; i < aTiles.length; i++) {
				aTiles[i].removeStyleClass("player1win");
				aTiles[i].removeStyleClass("player2win");
			}
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