from django.conf.urls.defaults import patterns, include, url

from views import terms, signup, logout, entrance, new_text, view_text
from views import edit_text, save_text, delete_text, publish_text, unpublish_text

urlpatterns = patterns(
    '',
    url(r'^terms/$', terms, name='terms'),
    url(r'^signup/$', signup, name='signup'),
    url(r'^logout/$', logout, name='logout'),
    url(r'^$', entrance, name='entrance'),
    url(r'^login/$', 'django.contrib.auth.views.login',
        {"template_name":"login.html",}
        , name='login'),

    url(r'^text/new/$', new_text, name='new_text'),
    url(r'^text/(?P<text_id>\d+)/delete/$', delete_text, name='delete_text'),
    url(r'^text/(?P<text_id>\d+)/publish/$', publish_text, name='publish_text'),
    url(r'^text/(?P<text_id>\d+)/unpublish/$', unpublish_text, name='unpublish_text'),
    url(r'^text/(?P<text_id>\d+)/$', view_text, name='view_text'),
    url(r'^text/(?P<text_id>\d+)/edit/$', edit_text, name='edit_text'),
#    url(r'^text/(?P<text_id>\d+)/properties/$', text_properties,
#        name='text_properties'),
    url(r'^services/text/(?P<text_id>\d+)/save/$', save_text, name='save_text'),
    
    

)
