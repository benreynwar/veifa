//      
// veifa.js
// 
// Use for viewing and editing annotated texts.
//
// Copyright: Ben Reynwar, 2011
//
// Initial concept and design advice given by Chantelle Warner.

/*******************************************************************************/
/*                                                                             */
/*                      Summary of Classes                                     */
/*                                                                             */
/* Annotext - The complete annotated text.                                     */
/*                                                                             */
/* Page - One page of the annotated text.                                      */
/*                                                                             */
/* AnnotatedItem - A region of text with which annotations are associated.     */
/*                                                                             */
/* Annotation - An annotation.  Could be text, image, video etc.               */
/* Subclasses of Annotation are defined in separate javascript files.          */
/*                                                                             */
/* Window - Takes care of the presentation and updating of a given display     */
/*          element.                                                           */
/* Subclasses are defined to take care of specific kinds of display elements   */
/* i.e. PageViewWindow or AnnotationEditWindow                                 */
/*                                                                             */
/* Screen - A collection of windows commonly displayed at the same time.       */
/*                                                                             */
/*******************************************************************************/

veifatext_version = "veifatext 0.1"

// Make one class behave as a subclass of another.
function make_subclass(child, parent) {
	function f(){};
	f.prototype = parent.prototype;
	child.prototype = new f();
	child.prototype.constructor = parent;
}

// Used for binding context to a function.
// Useful for passing bound methods as callbacks.
function bind(context, method) {
	return function() {
		return method.apply(context, arguments);
	};
}

// Takes a piece of text and converts into a list of elements.
// Line breaks are converted to <br/> elements.
// Returns DOM elements not jQuery objects.
function text_to_nodes(text) {
	var nodes = [];
	var bits = text.split("\n");
	for (var j = 0; j < bits.length; j++) {
		nodes.push(document.createTextNode(bits[j]));
		if (j < bits.length-1) {
			nodes.push(document.createElement('br'));
		}
	}
	return nodes;
}


/*******************************************************************************/
/*                                                                             */
/*                              Annotext Object                                */
/*                                                                             */
/* Corresponds to an entire annotated text.                                    */
/*                                                                             */
/*******************************************************************************/

// Constructor for Annotext object.
// data - a JSON object completely describing the text and annotations.
//        we refer to the format of this object as "veifatext".
function Annotext (data) {
	if (data === "") {
		data = {
			// We give a version number to the veifatext so that
			// backwards compatability is easier if the format is
			// changed.
			"format": veifatext_version,
			// Each element in "pages" is the raw text corresponding
			// to a page of the annotated text.  It includes the
			// formatting that creates links ie. "Some raw text with
			// an [[annotation]].".
			"pages": [""],
			// A mapping of annotated item ids to lists of annotations.
			"annotated_items": {}
		}
	}
	if (data.pages === []) {
		data.pages.push("");
	}
	for (var i = 0; i < data.pages.length; i++) {
		if (data.pages[i] === null){
			data.pages[i] = "";
		};
	}
	// Filter out some badly formed annotations.
	for (var key in data.annotated_items) {
		var ai_data = data.annotated_items[key];
		var new_ai_data = [];
		for (var i = 0; i < ai_data.length; i++) {
			var an_data = ai_data[i];
			if (an_data.type === undefined){
				continue;
			};
			new_ai_data.push(an_data);
		}
		data.annotated_items[key] = new_ai_data;
	}


	// a flag for indicating whether changes have been made since the
	// last save.
	this.needs_saving = false;
	// an element where save notifications are placed.
	this.notification = $("#notification");
	this.container = $("#container");
	// The link to the current annotated item is displayed differently
	// and must be tracked.  These values are also used to determine
	// whether empty annotated items or annotations should be deleted
	// or are being edited.
	this.current_annotated_item = null;
	this.current_annotation = null;
	this.current_page = null;
	this.current_screen = null;
	// Initialise some properties
	this.pages = [];
	this.annotated_items = {};
	this.annotations = [];
	// Initialise the pages
	for (var i = 0; i < data.pages.length; i++) {
		this.pages.push(new Page(this, data.pages[i]));
	}
	if (this.pages[0]) {
		this.current_page = this.pages[0];
	}
	// Check that all of them have data associated with them.
	for (var key in this.annotated_items) {
		if (!(key in data.annotated_items)) {
			// No given data for the link. Create a new AnnotatedItem.
			data.annotated_items[key] = [];
		}
	}
	// Added in any more annotated_items that are defined but not in text.
	for (var ai in data.annotated_items) {
		if (!(ai in this.annotated_items)) {
			this.annotated_items[ai] = new AnnotatedItem(this, ai, null, ai);
		}
	}
	// Find all annotations (they are implicitly added to this.annotations)
	this.annotations = [];
	for (var ai_id in this.annotated_items) {
		var ai = this.annotated_items[ai_id];
		for (var i = 0; i < data.annotated_items[ai.id].length; i++) {
			var an_data = data.annotated_items[ai.id][i];
			// Create the annotation
			new annot_types[an_data.type](this, ai, an_data);
		}
	}
}

