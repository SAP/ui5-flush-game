sap.ui.define([
	"sap/ui/base/Object",
], function(Object) {
	"use strict";

	return Object.extend("flush.game.controller.BadWeather", {

		/**
		 * Stores a reference to the app component for maximum bad weather experience
		 * @param {sap.ui.core.Component} oComponent the app component
		 */
		init: function (oComponent) {
			this._oComponent = oComponent;
			this._sMode = this._oComponent.getModel("game").getProperty("/mode");
		},

		/**
		 * Stops all bad weather
		 */
		stop: function () {
			if (this._sMode === "xmas") {
				this.stopSnow();
			} else {
				this.stopRain();
			}
			this.stopLightning();
		},

		/**
		 * remove all those little drops
		 */
		stopRain: function () {
			if (this._sMode === "xmas") {
				return this.stopSnow();
			} else {
				this._bStopRain = true;
				var oRain = document.getElementById('rain');
				while (oRain.firstChild) {
					oRain.removeChild(oRain.firstChild);
				}
			}
		},

		/**
		 * Remove all snowflakes
		 */
		stopSnow: function () {
			document.getElementById("snow").classList.add("display-none");
			this._bstopSnow = true;
		},

		/**
		 * hide CSS flash effects
		 */
		stopLightning: function () {
			document.getElementById("lightning").classList.add("display-none");
		},

		/**
		 * activate CSS flash effects
		 * source: https://codepen.io/Chrislion_me/pen/rVqwbO
		 */
		lightning: function () {
			document.getElementById("lightning").classList.remove("display-none");
		},

		/**
		 * Rain simulator - wetness guaranteed
		 * source: https://codepen.io/alemesre/pen/hAxGg
		 * @param {string} sHardness determines how hard it rains
		 */
		rain : function (sHardness) {
			if (this._sMode === "xmas") {
				return this.snow(sHardness);
			}

			this.stopRain();
			this._bStopRain = false;

			var iDrops,
				windowW = window.innerWidth;

			// number of drops created
			switch (sHardness) {
				case "heavy":
					iDrops = 100;
					break;
				case "moderate":
					iDrops = 60;
					break;
				case "soft":
				default:
					iDrops = 30;
					break;
			}

			// function to generate a random number range.
			function randRange( minNum, maxNum) {
				return (Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum);
			}

			// slowly start raining
			for(i = 1 ; i < iDrops ; i++) {
				(function (i) {
					setTimeout(function () {
						// early out to stop the init loop
						if (this._bStopRain) {
							return;
						}
						var iDropLeft = randRange(-100, windowW);
						var iDropTop = randRange(-1000, 500);

						var oRain = document.getElementById("rain");
						var oDrop = document.createElement("div");
						oDrop.classList.add("drop");
						oDrop.setAttribute("id", "drop" + i);
						oDrop.style.left = iDropLeft + "px";
						oDrop.style.top = iDropTop + "px";
						oRain.appendChild(oDrop);
					}.bind(this), i * 50);
				}.bind(this))(i);
			}
		},

		/**
		 * Snow simulator - icy conditions ahead
		 * Source: https://codepen.io/pimskie/pen/jEVPNx
		 * @param {string} sHardness determines how hard it snows
		 */
		snow: function (sHardness) {
			this._bstopSnow = false;
			document.getElementById("snow").classList.remove("display-none");

			var canvas = document.getElementById("snow"),
				ctx = canvas.getContext('2d'),
				windowW = window.innerWidth,
				windowH = window.innerHeight,
				iFlakes = 200,
				aFlakes = [];

			switch (sHardness) {
				case "heavy":
					iFlakes = 150;
					break;
				case "moderate":
					iFlakes = 100;
					break;
				case "soft":
				default:
					iFlakes = 50;
					break;
			}

			function Flake(x, y) {
				var maxWeight = 5,
					maxSpeed = 3;

				this.x = x;
				this.y = y;
				this.r = randomBetween(0, 1);
				this.a = randomBetween(0, Math.PI);
				this.aStep = 0.01;


				this.weight = randomBetween(2, maxWeight);
				this.alpha = (this.weight / maxWeight);
				this.speed = (this.weight / maxWeight) * maxSpeed;

				this.update = function() {
					this.x += Math.cos(this.a) * this.r;
					this.a += this.aStep;

					this.y += this.speed;
				}

			}

			function init() {
				var i = iFlakes,
					flake,
					x,
					y;

				while (i--) {
					x = randomBetween(0, windowW, true);
					y = randomBetween(0, windowH, true);


					flake = new Flake(x, y);
					aFlakes.push(flake);
				}

				scaleCanvas();
				loop();
			}

			function scaleCanvas() {
				canvas.width = windowW;
				canvas.height = windowH;
			}

			var loop = function() {
				var i = aFlakes.length,
					flake;

				// stopping the loop from outside
				if (this._bstopSnow) {
					return;
				}

				// clear canvas
				ctx.save();
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, windowW, windowH);
				ctx.restore();

				// loop of hell
				while (i--) {

					flake = aFlakes[i];
					flake.update();

					ctx.beginPath();
					ctx.arc(flake.x, flake.y, flake.weight, 0, 2 * Math.PI, false);
					ctx.fillStyle = 'rgba(255, 255, 255, ' + flake.alpha + ')';
					ctx.fill();

					if (flake.y >= windowH) {
						flake.y = -flake.weight;
					}
				}

				requestAnimationFrame(loop.bind(this));
			}.bind(this);

			function randomBetween(min, max, round) {
				var num = Math.random() * (max - min + 1) + min;

				if (round) {
					return Math.floor(num);
				} else {
					return num;
				}
			}

			init();
		}

	});
});
