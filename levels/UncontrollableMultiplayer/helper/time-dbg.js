sap.ui.define(function() {
	"use strict";
	// based on https://stackoverflow.com/questions/8860188/is-there-a-way-to-clear-all-time-outs
	return {
		timeouts: [],
		intervals: [],
		setTimeout: function(code, number) {
			var timeout = setTimeout(code, number)
			this.timeouts.push(timeout);
			return timeout;
		},
		setInterval: function(code, number) {
			var interval = setInterval(code, number);
			this.intervals.push(interval);
			return interval;
		},
		clearAllTimeout: function() {
			for (var i = 0; i < this.timeouts.length; i++) {
				window.clearTimeout(this.timeouts[i]);
			}
			this.timeouts = [];
		},
		clearAllIntervals: function() {
			for (var i = 0; i < this.intervals.length; i++) {
				window.clearInterval(this.intervals[i]);
			}
			this.intervals = [];
		},
		clearAll : function(){
			this.clearAllTimeout();
			this.clearAllIntervals();
		}
	};
});