// Create the JSON object (veifatext) for this annotated text.
Annotext.prototype.make_json = function() {
	var data = {};
	data.format = veifatext_version;
	data.pages = [];
	for (var i = 0; i < this.pages.length; i++) {
		data.pages.push(this.pages[i].text);
	}
	data.annotated_items = {};
	for (var key in this.annotated_items) {
		ai = this.annotated_items[key];
		data.annotated_items[ai.id] = ai.make_json();
	}
	return data;
};


// Mark the text as having been altered and that it should be saved.
Annotext.prototype.set_altered = function() {
	this.needs_saving = true;
	this.notification.empty();
	this.notification.append('Click Here to Save');
	this.notification.unbind('click');
	this.notification.click(bind(this, this.save));
	this.notification.show();
};

// This function is called when a save is successfully performed.
Annotext.prototype.save_success = function() {
	this.notification.empty();
	this.notification.append('Saved');
	this.notification.unbind('click');
	this.notification.show();
    this.notification.fadeOut(2000);
};

// This function is called when a save fails.
Annotext.prototype.save_fail = function() {
	this.notification.empty();
	this.notification.append('Error: Failed to Save - Click Here to Try Again');;
	this.notification.show();
};

// Save the veifatext to the server.
Annotext.prototype.save = function() {
	if (!this.needs_saving) {
		return;
	}
	this.tidy();
	var data = JSON.stringify(this.make_json());
	jQuery.ajax({"url": save_url,
				 "type": "POST",  
				 "dataType": "json",  
				 "contentType": "json",  
				 "error": bind(this, this.save_fail),
				 "success": bind(this, this.save_success),
				 "beforeSend": function(xhr) {
				     xhr.setRequestHeader("X-CSRFToken", csrf_token);
			     }, 
				 "data": {"json": data}
		});
	this.needs_saving = false;
};

// Tidy up the data structure by removing empty ennotations and unused
// annotated items.
Annotext.prototype.tidy = function() {
	// Remove empty annotations.
	for (var i = 0; i < this.annotations.length; i++) {
		var an = this.annotations[i];
		if ((!an.deleted && an.is_empty()) && an !== this.current_annotation) {
			an.delet();
		}
	}
	// Remove empty unused annotated items.
	for (var ai_id in this.annotated_items) {
		var ai = this.annotated_items[ai_id];
		if (ai.link_element === null && ai.annotations.length === 0) {
			delete this.annotated_items[ai_id];
		}
	}
};

Annotext.ready = function() {
	Window.get_templates();
};

/*******************************************************************************/
/*                                                                             */
/*                                  Page                                       */
/*                                                                             */
/* Represent a single page of annotated text.                                  */
/*                                                                             */
/*******************************************************************************/

function Page(annotext, text) {
	this.annotext = annotext;
	// The raw text from which the page is generated.
	this.text = text;
	this.view_window = new PageViewWindow(this);
	this.edit_window = new PageEditWindow(this);
	this.view_screen = new PageViewScreen(this);
	this.edit_screen = new PageEditScreen(this);
	// Mappings of link contents to the link elements.
	this.links = {}
}

Page.prototype.select = function() {
	this.annotext.current_page = this;
};

// Updates the text on the page.
Page.prototype.set_text = function(text) {
	this.view_window.altered = true;
	// We don't set the edit_window to altered since it never needs updating.
	this.text = text;
	this.annotext.set_altered();
};

