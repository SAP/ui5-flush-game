/* global createjs */

(function () {
	/* update loading status with amazing messages */
	var aStates = [
		"Checking Faulty Circuits",
		"Charging Chromatic Laser",
		"Rebooting AI Core System",
		"Instantiating Evil Robot Army",
		"Polishing communication antenna",
		"Booting up sound system",
		"Inspecting Software Bugs",
		"Analyzing Data Lake",
		"Taming Render Manager",
		"Updating Fusion Drive"
	];

	function updateStatus () {
		setTimeout(function () {
			var iRandom = Math.floor(Math.random() * aStates.length);
			document.getElementsByClassName("status")[0].innerHTML = aStates[iRandom];
			aStates.splice(iRandom, 1);
			if (aStates.length > 0) {
				updateStatus();
			}
		}, 300 + Math.random() * 500);
	}

	updateStatus();
})();

sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"./model/models",
	"./controller/SoundManager",
	"./controller/BadWeather"
], function (UIComponent, Device, JSONModel, models, SoundManager, BadWeather) {
	"use strict";

	return UIComponent.extend("flush.game.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// set the app model
			this.setModel(models.createAppModel(this), "app");

			// set the mode model
			var oViewModel = new JSONModel({
				mode: "easter", // "xmas", ["easter", "summer"]
			});
			this.setModel(oViewModel, "game");

			// create the views based on the url/hash
			this.getRouter().initialize();

			// create global sound manager
			this._soundManager = new SoundManager();
			this._soundManager.init();

			// create global bad weather instance
			this._badWeather = new BadWeather();
			this._badWeather.init(this);

			this._preloadFiles();
		},

		onAfterRendering: function () {
			// hide loading layer after app view is rendered
			this.getRootControl().addEventDelegate({
				onAfterRendering: function () {
					document.getElementsByClassName("loading")[0].style.display = 'none';
				}
			})
		},

		/**
		 * Resource loading promise
		 * @return {Promise} a promise resolved when all resources are loaded
		 */
		filesLoaded: function () {
			return this._filesLoaded;
		},

		/**
		 * Preloads all files needed for a fluent gameplay
		 * @private
		 */
		_preloadFiles: function () {
			this._filesLoaded = new Promise(function (fnResolve) {
				// intro and outro are not preloaded to save some loading time
				// but sprites, speakers, and images that need sizing calculations
				var manifest = [
					{src: "flush_logo.png"},
					{src: "flush_logo_large.png"},
					{src: "flush_logo_xl.png"},
					{src: "effect_awesome.png"},
					{src: "effect_ha_ha_ha_neu.png"},
					{src: "effect_ohno.png"},
					{src: "effect_plop.png"},
					{src: "effect_points.png"},
					{src: "effect_points_critical.png"},
					{src: "effect_points_negative.png"},
					{src: "effect_pow.png"},
					{src: "effect_lowenergy.png"},
					{src: "gauge_bg.png"},
					{src: "energy_bg.png"},
					{src: "OrangeBefuerchtet.png"},
					{src: "BlauZaehne.png"},
					{src: "GrauKeineMeinung.png"},
					{src: "GruenHoffnungsvoll.png"},
					{src: "LilaDebatiert.png"},
					{src: "OrangeBefuerchtet.png"},
					{src: "RotRenderManagerDroht.png"},
					//{src: "RotRenderManagerDrohtXmas.png"},
					{src: "GodMode.png"},
					{src: "ChickenOut.png"},
					{src: "SwitchMode.png"},
					{src: "Boom.png"},
					{src: "Zing.png"}
				];

				var loader = new createjs.LoadQueue(false);
				loader.addEventListener("complete", function () {
					fnResolve();
				}.bind(this));

				loader.loadManifest(manifest, true, sap.ui.require.toUrl("flush/game/images") + "/");
			});
			return this._filesLoaded;
		}

	});
});
