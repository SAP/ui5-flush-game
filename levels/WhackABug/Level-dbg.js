sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/Device"
], function (UI5Object, Device) {
	"use strict";

	/* globals needed for this level */
	var loader;
	var bugsX = [152, 594, 1052, 154, 593, 1053];
	var bugsY = [87, 150, 86, 560, 463, 560];
	var bXmas = false;

	var KEYBOARD_STEP = 25;
	var KEYBOARD_FREQUENCY = 20;

	return UI5Object.extend("flush.game.levels.WhackABug", {

		/**
		 * Connect the game and the canvas to the level
		 * @param {flush.game.controls.Game} oGame the global game object
		 * @param {Object} aCanvas First element is the game canvas, second element is the game debug canvas.
		 */
		constructor: function (oGame, aCanvas) {
			this._oGame = oGame;
			this._oCanvas = aCanvas[0];

			this._boundKeyDown = this._fnKeyDown.bind(this);
			this._boundKeyUp = this._fnKeyUp.bind(this);
			this._keyboardInputX = 0;
			this._keyboardInputY = 0;

			this._iScaleFactor = 1;
		},

		/**
		 * Resources and variables setup
		 * @return {Promise} Resolved when the init is completed
		 */
		init: function () {
			return new Promise(function (fnResolve, fnReject) {
				this._fnInitResolve = fnResolve;

				this.stage = new createjs.Stage(this._oCanvas.getId());
				createjs.Touch.enable(this.stage);

				var manifest = [
					{src: "bg.png", id: "bg"},
					{src: "Gut1.png", id: "gut1"},
					{src: "Gut2.png", id: "gut2"},
					{src: "Gut3.png", id: "gut3"},
					{src: "Gut4.png", id: "gut4"},
					{src: "Gut5.png", id: "gut5"},
					{src: "Gut6.png", id: "gut6"},
					{src: "Boese1.png", id: "boese1"},
					{src: "Boese2.png", id: "boese2"},
					//{src: "BoeseXmas1.png", id: "boese1"},
					//{src: "BoeseXmas2.png", id: "boese2"},
					{src: "hammer.png", id: "hammer"}
				];

				this.stage.mouseEventsEnabled = true;

				loader = new createjs.LoadQueue(false);
				loader.addEventListener("complete", this.onLoadingCompleted.bind(this));
				loader.loadManifest(manifest, true, sap.ui.require.toUrl("flush/game/levels/WhackABug/assets") + "/");

				// sync keyboard
				document.addEventListener("keydown",this._boundKeyDown);
				document.addEventListener("keyup", this._boundKeyUp);
			}.bind(this));
		},

		/**
		 * Level cleanup
		 * @return {Promise} Resolved when the cleanup is completed
		 */
		exit: function () {
			return new Promise(function (fnResolve, fnReject) {
				// deregister canvas
				if (this.stage) {
					this.stage.removeAllChildren();
					createjs.Ticker.removeAllEventListeners();
					createjs.Tween.removeAllTweens();
					this.stage = null;
				}
				// remove event listeners
				document.removeEventListener("keydown", this._boundKeyDown);
				document.removeEventListener("keyup", this._boundKeyUp);
				fnResolve();
			}.bind(this));
		},

		/**
		 * Sets the difficulty for this level
		 * @param {int} iDifficulty a difficulty value betweel 0 and 50
		 */
		setDifficulty: function (iDifficulty) {
			this._iDifficulty = Math.min(iDifficulty, 50);
		},

		/**
		 * Initial level setup after all resources are loaded
		 */
		onLoadingCompleted: function () {
			var bg = new createjs.Bitmap(loader.getResult("bg"));

			// scale down level on phones to see at least 2-4 holes
			if (Device.system.phone) {
				if (document.body.offsetWidth < document.body.offsetHeight) {
					// portrait
					this._iScaleFactor = 0.97;
				} else {
					// landscape
					this._iScaleFactor = 0.635;
				}
			}
			bg.scaleX = this._iScaleFactor;
			bg.scaleY = this._iScaleFactor;

			this.stage.addChild(bg);

			this.myCursor = new createjs.Bitmap(loader.getResult("hammer"));
			this.myCursor.mouseEnabled = false;
			this.stage.addChild(this.myCursor);

			// center mouse position initially
			this.stage.mouseX = this._oCanvas.$().width() / 2;
			this.stage.mouseY = this._oCanvas.$().height() / 2 ;

			/* Ticker */
			createjs.Ticker.timingMode = createjs.Ticker.RAF;
			createjs.Ticker.setInterval(25);
			createjs.Ticker.setFPS(40);

			// Tween.js is not re-initializing properly
			// https://stackoverflow.com/questions/20340796/how-to-clear-createjs-code-and-canvas-completely
			createjs.Ticker.addEventListener("tick", createjs.Tween);

			// update mouse hammer position
			createjs.Ticker.addEventListener("tick", function (oEvent) {
				this.stage.update();
				// only change cursor position if mouse moved to allow keyboard control
				// x coordinate
				if (this._previousMouseX !== this.stage.mouseX) {
					this.myCursor.x = this.stage.mouseX - 120;
				} else {
					this.myCursor.x += this._keyboardInputX;
					this._keyboardInputX = 0;
				}
				// y coordinate
				if (this._previousMouseY !== this.stage.mouseY) {
					this.myCursor.y = this.stage.mouseY - 80;
				} else {
					this.myCursor.y += this._keyboardInputY;
					this._keyboardInputY = 0;
				}
				this._previousMouseX = this.stage.mouseX;
				this._previousMouseY = this.stage.mouseY;

				// stay on stage
				this.myCursor.x = Math.max(0, this.myCursor.x);
				this.myCursor.x = Math.min(this.myCursor.x, this._oCanvas.$().width() - 75);
				this.myCursor.y = Math.max(0, this.myCursor.y);
				this.myCursor.y = Math.min(this.myCursor.y, this._oCanvas.$().height() - 75);

				this.stage.setChildIndex(this.myCursor, this.stage.getNumChildren() - 1);
			}.bind(this));

			// hammering animation
			this.stage.on("click", this._hammered.bind(this));

			// init bug positioning loops
			this.showGoodBug();
			this.showBadBug();

			// resolve init promise
			this._fnInitResolve();
		},

		/**
		 * Keydown listener to control cursor with keyboard as well
		 * @param oEvent
		 * @private
		 */
		_fnKeyDown : function(oEvent) {
			var sKey = oEvent.key;

			// action key
			if (sKey === " " || sKey === "Enter") {
				this.bugKeyboard();
				return;
			}

			// move until key up event is triggered
			switch (sKey) {
				case "ArrowLeft":
				case "a":
					this._iIntervalLeft = setInterval(function () {
						this._keyboardInputX -= KEYBOARD_STEP;
					}.bind(this), KEYBOARD_FREQUENCY);
					break;
				case "ArrowRight":
				case "d":
					this._iIntervalRight = setInterval(function () {
						this._keyboardInputX += KEYBOARD_STEP;
					}.bind(this), KEYBOARD_FREQUENCY);
					break;
				case "ArrowUp":
				case "w":
					this._iIntervalUp = setInterval(function () {
						this._keyboardInputY -= KEYBOARD_STEP;
					}.bind(this), KEYBOARD_FREQUENCY);
					break;
				case "ArrowDown":
				case "s":
					this._iIntervalDown = setInterval(function () {
						this._keyboardInputY += KEYBOARD_STEP;
					}.bind(this), KEYBOARD_FREQUENCY);
					break;
			}
		},

		/**
		 * Keyup listener to reset movement interval
		 * @param oEvent
		 * @private
		 */
		_fnKeyUp : function(oEvent) {
			switch (oEvent.key) {
				case "ArrowLeft":
				case "a":
					clearInterval(this._iIntervalLeft);
					break;
				case "ArrowRight":
				case "d":
					clearInterval(this._iIntervalRight);
					break;
				case "ArrowUp":
				case "w":
					clearInterval(this._iIntervalUp);
					break;
				case "ArrowDown":
				case "s":
					clearInterval(this._iIntervalDown);
					break;
			}
		},

		/**
		 * Hammer animation function
		 * @private
		 */
		_hammered: function () {
			createjs.Tween.get(this.myCursor)
				.to({rotation: 60, rotationDir: -1}, 100)
				.to({rotation: 30}, 100)
				.to({rotation: 10, rotationDir: -1}, 100);
		},

		/**
		 * A bug has been hit by keyboard
		 * @param oEvent
		 */
		bugKeyboard: function () {
			var aCoordinates;

			this._hammered();
			// keyboard input: find out which object was hit with hitTest
			var aCollisions = this.stage.getObjectsUnderPoint(this.myCursor.x + 120, this.myCursor.y + 80);
			for (var i = 0; i < aCollisions.length; i++) {
				if (aCollisions[i].image) {
					aCoordinates = [this.myCursor.x + 120, this.myCursor.y + 80];
					if (aCollisions[i].image.src.indexOf("Boese") >= 0) {
						this.badBugHit({rawX: aCoordinates[0], rawY: aCoordinates[1]});
					} else if(aCollisions[i].image.src.indexOf("Gut") >= 0) {
						this.goodBugHit({rawX: aCoordinates[0], rawY: aCoordinates[1]});
					}
				}
			}
		},

			/**
		 * Show another bad guy
		 */
		showBadBug: function () {
			var randomBadPos = Math.floor(Math.random() * bugsX.length);
			if (randomBadPos !== this.randomPos &&
					bugsX[randomBadPos] * this._iScaleFactor < document.body.offsetWidth &&
					bugsY[randomBadPos] * this._iScaleFactor < document.body.offsetHeight) {
				// only show bad bug if they don't overlap
				if (this.lastBadBug != null) {
					this.lastBadBug.removeAllEventListeners();
					this.stage.removeChild(this.lastBadBug);
					this.lastBadBug = null;
				}

				// chose more or less characters based on difficulty
				var iEvilIndex = Math.floor(Math.random() * 2 * Math.max(this._iDifficulty / 10, 1));
				this.badBug = new createjs.Bitmap(loader.getResult("boese" + iEvilIndex));
				this.badBug.scaleX = this._iScaleFactor;
				this.badBug.scaleY = this._iScaleFactor;
				this.badBug.x = bugsX[randomBadPos] * this._iScaleFactor;
				this.badBug.y = bugsY[randomBadPos] * this._iScaleFactor - (bXmas ? 18 : 0);
				this.stage.addChild(this.badBug);
				this.badBug.on("click", this.badBugHit.bind(this));

				this.lastBadBug = this.badBug;
				this.lastBadBug.scaleY *= 0.3;
				this.lastBadBug.y += 42 * this._iScaleFactor;

				var iDelay = 4000 / (1.5 + this._iDifficulty / 5);
				createjs.Tween.get(this.lastBadBug).to({scaleY: 1 * this._iScaleFactor, y: bugsY[randomBadPos] * this._iScaleFactor - (bXmas ? 18 : 0)}, 200).wait(iDelay).call(function(){
					this.showBadBug();
				}.bind(this));
			} else {
				this.showBadBug();
			}
		},

		/**
		 * A bad guy was hit
		 * @param oEvent
		 */
		badBugHit: function (oEvent) {
			this._oGame.getSoundManager().play("hammer");

			this._oGame.triggerEvent("Awesome");
			this._oGame.score(100 * this._iDifficulty / 10, [oEvent.rawX, oEvent.rawY]);

			this.lastBadBug.removeAllEventListeners();
			this.stage.removeChild(this.lastBadBug);
			this.lastBadBug = null;
		},


		/**
		 * Show another good guy
		 */
		showGoodBug: function () {
			this.randomPos = Math.floor(Math.random() * bugsX.length);
			if (bugsX[this.randomPos] * this._iScaleFactor < document.body.offsetWidth &&
				bugsY[this.randomPos] * this._iScaleFactor < document.body.offsetHeight) {

				if (this.lastBug != null) {
					this.lastBug.removeAllEventListeners();
					this.stage.removeChild(this.lastBug);
					this.lastBug = null;
				}

				var iGoodIndex = Math.floor(Math.random() * 6 * Math.max(this._iDifficulty / 10, 1));
				this.bug = new createjs.Bitmap(loader.getResult("gut" + iGoodIndex));
				this.bug.scaleX = this._iScaleFactor;
				this.bug.scaleY = this._iScaleFactor;
				this.bug.x = bugsX[this.randomPos] * this._iScaleFactor;
				this.bug.y = bugsY[this.randomPos] * this._iScaleFactor;
				this.stage.addChild(this.bug);
				this.bug.on("click", this.goodBugHit.bind(this));

				this.lastBug = this.bug;
				this.lastBug.scaleY *= 0.4;
				this.lastBug.y += 42 * this._iScaleFactor;

				var iDelay = 6000 / (1 + this._iDifficulty / 4);
				createjs.Tween.get(this.lastBug).to({
					scaleY: 1 * this._iScaleFactor,
					y: bugsY[this.randomPos] * this._iScaleFactor
				}, 200).wait(iDelay).call(function () {
					this.showGoodBug();
				}.bind(this));
			} else {
				this.showGoodBug();
			}
		},

		/**
		 * A good guy was hit
		 * @param oEvent
		 */
		goodBugHit: function (oEvent) {
			this._oGame.getSoundManager().play("hammer");

			this._oGame.triggerEvent("Ohno");
			this._oGame.score(-100 * this._iDifficulty / 5, [oEvent.rawX, oEvent.rawY]);

			this.lastBug.removeAllEventListeners();
			this.stage.removeChild(this.lastBug);
			this.lastBug = null;
		}

	});

});