// Parses the text into a list of plain text and annotations.
// i.e. "This is a [[little]] test." would become
// [ ["TEXT", "This is a "], ["ANNOT", "little"], ["TEXT", " test."] ]
Page.prototype.parse_text = function() {
	var bits = this.text.split("[[");
	var current_annot = "";
	var nodes = []
	if (bits[0].length > 0) {
		nodes.push(["TEXT", bits[0]])
	}
	for (var i = 1; i < bits.length; i++) {
		var subbits = bits[i].split("]]");
		current_annot = current_annot + subbits[0];
		if (subbits.length > 1) {
			nodes.push(["ANNOT", current_annot]);
			current_annot = "";
			var remainder = "";
			for (var j = 1; j < subbits.length; j++) {
				remainder += subbits[j];
			}
			nodes.push(["TEXT", remainder]);
		}
	}
	return nodes;
}
		
// Updates the content of this.view_window.node using the raw text.
// This function is kept in here rather than in PageViewWindow because
// it interacts so much with the Page object.
Page.prototype.update_view_window = function(element) {
	if (!this.view_window.altered) {
		return;
	}
	// The elements are all regenerated so we'll need to create
	// a new mapping for the links.
	// this.links maps annotated item ids to lists of link elements.
	this.links = {};
	element.empty();
	// Another function takes care of the first step of parsing.
	var parsed = this.parse_text();
	
	for (var i = 0; i < parsed.length; i++) {
		if (parsed[i][0] === "TEXT") {
			element.append(jQuery(text_to_nodes(parsed[i][1])));
		} else if (parsed[i][0] === "ANNOT") {
			var ai_id = parsed[i][1];
			var node = jQuery(document.createElement("a"));
			node.addClass("annot_link");
			var bound = bind(this.view_window,
							 this.view_window.select_annotated_item);
			var make_select_ai_fn = function(ai_id, link_text) {
				var f = function() {
					bound(ai_id, ai_id);
				}
				return f;
			};
			node.click(make_select_ai_fn(ai_id, ai_id));
			node.append(ai_id);
			// Keep track of links.
			if (!(ai_id in this.links)) {
				this.links[ai_id] = [];
			}
			this.links[ai_id].push(node);
			element.append(node);
		}
	}
	// AnnotatedItem objects are created for any new links.
	// The link_element is updated for any existing ones.
	var ais = this.annotext.annotated_items;
	for (var key in this.links) {
		if (!(key in ais)) {
			ais[key] = new AnnotatedItem(this.annotext, key, this.links[key], key);
		} else {
			ais[key].links = this.links[key];
		}
		for (var i = 0; i < ais[key].links.length; i++) {
			if (ais[key].annotations.length === 0) {
				ais[key].links[i].addClass("empty_annot_link");
			} else {
				ais[key].links[i].removeClass("empty_annot_link");
			}
		}
	}
	// Remove defunct link_elements.
	for (var ai_id in ais) {
		if (!(ai_id in this.links)) {
			ais[ai_id].link_element = null;
		}
	}
	this.view_window.node.altered = false;
};


/*******************************************************************************/
/*                                                                             */
/*                                  AnnotatedItem                              */
/*                                                                             */
/* Corresponds to a link in a page, either currently or previously             */
/* existing.                                                                   */
/*                                                                             */
/*******************************************************************************/

function AnnotatedItem (annotext, id, links, link_text) {
	// id - a unique text identifier for the annotated item.
    //      by default it is the same as the link_text.
	// links - a list of links to this annotated item from page.view_window.
	// link_text - the text in the link that was last clicked.
	this.annotext = annotext;
	this.id = id;
	this.links = links;
	this.link_text = link_text;
	// A list of annotations attached to this annotated item.
	this.annotations = [];
	this.view_window = new AIViewWindow(this);
	this.edit_window = new AIEditWindow(this);
	this.view_screen = new AIViewScreen(this);
	this.edit_screen = new AIEditScreen(this);
}

AnnotatedItem.prototype.add_annotation = function(annot_class) {
	var an = new annot_class(this.annotext, this, {});
	return an;
};	

