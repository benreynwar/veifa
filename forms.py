import logging

from django import forms
from django.contrib import auth
from django.utils.translation import ugettext_lazy as _
from django.db.models import get_model
from django.conf import settings

from django_guest.utils import make_guest_permanent

from models import Text

from constants import TEXT_NAME_MAX_LENGTH

logger = logging.getLogger('veifa.forms')

class SignupForm(forms.Form):
    username = forms.CharField()
    email = forms.EmailField()
    password = forms.CharField()
    password2 = forms.CharField()
    terms = forms.BooleanField()

    def clean_password2(self):
        if self._errors: return
        password = self.cleaned_data.get('password')
        password2 = self.cleaned_data.get('password2')
        if password != password2:
            raise forms.ValidationError(_("Passwords don't match."))
        return password

    def clean_username(self):
        if self._errors: return
        username = self.cleaned_data.get('username')
        if auth.models.User.objects.filter(username=username):
            raise forms.ValidationError(_("That user name already exists."))
        return username

    def clean_email(self):
        if self._errors: return
        email = self.cleaned_data.get('email')
        if auth.models.User.objects.filter(email=email):
            raise forms.ValidationError(_('A user already exists with that email address.'))
        return email

    def clean_terms(self):
        if self._errors: return
        terms = self.cleaned_data.get('terms')
        if not terms:
            raise forms.ValidationError(_('You have not agreed to the Terms and Conditions.'))
        return terms

    def create_user(self):
        """Creates a new user based on the form contents."""
        if self.is_valid():
            username = self.cleaned_data['username']
            email = self.cleaned_data['email']
            password = self.cleaned_data['password']
            user = auth.models.User.objects.create_user(username=username,email=email,password=password)
            user.save()
            return auth.authenticate(username=username, password=password)
        else:
            return None


class NewTextForm(forms.Form):
    
    text_name = forms.CharField(
        max_length=TEXT_NAME_MAX_LENGTH)        

    def clean_text_name(self):
        if self._errors: return
        text_name = self.cleaned_data.get('text_name')
        if Text.objects.filter(name=text_name):
            raise forms.ValidationError(_("A text already exists with that name."))
        return text_name
