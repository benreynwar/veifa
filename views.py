import simplejson

from django.shortcuts import render_to_response
from django.views.decorators.cache import never_cache
from django.contrib import auth
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.sites.models import Site, RequestSite
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.http import HttpResponseRedirect, HttpResponse
from django.conf import settings
from django.utils.http import urlquote
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse
from django.db.models import Q

from . import forms
from models import Text

REDIRECT_FIELD_NAME = 'next'

# Not a view!
def _get_context(request):
    """
    Creates a dictionary containing variables commonly required in templates.
    """
    d = {}
    d['url'] = urlquote(request.get_full_path())
    d['no_image_url'] = settings.STATIC_URL + "images/no_image.jpg"
    context = RequestContext(request, d)
    return context

def terms(request):
    context = _get_context(request)
    context['next'] = request.GET.get('next', '')
    return render_to_response('terms.html', context)

def entrance(request):
    if not request.user.is_anonymous():
        my_published_texts = Text.objects.filter(owner=request.user, public=True,
                                                 inactive=False)
        my_draft_texts = Text.objects.filter(owner=request.user, public=False,
                                             inactive=False)
        other_texts = Text.objects.filter(~Q(owner=request.user), public=True,
                                          inactive=False)
    else:
        my_published_texts = []
        my_draft_texts = []
        other_texts = Text.objects.filter(public=True, inactive=False)
    context = _get_context(request)
    context['show_own_text_lists'] = bool(my_published_texts or my_draft_texts) 
    context['my_published_texts'] = my_published_texts
    context['my_draft_texts'] = my_draft_texts
    context['other_texts'] = other_texts
    return render_to_response('entrance.html', context)

def signup(request, template_name='signup.html'):
    context = _get_context(request)
    if REDIRECT_FIELD_NAME in request.GET:
        redirect = request.GET[REDIRECT_FIELD_NAME]
    else:
        redirect = '/'
    if request.method == 'POST':
        form = forms.SignupForm(request.POST)
        user = form.create_user()
        if user is not None:
            if user.is_active:
                auth.login(request, user)
                return HttpResponseRedirect(redirect)
            else:
                raise StandardError, "Account is disabled for some reason and I don't handle that"
    else:
        form = forms.SignupForm()
    context['next'] = request.GET.get('next', '')
    context['form'] = form
    return render_to_response(template_name, context)

def logout(request):
    if REDIRECT_FIELD_NAME in request.GET:
        redirect = request.GET[REDIRECT_FIELD_NAME]
    else:
        redirect = '/'
    auth.logout(request)
    return HttpResponseRedirect(redirect)

def is_json_valid(json):
    try:
        simplejson.loads(json)
        return True
    except simplejson.decoder.JSONDecodeError:
        return False

new_json = '{"pages": ["To edit this text make sure you are in edit mode.\\n\\nThe window on the left is then used to edit the text.  Surround a word in double square brackets to allow the adding of [[annotations]].\\n\\nTo add an annotation simply click on the link in the right-hand window."], "annotated_items": [] }'

@login_required
def new_text(request):
    if request.POST:
        form = forms.NewTextForm(request.POST)
        if form.is_valid():
            text = Text()
            text.name = form.cleaned_data['text_name']
            text.owner = request.user
            text.public = False
            text.json = new_json
            text.save()
            return HttpResponseRedirect(
                reverse('edit_text',
                        kwargs={'text_id': text.id}))
    else:
        form = forms.NewTextForm()
    context = _get_context(request)
    context['form'] = form
    return render_to_response('new_text.html', context)

def view_text(request, text_id):
    text = Text.objects.get(id=text_id)
    text.confirm_may_view(request.user)
    context = _get_context(request)
    context['text'] = text
    context['may_edit'] = text.may_edit(request.user)
    if is_json_valid(text.json):
        context['json'] = text.json
    elif not text.json:
        context['json'] = '""'
    else:
        text.inactivate()
        raise StandardError("JSON in database is invalid")
    return render_to_response('view_text.html', context)

def edit_text(request, text_id):
    text = Text.objects.get(id=text_id)
    text.confirm_may_edit(request.user)
    context = _get_context(request)
    context['text'] = text
    if is_json_valid(text.json):
        context['json'] = text.json
    elif not text.json:
        context['json'] = '""'
    else:
        text.inactivate()
        raise StandardError("JSON in database is invalid")
    return render_to_response('edit_text.html', context)
    
def save_text(request, text_id):
    success_response = '{"success": true}'
    fail_response = '{"success": false}'
    mimetype = "application/json"
    if request.POST:
        text = Text.objects.get(id=text_id)
        new_json = request.POST.get('json', '')
        if text.may_edit(request.user) and is_json_valid(new_json):
            text.json = new_json
            text.save()
            return HttpResponse(content=success_response, mimetype=mimetype)
    return HttpResponse(content=fail_response, mimetype=mimetype)

def delete_text(request, text_id):
    text = Text.objects.get(id=text_id)
    text.confirm_may_edit(request.user)
    context = _get_context(request)
    context['text'] = text
    if request.POST:
        if 'Yes' in request.POST:
            text.delete(request.user)
            return HttpResponseRedirect(reverse("entrance"))
        else:
            return HttpResponseRedirect(reverse("view_text", kwargs={"text_id": text.id}))
    return render_to_response('delete_text.html', context)

def publish_text(request, text_id):
    text = Text.objects.get(id=text_id)
    text.confirm_may_edit(request.user)
    if request.POST:
        if 'Publish' in request.POST:
            text.public = True
            text.save()
            return HttpResponseRedirect(
                reverse("view_text", kwargs={"text_id": text.id}))
        else:
            return HttpResponseRedirect(
                reverse("view_text", kwargs={"text_id": text.id}))
    context = _get_context(request)
    context['text'] = text
    return render_to_response('publish_text.html', context)

def unpublish_text(request, text_id):
    text = Text.objects.get(id=text_id)
    text.confirm_may_edit(request.user)
    if request.POST:
        if 'Make_Private' in request.POST:
            text.public = False
            text.save()
            return HttpResponseRedirect(
                reverse("view_text", kwargs={"text_id": text.id}))
        else:
            return HttpResponseRedirect(
                reverse("view_text", kwargs={"text_id": text.id}))
    context = _get_context(request)
    context['text'] = text
    return render_to_response('unpublish_text.html', context)
