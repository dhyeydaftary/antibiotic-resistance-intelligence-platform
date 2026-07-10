from django.urls import path
from .views import predict_view, trends_view, dataset_stats_view

urlpatterns = [
    path('predict/', predict_view, name='predict'),
    path('trends/', trends_view, name='trends'),
    path('dataset-stats/', dataset_stats_view, name='dataset-stats'),
]