AnnotatedItem.prototype.select = function(link_text) {
	// Pass in link_text.
	// This is useful it multiple links go to the same annotated item
	// and we need to track which one was pressed for the purpose of
	// displaying titles.
	if (link_text !== undefined) {
		this.link_text = link_text;
	}
	if (this.annotext.current_annotated_item !== this
		&& this.annotext.current_annotated_item !== null) {
		this.annotext.current_annotated_item.unselect();
	}
	this.annotext.current_annotated_item = this;
	for (var i = 0; i < this.links.length; i++) {
		this.links[i].addClass("current_annot_link");
	}
};

// Set old annotated item link back to normal.
AnnotatedItem.prototype.unselect = function() {
	for (var i = 0; i < this.links.length; i++) {
		this.links[i].removeClass("current_annot_link");
	}
};

AnnotatedItem.prototype.make_json = function() {
	data = [];
	for (var i = 0; i < this.annotations.length; i++) {
		var an = this.annotations[i];
		an_data = an.make_json();
		if (!an.deleted) {
			an = this.annotations[i];
			data.push(an_data);
		}
	}
	return data
};
	

/*******************************************************************************/
/*                                                                             */
/*                                  Annotation                                 */
/*                                                                             */
/*******************************************************************************/

function make_annotation (annotext, ai, data) {
	return new annot_types[data.type](annotext, ai, data);
};

function Annotation (annotext, ai, data) {
	this.annotext = annotext;
	this.annotated_item = ai;
	// The contents of data depends on the type of annotatoin it is.
	this.data = data;
	// The id of an annotation is an assigned integer.
	this.id = annotext.annotations.length;
	this.deleted = false;
	ai.annotations.push(this);
	annotext.annotations.push(this);
};

Annotation.prototype.select = function() {
	this.annotext.current_annotation = this;
	this.annotated_item.select()
};

Annotation.prototype.unselect = function() {
	this.annotext.current_annotation = null;
};

Annotation.prototype.make_json = function() {
	return this.data;
};

Annotation.prototype.delet = function() {
	this.deleted = true;
};


// A mapping of strings onto subclasses of Annotation.
// i.e. 'text' to TextAnnotation
// There exists a separate javascript file for each annotation type.
// i.e. image_annot.js or text_annot.js
annot_types = {};


/*******************************************************************************/
/*                                                                             */
/*                                  Window                                     */
/*                                                                             */
/* A wrapper class for a jQuery object to take care of updating.               */
/*                                                                             */
/*******************************************************************************/

function Window(annotext) {
	this.annotext = annotext;
	// Set this to true initially so it will be updated before being displayed.
	this.altered = true;
	this.displayed = false;
	this.display_id = null;
	// This is false if the window is part of another window so we don't need
	// to worry about showing and hiding it so much.
	this.top_level = true;
}

Window.prototype.show = function() {
	if (!this.displayed) {
		this.node.show();
		this.displayed = true;
		this.update();
	}
};

Window.prototype.hide = function() {
	if (this.displayed) {
		this.node.hide();
		this.displayed = false;
	}
};

Window.prototype.update = function() {
};

// Dummy function so we can call this on all windows.
Window.prototype.set_editing = function() {
}

Window.all = [];

Window.get_templates = function() {
	for (var i = 0; i < Window.all.length; i++) {
		var window_class = Window.all[i];
		window_class.template = $("#" + window_class.template_id);
	}
};


/*******************************************************************************/
/*                                                                             */
/*                               PageViewWindow                                */
/*                                                                             */
/* Displays a view of a page.                                                  */
/*                                                                             */
/*******************************************************************************/

function PageViewWindow(page) {
	Window.call(this, page.annotext);
	this.node = PageViewWindow.template.clone();
	this.inner = this.node.find(".page_view_window_inner").first();
	this.page = page;
	this.editing = false;
};
make_subclass(PageViewWindow, Window);

Window.all.push(PageViewWindow);

PageViewWindow.template_id = "page_view_window_template";

PageViewWindow.prototype.set_editing = function(editing) {
	if (this.editing === editing) {
		return;
	}
	this.editing = editing;
};

PageViewWindow.prototype.select_annotated_item = function(ai_id, link_text) {
	var ai = this.annotext.annotated_items[ai_id];
	ai.link_text = link_text;
	ai.select();
	if (this.editing) {
		ai.edit_screen.show();
	} else {
		ai.view_screen.show();
	}
};

