import os
import sys

from django.apps import AppConfig


class MyappConfig(AppConfig):
    name = 'myapp'

    def ready(self):
        if 'migrate' in sys.argv or 'collectstatic' in sys.argv:
            return

        username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

        if not username or not password:
            return

        try:
            from django.contrib.auth import get_user_model

            user_model = get_user_model()
            if not user_model.objects.filter(username=username).exists():
                email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '')
                user_model.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password,
                )
        except Exception:
            pass
