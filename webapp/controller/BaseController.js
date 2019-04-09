sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/m/library",
	"sap/ui/core/Fragment"
], function (Controller, UIComponent, mobileLibrary, Fragment) {
	"use strict";

	return Controller.extend("flush.game.controller.BaseController", {

		/**
		 * Creates a promise to be resolved after the first re-rendering
		 */
		onInit: function () {
			this._firstRenderingFinished = new Promise(function (fnResolve) {
				this._firstRenderingResolve = fnResolve;
			}.bind(this));
		},

		/**
		 * Resolves the first rendering promise so that game controllers can register for it
		 */
		onAfterRendering: function () {
			this._firstRenderingResolve();
		},

		/**
		 * Returns the first rendering promise
		 * @return {Promise} A promise to be resolved after the first rendering
		 */
		rendered: function () {
			return this._firstRenderingFinished;
		},

		/**
		 * Resolved when resources are loaded and view is rendered
		 * @return {Promise}
		 */
		ready: function () {
			return Promise.all([
				this.getOwnerComponent().filesLoaded(),
				this.rendered()
			]);
		},

		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		/**
		 * Returns the global Sound Manager
		 * @return {Object} the sound managerinstance
		 */
		getSoundManager: function () {
			return this.getOwnerComponent()._soundManager;
		},

		/**
		 * Returns the global Bad Weather
		 * @return {Object} the bad weather instance
		 */
		getBadWeather: function () {
			return this.getOwnerComponent()._badWeather;
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Opens an E-Mail to the app owner
		 * @public
		 */
		onContactPress: function () {
			mobileLibrary.URLHelper.triggerEmail(this.getOwnerComponent().getModel("app").getProperty("/contact"));
		},

		/**
		 * Opens the application source code repo
		 * @public
		 */
		onRepoPress: function () {
			mobileLibrary.URLHelper.redirect(this.getOwnerComponent().getModel("app").getProperty("/repo"), true);
		},

		/**
		 * Opens the application help
		 * @public
		 */
		onHelpPress: function () {
			mobileLibrary.URLHelper.redirect(this.getOwnerComponent().getModel("app").getProperty("/help"), true);
		},

		/**
		 * Evaluates the arcade input from the direction and press buttons
		 * @param {sap.ui.base.Event} oEvent
		 */
		onArcadeInput: function (oEvent) {
			var KONAMI_CODE = "uuddlrlrba";
			if (this._konami === undefined) {
				this._konami = KONAMI_CODE;
			}

			var cCode = oEvent.getSource().getId().split("--").pop();
			if (cCode === this._konami[0]) {
				this._konami = this._konami.substr(1);
				if (this._konami.length === 0) {
					this.getOwnerComponent().getRootControl().getController().activateGodMode();
					this._konami = KONAMI_CODE;
				}
			} else {
				this._konami = KONAMI_CODE;
			}
		},

		/**
		 * Trigger 1player or 2player mode
		 * @param {sap.ui.base.Event|string} oEvent SegmentedButton change event or a string with 1player/2player
		 */
		onSwitchMode: function (oEvent) {
			var oItem, sKey;
			if (typeof oEvent === "string") {
				sKey = oEvent;
			} else {
				oItem = oEvent.getParameter("item");
				sKey = oItem.getKey();
			}

			if(sKey === "2player") {
				this.getRouter().navTo("multi");
			} else {
				this.getRouter().navTo("home");
			}
			this.getSoundManager().play("coin");
		},

		/**
		 * Starts the game story
		 * @private
		 */
		_playStory: function (sWhich) {
			var oMessageToastStory;
			if (typeof sWhich === "string") {
				oMessageToastStory = this.byId(sWhich);
			} else {
				oMessageToastStory = this.byId("page").getDependents()[0];
			}

			if (oMessageToastStory) {
				return oMessageToastStory.play();
			} else {
				return {
					then: function () {}
				};
			}
		},

		/**
		 * Stops the animation queue
		 * @private
		 */
		_stopStory: function (sWhich) {
			if (typeof sWhich === "string") {
				var oMessageToastStory = this.byId(sWhich);
				if (oMessageToastStory) {
					oMessageToastStory.stop();
				}
			} else {
				// stop all
				if (this.byId("page")) {
					this.byId("page").getDependents().forEach(function (oStory) {
						if (oStory instanceof flush.game.controls.MessageToastStory) {
							oStory.stop();
						}
					});
				}
			}
		},

		/**
		 * Show credits dialog
		 */
		onCredits: function () {
			var oFragmentController = {
				formatter: this.formatter,
				onCloseDialog : function () {
					this.byId("Credits").close();
				}.bind(this)
			};

			// lazy load credits dialog
			if (!this.byId("Credits")) {
				Fragment.load({
					id: this.getView().getId(),
					name: "flush.game.view.Credits",
					controller: oFragmentController
				}).then(function (oCreditsDialog) {
					oCreditsDialog.setInitialFocus(oCreditsDialog.getBeginButton());
					this.getView().addDependent(oCreditsDialog);
					oCreditsDialog.open();
				}.bind(this));
			} else {
				this.byId("Credits").open();
			}
		}
	});
});