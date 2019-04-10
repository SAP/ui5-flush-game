/**
 * Unique set of controls which are rendered somewhere to be used for image representations
 */

/* global domtoimage*/

sap.ui.define([
	"sap/base/Log",
	"sap/ui/core/Control"
], function(Log, Control) {
	"use strict";

	/**
	 * Renders UI5 controls to images so that they can be placed on a canvas
	 */
	return Control.extend("flush.game.controls.ControlManager", {
		metadata: {
			defaultAggregation: "content",
			aggregations: {
				/* list of controls to be converted to images */
				"content": {
					type: "sap.ui.core.Control",
					multiple: true
				}
			}
		},

		/**
		 * Creates images for all controls in the content aggregatipon
		 * @param {boolean} [bForceUpdate] forces an update of all images
		 * @return {Promise} a promise to be resolved when all images are created
		 */
		updateAllControlImages: function(bForceUpdate) {
			var pAllControlImagesUpdated = [];
			this.getContent().forEach(function(oControl) {
				pAllControlImagesUpdated.push(this.updateControlImage(oControl), bForceUpdate);
			}.bind(this));
			return Promise.all(pAllControlImagesUpdated);
		},

		/**
		 * Differences of html2canvas to domtoimage: https://github.com/tsayen/dom-to-image/issues/100
		 * Comparing performance: domtoimage (2.6s) is much faster than html2canvas (4.7s) for 7 controls
		 * @param {sap.ui.core.Control} control instance
		 * @param {boolean} [bForceUpdate] forces an update of the control image
		 */
		updateControlImage: function(oControl, bForceUpdate) {
			if (!oControl || !oControl.getDomRef()) {
				Log.info("There are controls with no DOMRef!");
				return Promise.resolve();
			} else {
				if (oControl.setBlocked){
					oControl.setBlocked(false);
				}
				if (!oControl._image || bForceUpdate){
					return domtoimage.toPngCacheId(oControl.getDomRef()).then(function(dataUrl) {
						oControl._dataUrl = dataUrl;
						var image = new Image();
						image.src = dataUrl;
						oControl._image = image;
						if (oControl.setBlocked){
							oControl.setBlocked(true);
						}
					}).then(function(){
						return domtoimage.toPngCacheId(oControl.getDomRef(), undefined, "Blocked").then(function(dataUrlBlocked) {
							oControl._dataUrlBlocked = dataUrlBlocked;
							var image = new Image();
							image.src = dataUrlBlocked;
							oControl._imageBlocked = image;
						});
					}).catch(function(error) {
						Log.error('oops, something went wrong!', error);
					});
				} else {
					return Promise.resolve();
				}
			}
		},

		/**
		 * Renders all controls in a simple div
		 * @param {sap.ui.core.RenderManager} oRM the evil render manager
		 * @param {sap.ui.core.Control} oControl the ControlManager control
		 */
		renderer: function(oRM, oControl) {
			oRM.write("<div");
			oRM.writeControlData(oControl);
			oRM.writeClasses();
			oRM.write(">");
			var aContent = oControl.getContent();
			var l = aContent.length;
			for (var i = 0; i < l; i++) {
				oRM.renderControl(aContent[i]);
			}
			oRM.write("</div>");
		}

	});
});