/*******************************************************************************/
/*                                                                             */
/*                                YouTubeAnnotation                               */
/*                                                                             */
/*******************************************************************************/

function YouTubeAnnotation(annotext, ai, data) {
	Annotation.call(this, annotext, ai, data);
	if (this.data.code === undefined) {
		this.data.code = '';
	}
	if (this.data.caption === undefined) {
		this.data.caption = '';
	}
	this.data.type = YouTubeAnnotation.slug;
	this.view_window = new YouTubeAnnotViewWindow(this);
	this.edit_window = new YouTubeAnnotEditWindow(this);
	this.thumb_window = new YouTubeAnnotThumbWindow(this);
	this.view_screen = new AnViewScreen(this);
	this.edit_screen = new AnEditScreen(this);
}
make_subclass(YouTubeAnnotation, Annotation);

YouTubeAnnotation.prototype.name = "YouTube Video";
YouTubeAnnotation.slug = "youtube";
annot_types[YouTubeAnnotation.slug] = YouTubeAnnotation;

YouTubeAnnotation.prototype.is_empty = function() {
	return (!this.data.code && !this.data.caption);
};

YouTubeAnnotation.prototype.set_code = function(code) {
	this.thumb_window.altered = true;
	this.view_window.altered = true;
	this.annotated_item.view_window.altered = true;
	this.data.code = code;
	this.annotext.set_altered();
};

YouTubeAnnotation.prototype.set_caption = function(caption) {
	this.view_window.altered = true;
	this.data.caption = caption;
	this.annotext.set_altered();
};

function YouTubeAnnotEditWindow(an) {
	this.annotation = an;
	this.node = YouTubeAnnotEditWindow.template.clone();
	this.code_field = this.node.find(".youtube_annot_edit_window_code").first();
	this.caption_field = this.node.find(".youtube_annot_edit_window_caption").first();
	this.code_field.append(this.annotation.data.code);
	this.caption_field.append(this.annotation.data.caption);
	// Things appear to work only if code_field and caption_field are
	// not properties of 'this' when passed into function.
	var code_field = this.code_field;
	var caption_field = this.caption_field;
	this.code_field.blur(function() {
			an.set_code(code_field.val());
			an.view_window.update();
			an.thumb_window.update();
		});
	this.caption_field.keyup(function() {
			an.set_caption(caption_field.val());
			an.view_window.update();
		});
	AnEditWindow.call(this, an);
}
make_subclass(YouTubeAnnotEditWindow, AnEditWindow);

Window.all.push(YouTubeAnnotEditWindow);

YouTubeAnnotEditWindow.template_id = "youtube_annot_edit_window_template";


function YouTubeAnnotViewWindow(an) {
	this.node = YouTubeAnnotViewWindow.template.clone();
	this.title = this.node.find(".youtube_annot_view_window_title").first();
	this.iframe = this.node.find("iframe").first();
	this.caption = this.node.find(".youtube_annot_view_window_caption").first();
	this.old_code = null;
	AnViewWindow.call(this, an);
}
make_subclass(YouTubeAnnotViewWindow, AnViewWindow);

Window.all.push(YouTubeAnnotViewWindow);

YouTubeAnnotViewWindow.template_id = "youtube_annot_view_window_template";

YouTubeAnnotViewWindow.prototype.update = function() {
	if (!this.altered) {
		return;
	}
	this.title.empty();
	this.title.append(this.annotation.annotated_item.link_text);
	if (this.annotation.data.code !== this.old_code) {
		this.iframe.attr("src", "http://www.youtube.com/embed/"+this.annotation.data.code);
		this.old_code = this.annotation.data.code;
	}
	this.caption.empty();
	this.caption.append(this.annotation.data.caption);
	this.altered = false;
};

function YouTubeAnnotThumbWindow(an) {
	this.annotation = an;
	this.node = YouTubeAnnotThumbWindow.template.clone();
	this.img = this.node.find("img").first();
	this.img.load(function() {
			// The size of this thumb is altered so the AIViewWindow
			// needs to be adjusted.
			an.annotated_item.view_window.altered = true;
			an.annotated_item.view_window.update();
		});
	var img = this.img;
	this.img.error(function() {
			if (img.attr("src") !== no_image_url) {
				img.attr("src", no_image_url);
				node.css('width', "");				
				node.css('width', node.width());				
			}
		});
	AnThumbWindow.call(this, an);
}
make_subclass(YouTubeAnnotThumbWindow, AnThumbWindow);

Window.all.push(YouTubeAnnotThumbWindow);

YouTubeAnnotThumbWindow.template_id = "youtube_annot_thumb_window_template";

YouTubeAnnotThumbWindow.prototype.update = function() {
	if (!this.altered) {
		return;
	}
	this.img.attr("src", "http://img.youtube.com/vi/"+this.annotation.data.code+"/2.jpg");
	this.altered = false;
};