PageViewWindow.prototype.update = function() {
	if (!this.altered) {
		return;
	}
	this.page.update_view_window(this.inner);
	this.altered = false;
}


/*******************************************************************************/
/*                                                                             */
/*                               PageEditWindow                                */
/*                                                                             */
/* Allows editing of the page.                                                 */
/*                                                                             */
/*******************************************************************************/

function PageEditWindow(page) {
	Window.call(this, page.annotext);
	this.node = PageEditWindow.template.clone();
	this.page = page;
	var ta = this.node.find('textarea').first();
	ta.append(this.page.text);
	//var set_text_fn = bind(this.page, this.page.set_text);
	ta.keyup(function() {
			page.set_text(ta.val());
			page.view_window.update();
		});
}
make_subclass(PageEditWindow, Window);

Window.all.push(PageEditWindow);

PageEditWindow.template_id = "page_edit_window_template";


/*******************************************************************************/
/*                                                                             */
/*                            AIViewWindow                                     */
/*                                                                             */
/* Displays a view of a page.                                                  */
/*                                                                             */
/*******************************************************************************/

function AIViewWindow(ai) {
	Window.call(this, ai.annotext);
	this.node = AIViewWindow.template.clone();
	var closer = this.node.find(".closer").first();
	closer.click(bind(this, this.close));
	this.ai = ai;
	this.editing = false;
	this.thumb_windows = [];
	this.thumb_con = this.node.find(".ai_view_window_inner").first();
	this.title = this.node.find(".ai_view_window_title").first();
}
make_subclass(AIViewWindow, Window);

Window.all.push(AIViewWindow);

AIViewWindow.template_id = "ai_view_window_template";

AIViewWindow.prototype.close = function() {
	this.ai.unselect();
	if (this.editing) {
		this.annotext.current_page.edit_screen.show();
	} else {
		this.annotext.current_page.view_screen.show();
	}
};

AIViewWindow.prototype.select_annotation = function(an) {
	this.hide();
	an.select();
	an.editing = this.editing;
	an.view_window.show();
	if (this.editing) {
		this.ai.edit_window.hide();
		an.edit_window.show();
	}
};

AIViewWindow.prototype.update = function() {
	if (!this.altered) {
		return;
	}
	this.title.empty();
	this.title.append(this.ai.link_text);
	// Make sure that the correct thumb nodes are within
	// the thumb container by removing them all and then reinserting.
	var thumbs = this.thumb_con.find(".thumb");
	thumbs.detach();
	this.thumb_windows = [];
	for (var i = 0; i < this.ai.annotations.length; i++) {
		var an = this.ai.annotations[i];
		if (!an.deleted) {
			this.thumb_con.append(an.thumb_window.node);
			an.thumb_window.show();
			this.thumb_windows.push(an.thumb_window);
		}
	}
	this.position_thumbs();
	this.altered = false;
};

AIViewWindow.prototype.position_thumbs = function() {
	var items = [];
	var thumbs = this.thumb_con.find(".thumb");
	thumbs.each(function() {
			var thumb = $(this);
			// Hardwire in the current width to prevent changes during
			// positioning.
			// FIXME
			// Probably a bad idea if the thumb contents are longer than they were.
			var width = thumb.width();
			// Don't set window width if it's zero since that means the content 
			// isn't loaded yet.
			if (width > 0) {
				thumb.css('width', thumb.width());
			}
			var blockage = new Blockage({'l': 0, 'r': 0}, thumb); 
			items.push(blockage);
		});
	this.title.css('width', this.title.width());
	// Set the height and width to the original values in stylesheet.
	this.node.css('height', '');
	this.node.css('width', '');
	// But force them to be at least 100 in size so placement doesn't get buggy.
	var min_dim = 100;
	if (this.thumb_con.height() < min_dim) {
		this.thumb_con.css('height', min_dim);
	}
	if (this.thumb_con.width() < min_dim) {
		this.thumb_con.css('width', min_dim);
	}
	var title_center = {'l': this.thumb_con.width()/2,
						't': this.thumb_con.height()/2}
	var title_block = new Blockage(title_center, this.title);
	var fixeds = [title_block];
	title_block.apply();
	var placer = new RandomPlacer(this.thumb_con, fixeds, this.id);
	placer.place_items(items);
};

