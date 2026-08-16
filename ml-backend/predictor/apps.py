from django.apps import AppConfig


# Django app config registering the predictor app under INSTALLED_APPS.
class PredictorConfig(AppConfig):
    name = 'predictor'

    # Runs once, in the master process, before gunicorn --preload forks
    # workers — eagerly populates both modules' dataset caches so no
    # request-time thread ever races to load them cold. Import happens
    # here (not at module top) since these modules aren't meant to be
    # imported before Django's app registry is ready.
    def ready(self):
        from . import trends, dataset_stats
        trends._load_data()
        trends._load_antibiotic_columns()
        dataset_stats._load_data()
        dataset_stats._load_antibiotic_columns()
