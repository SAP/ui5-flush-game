sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"../model/formatter"
], function (BaseController, JSONModel, MessageBox, formatter) {
	"use strict";

	return BaseController.extend("flush.game.controller.Intro", {

		formatter: formatter,

		/**
		 * Sets up the intro
		 */
		onInit: function () {
			BaseController.prototype.onInit.apply(this, arguments);

			this._bIntroPlaying = false;

			// view model
			var oViewModel = new JSONModel({
				score: 0,
				progress: 1,
				godMode: false,
				intro: [
					{file: 'images/Intro0LogoBg.png'},
					{file: 'images/Intro1Scherbenhaufen.png'},
					{file: 'images/Intro2Blitzschlag.png'},
					{file: 'images/Intro3VerkohlterRM.png'},
					{file: 'images/Intro4RMVerrueckt.png'},
					{file: 'images/Intro5DerHeldmussran.png'}
				]
			});
			this.setModel(oViewModel, "view");

			// start intro when page is entered
			this.getRouter().getRoute("intro").attachPatternMatched(this._playIntro, this);

			// ain't no sunshine when he's gone nuts
			this.ready().then(function () {
				try {
					this.getBadWeather().rain();
				} catch (oException) {
					// leaving and entering the app while the intro is playing will bring you here
				}
			}.bind(this));
		},

		/**
		 * Manually changes to an intro step when back/forward button in Carousel is pressed
		 * @param oEvent
		 */
		onCarouselChange: function (oEvent) {
			var sNewId = oEvent.getParameter("newActivePageId");
			var sOldId = oEvent.getParameter("oldActivePageId");

			// workaround: carouselChange event is also triggered by programmatic changes (sigh)
			if (this._bCarouselStoryTriggeredChange) {
				this._bCarouselStoryTriggeredChange = false;
				return;
			}

			// manually play chapter
			this._bIntroPlaying = false;
			if (sNewId !== sOldId) {
				var iWhich = parseInt(sNewId.split("-").pop());
				var oPromise = this._playChapter(iWhich);

				// end intro manually
				if (iWhich === 5) {
					oPromise.then(function () {
						this._endIntro();
					}.bind(this));
				}
			}
		},

		/**
		 * Shows a dirty flush exception error and closes the dialog automatically after 3 seconds
		 * @private
		 */
		_flushErrorDialog: function () {
			MessageBox.error(
				"DirtyFlushException",
				{
					id : "DirtyFlushException",
					title : "DirtyFlushException: An error occurred while flushing UI5 controls",
					details : "@Core.js:1337",
					actions : [MessageBox.Action.CLOSE]
				}
			);
			setTimeout(function () {
				var oDirtyFlushException = sap.ui.getCore().byId("DirtyFlushException");
				if (oDirtyFlushException) {
					oDirtyFlushException.destroy();
				}
			}, 3000);
		},

		/**
		 * Randomly animates the mood value for the intro to show Render Managers furious rage
		 * @private
		 */
		_animateMood: function () {
			setTimeout(function () {
				if (!this._bAnimateMood) {
					return;
				}
				var iRandomMood = Math.floor(Math.abs(Math.random()) * 100);
				this.getModel("appView").setProperty("/mood", iRandomMood);
				this._animateMood();
			}.bind(this),500);
		},

		/**
		 * Shows a specific page in the carousel
		 * @param {int} iWhich the page to navigate to
		 * @private
		 */
		_showIntroBackground(iWhich) {
			var oCarousel = this.byId("introBg");
			oCarousel.setActivePage(oCarousel.getPages()[iWhich]);
		},

		/**
		 * Plays a specific chapter of the intro with all special effects.
		 * Can be called individually with the carousel navigation or by the intro script
		 */
		_playChapter: function (iWhich) {
			if (!this.byId("page")) {
				return {
					then: function () {}
				};
			}
			// generic intro tasks
			this._stopStory();
			this._showIntroBackground(iWhich);

			// special effects
			switch(iWhich) {
				case 0:
					this.getSoundManager().play("thunderLightning");
					this.getSoundManager().play("coin", 5000);
					break;
				case 1:
					this.getBadWeather().rain("heavy");
					this.getBadWeather().lightning();
					break;
				case 2:
					this.getSoundManager().play("thunderHit", 0, 5000);
					this.getModel("appView").setProperty("/mood", 50);
					break;
				case 3:
					this.getModel("appView").setProperty("/mood", 80);
					this.getSoundManager().play("growl");
					setTimeout(function () {
						this._bAnimateMood = true;
						this._animateMood();
					}.bind(this), 1500);
					setTimeout(function () {
						this._flushErrorDialog();
					}.bind(this), 3000);
					break;
				case 4:
					this.getSoundManager().play("thunderLightning");
					this.getSoundManager().play("devil");
					this.getBadWeather().rain("moderate");
					break;
				case 5:
					this._bAnimateMood = false;
					this.getModel("appView").setProperty("/mood", 100);
					break;
			}

			// return promise to chain the intro
			return this._playStory("intro" + iWhich);
		},

		/**
		 * Starts playing the intro with a promise chain.
		 * When finished, navigate to the home view
		 * @private
		 */
		_playIntro: function () {
			var AudioContext = window.AudioContext || window.webkitAudioContext || false;
			// fix for chrome 70 security update - resume sounds after first user gesture
			if (AudioContext && new AudioContext().state === "suspended") {
				this.getModel("view").setProperty("/instructions", "Please click anywhere to enable the intro sound");
				document.addEventListener("click", function () {
					this.getSoundManager().play("thunderLightning");
					this.getModel("view").setProperty("/instructions", "Thanks, enjoy the game!");
				}.bind(this));
			}

			this._bAnimateMood = false;
			this._bCarouselStoryTriggeredChange = true;
			this._bIntroPlaying = true;

			// bugfix: carousel update when playing the intro the second time
			this.byId("introBg").invalidate();

			// start intro with gentle mood
			this.getModel("appView").setProperty("/mood", 1);

			// promise chain for the intro
			this.ready().then (function () {
				this._bCarouselStoryTriggeredChange = true;
				this._playChapter(0).then(function () {
					if (!this._bIntroPlaying) {
						return;
					}
					this._bCarouselStoryTriggeredChange = true;
					this._playChapter(1).then(function () {
						if (!this._bIntroPlaying) {
							return;
						}
						this._bCarouselStoryTriggeredChange = true;
						this._playChapter(2).then(function () {
							if (!this._bIntroPlaying) {
								return;
							}
							this._bCarouselStoryTriggeredChange = true;
							this._playChapter(3).then(function () {
								if (!this._bIntroPlaying) {
									return;
								}
								this._bCarouselStoryTriggeredChange = true;
								this._playChapter(4).then(function () {
									if (!this._bIntroPlaying) {
										return;
									}
									this._bCarouselStoryTriggeredChange = true;
									this._playChapter(5).then(function () {
										if (!this._bIntroPlaying) {
											return;
										}
										this._endIntro();
									}.bind(this))
								}.bind(this))
							}.bind(this))
						}.bind(this))
					}.bind(this))
				}.bind(this))
			}.bind(this));
		},

		/**
		 * Ends the intro and navigates to the home view
		 * @private
		 */
		_endIntro: function () {
			this._bAnimateMood = false;
			this._bIntroPlaying = false;
			this.getModel("appView").setProperty("/mood", 100);
			this.getSoundManager().stopAllSounds();
			this.getRouter().navTo("home");
		},

		/**
		 * Stops the intro and navigates to the home view
		 */
		onSkip: function () {
			this._stopStory();
			this._endIntro();
		}

	});
});