AIViewWindow.prototype.set_editing = function(editing) {
	// Don't check to see if this.editing is changed because we
	// need to do thumbs either way.
	this.editing = editing;
	for (var i = 0; i < this.thumb_windows.length; i++) {
		this.thumb_windows[i].set_editing(this.editing);
	};
};

/*******************************************************************************/
/*                                                                             */
/*                            AIEditWindow                                     */
/*                                                                             */
/* Gives options of types of annotations to add.                               */
/*                                                                             */
/*******************************************************************************/

function AIEditWindow(ai) {
	Window.call(this, ai.annotext);
	this.node = AIEditWindow.template.clone();
	this.ai = ai;
	var choices = this.node.find(".ai_edit_window_choices").first();
	for (var typ in annot_types) {
		var choice = $("<p><a>" + annot_types[typ].prototype.name + "</a></p>");
		var add_an_fn = bind(this, this.add_annotation);
		var make_add_an_fn = function(annot_klass) {
			var f = function() {
				add_an_fn(annot_klass);
			};
			return f;
		}
		choice.click(make_add_an_fn(annot_types[typ]));
		choices.append(choice);
	}
};
make_subclass(AIEditWindow, Window);

Window.all.push(AIEditWindow);

AIEditWindow.template_id = "ai_edit_window_template";

AIEditWindow.prototype.add_annotation = function(annotation_class) {
	var an = this.ai.add_annotation(annotation_class);
	an.select();
	an.edit_screen.show();
};

/*******************************************************************************/
/*                                                                             */
/*                            AnViewWindow                                     */
/*                                                                             */
/* Display the contents of an annotation.                                      */
/* Most of the work is done by specific subclasses                             */
/*                                                                             */
/*******************************************************************************/

function AnViewWindow(an) {
	Window.call(this, an.annotext);
	this.annotation = an;
	this.editing = false;
	// this.node already set by subclass
	// this.closer defined in subclass
	this.closer = this.node.find(".closer").first();
	this.closer.click(bind(this, this.close));
};
make_subclass(AnViewWindow, Window);

AnViewWindow.prototype.close = function() {
	this.annotation.unselect();
	if (this.editing) {
		this.annotation.annotated_item.edit_screen.show();
	} else {
		this.annotation.annotated_item.view_screen.show();
	}
};

AnViewWindow.prototype.set_editing = function(editing) {
	if (this.editing === editing) {
		return;
	}
	this.editing = editing;
};

AnViewWindow.prototype.update = function() {
};

/*******************************************************************************/
/*                                                                             */
/*                            AnThumbWindow                                    */
/*                                                                             */
/* Display a thumbnail for an annotation.                                      */
/* Most of the work is done by specific subclasses                             */
/*                                                                             */
/*******************************************************************************/

function AnThumbWindow(an) {
	Window.call(this, an.annotext);
	this.annotation = an;
	this.editing = false;
	this.node.click(bind(this, this.select_annotation));
	this.top_level = false;
};
make_subclass(AnThumbWindow, Window);

AnThumbWindow.prototype.set_editing = function(editing) {
	this.editing = editing;
};

AnThumbWindow.prototype.select_annotation = function() {
	this.annotation.select();
	if (this.editing) {
		this.annotation.edit_screen.show();
	} else {
		this.annotation.view_screen.show();
	}
}

/*******************************************************************************/
/*                                                                             */
/*                            AnEditWindow                                     */
/*                                                                             */
/* Allows editing of an annotation.                                            */
/* Most of the work is done by specific subclasses.                            */
/*                                                                             */
/*******************************************************************************/

function AnEditWindow(an) {
	Window.call(this, an.annotext);
	this.annotation = an;
	var delete_node = this.node.find(".an_edit_window_delete").first();
	delete_node.click(bind(this, this.delete_annotation));
};
make_subclass(AnEditWindow, Window);

AnEditWindow.prototype.delete_annotation = function() {
	this.annotation.delet();
	this.annotation.annotated_item.edit_screen.show();
}

/*******************************************************************************/
/*                                                                             */
/*                            Screen                                           */
/*                                                                             */
/* A collection of windows which are displayed at the same time.               */
/*                                                                             */
/*******************************************************************************/

