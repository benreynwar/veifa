/*******************************************************************************/
/*                                                                             */
/*                                ImageAnnotation                               */
/*                                                                             */
/*******************************************************************************/

function ImageAnnotation(annotext, ai, data) {
	Annotation.call(this, annotext, ai, data);
	if (this.data.url === undefined) {
		this.data.url = '';
	}
	if (this.data.caption === undefined) {
		this.data.caption = '';
	}
	this.data.type = ImageAnnotation.slug;
	this.view_window = new ImageAnnotViewWindow(this);
	this.edit_window = new ImageAnnotEditWindow(this);
	this.thumb_window = new ImageAnnotThumbWindow(this);
	this.view_screen = new AnViewScreen(this);
	this.edit_screen = new AnEditScreen(this);
}
make_subclass(ImageAnnotation, Annotation);

ImageAnnotation.prototype.name = "Image";
ImageAnnotation.slug = "image";
annot_types[ImageAnnotation.slug] = ImageAnnotation;

ImageAnnotation.prototype.is_empty = function() {
	return (!this.data.url && !this.data.caption);
};

ImageAnnotation.prototype.set_url = function(url) {
	this.thumb_window.altered = true;
	this.view_window.altered = true;
	this.annotated_item.view_window.altered = true;
	this.data.url = url;
	this.annotext.set_altered();
};

ImageAnnotation.prototype.set_caption = function(caption) {
	this.view_window.altered = true;
	this.data.caption = caption;
	this.annotext.set_altered();
};

function ImageAnnotEditWindow(an) {
	this.annotation = an;
	this.node = ImageAnnotEditWindow.template.clone();
	this.url_field = this.node.find(".image_annot_edit_window_url").first();
	this.caption_field = this.node.find(".image_annot_edit_window_caption").first();
	this.url_field.append(this.annotation.data.url);
	this.caption_field.append(this.annotation.data.caption);
	// Things appear to work only if url_field and caption_field are
	// not properties of 'this' when passed into function.
	var url_field = this.url_field;
	var caption_field = this.caption_field;
	this.url_field.blur(function() {
			an.set_url(url_field.val());
			an.view_window.update();
			an.thumb_window.update();
		});
	this.caption_field.keyup(function() {
			an.set_caption(caption_field.val());
			an.view_window.update();
		});
	AnEditWindow.call(this, an);
}
make_subclass(ImageAnnotEditWindow, AnEditWindow);

Window.all.push(ImageAnnotEditWindow);

ImageAnnotEditWindow.template_id = "image_annot_edit_window_template";


function ImageAnnotViewWindow(an) {
	this.node = ImageAnnotViewWindow.template.clone();
	this.title = this.node.find(".image_annot_view_window_title").first();
	this.img = this.node.find("img").first();
	this.caption = this.node.find(".image_annot_view_window_caption").first();
	this.old_url = null;
	var img = this.img;
	this.img.error(function() {
			if (img.attr("src") !== no_image_url) {
				img.attr("src", no_image_url);
			}
		});
	AnViewWindow.call(this, an);
}
make_subclass(ImageAnnotViewWindow, AnViewWindow);

Window.all.push(ImageAnnotViewWindow);

ImageAnnotViewWindow.template_id = "image_annot_view_window_template";

ImageAnnotViewWindow.prototype.update = function() {
	if (!this.altered) {
		return;
	}
	this.title.empty();
	this.title.append(this.annotation.annotated_item.link_text);
	
	if (this.annotation.data.url !== this.old_url) {
		this.img.attr("src", this.annotation.data.url);
		this.old_url = this.annotation.data.url;
	}
	this.caption.empty();
	this.caption.append(this.annotation.data.caption);
	this.altered = false;
};

function ImageAnnotThumbWindow(an) {
	this.annotation = an;
	this.node = ImageAnnotThumbWindow.template.clone();
	this.img = this.node.find("img").first();
	this.old_url = null;
	this.img.load(function(e) {
		// The size of this thumb is altered so the AIViewWindow
		// needs to be adjusted.
			an.annotated_item.view_window.altered = true;
			an.annotated_item.view_window.update();
		});
	var img = this.img;
	var node = this.node;
	this.img.error(function() {
			if (img.attr("src") !== no_image_url) {
				img.attr("src", no_image_url);
			}
		});
	AnThumbWindow.call(this, an);
}
make_subclass(ImageAnnotThumbWindow, AnThumbWindow);

Window.all.push(ImageAnnotThumbWindow);

ImageAnnotThumbWindow.template_id = "image_annot_thumb_window_template";

ImageAnnotThumbWindow.prototype.update = function() {
	if (!this.altered) {
		return;
	}
	if (this.annotation.data.url !== this.old_url) {
		if (this.annotation.data.url !== "") {
			this.img.attr("src", this.annotation.data.url);
		} else {
			this.img.attr("src", no_image_url);
		}
		this.old_url = this.annotation.data.url;
	}
	this.img.attr("alt", this.annotation.data.caption);
	this.altered = false;
};
