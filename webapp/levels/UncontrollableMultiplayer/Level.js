/**	central class for creating gameobjects
 *	sync box2D shapes with createjs objects
 */
sap.ui.define([
	"sap/ui/base/Object",
	"./physics/box2DHelper",
	"./helper/time",
	"./helper/random",
	"sap/ui/model/json/JSONModel"
], function(UI5Object, box2d, time, random, JSONModel) {
	"use strict";

	var canvasWidth,
		canvasHeight,
		oAssetLoader,
		canvas,
		debugCanvas;

	var startLoadingTimes = [];
	// Stores the movement directions of each player. Is used in tick function.
	var playerMoveVecs = [
		[0, 0],
		[0, 0]
	];

	return UI5Object.extend("flush.game.levels.UncontrollableMultiplayer", {

		/**
		 * Connect the game and the canvas to the level
		 * @param {flush.game.controls.Game} oGame the global game object
		 * @param {Object} aCanvas First element is the game canvas, second element is the game debug canvas.
		 * @param {Object} oControlManager ControlManager instance
		 */
		constructor: function(oGame, aCanvas, oControlManager) {
			this.oGame = oGame;
			this.oCanvas  = aCanvas[0];
			this.oDebugCanvas = aCanvas[1];
			this.oControlManager = oControlManager;
		},

		/**
		 * Resources and variables setup
		 * @return {Promise} Resolved when the init is completed
		 */
		init: function() {

			return new Promise((fnResolve, fnReject) => {

				canvas = this.oCanvas .getDomRef();
				debugCanvas = this.oDebugCanvas.getDomRef();
				createjs.MotionGuidePlugin.install();

				this.stage = new createjs.Stage(canvas);
				this.stage.snapPixelsEnabled = true;

				// adapt height
				canvasWidth = this.oCanvas.$().width();
				canvasHeight = this.oCanvas.$().height();

				var fnPlayerWasHitByControl = function(iPlayer, skinControlHit) {
					if (iPlayer) {
						var skinPlayer = box2d.playerSkin(iPlayer - 1);

						if (!skinPlayer.recoveringFromHit //player wasn't hit recently
							&&
							!skinControlHit.blocked //control isn't blocked
							&&
							!(skinControlHit.createdBy === iPlayer && Date.now() - skinControlHit.createdAt < 500) //not the throwing control action
						) {
							skinPlayer.recoveringFromHit = true;
							time.setTimeout(function() {
								if (skinPlayer) { //if deleted already
									skinPlayer.recoveringFromHit = false;
									skinPlayer.gotoAndPlay("stay");
								}
							}, 2000);

							if (skinPlayer.currentAnimation === "fly") {
								skinPlayer.gotoAndPlay("flyHit");
							} else {
								skinPlayer.gotoAndPlay("stayHit");
							}
							if (!jQuery.sap.getUriParameters().get("game-debug")) {
								this.oGame.hit(iPlayer);
							}
							this.oGame.getSoundManager().play("goodHit");
							this.oGame.getSoundManager().play("badHit");
							this.oGame.getSoundManager().play("hammer");
						}
					}
				}.bind(this);

				var fnControlPackageCollected = function(iPlayerNumber, packageSkin) {
					packageSkin.image = oAssetLoader.getResult("phoenix" + (iPlayerNumber === 1 ? "Blue" : "Red"));
					box2d.playerSkin(iPlayerNumber - 1).playerLvl++;
					this.oGame.getSoundManager().play("goodHit");
					this.oGame.triggerEvent("PickPhoenix", box2d.playerSkin(iPlayerNumber - 1).playerLvl, [(iPlayerNumber === 1 ? "begin" : "end"), "center"]);
				}.bind(this);


				var fnRemoveActor = function(actor, box2dActors) {
					if (this.stage && actor) {
						this.stage.removeChild(actor.skin);
						box2dActors.splice(box2dActors.indexOf(actor), 1);
					}
				}.bind(this);

				//TODO: Refactoring needed - The soundmanager shouldn't be given to the Box2DHelper class
				box2d.init(canvas, debugCanvas, fnPlayerWasHitByControl, fnControlPackageCollected, this._iDifficulty, fnRemoveActor, this.oGame.getSoundManager());

				oAssetLoader = new createjs.LoadQueue(false);
				var sPath = sap.ui.require.toUrl("flush/game/levels/UncontrollableMultiplayer") + "/";

				// Not supported in IE11, but IDC :)
				var oManifestModel = new JSONModel();
				oManifestModel.attachRequestCompleted((oResponse) => {
					var oManifest = oResponse.getSource().getData();
					oAssetLoader.loadManifest(oManifest, true, sPath + "assets/");
					oAssetLoader.on("complete", () => {
						this.onLoadingCompleted().then(fnResolve);
					}, this);
				});
				oManifestModel.loadData(sPath + "levelManifest.json");
			});
		},

		/**
		 * Initial level setup after all resources have been loaded.
		 * @returns {Promise} Resolves after all level is completely loaded.
		 */
		onLoadingCompleted: function() {

			// Create hill background
			var imgHill = oAssetLoader.getResult("hill");
			var oHillProperties = {
				width : 1464,
				height : 768,
				y : canvasHeight - 768 + 80,
				alpha : 0.1
			};

			this._hill1 = new createjs.Bitmap(imgHill);
			Object.assign(this._hill1, oHillProperties, {x: 0});
			this.stage.addChild(this._hill1);

			this._hill2 = new createjs.Bitmap(imgHill);
			Object.assign(this._hill2, oHillProperties, {x : canvasWidth + 194})
			this.stage.addChild(this._hill2);


			// Create background skylines.
			var oBackgroundImages = {
				"1": "bgLasVegas",
				"2": "bgBarcelona",
				"3": "bgUI5",
				"4": "bgSkyline",
				"5": "bgWolkenkratzer",
				"6": "bgBaeume",
				"7": "bgSpinne"
			};

			var sBg = oBackgroundImages[random.getInt(1, 8).toString()];
			var imgSkyline = oAssetLoader.getResult(sBg);

			var oSkylineProperties = {
				width : 1238,
				height : 475,
				y : canvasHeight - 475 + 7,
				alpha : 0.5
			};

			this._skyline1 = new createjs.Bitmap(imgSkyline);
			this.stage.addChild(Object.assign(this._skyline1, oSkylineProperties, {x : 0}));

			this._skyline2 = new createjs.Bitmap(imgSkyline);
			this.stage.addChild(Object.assign(this._skyline2, oSkylineProperties, {x : canvasWidth}));


			//Create robot players.
			var fnCreatePlayerProperties = function(sRobotPrefix){
				return {
					spriteSheet: new createjs.SpriteSheet({
						framerate: 1,
						"images": ["Stay", "Fly", "FlyHit1", "FlyHit2", "FlyHit3",
							"FlyHit4", "StayHit1", "StayHit2", "StayHit3", "StayHit4"
						].map(function(value) {
							return oAssetLoader.getResult(sRobotPrefix + value);
						}),
						frames: {
							"height": 350,
							"count": 10,
							"width": 280,
							"regX": 90,
							"regY": 90
						},
						"animations": {
							"stay": [0, 0],
							"fly": [1, 1],
							"flyHit": [2, 5, "flyHit", 0.5],
							"stayHit": [6, 9, "stayHit", 0.5]
						}
					}),
					spriteSheetAnimation: "stay",
					gameObjectType: box2d.types.gameObjects.PLAYER,
					shapeType: box2d.types.shapes.POLYGON,
					width: 133,
					scaleX: 133 / 200,
					height: 200,
					scaleY: 200 / 300,
					y: 0,
					snapToPixel: true,
					mouseEnabled: false,
					density: 1,
					isStaticBody: false,
					hasBox2dBody: true,
					playerLvl: 1,
					directionChanges: 0
				};
			};

			var oPlayer1Properties = {
				x: 0,
				playerNumber: 1
			};
			this.spawnGameObject(Object.assign(oPlayer1Properties, fnCreatePlayerProperties("robotBlue")));

			var oPlayer2Properties = {
				x: canvasWidth - 133,
				playerNumber: 2
			};
			this.spawnGameObject(Object.assign(oPlayer2Properties, fnCreatePlayerProperties("robotRed")));

			// Create bomb indicators on top of the screen.
			var oBombProperties = {
				width : 256,
				height : 316,
				alpha : 1,
				scaleX : 0.4,
				scaleY : 0.4,
				y : 0
			};

			var bombIndicatorP1 = Object.assign(new createjs.Bitmap(oAssetLoader.getResult("bomb1")), oBombProperties, {x:5});
			this.stage.addChild(bombIndicatorP1);
			bombIndicatorP1.image = oAssetLoader.getResult("bomb" + this.oGame.getPlayerEnergySegment(1));

			var bombIndicatorP2 = Object.assign(new createjs.Bitmap(oAssetLoader.getResult("bomb1")), oBombProperties, {x: canvasWidth - 115});
			this.stage.addChild(bombIndicatorP2);
			bombIndicatorP2.image = oAssetLoader.getResult("bomb" + this.oGame.getPlayerEnergySegment(2));

			time.setInterval(function() {
				bombIndicatorP1.image = oAssetLoader.getResult("bomb" + this.oGame.getPlayerEnergySegment(1));
				bombIndicatorP2.image = oAssetLoader.getResult("bomb" + this.oGame.getPlayerEnergySegment(2));
			}.bind(this), 300);

			// Create background clouds.
			var clouds = new createjs.Bitmap(oAssetLoader.getResult("cloud"));
			clouds.y = -50;
			clouds.scaleX = 1.240234375;
			clouds.alpha = 0.5;
			this.stage.addChild(clouds);

			// Create flying phoenix dropping a control package.
			var phoenix = new createjs.Bitmap(oAssetLoader.getResult("phoenix"));
			phoenix.scaleX = -1;
			phoenix.regY = 250;
			phoenix.regX = 200;
			this.stage.addChild(phoenix);
			phoenix.visible = true;

			this.oGame.getSoundManager().play("Adlerschrei");
			time.setInterval(()=>{
				createjs.Tween.get(phoenix).to({
					guide: {
						path: [-400, -200, -200, -100,
							0, 0,
							200, 100,
							400, 200,
							600, 200,
							800, 100,
							1000, 0,
							1200, -200
						]
					}
				}, 6000);

				time.setTimeout(() => {
					this.spawnGameObject({
						gameObjectType: box2d.types.gameObjects.CONTROLPACKAGE,
						assetId: "phoenixGrey",
						width: 100,
						height: 100,
						scaleX: 100 / 933,
						scaleY: 100 / 974,
						regX: 933 / 2,
						regY: 974 / 2,
						x: canvasWidth / 2,
						y: 100,
						snapToPixel: true,
						mouseEnabled: false,
						density: 1,
						isStaticBody: false,
						hasBox2dBody: true,
						shapeType: box2d.types.shapes.CIRCLE
					});
				}, 4000);
			}, 10000);

			return this.oControlManager.updateAllControlImages().then(() => {
				createjs.Ticker.setFPS(30);
				// https://stackoverflow.com/questions/20340796/how-to-clear-createjs-code-and-canvas-completely
				// Tween.js is not re-initializing properly
				this.tickFn = this.tick.bind(this);
				createjs.Ticker.addEventListener("tick", this.tickFn);

				var aStartHoldingThrowingKey = [];

				var laserPlayer1Block = false;
				var laserPlayer2Block = false;

				var skinPlayer1 = box2d.playerSkin(0);
				var skinPlayer2 = box2d.playerSkin(1);

				// global event handlers to deregister in exit
				this.fnKeyDown = function(oEvent) {
					// For toggling the development debug mode
					function toggleFunction() {
						jQuery("#flush---game--page-canvas").toggleClass("display-none");
						jQuery("#debugCanvas").toggleClass("display-inline");
					}

					switch (oEvent.key) {
						case "a":
							playerMoveVecs[0][0] = -1;
							break;
						case "ArrowLeft":
							playerMoveVecs[1][0] = -1;
							break;
						case "d":
							playerMoveVecs[0][0] = 1;
							break;
						case "ArrowRight":
							playerMoveVecs[1][0] = 1;
							break;
						case "w":
							var skin = box2d.playerSkin(0);
							if (skin && !this.oGame.getSoundManager().isPlaying("Raketenduese")) {
								this.oGame.getSoundManager().play("Raketenduese", undefined, undefined, 0.7);
							}
							if (skin.recoveringFromHit) {
								skin.gotoAndPlay("flyHit");
							} else {
								skin.gotoAndPlay("fly");
							}
							playerMoveVecs[0][1] = -1;
							break;
						case "ArrowUp":
							var skin = box2d.playerSkin(1);
							if (skin && !this.oGame.getSoundManager().isPlaying("Raketenduese")) {
								this.oGame.getSoundManager().play("Raketenduese", undefined, undefined, 0.7);
							}
							if (skin.recoveringFromHit) {
								skin.gotoAndPlay("flyHit");
							} else {
								skin.gotoAndPlay("fly");
							}
							playerMoveVecs[1][1] = -1;
							break;
						case "s":
							playerMoveVecs[0][1] = 1;
							break;
						case "ArrowDown":
							playerMoveVecs[1][1] = 1;
							break;
						case "v":
							var skin = box2d.playerSkin(0);
							if (skin && !this._laserPlayer1Block) {
								this.spawnLaserParticle(1);
								this._laserPlayer1Block = true;
								time.setTimeout(function() {
									this._laserPlayer1Block = false;
								}.bind(this), 3000);
							}
							break;
						case "0":
							var skin = box2d.playerSkin(1);
							if (skin && !this._laserPlayer2Block) {
								this.spawnLaserParticle(2);
								this._laserPlayer2Block = true;
								time.setTimeout(function() {
									this._laserPlayer2Block = false;
								}.bind(this), 3000);
							}
							break;
						case "Enter":
							var skin = box2d.playerSkin(1);
							if (skin && !startLoadingTimes[1]) {
								this.oGame.getSoundManager().play("shootingCharge1");
								startLoadingTimes[1] = new Date();
								skin.arm.gotoAndPlay(2);
							}
							break;
						case " ": // space key
							var skin = box2d.playerSkin(0);
							if (skin && !startLoadingTimes[0]) {
								this.oGame.getSoundManager().play("shootingCharge2");
								startLoadingTimes[0] = new Date();
								skin.arm.gotoAndPlay(2);
							}
							break;
						case "t":
							toggleFunction();
							break;
					}
				}.bind(this);

				this.fnKeyUp = function(oEvent) {
					// The movement direction must only be resetted, if the opposing direction key isn't pressed.
					switch (oEvent.key) {
						case "a":
							playerMoveVecs[0][0] = playerMoveVecs[0][0] !== 1 ? 0 : 1;
							break;
						case "ArrowLeft":
							playerMoveVecs[1][0] = playerMoveVecs[1][0] !== 1 ? 0 : 1;
							break;
						case "d":
							playerMoveVecs[0][0] = playerMoveVecs[0][0] !== -1 ? 0 : -1;
							break;
						case "ArrowRight":
							playerMoveVecs[1][0] = playerMoveVecs[1][0] !== -1 ? 0 : -1;
							break;
						case "w":
							var skin = box2d.playerSkin(0);
							if (skin) {
								this.oGame.getSoundManager().stop("Raketenduese");
								if (skin.recoveringFromHit) {
									skin.gotoAndPlay("stayHit");
								} else {
									skin.gotoAndPlay("stay");
								}
							}
							playerMoveVecs[0][1] = playerMoveVecs[0][1] !== 1 ? 0 : 1;
							break;
						case "ArrowUp":
							var skin = box2d.playerSkin(1);
							if (skin) {
								this.oGame.getSoundManager().stop("Raketenduese");
								if (skin.recoveringFromHit) {
									skin.gotoAndPlay("stayHit");
								} else {
									skin.gotoAndPlay("stay");
								}
							}
							playerMoveVecs[1][1] = playerMoveVecs[1][1] !== 1 ? 0 : 1;
							break;
						case "s":
							playerMoveVecs[0][1] = playerMoveVecs[0][1] !== -1 ? 0 : -1;
							break;
						case "ArrowDown":
							playerMoveVecs[1][1] = playerMoveVecs[1][1] !== -1 ? 0 : -1;
							break;
						case "v":
							break;
						case "0":
							break;
						case "Enter":
							var skin = box2d.playerSkin(1);
							if (skin) {
								this.oGame.getSoundManager().stop("shootingCharge1");
								skin.arm.gotoAndPlay("default");
								this.throwControl(2, Date.now() - startLoadingTimes[1]);
								startLoadingTimes[1] = false;
							}
							break;
						case " ": // space key
							var skin = box2d.playerSkin(0);
							if (skin) {
								this.oGame.getSoundManager().stop("shootingCharge2");
								skin.arm.gotoAndPlay("default");
								this.throwControl(1, Date.now() - startLoadingTimes[0]);
								startLoadingTimes[0] = false;
							}
							break;
						case "b":
							var skin = box2d.playerSkin(0);
							if (skin) {
								this.throwBomb(1);
							}
							break;
						case ",":
							var skin = box2d.playerSkin(1);
							if (skin) {
								this.throwBomb(2);
							}
							break;
					}
				}.bind(this);
				// allow keyboard inputs
				document.addEventListener("keydown", this.fnKeyDown);
				document.addEventListener("keyup", this.fnKeyUp);

				setTimeout(() => {
					// throw an initial control to illustrate the game
					// (and fix the initial stuck bug once and for all!!!111!!11111)
					this.throwControl(1, 3000 / this._iDifficulty);
					this.throwControl(2, 3000 / this._iDifficulty);
				}, 1000);
			});
		},

		spawnGameObject: function(config) {
			var objSkin;

			if (config.spriteSheet) {
				objSkin = new createjs.Sprite(config.spriteSheet, config.spriteSheetAnimation);
			} else if (config.assetId) {
				objSkin = new createjs.Bitmap(oAssetLoader.getResult(config.assetId));
			} else if (config.control) {
				objSkin = new createjs.Bitmap();
				objSkin.image = config.control._image;
				time.setTimeout(() => {
					if (objSkin && objSkin.image) {
						objSkin.image = config.control._imageBlocked;
						objSkin.blocked = true;
					}
				}, 2000);
			}

			// important to set origin point to center of your bitmap
			if (config.regX) {
				objSkin.regX = config.regX;
			} else {
				objSkin.regX = parseInt(config.width / 2, 10);
			}
			if (config.regY) {
				objSkin.regY = config.regY;
			} else {
				objSkin.regY = parseInt(config.height / 2, 10);
			}

			// Extend objectSkin with config properties
			Object.keys(config).forEach(function(key) {
				objSkin[key] = config[key];
			});

			this.stage.addChild(objSkin);

			//TODO: Find better indicator for robot spawning
			if (config.spriteSheet) {
				var robotNamePreFix = "blue";
				if (config.playerNumber === 2) {
					robotNamePreFix = "red";
				}
				var robotArm = new createjs.SpriteSheet({
					framerate: 1,
					"images": [1, 2, 3, 4, 5, 6, 7, 8].map(function(i) {
						return oAssetLoader.getResult(robotNamePreFix + "Arm" + i);
					}),
					"frames": {
						"height": 150,
						"count": 8,
						"width": 200
					},
					"animations": {
						"default": [0, 0],
						"loading": [1, 7, "loading", 30.0]
					}
				});
				var robotArmSprite = new createjs.Sprite(robotArm, "default");
				robotArmSprite.scaleX = 0.66;
				robotArmSprite.scaleY = 0.66;

				this.stage.addChild(robotArmSprite);
				objSkin.arm = robotArmSprite;
			}

			// returns physic object
			if (config.hasBox2dBody === true) {
				return box2d.createGameObjectBodyAndActor(objSkin, this._iDifficulty);
			}

			// returns normal object
			return objSkin;
		},


		updateDirection: function(iActivePlayer, iOtherPlayer) {
			if (iActivePlayer.x >= iOtherPlayer.x) {
				iActivePlayer.direction = -1;
				iOtherPlayer.direction = 1;
			} else {
				iActivePlayer.direction = 1;
				iOtherPlayer.direction = -1;
			}
			// Direction change detection
			if ((iActivePlayer.playerNumber === 1 && (iActivePlayer.direction === 1 && iActivePlayer.scaleX < 0 ||
				iActivePlayer.direction === -1 && iActivePlayer.scaleX > 0)) ||
				(iActivePlayer.playerNumber === 2 && (iActivePlayer.direction === -1 && iActivePlayer.scaleX < 0 ||
					iActivePlayer.direction === 1 && iActivePlayer.scaleX > 0))
			) {
				iActivePlayer.scaleX *= -1;
				iActivePlayer.arm.scaleX *= -1;
				iActivePlayer.directionChanges += 1;
			}
		},

		throwControl: function(iPlayerNumber, iLoadedTimeInMs) {
			var aControls = this.oControlManager.getContent();
			//var oControl = aControls[Math.floor(Math.abs(Math.random()) * aControls.length)];
			var iNextControlNr = box2d.playerSkin(iPlayerNumber - 1).playerLvl;
			var oControl = aControls[iNextControlNr > aControls.length ? aControls.length - 1 : iNextControlNr - 1];

			var skinPlayer1 = box2d.playerSkin(0);
			var skinPlayer2 = box2d.playerSkin(1);
			var activePlayer = iPlayerNumber === 1 ? skinPlayer1 : skinPlayer2;
			var otherPlayer = iPlayerNumber === 1 ? skinPlayer2 : skinPlayer1;

			this.updateDirection(activePlayer, otherPlayer);

			if (!activePlayer.controlThrowingCooldown) {
				activePlayer.controlThrowingCooldown = true;
				time.setTimeout(function() {
					if (activePlayer) {
						activePlayer.controlThrowingCooldown = false;
					}
				}, 200);

				var x = activePlayer.x;
				var y = activePlayer.y;
				if (activePlayer.direction === -1) {
					x -= activePlayer.width / 2 + oControl._image.width;
					x - 10; //TODO: Remove this hack - fixes stuck at beginning
				}

				this.oGame.getSoundManager().play("Controlshot");

				this.spawnGameObject({
					gameObjectType: box2d.types.gameObjects.CONTROL,
					shapeType: box2d.types.shapes.POLYGON,
					control: oControl,
					width: oControl._image.width,
					height: oControl._image.height,
					x: x,
					y: y,
					snapToPixel: true,
					mouseEnabled: false,
					density: 1,
					isStaticBody: false,
					hasBox2dBody: true,
					direction: activePlayer.direction,
					createdBy: iPlayerNumber,
					createdAt: Date.now(),
					loadedTime: iLoadedTimeInMs
				});
			}
		},

		/**
		 * Throws a bomb that destroys all controls on the screen
		 * @param {int} iWho 1 for player1, 2 for player2
		 */
		throwBomb: function(iWho) {
			if (this.oGame.hasBombEnergy(iWho)) {
				box2d.applyBombEffect(this.oGame.getSoundManager());
				this.oGame.getSoundManager().play("shoot");
			} else {
				this.oGame.getSoundManager().play("badHit");
			}
			// TODO: Add fancy effect for bomb.
			this.oGame.bomb(iWho);
		},


		updateRobotArms: function() {
			box2d.playerSkin().forEach(function(playerSkin) {

				var iAnimationOffset = 0;
				if (playerSkin.currentAnimation === "flyHit" || playerSkin.currentAnimation === "stayHit") {
					playerSkin.arm.visible = false;
					return;
				} else if (playerSkin.currentAnimation === "fly") {
					iAnimationOffset = -15;
				}
				playerSkin.arm.visible = true;
				var iDirectionChangedRotation = 1;
				if (playerSkin.directionChanges % 2 === 1) {
					iDirectionChangedRotation = -1;
				}
				if (playerSkin.direction === 1) {
					playerSkin.arm.x = playerSkin.x - (70 * iDirectionChangedRotation);
					playerSkin.arm.y = playerSkin.y - 20 + iAnimationOffset;
				} else {
					playerSkin.arm.x = playerSkin.x - (70 * iDirectionChangedRotation);
					playerSkin.arm.y = playerSkin.y - 20 + iAnimationOffset;
				}
			});
		},

		/**
		 * The createjs tick loop is called every frame to update the scene.
		 * @param oEvent
		 */
		tick: function(oEvent) {
			var deltaS = oEvent.delta / 1000;
			this._skyline1.x = (this._skyline1.x - deltaS * 30);
			if (this._skyline1.x + this._skyline1.image.width * this._skyline1.scaleX <= 0) {
				this._skyline1.x = 1238;
			}
			if (this._skyline1.x <= -canvasWidth) {
				this._skyline1.x = 0;
			}
			this._skyline2.x = (this._skyline2.x - deltaS * 30);
			if (this._skyline2.x + this._skyline2.image.width * this._skyline2.scaleX <= 0) {
				this._skyline2.x = 1238;
			}
			if (this._skyline2.x <= 0) {
				this._skyline2.x = canvasWidth;
			}


			var deltaSP = oEvent.delta / 1000;
			this._hill1.x = (this._hill1.x - deltaSP * 60);
			if (this._hill1.x + this._hill1.image.width * this._hill1.scaleX <= 0) {
				this._hill1.x = 1464;
			}
			if (this._hill1.x <= -canvasWidth) {
				this._hill1.x = 0;
			}
			this._hill2.x = (this._hill2.x - deltaSP * 60);
			if (this._hill2.x + this._hill2.image.width * this._hill2.scaleX <= 0) {
				this._hill2.x = 1464;
			}
			if (this._hill2.x <= 0) {
				this._hill2.x = canvasWidth;
			}

			this.fnMove(playerMoveVecs, deltaS);

			box2d.update();
			if (this.stage) {
				this.updateRobotArms();
				this.stage.update();
			}
		},

		fnMove: function(aMoveVecs, deltaTimeSec) {
			aMoveVecs.forEach(function(aVec, iPlayerNumber) {
				//Check whether box2d bodies are ready
				var oPosBox2D = box2d.playerBody(iPlayerNumber).GetPosition();
				var oPlayerSkin = box2d.playerSkin(iPlayerNumber);
				if (oPosBox2D && oPosBox2D.x !== undefined && oPosBox2D.y !== undefined) {
					var xDiff = aVec[0],
						yDiff = aVec[1];
					var oVelocity = box2d.playerBody(iPlayerNumber).GetLinearVelocity();


					// constant speed in x direction
					oVelocity.x = xDiff * deltaTimeSec * 200;
					if (xDiff > 0) { //right direction
						oVelocity.x = Math.min(oVelocity.x, 10);
						if (iPlayerNumber === 0 && oPlayerSkin.x + oPlayerSkin.width / 2 > canvasWidth / 2) { // block player 1
							oVelocity.x = 0;
						}
					} else if (xDiff < 0) { //left direction
						oVelocity.x = Math.max(oVelocity.x, -10);
						if (iPlayerNumber === 1 && oPlayerSkin.x - oPlayerSkin.width / 2 < canvasWidth / 2) { // block player 2
							oVelocity.x = 0;
						}
					}
					if (xDiff === 0) {
						oVelocity.x = 0;
					}

					// acceleration in y direction
					oVelocity.y = oVelocity.y + yDiff * deltaTimeSec * 50;
					if (yDiff === 0 || oPlayerSkin.y <= 50 || oPlayerSkin.recoveringFromHit) {
						//slowing sinking robots
						oVelocity.y = 1;
					} else if (yDiff > 0) {
						oVelocity.y = Math.min(oVelocity.y, 10);
					} else if (yDiff < 0) {
						oVelocity.y = Math.max(oVelocity.y, -10);
					}
					if (jQuery.sap.getUriParameters().get("debug-move")){
						jQuery.sap.log("velocity x: " + oVelocity.x + ", velocity y:" + oVelocity.y + ", direction x:" + xDiff + ", direction y:" + yDiff);
					}
					box2d.playerBody(iPlayerNumber).SetFixedRotation(true);
					box2d.playerBody(iPlayerNumber).SetLinearVelocity(oVelocity);
				}
			});
		},


		spawnLaserParticle: function(iPlayerNumber) {
			//this.oGame.bomb(iPlayerNumber);
			var startTime = new Date().getTime();
			var shotTime;

			var skinP1 = box2d.playerSkin(0);
			var skinP2 = box2d.playerSkin(1);
			var activePlayer = iPlayerNumber === 1 ? skinP1 : skinP2;
			var otherPlayer = iPlayerNumber === 1 ? skinP2 : skinP1;
			this.updateDirection(activePlayer, otherPlayer);

			var laserInterval = time.setInterval(function() {
				shotTime = new Date().getTime();
				if ((shotTime - startTime) >= 1000 /* ms */ ) {
					clearInterval(laserInterval);
				} else {
					this.oGame.getSoundManager().play("laser");
					// create laser particle
					var oSettings = {
						assetId: iPlayerNumber === 1 ? "laser_blue" : "laser_red",
						gameObjectType: box2d.types.gameObjects.LASERPARTICLE,
						shapeType: box2d.types.shapes.POLYGON,
						width: 71.5,
						height: 67.5,
						x: activePlayer.direction === 1 ? activePlayer.x - 25 : activePlayer.x - 160,
						y: activePlayer.y - 50,
						regX: 0,
						regY: 33.75,
						snapToPixel: true,
						mouseEnabled: false,
						density: 1,
						isStaticBody: false,
						hasBox2dBody: true,
						direction: activePlayer.direction,
						createdBy: iPlayerNumber,
						createdAt: Date.now()
					};
					this.spawnGameObject(oSettings);
				}
			}.bind(this), 150);
		},

		/**
		 * Level cleanup
		 * @return {Promise} Resolved when the cleanup is completed
		 */
		exit: function() {

			return new Promise(function(fnResolve, fnReject) {
				// deregister canvas
				if (this.stage) {
					createjs.Tween.removeAllTweens();
					this.stage.removeAllChildren();
					// The removal of all eventlisteners somehow kills the phoenix flight, when starting the level for the 2nd time.
					// But not removing all event listeners leads to a crashing game, after some level starts.
					// createjs.Ticker.removeEventListener("tick", this.tickFn);
					createjs.Ticker.removeAllEventListeners();
					box2d.destroy();
					delete this.stage;
				}

				// Clean up all running timeouts and intervals.
				time.clearAll();

				// Remove all keyboard event listener.
				document.removeEventListener("keydown", this.fnKeyDown);
				document.removeEventListener("keyup", this.fnKeyUp);

				fnResolve();
			}.bind(this));
		},

		/**
		 * Sets the difficulty for this level
		 * @param {int} iDifficulty a difficulty value betweel 0 and 50
		 */
		setDifficulty: function(iDifficulty) {
			this._iDifficulty = Math.min(iDifficulty, 50);
		}

	});
});