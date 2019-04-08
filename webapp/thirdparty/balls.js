/*
* Copyright (c) 2013 gskinner.com, inc
* Usage with permission of Grant Skinner
*/

(function (lib, img, cjs) {

	var p; // shortcut to reference prototypes
	var rect; // used to reference frame bounds

	// stage content:
	(lib.balls = function() {
		this.initialize();

		// Layer 1
		this.instance = new lib.Balls();
		this.instance.setTransform(267.6,204.1);

		this.addChild(this.instance);
	}).prototype = p = new cjs.Container();
	p.nominalBounds = rect = new cjs.Rectangle(148.6,122.6,240,165.1);
	p.frameBounds = [rect];


	// symbols:
	(lib.Circle = function() {
		this.initialize();

		// Layer 1
		this.shape = new cjs.Shape();
		this.shape.graphics.f().s("#CCFFFF").ss(10.1,1,1).de(-60.9,-60.9,122,122);
		this.shape.setTransform(0,0,0.82,0.82);

		this.addChild(this.shape);
	}).prototype = p = new cjs.Container();
	p.nominalBounds = rect = new cjs.Rectangle(-49.9,-49.9,100,100);
	p.frameBounds = [rect];

	(lib.Balls = function(mode,startPosition,loop) {
		this.initialize(mode,startPosition,loop,{});

		this.circle = new lib.Circle();
		this.circle.setTransform(0,0,1.5,1.5);

		this.timeline.addTween(cjs.Tween.get(this.circle).wait(1).to({scaleX:1,scaleY:1},0).wait(1).to({scaleX:0.3,scaleY:0.3},0).wait(6));

	}).prototype = p = new cjs.MovieClip();
	p.nominalBounds = rect = new cjs.Rectangle(-118.9,-81.4,240,165.1);
	p.frameBounds = [rect, new cjs.Rectangle(-53.3,-56.8,118.6,112.7), new cjs.Rectangle(-16.3,-18.4,32.7,37), new cjs.Rectangle(-17,-22.7,34.2,45.6), new cjs.Rectangle(-16.5,-18.1,33.3,36.4), new cjs.Rectangle(-14.9,-23,30,46.1), new cjs.Rectangle(-14.9,-19.2,30,38.6), new cjs.Rectangle(-15.8,-18,31.8,36.1)];

})(lib = lib||{}, images = images||{}, createjs = createjs||{});

var lib, images, createjs;
