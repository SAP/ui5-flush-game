/* global Box2D, createjs*/
sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/Device"
], function(UI5Object, Device) {
	"use strict";

	// TODO: why globals? refactor me
	var stage,
		canvasWidth,
		canvasHeight,
		assetLoader,
		canvas,
		debugCanvas,
		debugContext,
		myCursor,
		fnKeyDown,
		fnKeyUp,
		fnMouseDown,
		fnMouseMove,
		fnMouseUp;

	// MG: repair broken game - still relies on the globals
	var player,
		playerBody;

	var _bCampingWarningDisplayed = false;

	var SCALE = 30;
	var MOVEMENT_SCALE = 100;
	var KEYBOARD_FREQUENCY = 20;
	var MOUSE_FREQUENCY = 30;
	var TOUCH_FREQUENCY = 60;
	var VERTICAL_LIMIT = 6;
	var MOBILE_SCALE = (Device.system.phone ? 0.7 : 1);

	var _fnInitResolve;

	var _oGame;
	var _iDifficulty;


	var _iScoreCollisionTimeout;
	var _iScoreNoCollisionTimeout;
	var _iScoreCampingDetectionTimeout;
	var _iLastCollision;
	var _aLastHorizontalMovements = [];
	var _iLastMovement;
	var _iLastSignificantMovement;

	var controlDelayCounter = 3;
	var focused = true;

	var gameObjectTypes = {
		PLAYER: 1,
		PLAYERBOTTOM: 2,
		RENDERMANAGER: 3,
		CONTROL: 4
	};

	var shapeTypes = {
		POLYGON: 1,
		CIRCLE: 2
	};

	var box2dWorld;
	var box2dActors = [];

	var b2Vec2 = Box2D.Common.Math.b2Vec2;
	var b2BodyDef = Box2D.Dynamics.b2BodyDef;
	var b2Body = Box2D.Dynamics.b2Body;
	var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
	var b2World = Box2D.Dynamics.b2World;
	var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
	var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
	var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
	var b2ContactListener = Box2D.Dynamics.b2ContactListener;

	var gameObjects = {
		spawnGameObject: function(config, _playerBody, _player) {
			var objSkin;

			if (config.spriteSheet) {
				objSkin = new createjs.Sprite(config.spriteSheet, config.spriteSheetAnimation);
				objSkin.spriteSheetAnimation = config.spriteSheetAnimation;
			} else if (config.assetId) {
				objSkin = new createjs.Bitmap(assetLoader.getResult(config.assetId));
			} else if (config.control) {
				objSkin = new createjs.Bitmap();
				objSkin.image = config.control._image;
			}
			if (config.width) objSkin.width = config.width;
			if (config.height) objSkin.height = config.height;
			if (config.x) objSkin.x = config.x;
			if (config.y) objSkin.y = config.y;

			// important to set origin point to center of your bitmap
			if (config.regX) {
				objSkin.regX = config.regX;
			} else {
				objSkin.regX = parseInt(config.width / 2);
			}
			if (config.regY) {
				objSkin.regY = config.regY;
			} else {
				objSkin.regY = parseInt(config.height / 2);
			}

			if (config.scaleX) objSkin.scaleX = config.scaleX;
			if (config.scaleY) objSkin.scaleY = config.scaleY;

			if (config.control) objSkin.control = config.control;
			if (config.assetId) objSkin.assetId = config.assetId;
			if (config.snapToPixel) objSkin.snapToPixel = config.snapToPixel;
			if (config.mouseEnabled) objSkin.mouseEnabled = config.mouseEnabled;
			if (config.gameObjectType) objSkin.gameObjectType = config.gameObjectType;
			if (config.shapeType) objSkin.shapeType = config.shapeType;
			if (config.density) objSkin.density = config.density;
			if (config.isStaticBody) objSkin.isStaticBody = config.isStaticBody;

			if (config.gameObjectType == gameObjectTypes.PLAYER) {
				_player = objSkin;
				// MG: repair broken game - still relies on the globals
				player = _player
			}

			stage.addChild(objSkin);

			// returns physic object
			if (config.hasBox2dBody === true) {
				return box2d.createGameObjectBodyAndActor(objSkin, _playerBody);
			}

			// returns normal object
			return objSkin;
		}
	};

	var box2d = (function() {

		// important box2d scale and speed vars
		var WALLTHICKNESS = 1,
			STEP = 20,
			TIMESTEP = 1 / STEP;

		var lastTimestamp = Date.now();
		var fixedTimestepAccumulator = 0;

		var controlsToRemove = [];

		var controls = [];
		var longlifeGameObjects = [];
		var _bCollissionScoreEnabled = true;


		// box2d world setup and boundaries
		var setup = function() {
			box2dWorld = new b2World(new b2Vec2(0, 6), true);
			var debugDraw = new b2DebugDraw();
			//var b2WorldManifold;

			debugDraw.SetSprite(debugContext);
			debugDraw.SetDrawScale(SCALE);
			debugDraw.SetFillAlpha(0.7);
			debugDraw.SetLineThickness(1.0);
			debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
			box2dWorld.SetDebugDraw(debugDraw);

			var fnMove = function(aVec) {
				var x = aVec[0],
					y = aVec[1];

				if (Math.abs(playerBody.GetLinearVelocity().y) < 6 && playerBody.GetPosition().y > (Device.system.phone && Device.orientation.landscape ? VERTICAL_LIMIT / 2 : VERTICAL_LIMIT)) {
					playerBody.ApplyForce(new b2Vec2(0, y * MOVEMENT_SCALE * 5), playerBody.GetPosition());
					_iLastMovement = Date.now();

					// anti camping detection
					_aLastHorizontalMovements.push(playerBody.GetPosition().x);
					if (_aLastHorizontalMovements.length > 3) {
						var iDelta = 0;
						for (var i = 0; i < _aLastHorizontalMovements.length - 2; i++) {
							iDelta += _aLastHorizontalMovements[i + 1] - _aLastHorizontalMovements[i];
						}
						if (Math.abs(iDelta) > 2) {
							_iLastSignificantMovement = Date.now();
							_bCampingWarningDisplayed = false;
						}
					}
					if (_aLastHorizontalMovements.length > 10) {
						_aLastHorizontalMovements.shift();
					}
				}
				playerBody.ApplyForce(new b2Vec2(x * MOVEMENT_SCALE, x * MOVEMENT_SCALE), playerBody.GetPosition());
				playerBody.SetLinearDamping(0.5);
				playerBody.SetFixedRotation(true);

			};

			fnKeyDown = function(oEvent) {
				switch (oEvent.key) {
					case "ArrowLeft":
					case "a":
						this._movement[0] = -1;
						break;
					case "ArrowRight":
					case "d":
						this._movement[0] = 1;
						break;
					case "ArrowUp":
					case "w":
						if (!_oGame.getSoundManager().isPlaying("Raketenduese")) {
							_oGame.getSoundManager().play("Raketenduese", undefined, undefined, 0.5)
						}
						player.gotoAndPlay("fly");
						this._movement[1] = -1;
						break;
					case "ArrowDown":
					case "s":
						this._movement[0] = 1;
						break;
					case " ": // space key
						//fnSimulateClick("a");
						break;
					case "Enter":
						//fnSimulateClick("b");
						break;
				}

				// call move function until no movement or keyup event was triggered
				if (this._movement [0] || this._movement [1]) {
					clearInterval(this._iIntervalMove);
					this._iIntervalMove = setInterval(function () {
						fnMove(this._movement);
					}.bind(this), KEYBOARD_FREQUENCY);
				}

			}.bind(this);

			fnKeyUp = function(oEvent) {
				switch (oEvent.key) {
					case "ArrowLeft":
					case "a":
						this._movement[0] = 0;
						clearInterval(this._iIntervalMove);
						break;
					case "ArrowRight":
					case "d":
						this._movement[0] = 0;
						clearInterval(this._iIntervalMove);
						break;
					case "ArrowUp":
					case "w":
						_oGame.getSoundManager().stop("Raketenduese");
						player.gotoAndPlay("run");
						this._movement[1] = 0;
						clearInterval(this._iIntervalMove);
						break;
					case "ArrowDown":
					case "s":
						this._movement[0] = 0;
						clearInterval(this._iIntervalMove);
						break;
					case " ": // space key
						//fnSimulateClick("a");
						break;
					case "Enter":
						//fnSimulateClick("b");
						break;
				}
			}.bind(this);

			this.shakeMagnet = function() {
				if (!this._bShakeRunning) {
					this._bShakeRunning = true;
					createjs.Tween.get(myCursor)
						.to({scaleX: 1.2, scaleY: 1.2}, 50)
						.to({rotation: myCursor.rotation + 25, rotationDir: -1}, 50)
						.to({scaleX: 1, scaleY: 1}, 50)
						.to({rotation: myCursor.rotation}, 50)
						.to({scaleX: 0.8, scaleY: 0.8}, 50)
						.to({rotation: myCursor.rotation + 25, rotationDir: -1}, 50)
						.to({scaleX: 1, scaleY: 1}, 50)
						.to({rotation: myCursor.rotation}, 50);
					setTimeout(function () {
						this._bShakeRunning = false;
					}.bind(this), 400);
				}
			}.bind(this);

			// calculate a vector relative to the mouse event and the player
			this.calculateMouseMovement = function (oEvent) {
				var x = oEvent.offsetX || oEvent.targetTouches[0].clientX;
				var y = oEvent.offsetY || oEvent.targetTouches[0].clientY;

				if (x < player.x + 50) {
					this._movement[0] = -1;
				} else {
					this._movement[0] = 1;
				}
				if (y < player.y + 50) {
					this._movement[1] = -1;
					if (!_oGame.getSoundManager().isPlaying("Raketenduese")) {
						_oGame.getSoundManager().play("Raketenduese", undefined, undefined, 0.5)
					}
					player.gotoAndPlay("fly");
				} else {
					this._movement[1] = 1;
					_oGame.getSoundManager().stop("Raketenduese");
					player.gotoAndPlay("run");
				}
			}.bind(this);

			fnMouseDown = function (oEvent) {
				// limit the amount of processed events to one every 20ms
				if (this._bLastDownStillActive) {
					return;
				}
				setTimeout(function () {
					this._bLastDownStillActive = false;
				}.bind(this), 20);
				this._bLastDownStillActive = true;

				this._bMousePressed = true;

				this.shakeMagnet();
				this.calculateMouseMovement(oEvent);

				// call move function until no movement or keyup event was triggered
				if (this._movement [0] || this._movement [1]) {
					clearInterval(this._iIntervalMove);
					fnMove(this._movement);
					this._iIntervalMove = setInterval(function () {
						fnMove(this._movement);
					}.bind(this), (oEvent.targetTouches ? TOUCH_FREQUENCY : MOUSE_FREQUENCY));
				}
				if (!_oGame.getSoundManager().isPlaying("shootingCharge1")) {
					_oGame.getSoundManager().play("shootingCharge1");
				}
			}.bind(this);

			fnMouseMove = function (oEvent) {
				if (this._bMousePressed) {
					this.shakeMagnet();
					this.calculateMouseMovement(oEvent);
				}
			}.bind(this);

			fnMouseUp = function () {
				this._bMousePressed = false;
				clearInterval(this._iIntervalMove);
				this._movement = [0, 0];
				_oGame.getSoundManager().stop("shootingCharge1");
				_oGame.getSoundManager().stop("Raketenduese");
				player.gotoAndPlay("run");
			}.bind(this);

			this._movement = [0, 0];

			// sync keyboard
			document.addEventListener("keydown", fnKeyDown);
			document.addEventListener("keyup", fnKeyUp);

			// sync mouse
			canvas.addEventListener("mousedown", fnMouseDown);
			canvas.addEventListener("mousemove", fnMouseMove);
			canvas.addEventListener("mouseup", fnMouseUp);
			canvas.addEventListener("touchdown", fnMouseDown);
			canvas.addEventListener("touchmove", fnMouseDown);
			canvas.addEventListener("touchend", fnMouseUp);

			// sync mouse
			canvas.addEventListener("mousedown", fnMouseDown);
			canvas.addEventListener("mousemove", fnMouseMove);
			canvas.addEventListener("mouseup", fnMouseUp);
			canvas.addEventListener("touchdown", fnMouseDown);
			canvas.addEventListener("touchmove", fnMouseDown);
			canvas.addEventListener("touchend", fnMouseUp);

			// Collision Detection
			var oContactListener = new b2ContactListener();
			oContactListener.BeginContact = function(contact) {
				if (contact.GetFixtureA().m_body.m_userData &&
					contact.GetFixtureB().m_body.m_userData &&
					contact.GetFixtureA().m_body.m_userData.skin &&
					contact.GetFixtureB().m_body.m_userData.skin &&
					((contact.GetFixtureA().m_body.m_userData.skin.gameObjectType === gameObjectTypes.PLAYER &&
							!contact.GetFixtureA().m_userData &&
							contact.GetFixtureB().m_body.m_userData.skin.gameObjectType === gameObjectTypes.CONTROL) ||
						(contact.GetFixtureB().m_body.m_userData.skin.gameObjectType === gameObjectTypes.PLAYER &&
							!contact.GetFixtureB().m_userData &&
							contact.GetFixtureA().m_body.m_userData.skin.gameObjectType === gameObjectTypes.CONTROL))
				) {
					if (_bCollissionScoreEnabled) {
						_bCollissionScoreEnabled = false;
						_iScoreCollisionTimeout = setTimeout(function() {
							_bCollissionScoreEnabled = true;
						}, 500);
						_oGame.score(-100 * _iDifficulty / 10, [playerBody.GetPosition().x * SCALE + 25, playerBody.GetPosition().y * SCALE + 25]);
						_oGame.triggerEvent("Haha");
						_iLastCollision = Date.now();
					}
				}
			};
			box2dWorld.SetContactListener(oContactListener);

			// boundaries - floor_movement
			var floorFixture = new b2FixtureDef();
			floorFixture.density = 0.3;
			floorFixture.restitution = 0.5;
			floorFixture.shape = new b2PolygonShape();
			floorFixture.shape.SetAsBox(canvasWidth / SCALE, WALLTHICKNESS / SCALE);
			var floorBodyDef = new b2BodyDef();
			floorBodyDef.type = b2Body.b2_staticBody;
			floorBodyDef.position.x = 0;
			floorBodyDef.position.y = canvasHeight / SCALE;
			var floor = box2dWorld.CreateBody(floorBodyDef);
			floor.CreateFixture(floorFixture);

			// boundaries - left
			var leftFixture = new b2FixtureDef();
			leftFixture.shape = new b2PolygonShape();
			leftFixture.shape.SetAsBox(WALLTHICKNESS / SCALE, canvasHeight / SCALE);
			var leftBodyDef = new b2BodyDef();
			leftBodyDef.type = b2Body.b2_staticBody;
			leftBodyDef.position.x = 0;
			leftBodyDef.position.y = canvasHeight / SCALE;
			var left = box2dWorld.CreateBody(leftBodyDef);
			left.CreateFixture(leftFixture);
		};

		// actor object - this is responsible for taking the body's position and translating it to your easel display object
		var actorObject = function(body, skin) {
			this.body = body;
			this.skin = skin;
			this.update = function() { // translate box2d positions to pixels
				this.skin.rotation = this.body.GetAngle() * (180 / Math.PI);
				this.skin.x = this.body.GetWorldCenter().x * SCALE;
				this.skin.y = this.body.GetWorldCenter().y * SCALE;
			};
			box2dActors.push(this);
		};

		// create game object body shape and assign actor object
		var createGameObjectBodyAndActor = function(objSkin, _playerBody) {
			var fixture = new b2FixtureDef();

			fixture.density = objSkin.density; // Dichte
			fixture.restitution = 0.1;

			var bodyDef = new b2BodyDef();

			if (objSkin.shapeType === shapeTypes.POLYGON) {
				fixture.shape = new b2PolygonShape();
				if (objSkin.gameObjectType === gameObjectTypes.PLAYER) {
					fixture.shape.SetAsBox(objSkin.width / SCALE / 2, (objSkin.height - 30) / SCALE / 2);
				} else {
					fixture.shape.SetAsBox(objSkin.width * MOBILE_SCALE / SCALE / 2, objSkin.height * MOBILE_SCALE / SCALE / 2);
				}
				bodyDef.position.x = (objSkin.x + (objSkin.width / 2)) / SCALE; // (0/0) im Canvas
				bodyDef.position.y = (objSkin.y + (objSkin.height / 2)) / SCALE; // (0/0) im Canvas
			}

			if (objSkin.shapeType == shapeTypes.CIRCLE) {
				// Currently only because of birds which use a circle to roll like a circle
				// REQUIRED: objSkin.width and objSkin.height are the same
				fixture.shape = new b2CircleShape(objSkin.width / 2 / SCALE);
				bodyDef.position.x = objSkin.x / SCALE;
				bodyDef.position.y = objSkin.y / SCALE;
			}

			if (objSkin.isStaticBody === true) {
				bodyDef.type = b2Body.b2_staticBody;
			} else {
				bodyDef.type = b2Body.b2_dynamicBody;
			}

			var body = box2dWorld.CreateBody(bodyDef);
			body.skin = objSkin;

			if (objSkin.gameObjectType === gameObjectTypes.PLAYER) {
				_playerBody = body;
				// MG: repair broken game - still relies on the globals
				playerBody = _playerBody;
			}

			if (objSkin.gameObjectType === gameObjectTypes.PLAYER) {
				var fixtureBottom = new b2FixtureDef();
				fixtureBottom.density = objSkin.density; // Dichte
				fixtureBottom.restitution = 0.1;
				fixtureBottom.shape = new b2PolygonShape();
				fixtureBottom.shape.SetAsOrientedBox(objSkin.width / SCALE / 2, 1 / SCALE / 2, new b2Vec2(0, objSkin.height / 2 / SCALE));
				fixtureBottom.userData = true;
				body.CreateFixture(fixtureBottom);
			}

			var fixtureReturn = body.CreateFixture(fixture);
			fixtureReturn.skin = objSkin;

			if (objSkin.gameObjectType === gameObjectTypes.CONTROL) {
				var iEvilFactor = 2 * _iDifficulty / 10;
				var iRandomFactor = Math.random() * iEvilFactor + 1.5;
				body.ApplyImpulse(new b2Vec2(-4 * body.m_mass * iRandomFactor * MOBILE_SCALE, -4.3 * body.m_mass * iRandomFactor * 0.6 * MOBILE_SCALE * MOBILE_SCALE), body.GetPosition()); // impulse, position
			}

			// assign actor
			var actor = new actorObject(body, objSkin);
			body.SetUserData(actor); // set the actor as user data of the body so we can use it later: body.GetUserData()

			if (objSkin.gameObjectType === gameObjectTypes.CONTROL || objSkin.assetId === "ALVTable") {
				controls.push(body);
			} else {
				longlifeGameObjects.push(body);
			}

			return body;
		};

		// remove actor and it's skin object
		var removeActor = function(actor) {
			if (actor) {
				stage.removeChild(actor.skin);
				box2dActors.splice(box2dActors.indexOf(actor), 1);
			}
		};

		// box2d update function. delta time is used to avoid differences in simulation if frame rate drops
		var update = function() {
			var now = Date.now();
			var dt = now - lastTimestamp;
			fixedTimestepAccumulator += dt;
			lastTimestamp = now;
			while (fixedTimestepAccumulator >= STEP) {
				// remove bodies before world timestep
				for (var i = 0, l = controlsToRemove.length; i < l; i++) {
					removeActor(controlsToRemove[i].GetUserData());
					controlsToRemove[i].SetUserData(null);
					box2dWorld.DestroyBody(controlsToRemove[i]);
				}
				controlsToRemove = [];

				// update active actors
				for (var i = 0, l = box2dActors.length; i < l; i++) {
					box2dActors[i].update();
				}

				box2dWorld.Step(TIMESTEP, 10, 10);

				fixedTimestepAccumulator -= STEP;
				box2dWorld.ClearForces();
				box2dWorld.m_debugDraw.m_sprite.graphics.clear();
				box2dWorld.DrawDebugData();
				if (controls.length > 30) {
					controlsToRemove.push(controls[0]);
					controls.splice(0, 1);
				}
			}
		};

		var pauseResume = function(p) {
			if (p) {
				TIMESTEP = 0;
			} else {
				TIMESTEP = 1 / STEP;
			}
			lastTimestamp = Date.now();
		};
		return {
			setup: setup,
			update: update,
			createGameObjectBodyAndActor: createGameObjectBodyAndActor,
			pauseResume: pauseResume
		};
	})();

	return UI5Object.extend("flush.game.levels.Uncontrollable", {

		/**
		 * Connect the game and the canvas to the level
		 * @param {flush.game.controls.Game} oGame the global game object.
		 * @param {Object} aCanvas First element is the game canvas, second element is the game debug canvas.
		 */
		constructor: function(oGame, aCanvas, oControlManager) {
			_oGame = oGame;
			this._oCanvas = aCanvas[0];
			this._oDebugCanvas = aCanvas[0];
			this._oControlManager = oControlManager;
		},

		/**
		 * The createjs tick loop is called every frame to update the scene
		 * @param oEvent
		 */
		tick: function(oEvent) {
			// remove 1 value a frame from the camping detection array
			if (Math.random() < 0.1) {
				_aLastHorizontalMovements.shift();
			}

			if (focused) {
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

				box2d.update();
				stage.update();

				controlDelayCounter++;
				var iEvilFactor = Math.floor(60 - _iDifficulty * 2);
				if (controlDelayCounter % iEvilFactor === 0) {
					controlDelayCounter = 0;

					var aControls = this._oControlManager.getContent();
					var oControl = aControls[Math.floor(Math.abs(Math.random()) * aControls.length)];

					if (Device.system.phone) {
						// skip large calendar control and reduce the amount of large tiles on phone
						while (oControl.getMetadata().getName() === "sap.ui.unified.Calendar"  || oControl.getMetadata().getName() === "sap.m.GenericTile" && Math.random() * 2 < 1.3) {
							oControl = aControls[Math.floor(Math.abs(Math.random()) * aControls.length)];
						}
					}

					_oGame.getSoundManager().play("Controlshot");

					// Let the renderManager throw controls
					gameObjects.spawnGameObject({
						gameObjectType: gameObjectTypes.CONTROL,
						shapeType: shapeTypes.POLYGON,
						control: oControl,
						width: oControl._image.width,
						height: oControl._image.height,
						scaleX: MOBILE_SCALE,
						scaleY: MOBILE_SCALE,
						x: canvasWidth,
						y: canvasHeight - (Device.system.phone ? 200 : 300),
						snapToPixel: true,
						mouseEnabled: false,
						density: 1,
						isStaticBody: false,
						hasBox2dBody: true
					}, this._playerBody, this._player);
				}
			}

			myCursor.x = stage.mouseX;
			myCursor.y = stage.mouseY;

			// stay on stage
			myCursor.x = Math.max(0, myCursor.x);
			myCursor.x = Math.min(myCursor.x, canvas.width - 75);
			myCursor.y = Math.max(0, myCursor.y);
			myCursor.y = Math.min(myCursor.y, canvas.height - 75);

			// hide magnet if player is only using keyboard
			if (stage.mouseX === 0 && stage.mouseY === 0) {
				myCursor.x = -200;
				myCursor.y = -200;
			}

			// rotate towards player
			var deltaX = player.x + 50 - myCursor.x - 50;
			var deltaY = player.y + 75 - myCursor.y - 80;
			myCursor.rotation = Math.atan2(deltaX, deltaY * -1) * 180 / Math.PI;

			stage.setChildIndex(myCursor, stage.getNumChildren() - 1);
		},

		/**
		 * drops a super-heave ALV table on the hero's head as a camping penalty
		 */
		dropTable: function() {
			// destroy previous table if it still exists
			if (this._oALVTable) {
				if (this._oALVTable.GetUserData()) {
					stage.removeChild(this._oALVTable.GetUserData().skin);
					box2dActors.splice(box2dActors.indexOf(this._oALVTable.GetUserData()), 1);
				}
				this._oALVTable.SetUserData(null);
				box2dWorld.DestroyBody(this._oALVTable);
			}

			this._oALVTable = gameObjects.spawnGameObject({
				assetId: "ALVTable",
				shapeType: shapeTypes.POLYGON,
				width: 500,
				height: 373,
				scaleX: MOBILE_SCALE,
				scaleY: MOBILE_SCALE,
				x: playerBody.GetPosition().x * SCALE - 250,
				y: (canvasHeight - 800),
				snapToPixel: true,
				mouseEnabled: false,
				density: 15,
				isStaticBody: false,
				hasBox2dBody: true
			}, this._playerBody, this._player);
			this._oALVTable.ApplyImpulse(new b2Vec2(Math.random() * 5, 10), this._oALVTable.GetPosition());
		},

		/**
		 * Resources and variables setup
		 * @return {Promise} Resolved when the init is completed
		 */
		init: function() {
			return new Promise(function(fnResolve, fnReject) {
				_fnInitResolve = fnResolve;

				canvas = this._oCanvas.getDomRef();
				debugCanvas = this._oDebugCanvas.getDomRef();
				debugContext = debugCanvas.getContext("2d");

				createjs.MotionGuidePlugin.install();

				stage = new createjs.Stage(canvas);
				createjs.Touch.enable(stage);
				stage.snapPixelsEnabled = true;

				canvasWidth = this._oCanvas.$().width();
				canvasHeight = this._oCanvas.$().height();

				box2d.setup();

				// score points per interval when no collision has happened
				var fnScoreInterval = function() {
					_iScoreNoCollisionTimeout = setTimeout(function() {
						var iCollisionDelta = Date.now() - _iLastCollision;
						var iLastMovementDelta = Date.now() - _iLastMovement;
						iCollisionDelta = Math.floor(iCollisionDelta / 1000);
						iLastMovementDelta = Math.floor(iLastMovementDelta / 1000);

						if (iLastMovementDelta < 3 && iCollisionDelta > 0) {
							_oGame.score(Math.max(10, iCollisionDelta * 100 * _iDifficulty / 20), [playerBody.GetPosition().x * SCALE - 25, playerBody.GetPosition().y * SCALE + 25]);
							_oGame.triggerEvent("Awesome");
						}
						fnScoreInterval();
					}, 3000);
				};

				_iLastMovement = Date.now() - 3000;
				_iLastCollision = Date.now() + 3000;
				fnScoreInterval();

				var fnCampingInterval = function() {
					_iScoreCampingDetectionTimeout = setTimeout(function() {
						var iLastMovementDelta = (Date.now() - _iLastSignificantMovement) / 1000;

						// show last warning
						if (iLastMovementDelta > 3 && !_bCampingWarningDisplayed) {
							_oGame.triggerEvent("PointsCritical", "Move!", [playerBody.GetPosition().x * SCALE - 25, playerBody.GetPosition().y * SCALE + 25]);
							_bCampingWarningDisplayed = true;
						}

						// deduct anti cheating penalty and get crushed
						if (iLastMovementDelta > 6) {
							setTimeout(function() {
								_oGame.score(-1000, [playerBody.GetPosition().x * SCALE - 25, playerBody.GetPosition().y * SCALE + 25]);
								_oGame.triggerEvent("Ohno");

								// 5 seconds safety delay
								_iLastSignificantMovement = Date.now() + 5000;
								_bCampingWarningDisplayed = false;
							}, 1000);

							this.dropTable();
							_oGame.getSoundManager().play("devil");
							_oGame.getSoundManager().play("shoot");
						}

						fnCampingInterval();
					}.bind(this), 3000);
				}.bind(this);

				_iLastSignificantMovement = Date.now() + 10000;
				fnCampingInterval();

				var sAssetPath = sap.ui.require.toUrl("flush/game/levels/Uncontrollable/assets");
				assetLoader = new createjs.LoadQueue(false);
				assetLoader.on("complete", this.onLoadingCompleted, this);
				assetLoader.crossOrigin = "";
				assetLoader.loadFile({
					id: "robot",
					src: sAssetPath + "/robo.png"
					//src: sAssetPath + "/roboXmas.png"
				});
				assetLoader.loadFile({
					id: "skyline",
					src: sAssetPath + "/skyline.png"
				});
				assetLoader.loadFile({
					id: "playerSprite",
					src: sAssetPath + "/spritesheet_CodiFaehrtUndSpringt.png"
				});
				assetLoader.loadFile({
					id: "phoenix",
					src: sAssetPath + "/phoenix.png"
				});
				assetLoader.loadFile({
					id: "cloud",
					src: sAssetPath + "/clouds.png"
				});
				assetLoader.loadFile({
					id: "hill",
					src: sAssetPath + "/hill.png"
				});
				assetLoader.loadFile({
					id: "ALVTable",
					src: sAssetPath + "/ALVTable.png"
				});
				assetLoader.loadFile({
					id: "magnet",
					src: sAssetPath + "/magnet.png"
				});
			}.bind(this));
		},

		/**
		 * Initial level setup after all resources are loaded
		 */
		onLoadingCompleted: function() {
			// https://stackoverflow.com/questions/20340796/how-to-clear-createjs-code-and-canvas-completely
			// Tween.js is not re-initializing properly
			createjs.Ticker.addEventListener("tick", createjs.Tween);
			this._hill1 = new createjs.Bitmap(assetLoader.getResult("hill"));
			this._hill1.width = 1464;
			this._hill1.height = 768;
			this._hill1.alpha = 0.1;
			//this._hill1.scaleX = 1.152;
			this._hill1.x = 0;
			this._hill1.y = canvasHeight - this._hill1.height + 80;
			stage.addChild(this._hill1);

			this._hill2 = new createjs.Bitmap(assetLoader.getResult("hill"));
			this._hill2.width = 1464;
			this._hill2.height = 768;
			this._hill2.alpha = 0.1;
			//this._hill2.scaleX = 1.152;
			this._hill2.x = canvasWidth + 194;
			this._hill2.y = canvasHeight - this._hill2.height + 80;
			stage.addChild(this._hill2);

			// Background image
			this._skyline1 = new createjs.Bitmap(assetLoader.getResult("skyline"));
			this._skyline1.width = 1238;
			this._skyline1.height = 475;
			this._skyline1.alpha = 0.3;
			this._skyline1.x = 0;
			this._skyline1.y = canvasHeight - this._skyline1.height + 7;
			stage.addChild(this._skyline1);

			this._skyline2 = new createjs.Bitmap(assetLoader.getResult("skyline"));
			this._skyline2.width = 1238;
			this._skyline2.height = 475;
			this._skyline2.alpha = 0.3;
			this._skyline2.x = canvasWidth;
			this._skyline2.y = canvasHeight - this._skyline2.height + 7;
			stage.addChild(this._skyline2);

			myCursor = new createjs.Bitmap(assetLoader.getResult("magnet"));
			myCursor.regX = 52;
			myCursor.regY = 83;

			myCursor.mouseEnabled = false;
			stage.addChild(myCursor);

			// Spawn player
			gameObjects.spawnGameObject({
				spriteSheet: new createjs.SpriteSheet({
					framerate: 1,
					"images": [assetLoader.getResult("playerSprite")],
					"frames": {
						"height": 153,
						"count": 28,
						"width": 99,
						spacing: 10
					},
					// define two animations, run (loops, 1.5x speed) and jump (returns to run):
					"animations": {
						"run": [0, 0, "stay", 1.5],
						"jump": [20, 26],
						"fly": [27, 27]
					}
				}),
				spriteSheetAnimation: "run",
				gameObjectType: gameObjectTypes.PLAYER,
				shapeType: shapeTypes.POLYGON,
				width: "99",
				height: "143",
				x: 100,
				y: canvasHeight - 2000,
				snapToPixel: true,
				mouseEnabled: false,
				density: 1,
				isStaticBody: false,
				hasBox2dBody: true
			});

			// RenderManager
			this._robot = new createjs.Bitmap(assetLoader.getResult("robot"));
			this._robot.x = canvasWidth - 186;
			this._robot.y = canvasHeight - 143;
			stage.addChild(this._robot);

			// Flying phoenix
			var phoenix = new createjs.Bitmap(assetLoader.getResult("phoenix"));
			phoenix.scaleX = -1;
			phoenix.regY = 250;
			phoenix.regX = 200;
			stage.addChild(phoenix);
			createjs.Tween.get(phoenix).to({
				guide: {
					path: [-200, -200, 0, 200, 400, 200, 600, 200, 800, -200]
				}
			}, 7000);

			// clouds
			var clouds = new createjs.Bitmap(assetLoader.getResult("cloud"));
			clouds.y = -50;
			clouds.scaleX = 1.240234375;
			clouds.alpha = 0.5;
			stage.addChild(clouds);

			this._oControlManager.updateAllControlImages().then(function() {
				createjs.Ticker.setFPS(30);
				createjs.Ticker.addEventListener("tick", this.tick.bind(this));

				// level is now loaded
				_fnInitResolve();
				_oGame.getSoundManager().play("Adlerschrei");
			}.bind(this));
		},

		/**
		 * Level cleanup
		 * @return {Promise} Resolved when the cleanup is completed
		 */
		exit: function() {
			return new Promise(function(fnResolve, fnReject) {
				// deregister canvas
				if (stage) {
					stage.removeAllChildren();
					createjs.Ticker.removeAllEventListeners();
					createjs.Tween.removeAllTweens();
					stage = null;
				}
				// remove score timeouts
				clearTimeout(_iScoreCollisionTimeout);
				clearTimeout(_iScoreNoCollisionTimeout);
				clearTimeout(_iScoreCampingDetectionTimeout);
				// remove event listeners
				document.removeEventListener("keydown", fnKeyDown);
				document.removeEventListener("keyup", fnKeyUp);
				canvas.removeEventListener("mousedown", fnMouseDown);
				canvas.removeEventListener("mousemove", fnMouseMove);
				canvas.removeEventListener("mouseup", fnMouseUp);
				canvas.removeEventListener("touchdown", fnMouseDown);
				canvas.removeEventListener("touchmove", fnMouseMove);
				canvas.removeEventListener("touchend", fnMouseUp);

				fnResolve();
			}.bind(this));
		},

		/**
		 * Sets the difficulty for this level
		 * @param {int} iDifficulty a difficulty value betweel 0 and 50
		 */
		setDifficulty: function(iDifficulty) {
			_iDifficulty = Math.min(iDifficulty, 50);
		}
	});
});