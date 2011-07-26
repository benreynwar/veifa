/*******************************************************/
/*                                                     */
/*             RandomPlacer                            */
/*                                                     */
/*******************************************************/

function RandomPlacer(container, fixeds, seed) {
	this.at_max_size = false;
	this.container = container;
	this.c_size = {"t": Math.max(container.height(), RandomPlacer.min_size),
				   "l": Math.max(container.width(), RandomPlacer.min_size)};
	this.c_pad = {"t": 0,
				  "l": 0};
	this.blockages = [];
	for (var i = 0; i < fixeds.length; i++) {
		this.blockages.push(fixeds[i]);
	}
	this.grow_to_fit();
	if (seed !== undefined) {
		Math.seedrandom(seed);
	}
}

RandomPlacer.prototype.place_items = function(items) {
	for (var i = 0; i < items.length; i++) {
		var success = false;
		while (!success) {
			var attempt = 0;
			while (!success && attempt < RandomPlacer.max_attempts) {
				var ran_pos = this.random_position(items[i].size);
				items[i].position(ran_pos);
				if (this.fits(items[i]) || this.at_max_size) {
					items[i].apply();
					this.blockages.push(items[i]);
					success = true;
				}
				attempt += 1;
			}
			if (!success) {
				this.grow_container();
			}
		}
	}
};

RandomPlacer.prototype.grow_to_fit = function() {
	for (var i = 0; i < this.blockages.length; i++) {
		var bl = this.blockages[i];
		while (!bl.fits_in_container(this.c_size) && !this.at_max_size) {
			this.grow_container();
		}
	}
};

RandomPlacer.prototype.apply_container = function() {
	this.container.css('height', this.c_size.t);
	this.container.css('width', this.c_size.l);
};	

RandomPlacer.prototype.grow_container = function() {
	var old_c_size = this.c_size;
	scale = {"t": RandomPlacer.growth_factor,
			 "l": RandomPlacer.growth_factor}
	this.c_size.t = Math.min(this.c_size.t * scale.t, RandomPlacer.max_size.t);
	this.c_size.l = Math.min(this.c_size.l * scale.l, RandomPlacer.max_size.l);
	if (this.c_size.t === RandomPlacer.max_size.t &&
		this.c_size.l === RandomPlacer.max_size.l) {
		this.at_max_size = true;
	}
	this.apply_container();
	for (var i = 0; i < this.blockages.length; i++) {
		this.blockages[i].shift(scale);
		this.blockages[i].apply();
	}
};

RandomPlacer.max_attempts = 50;
RandomPlacer.growth_factor = 1.2;
RandomPlacer.min_size = 50;
RandomPlacer.max_size = {"t": 1000, "l": 1000};

RandomPlacer.prototype.random_position = function(size) {
	var top = Math.random() * (this.c_size.t - size.t);
	var left = Math.random() * (this.c_size.l - size.l);
	return {"t": top, "l": left};
};

RandomPlacer.prototype.fits = function(blockage) {
	for (var i = 0; i < this.blockages.length; i++) {
		if (is_clash(blockage, this.blockages[i])) {
			return false;
		}
	}
	return true;
};

// Blockage

function Blockage(center, object) {
	this.center = center;
	this.object = object;
	this.size = {};
	this.min = {};
	this.max = {};
	this.size.t = this.object.outerHeight(true);
	this.size.l = this.object.outerWidth(true);
	this.recalc();
}

Blockage.prototype.toString = function() {
	str = "Blockage Object - center = ("+this.center.t+", "+this.center.l+")";
	return str;
}

Blockage.prototype.fits_in_container = function(c_size) {
	var l_fits = (this.min.l > 0 && this.max.l < c_size.l);
	var t_fits = (this.min.t > 0 && this.max.t < c_size.t);
	return (l_fits && t_fits);
};

Blockage.prototype.shift = function(scale) {
	var shift = {};
	shift.t = this.center.t * (scale.t-1);
	shift.l = this.center.l * (scale.l-1);
	this.center.t += shift.t;
	this.center.l += shift.l;
	this.recalc();
};

Blockage.prototype.position = function(pos) {
	this.center.t = pos.t + this.size.t/2;
	this.center.l = pos.l + this.size.l/2;
	this.recalc();
};

Blockage.prototype.apply = function() {
	this.object.css('left', this.min.l);
	this.object.css('top', this.min.t);
};

Blockage.prototype.recalc = function() {
	this.min.t = this.center.t - this.size.t/2;
	this.max.t = this.center.t + this.size.t/2;
	this.min.l = this.center.l - this.size.l/2;
	this.max.l = this.center.l + this.size.l/2;
};

function is_clash(b1, b2) {
	var t_overlap = (b1.max.t > b2.min.t && b1.min.t < b2.max.t);
	var l_overlap = (b1.max.l > b2.min.l && b1.min.l < b2.max.l);
	return (t_overlap && l_overlap);
}