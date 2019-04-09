/* eslint-disable new-cap*/
sap.ui.define([
	"sap/ui/base/EventProvider",
	"./../helper/time"
], function(EventProvider, time) {
	"use strict";

	var gameObjects = {
		PLAYER: 1,
		PLAYERBOTTOM: 2,
		RENDERMANAGER: 3,
		CONTROL: 4,
		LASERPARTICLE: 5,
		LEFTWALL: 6,
		RIGHTWALL: 7,
		FLOOR: 8,
		ROOF: 9,
		CONTROLPACKAGE: 10
	};

	var shapes = {
		POLYGON: 1,
		CIRCLE: 2
	};

	var canvasWidth, canvasHeight, debugContext;

	// important box2d scale and speed vars
	var WALLTHICKNESS = 1,
		STEP = 20,
		TIMESTEP = 1 / STEP;
	var SCALE = 30;
	var lastTimestamp = Date.now();
	var fixedTimestepAccumulator = 0;
	var bodiesToRemove = [];
	var controls = [];
	var longlifeGameObjects = [];

	//	var player, playerBody;
	var playerObjects = {};

	// laser particles currently displayed
	var laserParticles = [];

	var _iDifficulty;
	var fnCollisionHook = function() {};
	var fnRemoveActor = function() {};
	var fnPackageCollected = function(){};

	//TODO: Move Soundmanager to Level.js
	var soundManager = {};

	//box2d globals
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

	// box2d world setup and boundaries
	var init = function(canvas, debugCanvas, collisionHook, packageCollected, difficulty, removeActor, soundManager) {
		canvasWidth = canvas.width;
		canvasHeight = canvas.height;
		debugContext = debugCanvas.getContext("2d");
		fnCollisionHook = collisionHook;
		fnRemoveActor = removeActor;
		fnPackageCollected = packageCollected;
		soundManager = soundManager;

		_iDifficulty = difficulty;


		box2dWorld = new b2World(new b2Vec2(0, 3), true);
		var debugDraw = new b2DebugDraw();
		//var b2WorldManifold;

		debugDraw.SetSprite(debugContext);
		debugDraw.SetDrawScale(SCALE);
		debugDraw.SetFillAlpha(0.7);
		debugDraw.SetLineThickness(1.0);
		debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
		box2dWorld.SetDebugDraw(debugDraw);

		// boundaries - roof
		var roofFixture = new b2FixtureDef();
		roofFixture.density = 1.0;
		roofFixture.restitution = 0.5;
		roofFixture.shape = new b2PolygonShape();
		roofFixture.shape.SetAsBox(canvasWidth / SCALE, WALLTHICKNESS / SCALE);
		var roofBodyDef = new b2BodyDef();
		roofBodyDef.type = b2Body.b2_staticBody;
		roofBodyDef.position.x = 0;
		roofBodyDef.position.y = -1000 / SCALE;
		roofBodyDef.userData = {
			gameObjectType: gameObjects.ROOF
		};
		var roof = box2dWorld.CreateBody(roofBodyDef);
		roof.CreateFixture(roofFixture);

		// boundaries - floor_movement
		var floorFixture = new b2FixtureDef();
		floorFixture.density = 1.0;
		floorFixture.restitution = 0.5;
		floorFixture.shape = new b2PolygonShape();
		floorFixture.shape.SetAsBox(canvasWidth / SCALE, WALLTHICKNESS / SCALE);
		var floorBodyDef = new b2BodyDef();
		floorBodyDef.type = b2Body.b2_staticBody;
		floorBodyDef.position.x = 0;
		floorBodyDef.position.y = canvasHeight / SCALE;
		floorBodyDef.userData = {
			gameObjectType: gameObjects.FLOOR
		};
		var floor = box2dWorld.CreateBody(floorBodyDef);
		floor.CreateFixture(floorFixture);

		// boundaries - left
		var leftFixture = new b2FixtureDef();
		leftFixture.shape = new b2PolygonShape();
		leftFixture.density = 1.0;
		leftFixture.shape.SetAsBox(WALLTHICKNESS / SCALE, canvasHeight + 1000 / SCALE);
		var leftBodyDef = new b2BodyDef();
		leftBodyDef.type = b2Body.b2_staticBody;
		leftBodyDef.position.x = 0;
		leftBodyDef.position.y = canvasHeight / SCALE;
		leftBodyDef.userData = {
			gameObjectType: gameObjects.LEFTWALL
		};
		var left = box2dWorld.CreateBody(leftBodyDef);
		left.CreateFixture(leftFixture);

		// boundaries - right
		var rightFixture = new b2FixtureDef();
		rightFixture.shape = new b2PolygonShape();
		rightFixture.density = 1.0;
		rightFixture.shape.SetAsBox(WALLTHICKNESS / SCALE, canvasHeight + 1000 / SCALE);
		var rightBodyDef = new b2BodyDef();
		rightBodyDef.type = b2Body.b2_staticBody;
		rightBodyDef.position.x = canvasWidth / SCALE;
		rightBodyDef.position.y = canvasHeight / SCALE;
		rightBodyDef.userData = {
			gameObjectType: gameObjects.RIGHTWALL
		};
		var right = box2dWorld.CreateBody(rightBodyDef);
		right.CreateFixture(rightFixture);

		// Register collision detection
		var oContactListener = new b2ContactListener();
		oContactListener.BeginContact = function(contact) {

			var fixtureA = contact.GetFixtureA();
			var fixtureB = contact.GetFixtureB();

			// Prepare collision objects for later usage
			var hitObj = {
				a: {
					fixture: fixtureA,
					body: fixtureA.GetBody(),
					skin: fixtureA.GetBody() && fixtureA.GetBody().skin
				},
				b: {
					fixture: fixtureB,
					body: fixtureB.GetBody(),
					skin: fixtureB.GetBody() && fixtureB.GetBody().skin
				}
			};

			hitObj.a.type = (hitObj.a.fixture && hitObj.a.fixture.GetUserData() && hitObj.a.fixture.GetUserData().gameObjectType) ||
				(hitObj.a.body && hitObj.a.body.GetUserData() && hitObj.a.body.GetUserData().gameObjectType);
			hitObj.b.type = (hitObj.b.fixture && hitObj.b.fixture.GetUserData() && hitObj.b.fixture.GetUserData().gameObjectType) ||
				(hitObj.b.body && hitObj.b.body.GetUserData() && hitObj.b.body.GetUserData().gameObjectType);

			// CONTROL MEETS PLAYER (W/O BOTTOM PART)
			if (((hitObj.a.body.GetUserData() && hitObj.a.body.GetUserData().gameObjectType && hitObj.a.body.GetUserData().gameObjectType === gameObjects.PLAYER) &&
				(hitObj.a.type !== gameObjects.PLAYERBOTTOM) &&
				(hitObj.b.type === gameObjects.CONTROL)) ||
				((hitObj.b.body.GetUserData() && hitObj.b.body.GetUserData().gameObjectType && hitObj.b.body.GetUserData().gameObjectType === gameObjects.PLAYER) &&
				(hitObj.b.type !== gameObjects.PLAYERBOTTOM) &&
				(hitObj.a.type === gameObjects.CONTROL))) {

				var skinControlHit = hitObj.a.type === gameObjects.CONTROL ? hitObj.a.skin : hitObj.b.skin;
				fnCollisionHook(hitObj.a.skin && hitObj.a.skin.playerNumber || hitObj.b.skin && hitObj.b.skin.playerNumber, skinControlHit);
				return;
			}

			// LASERPARTICLE MEETS SOME OTHER OBJECT
			if (hitObj.a.type === gameObjects.LASERPARTICLE || hitObj.b.type === gameObjects.LASERPARTICLE) {

				// Which one is the laser particle?
				var a_isLaser = hitObj.a.type === gameObjects.LASERPARTICLE;
				var b_isLaser = hitObj.b.type === gameObjects.LASERPARTICLE;

				// Are both objects laser particles?
				if (a_isLaser && b_isLaser) {
					// Remove both of them, as they hit each other
					if (hitObj.a.body && hitObj.a.body.m_userData !== undefined) {
						bodiesToRemove.push(hitObj.a.body);
					}
					if (hitObj.b.body && hitObj.b.body.m_userData !== undefined) {
						bodiesToRemove.push(hitObj.b.body);
					}
				} else {
					// Just one of the objects is a laser particle
					var laserParticle = a_isLaser ? hitObj.a : hitObj.b;
					var otherGameObject = a_isLaser ? hitObj.b : hitObj.a;

					// Don't remove laser particle when they collide with the player who shot the laser,
					// as there is a collision happening in the moment they spawn
					if (otherGameObject.type === gameObjects.PLAYER && otherGameObject.skin && otherGameObject.skin.playerNumber && laserParticle.skin && laserParticle.skin.createdBy && laserParticle.skin.createdBy !== otherGameObject.skin.playerNumber) {
						if (laserParticle.body.m_userData !== undefined) {
							bodiesToRemove.push(laserParticle.body);
						}
					}
					// In case the other object is a control, remove this as well
					if (otherGameObject.type === gameObjects.CONTROL &&
						otherGameObject.body.m_userData !== undefined) {
						soundManager.play("laserHitsControl");
						bodiesToRemove.push(otherGameObject.body);
					}
				}
			}

			// control package collected
			if ((hitObj.a.type === gameObjects.PLAYER || hitObj.a.type === gameObjects.PLAYERBOTTOM)
			&& hitObj.b.type === gameObjects.CONTROLPACKAGE && !hitObj.b.body.GetUserData().collected){
				hitObj.b.body.GetUserData().collected = true;
				fnPackageCollected(hitObj.a.skin.playerNumber, hitObj.b.skin);
				time.setTimeout(function(){
					bodiesToRemove.push(hitObj.b.body);
				}, 1000);
			} else if ((hitObj.b.type === gameObjects.PLAYER || hitObj.a.type === gameObjects.PLAYERBOTTOM)
			&& hitObj.a.type === gameObjects.CONTROLPACKAGE && !hitObj.a.body.GetUserData().collected){
				hitObj.a.body.GetUserData().collected = true;
				fnPackageCollected(hitObj.b.skin.playerNumber, hitObj.a.skin);
				time.setTimeout(function(){
					if (hitObj.a.body && hitObj.a.body.GetUserData() !== null){
						bodiesToRemove.push(hitObj.a.body);
					}
				}, 1000);
			}

		};
		box2dWorld.SetContactListener(oContactListener);
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
	var createGameObjectBodyAndActor = function(objSkin, iDifficulty) {
		var fixture = new b2FixtureDef();

		fixture.density = objSkin.density; // Dichte
		fixture.restitution = 0.1;

		var bodyDef = new b2BodyDef();

		if (objSkin.shapeType == shapes.POLYGON) {
			fixture.shape = new b2PolygonShape();
			if (objSkin.gameObjectType == gameObjects.PLAYER) {
				fixture.shape.SetAsBox(objSkin.width / SCALE / 2, (objSkin.height - 30) / SCALE / 2);
			} else {
				fixture.shape.SetAsBox(objSkin.width  / SCALE / 2, (objSkin.height) / SCALE / 2);
			}
			bodyDef.position.x = (objSkin.x + (objSkin.width / 2)) / SCALE; // (0/0) im Canvas
			bodyDef.position.y = (objSkin.y + (objSkin.height / 2)) / SCALE; // (0/0) im Canvas
		}

		if (objSkin.shapeType == shapes.CIRCLE) {
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

		if (objSkin.gameObjectType == gameObjects.LASERPARTICLE) {
			body.SetFixedRotation(true);
			body.ApplyForce(new b2Vec2(0,-3), new b2Vec2(0,1));
			body.ApplyImpulse(new b2Vec2(objSkin.direction * 75, -2), body.GetPosition());
			laserParticles.push({
				body: body,
				skin: objSkin
			});
		}

		if (objSkin.gameObjectType == gameObjects.PLAYER) {
			playerObjects[objSkin.playerNumber - 1] = {
				body: body,
				skin: objSkin
			};
		}

		if (objSkin.gameObjectType == gameObjects.PLAYER) {
			var fixtureBottom = new b2FixtureDef();
			fixtureBottom.density = objSkin.density;
			fixtureBottom.restitution = 0.1;
			fixtureBottom.shape = new b2PolygonShape();
			fixtureBottom.shape.SetAsOrientedBox(objSkin.width / SCALE / 2, 13 / SCALE, new b2Vec2(0, objSkin.height / 2 / SCALE));
			fixtureBottom.userData = {
				gameObjectType: gameObjects.PLAYERBOTTOM
			};
			body.CreateFixture(fixtureBottom);
		}

		var fixtureReturn = body.CreateFixture(fixture);
		fixtureReturn.skin = objSkin;

		if (objSkin.gameObjectType == gameObjects.CONTROL) {
			var iLoadedFactor = Math.min(objSkin.loadedTime / 1000, 3);
			//var iBodyMassFactor = body.m_mass; // typical m_mass values 10 for small, 30 for bigger control
			//body.ApplyImpulse(new b2Vec2(-4 * body.m_mass * iRandomFactor, -4.3 * body.m_mass * iRandomFactor * 0.6), body.GetPosition()); // impulse, position
			body.ApplyImpulse(new b2Vec2(
					iLoadedFactor * 25 * objSkin.direction * iDifficulty * body.m_mass / 10,
					0),
				body.GetPosition());
		}
		// assign actor
		var actor = new actorObject(body, objSkin);

		var userData = {
			actor: actor,
			gameObjectType: objSkin.gameObjectType
		};

		if (objSkin.gameObjectType === gameObjects.CONTROLPACKAGE){
			userData.collected = false;
		}

		if (objSkin.gameObjectType === gameObjects.CONTROL || objSkin.gameObjectType === gameObjects.CONTROLPACKAGE) {
			body.objSkin = objSkin;
			controls.push(body);
		} else {
			longlifeGameObjects.push(body);
		}

		body.SetUserData(userData); // set the actor as part of the user data of the body so we can use it later: body.GetUserData()
		return body;
	};

	// box2d update function. delta time is used to avoid differences in simulation if frame rate drops
	var update = function() {
		var now = Date.now();
		var dt = now - lastTimestamp;
		fixedTimestepAccumulator += dt;
		lastTimestamp = now;
		while (fixedTimestepAccumulator >= STEP) {
			// remove bodies before world timestep
			for (var i = 0, l = bodiesToRemove.length; i < l; i++) {
				fnRemoveActor(bodiesToRemove[i].GetUserData() && bodiesToRemove[i].GetUserData().actor, box2dActors);
				bodiesToRemove[i].SetUserData(null);
				box2dWorld.DestroyBody(bodiesToRemove[i]);
			}
			bodiesToRemove = [];

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
				bodiesToRemove.push(controls[0]);
				controls.splice(0, 1);
			}
		}
	};

	// registers all controls on the screen to be destroyed in the next update cycle
	var removeAllControls = function () {
		for (var i = 0; i < controls.length; i++) {
			bodiesToRemove.push(controls[i]);
		}
	};

	/**
	 * Applies a bomb effect to all controls which are currently displayed
	 *
	 * @param {*} soundManager Sound manager for playing the bomb effect sound
	 */
	var applyBombEffect = function (soundManager) {
		/**
		 * Calculates a random number
		 *
		 * @param {number} min Min border for random number
		 * @param {number} max Max border for random number
		 * @returns {number} Random number
		 */
		function getRandomInt(min, max) {
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(Math.random() * (max - min)) + min;
		}

		/**
		 * Iterates all controls displayed in the scene and applies an impuls
		 * which is close to a bomb explosion.
		 * The controls also slowly fade away until they are transparent / invisible.
		 *
		 * @param {object} controls Controls to make slowly transparent
		 * @param {number} duration Duration in seconds until the control is invisible
		 * @param {number} gradations Number of gradations for the animation
		 */
		function coordinateEffect(controls, duration, gradations) {
			// alpha value to substract each interval step
			var substractEachStep = 1 / gradations;

			/**
			 *
			 * @param {*} index Index of control to fade away
			 */
			function fadeControl(index) {
				// create interval for fading animation
				var interval = time.setInterval(function () {
					controls[index].objSkin.alpha -= substractEachStep;
					if (controls[index].objSkin.alpha <= 0) {
						clearInterval(interval);
						// registers all controls on the screen to be destroyed in the next update cycle
						bodiesToRemove.push(controls[index]);
					}
				}, (duration * 1000) / gradations);
			}

			for (var z = 0; z < controls.length; z++) {
				// apply bomb effect
				controls[z].ApplyImpulse(
					new b2Vec2(getRandomInt(50, 200) * _iDifficulty, getRandomInt(3000, 5000) * _iDifficulty),
					controls[z].GetPosition()
				);
				// play explosion sound
				soundManager.play("big_bomb");
				// fade controls until they are invisible
				fadeControl(z);
			}
		}

		// start bomb effect on all controls
		coordinateEffect(controls, 0.5, 50);
	};

	var pauseResume = function(p) {
		if (p) {
			TIMESTEP = 0;
		} else {
			TIMESTEP = 1 / STEP;
		}
		lastTimestamp = Date.now();
	};

	var destroy = function() {
		// TODO: is no destroy needed?
		/*var objectBodiesToDestroy = [];
		objectBodiesToDestroy = jQuery.merge(bodiesToRemove, controls);
		//objectBodiesToDestroy = jQuery.merge(objectBodiesToDestroy, longlifeGameObjects);
		objectBodiesToDestroy = jQuery.merge(objectBodiesToDestroy, Object.keys(laserParticles).map(function(key){return laserParticles[key].body}));

		for (var i = 0, l = objectBodiesToDestroy.length; i < l; i++) {
			fnRemoveActor(objectBodiesToDestroy[i].GetUserData() && objectBodiesToDestroy[i].GetUserData().actor, box2dActors);
			objectBodiesToDestroy[i].SetUserData(null);
			box2dWorld.DestroyBody(objectBodiesToDestroy[i]);
		}
		bodiesToRemove = controls = longlifeGameObjects = [];*/
	};

	return {
		init: init,
		applyBombEffect: applyBombEffect,
		update: update,
		createGameObjectBodyAndActor: createGameObjectBodyAndActor,
		pauseResume: pauseResume,
		playerBody: function(iPlayerNumber) {
			return playerObjects[String(iPlayerNumber)].body;
		},
		playerSkin: function(iPlayerNumber) {
			if (iPlayerNumber !== undefined){
				return playerObjects[String(iPlayerNumber)].skin;
			} else { // return all
				return Object.keys(playerObjects).map(function(key){
					return playerObjects[key].skin;
				});
			}
		},
		removeAllControls: removeAllControls,
		types: {
			"gameObjects": gameObjects,
			"shapes": shapes
		},
		destroy: destroy
	};
});