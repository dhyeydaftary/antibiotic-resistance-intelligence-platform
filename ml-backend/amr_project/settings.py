from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

INTERNAL_API_KEY = config('INTERNAL_API_KEY', default='')

# This API has no user model and no DRF-level authentication — access
# control is handled entirely by InternalApiKeyMiddleware (Django
# middleware, runs before DRF's view dispatch). DRF's built-in defaults for
# DEFAULT_AUTHENTICATION_CLASSES (SessionAuthentication, BasicAuthentication)
# and UNAUTHENTICATED_USER all transitively depend on django.contrib.auth,
# which isn't in INSTALLED_APPS (removed as unused in the Authorization
# sub-phase) — leaving these at their defaults crashes perform_authentication()
# with a RuntimeError the moment DRF tries to resolve AnonymousUser or, for
# DEFAULT_AUTHENTICATION_CLASSES, the moment a request happens to carry a
# Basic auth header. Disabling both removes the dependency on
# django.contrib.auth entirely rather than papering over one crash site.
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'UNAUTHENTICATED_USER': None,
}


# Application definition

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'predictor',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'amr_project.middleware.InternalApiKeyMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'amr_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'amr_project.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'


CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]