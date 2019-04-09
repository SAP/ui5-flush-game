sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"../model/formatter"
], function (BaseController, JSONModel, MessageBox, formatter) {
	"use strict";

	return BaseController.extend("flush.game.controller.Outro", {

		formatter: formatter,

		/**
		 * Sets up the intro
		 */
		onInit: function () {
			BaseController.prototype.onInit.apply(this, arguments);

			var oViewModel = new JSONModel({
				score: 0,
				progress: 1,
				godMode: false,
				outro: "images/Outro.png"
			});
			this.setModel(oViewModel, "view");
			this.getRouter().getRoute("outro").attachPatternMatched(this._playOutro, this);
		},

		/**
		 * Shows a win is not defined exception
		 * @private
		 */
		_winErrorDialog: function () {
			MessageBox.error(
				"WinException",
				{
					id : "WinException",
					title : "Error: \"Win\" is not defined",
					details : "@Core.js:1337",
					actions : [MessageBox.Action.CLOSE]
				}
			);
			setTimeout(function () {
				var oWinException = sap.ui.getCore().byId("WinException");
				if (oWinException) {
					sap.ui.getCore().byId("WinException").destroy();
				}
				this.getRouter().navTo("home");
			}.bind(this), 10000);
		},

		/**
		 * Plays the outro and shows the win dialog
		 * @private
		 */
		_playOutro: function () {
			this.getBadWeather().stop();
			this.getSoundManager().play("Cheer");
			this._playStory("outro").then(function() {
				this._winErrorDialog();
				this.getSoundManager().play("gameOver");
			}.bind(this));
		},

		/**
		 * Navigates back to the home screen
		 */
		onBack: function () {
			this._stopStory();
			this.getRouter().navTo("home");
		}
	});
});