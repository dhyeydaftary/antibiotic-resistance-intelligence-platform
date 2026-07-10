from django.urls import path
from .views import predict_view, trends_view

urlpatterns = [
    path('predict/', predict_view, name='predict'),
    path('trends/', trends_view, name='trends'),
]