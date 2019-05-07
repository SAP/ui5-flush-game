sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../controls/MessageToastDeluxe",
	"../model/formatter",
	"sap/ui/test/actions/Press",
	"sap/base/util/UriParameters",
	"sap/ui/core/Fragment",
	"sap/ui/thirdparty/jquery" // file contains implicit calls via control.$() and jQuery.event
], function (BaseController, JSONModel, MessageToastDeluxe, formatter, Press, UriParameters, Fragment, jQuery) {
	"use strict";

	return BaseController.extend("flush.game.controller.App", {

		formatter: formatter,

		/**
		 ** Calls the base controller's init method
		 */
		onInit: function () {
			BaseController.prototype.onInit.apply(this, arguments);

			var oUriParameters = new UriParameters(window.location.href),
				bGodMode = !!oUriParameters.get("sap-ui-godMode");

			var oViewModel = new JSONModel({
				score: 0,
				progress: 1,
				multiProgress: 1,
				mood: 100,
				godMode: false,
				mode : "1player",
				idleTimeReloopIntro: 120000, // 2mins
				player1: 'images/player1.png',
				player2: 'images/player2.png',
				flushLogo: 'images/flush_logo.png',
				chickenOut: 'images/ChickenOut.png',
				switchMode: 'images/SwitchMode.png'
			});
			this.setModel(oViewModel, "appView");

			// enable god mode
			if (bGodMode) {
				this.activateGodMode();
			}

			// enable soft keyboard
			this.ready().then(function () {
				this._initArcadeControlEvents();
				this._initEscape();
				this._initEnter();
			}.bind(this));
		},

		/**
		 * wire key events to arcade soft keyboard
		 * @private
		 */
		_initArcadeControlEvents: function () {
			// intentional that to keep this pointer of press event stable
			var that = this;
			/* override to do a slow press */
			Press.prototype.executeOnArcade = function (oControl) {
				// early out if controls are not visible (multiplayer mode)
				if (!oControl.$().length) {
					return;
				}
				var $ActionDomRef = this.$(oControl),
					oActionDomRef = $ActionDomRef[0];

				if ($ActionDomRef.length) {
					// do not allow 2 events at a time
					if (that["__sneakedInTimeout"]) {
						return;
					}

					// the missing events like saptouchstart and tap will be fired by the event simulation
					this._createAndDispatchMouseEvent("mousedown", oActionDomRef);
					that["__sneakedInTimeout"] = setTimeout(function () {
						this._createAndDispatchMouseEvent("mouseup", oActionDomRef);
						that["__sneakedInTimeout"] = null;
					}.bind(this), 200);

					//Focusout simulation removed in order to fix Press action behavior
					//since in real scenario manual press action does not fire focusout event
				}
			};

			var fnSimulateClick = function (sId) {
				try {
					new Press().executeOnArcade(this.byId("app").getCurrentPage().byId("arcadeBoard--" + sId));
				} catch (oException) {
					// do nothing if page is not rendered
				}
			}.bind(this);

			// sync mouse
			document.addEventListener("click", function (oEvent) {
				var sId = oEvent.target.getAttribute("id");
				if (!sId && oEvent.target.parentNode) {
					sId = oEvent.target.parentNode.getAttribute("id");
				}
				var sTargetId = sId && sId.split("--").pop().split("-")[0];
				var aExcluedIds = ["a", "b", "l", "r", "u", "d"];
				if (aExcluedIds.indexOf(sTargetId) === -1) {
					if (oEvent.which === 1) { // left
						fnSimulateClick("a");
					} else if (oEvent.which === 2) { // middle
						fnSimulateClick("b");
					}
				}
			});

			// for level selection screen, trigger the same events for both controllers
			var fnSimulateKey = function (sKey) {
				var oCurrentPage = this.byId("app").getCurrentPage(),
					sView = oCurrentPage.getId().split("---").pop();

				// trigger event on carousel
				if (sView === "home" || sView === "multi") {
					// just virtual simulation does not work as qunit utils do not trigger sap pseudo events
					var oEvent = jQuery.Event("keypress");
					oEvent.ctrlKey = false;

					// trigger pseudo events directly to also enable player 1 to navigate the level container
					var oControl = oCurrentPage.byId("levels");
					switch (sKey) {
						case "ArrowLeft":
							oControl.onsapleft(oEvent);
							break;
						case "ArrowRight":
							oControl.onsapright(oEvent);
							break;
						case "ArrowUp":
							oControl.onsapup(oEvent);
							break;
						case "ArrowDown":
							oControl.onsapdown(oEvent);
							break;
						case "Enter":
							try {
								// use the original function, not the override for the arcade buttons
								var oControl = sap.ui.getCore().byId(document.activeElement.getAttribute("id"));
								new Press().executeOn(oControl);
							} catch (oException) {
								// do nothing if page is not rendered
							}
							break;
					}
				}
			}.bind(this);

			// sync keyboard
			document.addEventListener("keydown", function (oEvent) {
				switch (oEvent.key) {
					case "ArrowLeft":
					case "a":
						fnSimulateClick("l");
						fnSimulateKey("ArrowLeft");
						break;
					case "ArrowRight":
					case "d":
						fnSimulateClick("r");
						fnSimulateKey("ArrowRight");
						break;
					case "ArrowUp":
					case "w":
						fnSimulateClick("u");
						fnSimulateKey("ArrowUp");
						break;
					case "ArrowDown":
					case "s":
						fnSimulateClick("d");
						fnSimulateKey("ArrowDown");
						break;
					case " ":
						fnSimulateClick("a");
						fnSimulateKey("Enter");
						break;
					case "b":
						fnSimulateClick("b");
						break;
				}
			}.bind(this));
		},

		/**
		 * Shows the escape dialog to cancel a running game
		 * @private
		 */
		_initEscape: function () {
			document.addEventListener("keyup", function(oEvent) {
				// escape dialog is already open: confirm or cancel
				var oEscapeDialog = this.byId("Escape");
				if (oEscapeDialog && oEscapeDialog.isOpen()) {
					if (oEvent.key === "Escape" || oEvent.key === "5") {
						// confirm with ESC, 5
						oEscapeDialog.getBeginButton().firePress();
					} else {
						// any other key cancels the dialog
						oEscapeDialog.getEndButton().firePress();
					}
					oEscapeDialog.destroy();
					return;
				}

				// switch mode dialog is already open: confirm or cancel
				var oSwitchModeConfirmDialog = this.byId("SwitchMode");
				if (oSwitchModeConfirmDialog && oSwitchModeConfirmDialog.isOpen()) {
					if (oEvent.key === "Escape" || oEvent.key === "5" ||
						oEvent.key === "1" || oEvent.key === "2" || oEvent.key === "3") {
						// confirm with ESC, 5, 1, 2, 3
						oSwitchModeConfirmDialog.getBeginButton().firePress();
					} else {
						// any other key cancels the dialog
						oSwitchModeConfirmDialog.getEndButton().firePress();
					}
					oSwitchModeConfirmDialog.destroy();
					return;
				}

				// 1,2,3: 1player, 2player, switch between 1player and 2player
				// ESC,5: cancel, insert coin
				if (oEvent.key === "1" || oEvent.key === "2" || oEvent.key === "3" ||
					oEvent.key === "Escape" || oEvent.key === "5") {
					var oCurrentPage = this.byId("app").getCurrentPage(),
						sView = oCurrentPage.getId().split("---").pop();

					// cancel intro with all action keys
					if (sView === "intro" && this.getModel("appView").getProperty("/score") === 0) {
						oCurrentPage.getController()._endIntro();
					}

					// individual dialogs for other events
					// switch game mode with 1 and 2 (select) and 3 (toggle)
					if (oEvent.key === "1" || oEvent.key === "2" || oEvent.key === "3") {

						// early out if already in the same mode that was requested
						var sMode = this.getModel("appView").getProperty("/mode");
						if (oEvent.key === "1" && sMode === "1player" ||
							oEvent.key === "2" && sMode === "2player") {
							// play a rewarding sound anyway :-)
							this.getSoundManager().play("coin");
							return;
						}

						// define 3new game mode
						var sNewMode = (oEvent.key === "1" ? "1player" : "2player");
						if (oEvent.key === "3") {
							// 3 or controller select - toggle mode
							sNewMode = (sMode === "1player" ? "2player" : "1player");
						}

						// only show the dialog if a game is running
						if(sView === "game") {
							// show dialog to confirm if in game
							var oFragmentController = {
								formatter: this.formatter,
								onStay : function () {
									this.byId("SwitchMode").close();
								}.bind(this),
								onLeave : function () {
									var oCurrentPage = this.byId("app").getCurrentPage();

									// end game first before resetting
									if (oCurrentPage.getId().split("---").pop() === "game") {
										oCurrentPage.byId("page").end().then(function() {
											this.onSwitchMode(sNewMode);
										}.bind(this))
									} else {
										this.onSwitchMode(sNewMode);
									}
									this.byId("SwitchMode").close();
								}.bind(this)
							};

							if (!oSwitchModeConfirmDialog) {
								Fragment.load({
									id: this.getView().getId(),
									name: "flush.game.view.SwitchMode",
									controller: oFragmentController
								}).then(function (oSwitchModeConfirmDialog) {
									oSwitchModeConfirmDialog.setInitialFocus(oSwitchModeConfirmDialog.getBeginButton());
									this.getView().addDependent(oSwitchModeConfirmDialog);
									oSwitchModeConfirmDialog.open();
								}.bind(this));
							} else {
								oSwitchModeConfirmDialog.open();
							}
						} else {
							this.onSwitchMode(sNewMode);
						}
					} else if (oEvent.key === "Escape" || oEvent.key === "5") {
						// show dialog with ESC key or 5 key
						var oFragmentController = {
							formatter: this.formatter,
							onStay : function () {
								this.byId("Escape").close();
							}.bind(this),
							onLeave : function () {
								var oCurrentPage = this.byId("app").getCurrentPage();

								// end game first before resetting
								if (oCurrentPage.getId().split("---").pop() === "game") {
									oCurrentPage.byId("page").end().then(function() {
										this.reset();
									}.bind(this))
								} else {
									this.reset();
								}
								this.byId("Escape").close();
							}.bind(this)
						};

						if (!oEscapeDialog) {
							Fragment.load({
								id: this.getView().getId(),
								name: "flush.game.view.Escape",
								controller: oFragmentController
							}).then(function (oEscapeDialog) {
								oEscapeDialog.setInitialFocus(oEscapeDialog.getBeginButton());
								this.getView().addDependent(oEscapeDialog);
								oEscapeDialog.open();
							}.bind(this));
						} else {
							oEscapeDialog.open();
						}
					}
				}
			}.bind(this));
		},

		/**
		 * Maps action key for player 1 and 2 to enter key so that a level can be selected
		 * We detect the keys and trigger a Press action with OPA to simulate a click
		 * @private
		 */
		_initEnter: function () {
			var fnSimulateClick = function (oControl) {
				try {
					// use the original function, not the override for the arcade buttons
					new Press().executeOn(oControl);
				} catch (oException) {
					// do nothing if page is not rendered
				}
			}.bind(this);

			document.addEventListener("keyup", function(oEvent) {
				switch (oEvent.key) {
					case "g":
					case "h":
						var oControl = sap.ui.getCore().byId(document.activeElement.getAttribute("id"));
						// game handles input separately and needs more infos like coordinates
						if (oControl && oControl.getMetadata().getName() !== "flush.game.controls.Game") {
							fnSimulateClick(oControl);
						}
						break;
				}
			});
		},

		/**
		 * resets the game and returns to home screen so that a new player can start playing
		 */
		reset: function () {
			var oModel = this.getModel("appView");

			// reset all game parameters
			oModel.setProperty('/score', 0);
			oModel.setProperty('/progress', 1);
			oModel.setProperty('/multiProgress', 1);
			oModel.setProperty('/mood', 100);
			oModel.setProperty('/godMode', false);

			// play loose sound
			this.getSoundManager().play("Loose");

			var oCurrentPage = this.byId("app").getCurrentPage(),
				sView = oCurrentPage.getId().split("---").pop();

			// kill the intro if running
			if (sView === "intro") {
				oCurrentPage.getController()._endIntro();
			}

			// go to multiplayer or single player homepage
			if (this.getModel("appView").getProperty("/mode") === "2player" ||
					sView === "multi" ||
					sView === "game" && oCurrentPage.getModel("view").getProperty("/multi")) {
				// go to multi home screen
				this.getRouter().navTo("multi");
				if (sView === "multi") {
					this.getRouter().getRoute("multi").fireEvent("patternMatched");
				}
			} else {
				// go to single home screen
				this.getRouter().navTo("home");
				if (sView === "home") {
					this.getRouter().getRoute("home").fireEvent("patternMatched");
				}
			}
		},

		/**
		 * Activates god mode after a certain key combination was entered
		 */
		activateGodMode: function () {
			var oGodToast = new MessageToastDeluxe({
				message: "God mode activated",
				image: "GodMode.png",
				duration: 5000,
				position: "center bottom"
			});

			// wait until first rendering to display toast and effects
			this.ready().then(function () {
				// generic sprite lifecycle
				oGodToast.show().then(function () {
					oGodToast.destroy();
				});

				// god does not allow bad weather
				this.getBadWeather().stop();
				this.getSoundManager().stop("thunderLightning");
				this.getSoundManager().play("Win");

				// unlock all levels when on home screen while entering the code
				var oCurrentPage = this.byId("app").getCurrentPage();
				if (oCurrentPage.getId().split("---").pop() === "home") {
					oCurrentPage.getController()._unlockLevels();
				}
			}.bind(this));

			// life is beautiful
			this.getModel("appView").setProperty("/godMode", true);
			this.getModel("appView").setProperty("/score", 9999);
			this.getModel("appView").setProperty("/mood", 3);
		}

	});
});