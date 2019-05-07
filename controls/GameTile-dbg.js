
sap.ui.define([
	"sap/m/CustomTile",
	"sap/ui/core/Icon",
	"sap/ui/Device",
	"sap/m/CustomTileRenderer",
	"sap/ui/thirdparty/jquery" // file contains implicit calls via control.$()
], function (CustomTile, Icon, Device, CustomTileRenderer) {
	"use strict";

	/**
	 * Custom game tile that can be locked and unlocked to show the game progress
	 */
	return CustomTile.extend("flush.game.controls.GameTile", {
		metadata: {
			properties: {
				/* displays a lock and disables the click on the tile if set */
				"locked": {
					type: "boolean",
					defaultValue: true
				}
			},
			events: {
				press2: {}
			}
		},

		/**
		 * Adds a custom style to the base class
		 */
		init: function () {
			this.addStyleClass("gameTile");
		},

		/**
		 * Cleanup of the locked icon
		 */
		exit: function () {
			if (this._lockedIcon) {
				this._lockedIcon.destroy();
				this._lockedIcon = null;
			}
		},

		/**
		 * Adds the locked class
		 */
		onBeforeRendering: function () {
			this.toggleStyleClass("locked", this.getLocked());
		},

		/**
		 * Setter without rerendering and CSS animation toggling
		 * @param {boolean} bLocked value for the locked state
		 */
		setLocked: function (bLocked) {
			this.setProperty("locked", bLocked, true);
			this.$().find(".sapUiIcon").animate({
				opacity: (bLocked ? 1 : 0),
				top: (bLocked ? "0" : "-=50"),
				height: (bLocked ? "inherit": "toggle")
			}, 500, function () {
				this.$().find(".sapUiIcon").css("display", (bLocked ? "block" : "none") );
				this.toggleStyleClass("locked", this.getLocked());
			}.bind(this));
		},

		/**
		 * pass through tap events (custom tile does not support this by default
		 * @param {sap.ui.base.Event} oEvent
		 */
		ontap: function (oEvent) {
			if (!this.getLocked()) {
				this.firePress();
			}
		},

		/**
		 * pass through keyboard events
		 * @param {sap.ui.base.Event} oEvent
		 */
		onsapenter: function (oEvent) {
			this.ontap(oEvent);
		},

		/**
		 * Inject a locked layer on top of the tile that blocks the clicks
		 */
		onAfterRendering: function () {
			CustomTile.prototype.onAfterRendering.apply(this, arguments);
			this.$().append('<div class="locker"></div>');

			if (!this._lockedIcon) {
				this._lockedIcon = new Icon({
					src: "sap-icon://locked",
					color: "#f2d249",
					size: (Device.system.phone ? "5.5rem" : "7rem"),
					width: (Device.system.phone ? "135px" : "200px"),
					height: (Device.system.phone ? "135px" : "190px"),
				});
			}

			// there he is, the evil render manager, well in this case quite helpful
			var oRm = sap.ui.getCore().createRenderManager(),
				oContent = this.$("cnt")[0];

			oRm.renderControl(this._lockedIcon);
			oRm.flush(this.$().find(".locker")[0]);
			oRm.destroy();
		},

		/**
		 * Nothing special, just render the custom tile
		 * @param {sap.ui.core.RenderManager} oRM the RenderManager
		 * @param {sap.ui.core.Control} oControl the control to be rendered
		 */
		renderer: function (oRM, oControl) {
			CustomTileRenderer.render(oRM, oControl);
		}

	});
});