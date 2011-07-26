/*******************************************************************************/
/*                                                                             */
/*                                TextAnnotation                               */
/*                                                                             */
/*******************************************************************************/

function TextAnnotation(annotext, ai, data) {
	Annotation.call(this, annotext, ai, data);
	if (this.data.thumbtext === undefined) {
		this.data.thumbtext = '';
	}
	if (this.data.content === undefined) {
		this.data.content = '';
	}
	this.data.type = TextAnnotation.slug;
	this.view_window = new TextAnnotViewWindow(this);
	this.edit_window = new TextAnnotEditWindow(this);
	this.thumb_window = new TextAnnotThumbWindow(this);
	this.view_screen = new AnViewScreen(this);
	this.edit_screen = new AnEditScreen(this);
}
make_subclass(TextAnnotation, Annotation);

TextAnnotation.prototype.name = "Text";
TextAnnotation.slug = "text";
annot_types[TextAnnotation.slug] = TextAnnotation;

TextAnnotation.prototype.is_empty = function() {
	return (!this.data.thumbtext && !this.data.content);
};

TextAnnotation.prototype.set_thumbtext = function(thumbtext) {
	this.thumb_window.altered = true;
	this.annotated_item.view_window.altered = true;
	this.data.thumbtext = thumbtext;
	this.annotext.set_altered();
};

TextAnnotation.prototype.set_content = function(content) {
	this.view_window.altered = true;
	this.data.content = content;
	this.annotext.set_altered();
};

function TextAnnotEditWindow(an) {
	this.annotation = an;
	this.node = TextAnnotEditWindow.template.clone();
	this.thumb_field = this.node.find(".text_annot_edit_window_thumb").first();
	this.content_field = this.node.find(".text_annot_edit_window_content").first();
	this.thumb_field.append(this.annotation.data.thumbtext);
	this.content_field.append(this.annotation.data.content);
	// Things appear to work only if thumb_field and content_field are
	// not properties of 'this' when passed into function.
	var thumb_field = this.thumb_field;
	var content_field = this.content_field;
	this.thumb_field.keyup(function() {
			an.set_thumbtext(thumb_field.val());
			// not necessay to update thumb_window as it is not shown.
			//an.thumb_window.update();
		});
	this.content_field.keyup(function() {
			an.set_content(content_field.val());
			an.view_window.update();
		});
	AnEditWindow.call(this, an);
}
make_subclass(TextAnnotEditWindow, AnEditWindow);

Window.all.push(TextAnnotEditWindow);

TextAnnotEditWindow.template_id = "text_annot_edit_window_template";


function TextAnnotViewWindow(an) {
	this.node = TextAnnotViewWindow.template.clone();
	this.title = this.node.find(".text_annot_view_window_title").first();
	this.content = this.node.find(".text_annot_view_window_content").first();
	AnViewWindow.call(this, an);
}
make_subclass(TextAnnotViewWindow, AnViewWindow);

Window.all.push(TextAnnotViewWindow);

TextAnnotViewWindow.template_id = "text_annot_view_window_template";

TextAnnotViewWindow.prototype.update = function() {
	if (!this.altered) {
		return;
	}
	this.title.empty();
	this.title.append(this.annotation.annotated_item.link_text);
	this.content.empty();
	var nodes = text_to_nodes(this.annotation.data.content);
	for (var i = 0; i < nodes.length; i++) {
		this.content.append(nodes[i]);
	}
	this.altered = false;
};

function TextAnnotThumbWindow(an) {
	this.annotation = an;
	this.node = TextAnnotThumbWindow.template.clone();
	AnThumbWindow.call(this, an);
}
make_subclass(TextAnnotThumbWindow, AnThumbWindow);

Window.all.push(TextAnnotThumbWindow);

TextAnnotThumbWindow.template_id = "text_annot_thumb_window_template";

TextAnnotThumbWindow.prototype.update = function() {
	if (!this.altered) {
		return;
	}
	this.node.html(this.annotation.data.thumbtext);
	this.altered = false;
};