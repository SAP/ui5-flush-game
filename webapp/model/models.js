sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function(JSONModel, Device) {
	"use strict";

	var MANIFEST_CUSTOM_PATH = "/sap.ui/custom/";

	return {

		/**
		 * Creates a device model to define responsive behavior for the app
		 * @return {sap.ui.model.jsonJSONModel} the device model
		 */
		createDeviceModel: function() {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		/**
		 * reads properties from manifest for the three buttons (repo, help, contact)
		 * @param {sap.ui.core.Component} oComponent the component for this app
		 * @return {sap.ui.model.jsonJSONModel} the app model
		 */
		createAppModel: function(oComponent) {
			var oModel = new JSONModel();

			["help", "repo", "contact"].forEach(function (sProperty) {
				var sValue = oComponent.getManifestEntry(MANIFEST_CUSTOM_PATH + sProperty);
				oModel.setProperty("/" + sProperty, sValue);
			}.bind(this));

			return oModel;
		}

	};

});
