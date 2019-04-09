sap.ui.define([
	"sap/ui/thirdparty/jquery", // file contains a jQuery.animate call
	"sap/ui/core/Control",
	"sap/m/MessageToast",
], function (jQuery, Control, MessageToast) {
	"use strict";

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
				"effect_pow.png": [300, 217],
				"effect_lowenergy.png": [200, 160],
				"Boom.png": [400, 179],
				"Zing.png": [400, 299],
				"GodMode.png": [839, 460],
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

			var oImage = document.createElement("img");
			oImage.setAttribute("src", sap.ui.require.toUrl("flush/game/images") + '/' + this.getImage());
			oImage.classList.add("messageToastDeluxeImage");

			if (this.getMessage()) {
				// put image on top of toast
				oImage.style.left = (oOrdinaryToast.offsetWidth - (oImage.width || aFallbackSize[0])) / 2 + "px";
				oImage.style.bottom = oOrdinaryToast.offsetHeight + "px";
			} else {
				// center image
				var iBottom = (oImage.height || aFallbackSize[1]) / -2;
				if (this.getPosition().split(" ").pop() === "bottom") {
					iBottom /= 2;
				}
				oImage.style.left = ((oImage.width || aFallbackSize[0]) / -2) + "px";
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
				oOrdinaryToast = aToastCollection.item(aToastCollection.length - 1);

			var oNumber = document.createElement("span");
			oNumber.classList.add('messageToastDeluxeNumber');
			if (this.getNumber() < 0) {
				oNumber.classList.add('negative');
			}
			oNumber.appendChild(document.createTextNode(this.getNumber()));

			oNumber.style.left = -100 + "px";
			oNumber.style.bottom = -30 + "px";

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
						offset: iOffsetLeft + " " + iOffsetBottom,
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