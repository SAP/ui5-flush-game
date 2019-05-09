sap.ui.define([
	"sap/ui/thirdparty/jquery", // file contains a jQuery.animate call
	"sap/ui/core/Control",
	"sap/m/MessageToast",
	"sap/ui/Device"
], function (jQuery, Control, MessageToast, Device) {
	"use strict";

	/* monkey patch for faulty message toast validation (mSettings.at also accepts an object with {left: 0, top: 0} syntax */
	sap.m.MessageToast._validateDockPosition = function () {};

	var previousOffsetLeft = 0;

	/**
	 * MessageToast wrapped as a control so that we can define it declaratively and extend it with an image
	 */
	return Control.extend("flush.game.controls.MessageToastDeluxe", {
		metadata: {
			properties: {
				/* message toast image*/
				"image": {
					type: "string"
				},
				/* message toast position */
				"position": {
					type: "string",
					defaultValue: "left top"
				},
				/* message toast duration */
				"duration": {
					type: "int",
					defaultValue: 3000
				},
				/* message toast width */
				"width": {
					type: "sap.ui.core.CSSSize",
					defaultValue: "15em"
				},
				/* the message, if left empty it is considered as a break in the length of duration */
				"message": {
					type: "string",
					defaultValue: ""
				},
				/* display numeric values, don't use it together with message */
				"number": {
					type: "string",
					defaultValue: ""
				},
				/* adds random jitter to the left or right */
				"jitter": {
					type: "int",
					defaultValue: 0
				},
				/* adds quotation marks around the message */
				"quote": {
					type: "boolean",
					defaultValue: false
				},
				/* adds speaker name to the message */
				"speaker": {
					type: "string",
					defaultValue: ""
				}
			}
		},

		/**
		 * Sets up the fallback sizes for sprites
		 */
		init: function () {
			this._EFFECT_DEFAULT_SIZE = 200;
			this._MAX_GAME_HEIGHT = 770;
			this._MESSAGETOAST_WIDTH = 288;
			this._HEADER_HEIGHT = 50;

			this._fallbackSizes = {
				"flush_logo_large.png": [427, 179],
				"flush_logo_xl.png": [909, 332],
				"effect_awesome.png": [381, 271],
				"effect_ha_ha_ha_neu.png": [344, 259],
				"effect_ohno.png": [234, 236],
				"effect_plop.png": [250, 256],
				"effect_points.png": [200, 167],
				"effect_points_critical.png": [200, 167],
				"effect_points_negative.png": [200, 167],
				"effect_pow.png": [300, 138],
				"effect_lowenergy.png": [200, 160],
				"Boom.png": [400, 179],
				"Zing.png": [400, 299],
				"GodMode.png": [839, 391],
				"BlauZaehne.png": [162, 191],
				"GrauKeineMeinung.png": [162, 191],
				"GruenHoffnungsvoll.png": [162, 191],
				"LilaDebatiert.png": [162, 191],
				"OrangeBefuerchtet.png": [162, 191],
				"RotRenderManagerDroht.png": [162, 191]//,
				//"RotRenderManagerDrohtXmas.png": [162, 225]
			};
		},

		/**
		 * workaround for not loaded images: return fallback size
		 * @private
		 * @return {Array} an array of width and height
		 */
		_getFallbackSize: function (sName) {
			if (this._fallbackSizes[sName]) {
				return this._fallbackSizes[sName];
			} else {
				return [this._EFFECT_DEFAULT_SIZE, this._EFFECT_DEFAULT_SIZE];
			}
		},

		/**
		 * Sneaks in an image on top of the MessageToast using jQuery
		 * @private
		 */
		_sneakInImage: function () {
			var aToastCollection = document.getElementsByClassName("sapMMessageToast"),
				oOrdinaryToast = aToastCollection.item(aToastCollection.length - 1),
				aFallbackSize = this._getFallbackSize(this.getImage());

			// create new image tag to load the asset
			var oImage = document.createElement("img");
			oImage.setAttribute("src", sap.ui.require.toUrl("flush/game/images") + '/' + this.getImage());
			oImage.classList.add("messageToastDeluxeImage");

			// responsiveness: limit fallback size to screen size and scale accordingly
			if (Device.resize.width < aFallbackSize[0]) {
				var iOldValue = aFallbackSize[0];
				aFallbackSize[0] = Device.resize.width * 0.9; // 90% width
				aFallbackSize[1] = aFallbackSize[1] * aFallbackSize[0] / iOldValue;
			} else if (Device.resize.height < aFallbackSize[1]) {
				var iOldValue = aFallbackSize[1];
				aFallbackSize[1] = Math.min(Device.resize.height * 0.9, this._MAX_GAME_HEIGHT); // 90% height
				aFallbackSize[0] = aFallbackSize[1] * aFallbackSize[0] / iOldValue;
			}
			oImage.width = aFallbackSize[0];
			oImage.height = aFallbackSize[1];

			if (this.getMessage()) {
				// put image on top of toast
				oImage.style.left = (oOrdinaryToast.offsetWidth - (oImage.width || aFallbackSize[0])) / 2 + "px";
				oImage.style.bottom = oOrdinaryToast.offsetHeight + "px";
			} else {
				// center image
				var iBottom = (oImage.height || aFallbackSize[1]) / -2 - this._HEADER_HEIGHT;
				if (this.getPosition().split(" ").pop() === "bottom") {
					iBottom /= 2;
				}
				oImage.style.left = ((oImage.width || aFallbackSize[0]) / - 2) + "px";
				oImage.style.bottom = iBottom + "px";
			}

			oOrdinaryToast.appendChild(oImage);
		},

		/**
		 * Sneaks in a number on top of an image to display bubbles with text using jQuery
		 * @private
		 */
		_sneakInNumber: function () {
			var aToastCollection = document.getElementsByClassName("sapMMessageToast"),
				oOrdinaryToast = aToastCollection.item(aToastCollection.length - 1),
				aFallbackSize = this._getFallbackSize(this.getImage()),
				oImage = oOrdinaryToast.getElementsByTagName("img")[0];

			var oNumber = document.createElement("span");
			oNumber.classList.add('messageToastDeluxeNumber');
			if (this.getNumber() < 0) {
				oNumber.classList.add('negative');
			}
			oNumber.appendChild(document.createTextNode(this.getNumber()));

			oNumber.style.left = ((oImage.width || aFallbackSize[0]) / - 2) + "px";
			oNumber.style.bottom = -30 - this._HEADER_HEIGHT + "px";

			oOrdinaryToast.appendChild(oNumber);

			// TODO: no suitable replacement for jQuery found
			jQuery(oOrdinaryToast).animate({
				top: "-=200"
			});
		},

		/**
		 * Shows a deluxe message toast with text, image, and number
		 * @return {Promise} resolved when the Toast is hidden
		 */
		show: function () {
			return new Promise(function(resolve, reject) {
				if (this.getMessage() || this.getImage()) {
					var sMessage = this.getMessage();

					// add quotes
					if (this.getQuote()) {
						sMessage = '"' +  sMessage + '"';
					}
					// add speaker
					if (this.getSpeaker()) {
						sMessage = this.getSpeaker() + ": "  + sMessage;
					}

					var sWidth = this.getWidth();
					if (!this.getMessage()) {
						sWidth = "0";
					}

					// calculate offset based on position
					var sPosition = this.getPosition();
					var iOffsetLeft = 0;
					if (this.getParent() && this.getParent().getParent() && this.getParent().getParent().$().offset()) {
						iOffsetLeft = this.getParent().getParent().$().offset().left;
						previousOffsetLeft = iOffsetLeft;
					} else if (previousOffsetLeft) {
						iOffsetLeft = previousOffsetLeft;
					}
					var iOffsetBottom = -64;
					var aPosition = sPosition.split(" ");

					if (aPosition[0] === "end" || aPosition === "right") {
						// invert offset
						iOffsetLeft *= -1;
					} else if (aPosition[0] === "left" || aPosition[0] === "begin") {
						// nothing
					} else if (aPosition[0] === "center") {
						iOffsetLeft = 0;
					} else {
						// add custom value
						iOffsetLeft += parseInt(aPosition[0]);
						sPosition = "begin top";
					}

					if (aPosition[1] === "top") {
						// invert and duplicate offset
						iOffsetBottom *= -2;
					} else if (aPosition[1] === "center") {
						// some top offset
						iOffsetBottom *= -1;
					} else if (aPosition[1] === "bottom") {
						// nothing
					} else {
						// set custom value
						sPosition = "begin top";
						iOffsetBottom = parseInt(aPosition[1]);
					}

					// position toast either close to the screen edge or on top of the letterbox
					var iDistanceToScreen = document.getElementsByClassName("flush")[0].getBoundingClientRect().left || 16;
					if (iDistanceToScreen > this._MESSAGETOAST_WIDTH / 2) {
						iDistanceToScreen -= this._MESSAGETOAST_WIDTH / 2;
					}

					// recalculate center relative to arcade machine width and height
					if (typeof aPosition[0] === "string" || typeof aPosition[1] === "string") {
						if (aPosition[0] === "begin") {
							aPosition[0] = iDistanceToScreen;
						} else if (aPosition[0] === "center") {
							aPosition[0] = Device.resize.width / 2  - (this.getMessage() ? this._MESSAGETOAST_WIDTH / 2 : 0);
						} else if (aPosition[0] === "end") {
							aPosition[0] = Device.resize.width - this._MESSAGETOAST_WIDTH - iDistanceToScreen;
						} else {
							aPosition[0] = parseInt(aPosition[0]);
							// add letterboxing offset
							aPosition[0] += document.getElementsByClassName("game")[0].getClientRects()[0].left;
						}
						if (aPosition[1] === "top") {
							aPosition[1] = 0;
						} else if (aPosition[1] === "center") {
							aPosition[1] = Math.min(Device.resize.height, this._MAX_GAME_HEIGHT) / 2;
						} else if (aPosition[1] === "bottom") {
							aPosition[1] = Math.min(Device.resize.height, this._MAX_GAME_HEIGHT) - 100;
						} else {
							aPosition[1] = parseInt(aPosition[1]);
						}

						// special cases
						if (this.getMessage() && this.getImage()) {
							// position messages with an image a little furter down
							aPosition[1] += this._HEADER_HEIGHT;
						} else {
							// move up other sprites a bit
							aPosition[1] -= this._HEADER_HEIGHT / 2;
						}

						sPosition = {left: aPosition[0], top: aPosition[1]};
					}

					// add some random jitter offset
					if (this.getJitter()) {
						iOffsetLeft += Math.floor(Math.abs(Math.random()) * this.getJitter());
						iOffsetBottom += Math.floor(Math.abs(Math.random()) * this.getJitter() / 2);
					}

					// classic message toast + image (optional)
					MessageToast.show(sMessage, {
						// TODO: support all props of MessageToast
						at: sPosition,
						//my: this.getPosition(),
						//offset: iOffsetLeft + " " + iOffsetBottom,
						duration: this.getDuration(),
						width: sWidth,
						onClose: resolve
					});

					var aToastCollection = document.getElementsByClassName("sapMMessageToast"),
						oToast = aToastCollection.item(aToastCollection.length - 1);

					oToast.classList.add("flush");

					// image only
					if (!this.getMessage()) {
						oToast.classList.add("transparent");
					}

					// speaker image (optional)
					if (this.getImage()) {
						this._sneakInImage();
					}

					// number (optional)
					if (this.getNumber()) {
						this._sneakInNumber();
					}
				} else {
					// have a break
					setTimeout(function () {
						resolve();
					}, this.getDuration());
				}
			}.bind(this));
		}
	});

});