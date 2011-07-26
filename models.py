from django.db import models
from django.contrib.auth.models import User

from constants import JSON_MAX_LENGTH, TEXT_NAME_MAX_LENGTH

class PermissionException(Exception):
    pass

class Text(models.Model):
    """
    An annotated text.
    """
    name = models.CharField(max_length=TEXT_NAME_MAX_LENGTH)
    public = models.BooleanField(default=False)
    owner = models.ForeignKey(User)
    json = models.CharField(max_length=JSON_MAX_LENGTH)
    inactive = models.BooleanField(default=False)

    def inactivate(self):
        self.inactive = True
        self.save()

    def delete(self, user):
        self.confirm_may_delete(user)
        self.inactivate()

    def may_view(self, user):
        return (not self.inactive) and (self.public or self.owner == user)

    def confirm_may_view(self, user):
        if not self.may_view(user):
            raise PermissionException()

    def may_edit(self, user):
        return (self.owner == user and not self.inactive)

    def confirm_may_edit(self, user):
        if not self.may_edit(user):
            raise PermissionException()

    def may_delete(self, user):
        return (self.owner == user and not self.inactive)
    
    def confirm_may_delete(self, user):
        if not self.may_delete(user):
            raise PermissionException()