function Screen(annotext) {
	this.annotext = annotext;
	if (!("template" in this.klass)) {
		Screen.get_templates();
	}
	this.node = this.klass.template.clone();
	this.annotext.container.append(this.node);
}

Screen.prototype.show = function() {
	if (this.annotext.current_screen) {
		this.annotext.current_screen.hide();
	}

	this.sections = [];
	var found_sections = {};
	for (var i = 0; i < this.section_ids().length; i++) {
		var section_id = this.section_ids()[i][0];
		var window = this.section_ids()[i][1];
		window.set_editing(this.editing);
		if (section_id in found_sections) {
			var section = found_sections[section_id];
		} else {
			var section = this.node.find("#"+section_id).first();
			found_sections[section_id] = section;
			section.children().detach();
		}
		this.sections.push([section, window]);
	};

	this.node.show();
	
	this.annotext.current_screen = this;
	this.windows = [];
	for (var i = 0; i < this.sections.length; i++) {
		var section = this.sections[i][0];
		var window = this.sections[i][1];
		section.append(window.node);
		window.show();
		this.windows.push(window);
		window.set_editing(this.editing);
	};
};

Screen.all = [];

Screen.prototype.hide = function() {
	for (var i = 0; i < this.windows.length; i++) {
		this.windows[i].hide();
	}	
	this.node.hide();
};

Screen.prototype.update = function() {
	for (var i = 0; i < this.windows.length; i++) {
		this.windows[i].update();
	}
};

Screen.get_templates = function() {
	for (var i = 0; i < Screen.all.length; i++) {
		var screen_klass = Screen.all[i];
		screen_klass.template = $("#" + screen_klass.template_id);
	}
};

function PageViewScreen(page) {
	this.page = page;
	this.editing = false;
	this.klass = PageViewScreen;
	Screen.call(this, page.annotext);
}
make_subclass(PageViewScreen, Screen);
PageViewScreen.template_id = "two_section_screen";
Screen.all.push(PageViewScreen);

PageViewScreen.prototype.section_ids = function() {
	return [["left_section", this.page.view_window]];
};

function PageEditScreen(page) {
	this.page = page;
	this.editing = true;
	this.klass = PageEditScreen;
	Screen.call(this, page.annotext);
}
make_subclass(PageEditScreen, Screen);
PageEditScreen.template_id = "two_section_screen";
Screen.all.push(PageEditScreen);

PageEditScreen.prototype.section_ids = function() {
	return [["left_section", this.page.edit_window],
			["right_section", this.page.view_window]];
};

function AIViewScreen(ai) {
	this.ai = ai;
	this.editing = false;
	this.klass = AIViewScreen;
	Screen.call(this, ai.annotext);
}
make_subclass(AIViewScreen, Screen);
AIViewScreen.template_id = "two_section_screen";
Screen.all.push(AIViewScreen);

AIViewScreen.prototype.section_ids = function() {
	return [["left_section", this.annotext.current_page.view_window],
			["right_section", this.ai.view_window]];
};

function AIEditScreen(ai) {
	this.ai = ai;
	this.editing = true;
	this.klass = AIEditScreen;
	Screen.call(this, ai.annotext);
}
make_subclass(AIEditScreen, Screen);
AIEditScreen.template_id = "one_section_screen";
Screen.all.push(AIEditScreen);

AIEditScreen.prototype.section_ids = function() {
	return [["both_section", this.ai.edit_window],
			["both_section", this.ai.view_window]];
};

function AnViewScreen(an) {
	this.an = an;
	this.editing = false;
	this.klass = AnViewScreen;
	Screen.call(this, an.annotext);
}
make_subclass(AnViewScreen, Screen);
AnViewScreen.template_id = "two_section_screen";
Screen.all.push(AnViewScreen);

AnViewScreen.prototype.section_ids = function() {
	return [["left_section", this.annotext.current_page.view_window],
			["right_section", this.an.view_window]];
};

function AnEditScreen(an) {
	this.an = an;
	this.editing = true;
	this.klass = AnEditScreen;
	Screen.call(this, an.annotext);
}
make_subclass(AnEditScreen, Screen);
AnEditScreen.template_id = "two_section_screen";
Screen.all.push(AnEditScreen);

AnEditScreen.prototype.section_ids = function() {
	return [["left_section", this.an.edit_window],
			["right_section", this.an.view_window]];
};