sap.ui.define([
	"sap/ui/base/Object"
], function (UI5Object) {
	"use strict";

	/* globals needed for this level */
	var w, h, loader, stage;
	var b2d = {
		b2Vec2: Box2D.Common.Math.b2Vec2,
		b2BodyDef: Box2D.Dynamics.b2BodyDef,
		b2Body: Box2D.Dynamics.b2Body,
		b2FixtureDef: Box2D.Dynamics.b2FixtureDef,
		b2Fixture: Box2D.Dynamics.b2Fixture,
		b2World: Box2D.Dynamics.b2World,
		b2MassData: Box2D.Collision.Shapes.b2MassData,
		b2PolygonShape: Box2D.Collision.Shapes.b2PolygonShape,
		b2CircleShape: Box2D.Collision.Shapes.b2CircleShape,
		b2DebugDraw: Box2D.Dynamics.b2DebugDraw
	};

	var constructorLoaded = false;
	var initLoaded = false;

	var KEYBOARD_STEP = 25;
	var KEYBOARD_FREQUENCY = 20;
	var WORLD_SCALE = 32;
	var SCALE = 0.7;
	var ballDefs, spriteSheet, ballsToRemove, count, world;

	return UI5Object.extend("flush.game.levels.PlopARobot", {

		/**
		 * Connect the game and the canvas to the level
		 * @param {flush.game.controls.Game} oGame the global game object
		 * @param {Object} aCanvas First element is the game canvas, second element is the game debug canvas.
		 */
		constructor: function(oGame, aCanvas, oControlManager) {
			if (constructorLoaded === false) {
				constructorLoaded = true;
				this._oGame = oGame;
				this._oCanvas = aCanvas[0];
				this._oControlManager = oControlManager;

				this._boundKeyDown = this._fnKeyDown.bind(this);
				this._boundKeyUp = this._fnKeyUp.bind(this);
				this._keyboardInputX = 0;
				this._keyboardInputY = 0;
			}
		},

		/**
		 * Resources and variables setup
		 * @return {Promise} Resolved when the init is completed
		 */
		init: function() {
			return new Promise(function(fnResolve) {
				this._fnInitResolve = fnResolve;
				if (constructorLoaded === true && initLoaded === false) {
					initLoaded = true;
					var manifest = [
						{src: "CodiBlau.png", id: "codi0"},
						{src: "CodiGruen.png", id: "codi1"},
						{src: "CodiLila.png", id: "codi2"},
						{src: "CodiOrange.png", id: "codi3"},
						{src: "RenderManagerRot.png", id: "render0"},
						//{src: "RenderManagerRotXmas.png", id: "render1"},
						{src: "hammer.png", id: "hammer"}
					];

					loader = new createjs.LoadQueue(false);
					loader.addEventListener("complete", this.onLoadingCompleted.bind(this));
					loader.loadManifest(manifest, true, sap.ui.require.toUrl("flush/game/levels/PlopARobot/assets") + "/");

					// grab canvas width and height for later calculations:
					w = this._oCanvas.$().width();
					h = this._oCanvas.$().height();

					// sync keyboard
					document.addEventListener("keydown",this._boundKeyDown);
					document.addEventListener("keyup", this._boundKeyUp);
				}
			}.bind(this));
		},

		/**
		 * Box2d setup
		 */
		setupPhysics: function() {
			world = new b2d.b2World(new b2d.b2Vec2(0, 20), true);

			// ground
			var fixDef = new b2d.b2FixtureDef();
			fixDef.density = 1;
			fixDef.friction = 0.5;
			fixDef.restitution = 0;
			fixDef.shape = new b2d.b2PolygonShape();
			fixDef.shape.SetAsBox(w / WORLD_SCALE * 0.6, 10 / WORLD_SCALE);

			var bodyDef = new b2d.b2BodyDef();
			bodyDef.type = b2d.b2Body.b2_staticBody;
			bodyDef.position.x = w / 2 / WORLD_SCALE;
			bodyDef.position.y = (h + 10) / WORLD_SCALE;

			world.CreateBody(bodyDef).CreateFixture(fixDef);
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
		setDifficulty : function (iDifficulty) {
			this._iDifficulty = Math.min(iDifficulty, 50);
			this._difficultyFactor = 0.2 + 0.7 / iDifficulty;
		},

		/**
		 * Initial level setup after all resources are loaded
		 */
		onLoadingCompleted: function() {
			stage = new createjs.Stage(this._oCanvas.getId());
			createjs.Touch.enable(stage);
			stage.autoClear = false;
			stage.alpha = 1;

			setTimeout(function () {
				constructorLoaded = false;
				initLoaded = false;
			}, 3000);

			ballsToRemove = [];
			count = 0;

			// Tween.js is not re-initializing properly
			// https://stackoverflow.com/questions/20340796/how-to-clear-createjs-code-and-canvas-completely
			createjs.Ticker.addEventListener("tick", createjs.Tween);

			this.myCursor = new createjs.Bitmap(loader.getResult("hammer"));
			this.myCursor.mouseEnabled = false;
			stage.addChild(this.myCursor);

			// center mouse position initially
			stage.mouseX = this._oCanvas.$().width() / 2;
			stage.mouseY = this._oCanvas.$().height() / 2 ;

			stage.addChild(new createjs.Shape()).graphics.beginFill("#5C89A1").drawRect(0, 0, w, h);

			// set up defs:
			var builder = new createjs.SpriteSheetBuilder();
				var mc = new lib.Balls();
			mc.actionsEnabled = false;
			mc.circle.visible = false;
			builder.addMovieClip(mc, null, SCALE);
			spriteSheet = builder.build();

			ballDefs = [];
			for (var i = 0, l = spriteSheet.getNumFrames(); i < l; i++) {
				mc.gotoAndStop(i);
				ballDefs.push({
					frame: i,
					radius: mc.circle.scaleX * 100 * SCALE / 2
				});
			}

			this.setupPhysics();

			createjs.Ticker.setFPS(30);
			createjs.Ticker.useRAF = true;
			createjs.Ticker.timingMode = createjs.Ticker.RAF;

			// update control manager
			this._oControlManager.updateAllControlImages().then(function () {
				createjs.Ticker.addEventListener("tick", this.tick.bind(this));
			}.bind(this));

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
				this.boom();
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
		_hammered: function() {
			createjs.Tween.get(this.myCursor)
				.to({rotation: 60, rotationDir: -1}, 100)
				.to({rotation: 30}, 100)
				.to({rotation: 10, rotationDir: -1}, 100);
		},

		/**
		 * The createjs tick loop is called every frame to update the scene
		 * @param oEvent
		 */
		tick: function(oEvent) {
			world.Step(oEvent.delta / 1000, 10, 10);

			if (count++ % 2 == 0 && world.GetBodyCount() < w * h / (125 * 125) / (SCALE * SCALE)) { // 125*125 == average unscaled area of a ball
				this.resetBall(this.addBall(0));
			}

			for (var body = world.GetBodyList(); body; body = body.GetNext()) {
				var ball = body.userData;
				if (!ball) {
					continue;
				}
				var pt = body.GetPosition();
				var sprite = ball.sprite;
				sprite.x = pt.x * WORLD_SCALE;
				sprite.y = pt.y * WORLD_SCALE;
				sprite.rotation = body.GetAngle() / Math.PI * 180;
				if (ball.type != 0) {
					sprite.alpha -= 0.03;
				}
				if (sprite.y > h || sprite.x < -ball.radius * 1.5 || sprite.x > w + ball.radius * 1.5 || sprite.alpha <= 0) {
					this.resetBall(ball);
				}
			}

			this.removeBalls();

			// only change cursor position if mouse moved to allow keyboard control
			// x coordinate
			if (this._previousMouseX !== stage.mouseX) {
				this.myCursor.x = stage.mouseX - 120;
			} else {
				this.myCursor.x += this._keyboardInputX;
				this._keyboardInputX = 0;
			}
			// y coordinate
			if (this._previousMouseY !== stage.mouseY) {
				this.myCursor.y = stage.mouseY - 80;
			} else {
				this.myCursor.y += this._keyboardInputY;
				this._keyboardInputY = 0;
			}
			this._previousMouseX = stage.mouseX;
			this._previousMouseY = stage.mouseY;

			// stay on stage
			this.myCursor.x = Math.max(0, this.myCursor.x);
			this.myCursor.x = Math.min(this.myCursor.x, this._oCanvas.$().width() - 75);
			this.myCursor.y = Math.max(0, this.myCursor.y);
			this.myCursor.y = Math.min(this.myCursor.y, this._oCanvas.$().height() - 75);

			stage.setChildIndex(this.myCursor, stage.getNumChildren()-1);

			stage.update(oEvent);
		},

		/**
		 * Add a new object to the canvas
		 * @param {int} type the type of object to be created
		 * @param {float} scale the scale factor
		 * @return {{def: any, fixDef: (any|b2FixtureDef), bodyDef: (any|b2BodyDef), body: any, sprite: any, radius: number, type: any}}
		 */
		addBall: function(type, scale) {
			scale = scale || 1;
			var iEvilFactor = Math.max(this._iDifficulty / 10, 1) * 0.75;
			scale *= 1/iEvilFactor;
			var def = ballDefs[Math.random() * 2 + type * 2 | 0];
			var radius = def.radius * SCALE * scale;

			// physics:
			var fixDef = new b2d.b2FixtureDef();
			fixDef.density = 0.1;
			fixDef.friction = 0.5;
			fixDef.restitution = 0.6;
			fixDef.shape = new b2d.b2CircleShape(def.radius / WORLD_SCALE);

			var bodyDef = new b2d.b2BodyDef();
			bodyDef.type = b2d.b2Body.b2_dynamicBody;

			var body = world.CreateBody(bodyDef);
			body.CreateFixture(fixDef);

			var sprite;
			if (type <= 1) {
				if (Math.random() < this._difficultyFactor) {
					var iEvilIndex = Math.floor(Math.random() * 2 * Math.max(this._iDifficulty / 10, 1));
					sprite = new createjs.Bitmap(loader.getResult("render" + iEvilIndex));
				} else if(Math.random() < 0.3) {
					var aControls =  this._oControlManager.getContent();
					var oControl = aControls[Math.floor(Math.abs(Math.random()) * aControls.length)];
					sprite = new createjs.Bitmap(oControl._image);
				} else {
					var iGoodIndex = Math.floor(Math.random() * 4 * Math.max(this._iDifficulty / 10, 1));
					sprite = new createjs.Bitmap(loader.getResult("codi" + iGoodIndex));
				}
			} else {
				sprite = new createjs.Sprite(spriteSheet);
				sprite.gotoAndStop(def.frame);
			}
			sprite.scaleX = sprite.scaleY = scale;
			if (type === 0) {
				sprite.addEventListener("mousedown", this.boom.bind(this));
			}
			stage.addChild(sprite);

			var ball = {
				def: def,
				fixDef: fixDef,
				bodyDef: bodyDef,
				body: body,
				sprite: sprite,
				radius: radius,
				type: type
			};
			body.userData = sprite.userData = ball;

			return ball;
		},

		resetBall: function(ball) {
			var body = ball.body;
			if (ball.type === 0) {
				body.SetPositionAndAngle(new b2d.b2Vec2(Math.random() * w / WORLD_SCALE | 0, -(ball.radius * 2 + 100 * SCALE) / WORLD_SCALE), 0);
				body.SetLinearVelocity(new b2d.b2Vec2(Math.random() * 20 - 10), 0);
				body.SetAngularVelocity(0);
			}
		},

		removeBall: function(ball) {
			ballsToRemove.push(ball);
		},

		removeBalls: function removeBalls() {
			while (ballsToRemove.length) {
				var ball = ballsToRemove.pop();
				world.DestroyBody(ball.body);
				stage.removeChild(ball.sprite);
				ball.body = null;
			}
		},

		/**
		 * A ball has been hit
		 * @param oEvent
		 */
		boom: function(oEvent) {
			var bHitCodi = false;
			var oBall;
			var aCoordinates;
			if (!oEvent) {
				// keyboard input: find out which object was hit with hitTest
				var aCollisions = stage.getObjectsUnderPoint(this.myCursor.x + 120, this.myCursor.y + 80);
				for (var i = 0; i < aCollisions.length;  i++) {
					if (aCollisions[i].image) {
						oBall = aCollisions[i].userData;
						aCoordinates = [this.myCursor.x + 120, this.myCursor.y + 80];
						if (aCollisions[i].image.src.indexOf("Codi") >= 0) {
							bHitCodi = true;
							break;
						}
					}
				}
			} else {
				bHitCodi = oEvent.currentTarget.image.src.indexOf("Codi") >= 0;
				oBall = oEvent.target.userData;
				aCoordinates = [oEvent.rawX, oEvent.rawY];

			}

			if (!oBall) {
				return;
			}

			this._oGame.getSoundManager().play("hammer");
			this._hammered();
			if (bHitCodi) {
				this._oGame.triggerEvent("Ohno");
				this._oGame.score(-100 * this._iDifficulty / 5, aCoordinates);
			} else {
				this._oGame.triggerEvent("Awesome");
				this._oGame.score(100 * this._iDifficulty / 10, aCoordinates);
			}

			this.resetBall(oBall);
			var maxD = (50 + SCALE * 400) / WORLD_SCALE;
			var maxF = SCALE * SCALE * 120;
			var x = aCoordinates[0] / WORLD_SCALE;
			var y = aCoordinates[1] / WORLD_SCALE;

			var frame = oBall.def.frame;
			for (var i = 0; i < 8; i++) {
				var scale = Math.random() * 0.7  + 0.5;
				var a = Math.random() * Math.PI * 2;
				var d = oBall.radius * (0.5 + Math.random() * 0.5);
				var x1 = x + Math.cos(a) * d / WORLD_SCALE;
				var y1 = y + Math.sin(a) * d / WORLD_SCALE;
				var ball1 = this.addBall(Math.random() < 0.3 ? 3 : frame + 1, scale);
				if (ball1) {
					ball1.body.SetPositionAndAngle(new b2d.b2Vec2(x1, y1), a);
				}
			}

			for (var body = world.GetBodyList(); body; body = body.GetNext()) {
				oBall = body.userData;
				if (!oBall) {
					continue;
				}
				var bpt = body.GetPosition();
				var dx = bpt.x - x;
				var dy = bpt.y - y;
				var d = Math.sqrt(dx * dx + dy * dy);
				if (d >= maxD) {
					continue;
				}
				var force = (maxD - d) / maxD * maxF * (oBall.type == 0 ? 1 : 0.01);
				var a = Math.atan2(dy, dx);
				body.ApplyImpulse(new b2d.b2Vec2(Math.cos(a) * force, Math.sin(a) * force), bpt);
			}
		}
	});
});
