from django.urls import path, include

urlpatterns = [
    path('api/predictor/', include('predictor.urls')),
]
